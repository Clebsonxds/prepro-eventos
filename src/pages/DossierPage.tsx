import { Download, Printer } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import {
  calculateTotals, equipmentForItem, groupOwnWeightKg, itemPowerW, itemWeightKg,
  metadataNumber, metadataString, structureLoadKg, videoDerivedSupportWeightKg,
  videoSupportWeightForStructure,
} from '../utils/calculations';
import { formatDateTime } from '../utils/dates';
import { downloadCsv } from '../utils/download';
import type { ProjectGroup, ProjectItem } from '../types/domain';

const areaName = { audio: 'Áudio', lighting: 'Iluminação', video: 'Vídeo', structure: 'Estrutura' } as const;

export function DossierPage() {
  const data = useData();
  const project = data.currentProject;
  if (!project) return <ProjectRequired><></></ProjectRequired>;

  const totals = calculateTotals(data.groups, data.items, data.catalog);
  const structures = data.groups.filter((g) => g.area === 'structure');
  const aerial = structures.filter((g) => g.mount_type === 'aerial' || g.mount_type === 'mixed');
  const floorStructures = structures.filter((g) => g.mount_type === 'floor' || g.mount_type === 'mixed');
  const videoSystems = data.groups.filter((g) => g.area === 'video');
  const groundVideo = videoSystems.filter((g) => g.mount_type !== 'aerial');
  const aerialSafety = 20;
  const floorSafety = 10;

  function videoPanelItems(group: ProjectGroup): ProjectItem[] {
    return data.items.filter((i) => i.area === 'video' && i.position_name === `video:${group.id}` && data.catalog.find((e) => e.id === i.equipment_id)?.category === 'video_panel');
  }

  function aerialRows() {
    const rows: (string | number)[][] = [['MEMORIAL DE CÁLCULO AÉREO'], ['Projeto', project.name], ['Local', project.venue], []];
    for (const g of aerial) {
      const assigned = data.items.filter((i) => i.group_id === g.id);
      const own = groupOwnWeightKg(g);
      const videoSupport = videoSupportWeightForStructure(g.id, data.groups);
      rows.push(['ESTRUTURA', g.name, g.structure_type, `${g.length_m} m`], ['Equipamento / item', 'Área', 'Qtd.', 'Peso unit. kg', 'Peso total kg']);
      if (own > 0) rows.push([`${g.structure_type || 'Estrutura'} + talhas/correntes`, 'Estrutura', 1, own.toFixed(1), own.toFixed(1)]);
      for (const i of assigned) {
        const eq = equipmentForItem(i, data.catalog);
        rows.push([eq?.name ?? 'Item', areaName[i.area], i.quantity, (i.override_weight_kg ?? eq?.weight_kg ?? 0).toFixed(2), itemWeightKg(i, eq).toFixed(1)]);
      }
      if (videoSupport > 0) rows.push(['Bumpers / apoio derivado de vídeo', 'Vídeo', 1, videoSupport.toFixed(1), videoSupport.toFixed(1)]);
      const total = structureLoadKg(g, data.items, data.catalog, data.groups);
      const safe = total * (1 + aerialSafety / 100);
      const points = g.points_count || 0;
      rows.push(
        ['TOTAL EQUIPAMENTOS + ESTRUTURA', '', '', '', total.toFixed(1)],
        ['MARGEM DE SEGURANÇA', `${aerialSafety}%`, '', '', (total * aerialSafety / 100).toFixed(1)],
        ['TOTAL COM MARGEM', '', '', '', safe.toFixed(1)],
        ['PONTOS', points, 'kg/ponto', points ? (safe / points).toFixed(1) : '—'],
        [],
      );
    }
    return rows;
  }

  function floorRows() {
    const rows: (string | number)[][] = [['MEMORIAL DE CÁLCULO DE SOLO'], ['Projeto', project.name], ['Local', project.venue], []];

    for (const g of floorStructures) {
      const assigned = data.items.filter((i) => i.group_id === g.id);
      const own = groupOwnWeightKg(g);
      const contact = metadataNumber(g, 'contact_area_m2');
      rows.push(['ESTRUTURA / ÁREA', g.name, g.structure_type, contact ? `${contact} m²` : 'área de contato não informada'], ['Equipamento / item', 'Área', 'Qtd.', 'Peso unit. kg', 'Peso total kg']);
      if (own > 0) rows.push([`${g.structure_type || 'Estrutura'}`, 'Estrutura', 1, own.toFixed(1), own.toFixed(1)]);
      for (const i of assigned) {
        const eq = equipmentForItem(i, data.catalog);
        rows.push([eq?.name ?? 'Item', areaName[i.area], i.quantity, (i.override_weight_kg ?? eq?.weight_kg ?? 0).toFixed(2), itemWeightKg(i, eq).toFixed(1)]);
      }
      const total = structureLoadKg(g, data.items, data.catalog, data.groups);
      const safe = total * (1 + floorSafety / 100);
      rows.push(
        ['TOTAL', '', '', '', total.toFixed(1)],
        ['MARGEM DE SEGURANÇA', `${floorSafety}%`, '', '', (total * floorSafety / 100).toFixed(1)],
        ['TOTAL COM MARGEM', '', '', '', safe.toFixed(1)],
        ['DISTRIBUIÇÃO', contact ? `${(safe / contact).toFixed(2)} kg/m²` : '—'],
        [],
      );
    }

    // Cada painel de solo vira uma seção própria, juntando placas + estrutura de apoio calculada.
    for (const g of groundVideo) {
      const panelItems = videoPanelItems(g);
      const support = videoDerivedSupportWeightKg(g);
      if (!panelItems.length && !support) continue;
      rows.push(['SISTEMA DE LED NO SOLO', g.name, metadataString(g, 'install_mode')], ['Equipamento / item', 'Área', 'Qtd.', 'Peso unit. kg', 'Peso total kg']);
      let total = support;
      for (const i of panelItems) {
        const eq = equipmentForItem(i, data.catalog);
        const weight = itemWeightKg(i, eq); total += weight;
        rows.push([eq?.name ?? 'Painel', 'Vídeo', i.quantity, (i.override_weight_kg ?? eq?.weight_kg ?? 0).toFixed(2), weight.toFixed(1)]);
      }
      if (support > 0) rows.push(['Mãos francesas / barras / contrapesos', 'Estrutura LED', 1, support.toFixed(1), support.toFixed(1)]);
      const safe = total * (1 + floorSafety / 100);
      rows.push(['TOTAL', '', '', '', total.toFixed(1)], ['MARGEM DE SEGURANÇA', `${floorSafety}%`, '', '', (safe - total).toFixed(1)], ['TOTAL COM MARGEM', '', '', '', safe.toFixed(1)], []);
    }

    const unassigned = data.items.filter((i) => !i.group_id && i.area !== 'video');
    if (unassigned.length) {
      rows.push(['ÁREA', 'Itens de solo sem estrutura'], ['Equipamento', 'Área', 'Qtd.', 'Peso unit. kg', 'Peso total kg']);
      for (const i of unassigned) {
        const eq = equipmentForItem(i, data.catalog);
        rows.push([eq?.name ?? 'Item', areaName[i.area], i.quantity, (i.override_weight_kg ?? eq?.weight_kg ?? 0).toFixed(2), itemWeightKg(i, eq).toFixed(1)]);
      }
    }
    return rows;
  }

  return <ProjectRequired><div className="stack-lg dossier-page">
    <section className="hero-panel compact no-print">
      <div><span className="eyebrow">Dossiê + memoriais</span><h2>Saídas automáticas do projeto</h2><p>O mesmo cadastro alimenta o descritivo, o memorial aéreo e o memorial de solo.</p></div>
      <div className="hero-actions">
        <button className="button primary" type="button" onClick={() => window.print()}><Printer size={17}/> PDF / imprimir</button>
        <button className="button primary" type="button" onClick={() => downloadCsv(`memorial-aereo-${project.name}.csv`, aerialRows())}><Download size={17}/> Memorial aéreo</button>
        <button className="button primary" type="button" onClick={() => downloadCsv(`memorial-solo-${project.name}.csv`, floorRows())}><Download size={17}/> Memorial solo</button>
      </div>
    </section>

    <article className="dossier-sheet">
      <div className="dossier-cover-band"><span>PRÉ-PRODUÇÃO TÉCNICA</span><h1>{project.name}</h1><p>{project.client || 'Cliente não informado'}</p></div>
      <section className="dossier-grid">
        <div><span>Local</span><strong>{project.venue || '—'}</strong><small>{project.address || ''}</small></div>
        <div><span>Salas / espaços</span><strong>{project.spaces || '—'}</strong></div>
        <div><span>Montagem</span><strong>{formatDateTime(project.assembly_start)}</strong><small>até {formatDateTime(project.assembly_end)}</small></div>
        <div><span>Evento</span><strong>{formatDateTime(project.event_start)}</strong><small>até {formatDateTime(project.event_end)}</small></div>
        <div><span>Desmontagem / liberação</span><strong>{formatDateTime(project.release_end)}</strong></div>
        <div><span>Coordenação / produção</span><strong>{project.coordinator || '—'}</strong></div>
      </section>

      <section className="dossier-section"><h2>Resumo técnico</h2><div className="dossier-metrics">
        <div><span>Peso cadastrado</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
        <div><span>Carga aérea</span><strong>{totals.aerialWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
        <div><span>Potência</span><strong>{(totals.totalPowerW / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div>
      </div></section>

      {(['audio', 'lighting', 'video'] as const).map((area) => {
        const items = data.items.filter((i) => i.area === area);
        if (!items.length) return null;
        return <section className="dossier-section" key={area}><h2>{areaName[area]}</h2><table className="dossier-table">
          <thead><tr><th>Equipamento</th><th>Local / estrutura</th><th>Qtd.</th><th>Peso</th><th>Consumo</th></tr></thead>
          <tbody>{items.map((item) => { const eq = equipmentForItem(item, data.catalog); const g = item.group_id ? data.groups.find((x) => x.id === item.group_id) : null; return <tr key={item.id}><td>{eq?.name ?? 'Item removido'}</td><td>{g?.name || item.position_name || 'Solo'}</td><td>{item.quantity}</td><td>{itemWeightKg(item, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td><td>{(itemPowerW(item, eq) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</td></tr>; })}</tbody>
        </table></section>;
      })}

      {videoSystems.length > 0 && <section className="dossier-section"><h2>Dimensionamento dos painéis de LED</h2><table className="dossier-table"><thead><tr><th>Sistema</th><th>Medida desejada</th><th>Medida efetiva</th><th>Placas</th><th>Rede</th><th>Energia</th><th>Apoio</th></tr></thead><tbody>{videoSystems.map((g) => <tr key={g.id}><td>{g.name}</td><td>{metadataNumber(g, 'width_m')} × {metadataNumber(g, 'height_m')} m</td><td>{metadataNumber(g, 'effective_width_m').toFixed(2)} × {metadataNumber(g, 'effective_height_m').toFixed(2)} m</td><td>{metadataNumber(g, 'module_count')}</td><td>{metadataNumber(g, 'network_ports')} portas · {metadataNumber(g, 'signal_jumps')} jumps</td><td>{metadataNumber(g, 'power_feeds')} alimentações · {metadataNumber(g, 'power_jumps')} jumps</td><td>{g.mount_type === 'aerial' ? `${metadataNumber(g, 'bumpers')} bumpers` : `${metadataNumber(g, 'french_hands')} mãos francesas`}</td></tr>)}</tbody></table></section>}

      <section className="dossier-section"><h2>Memorial aéreo — prévia</h2>{aerial.length === 0 ? <p>Sem estruturas aéreas cadastradas.</p> : aerial.map((g) => <MemorialStructure key={g.id} group={g} safety={aerialSafety}/>)}</section>
      <section className="dossier-section"><h2>Memorial de solo — prévia</h2>{floorStructures.length === 0 && groundVideo.length === 0 ? <p>Sem estruturas de solo cadastradas.</p> : <>{floorStructures.map((g) => <MemorialStructure key={g.id} group={g} safety={floorSafety}/>)}{groundVideo.map((g) => <MemorialVideoFloor key={g.id} group={g} safety={floorSafety}/>)}</>}</section>
      <section className="dossier-section disclaimer"><h2>Premissas</h2><p>As tabelas desta Alpha são memoriais de pré-produção. Cargas, pontos, capacidades, fatores de segurança e critérios estruturais devem ser revisados e aprovados pelo profissional habilitado antes da emissão de documentação legal.</p></section>
    </article>
  </div></ProjectRequired>;
}

function MemorialStructure({ group, safety }: { group: ProjectGroup; safety: number }) {
  const data = useData();
  const items = data.items.filter((i) => i.group_id === group.id);
  const own = groupOwnWeightKg(group);
  const videoSupport = videoSupportWeightForStructure(group.id, data.groups);
  const total = structureLoadKg(group, data.items, data.catalog, data.groups);
  const withSafety = total * (1 + safety / 100);
  return <div className="dossier-group">
    <div className="dossier-group-title"><strong>{group.name}</strong><span>{group.structure_type} · {group.length_m}m · {group.points_count || 0} pontos</span></div>
    <table><thead><tr><th>Item</th><th>Área</th><th>Qtd.</th><th>Peso total</th></tr></thead><tbody>
      {own > 0 && <tr><td>Estrutura / talhas / corrente</td><td>Estrutura</td><td>1</td><td>{own.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>}
      {items.map((i) => { const eq = equipmentForItem(i, data.catalog); return <tr key={i.id}><td>{eq?.name ?? 'Item'}</td><td>{areaName[i.area]}</td><td>{i.quantity}</td><td>{itemWeightKg(i, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>; })}
      {videoSupport > 0 && <tr><td>Bumpers / apoio derivado de vídeo</td><td>Vídeo</td><td>1</td><td>{videoSupport.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>}
      <tr className="total-row"><td>Total</td><td></td><td></td><td>{total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
      <tr><td>Margem de segurança ({safety}%)</td><td></td><td></td><td>{(withSafety - total).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
      <tr className="total-row"><td>Total com margem</td><td></td><td></td><td>{withSafety.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
    </tbody></table>
  </div>;
}

function MemorialVideoFloor({ group, safety }: { group: ProjectGroup; safety: number }) {
  const data = useData();
  const panels = data.items.filter((i) => i.area === 'video' && i.position_name === `video:${group.id}` && data.catalog.find((e) => e.id === i.equipment_id)?.category === 'video_panel');
  const support = videoDerivedSupportWeightKg(group);
  const panelWeight = panels.reduce((sum, i) => sum + itemWeightKg(i, equipmentForItem(i, data.catalog)), 0);
  const total = panelWeight + support;
  const withSafety = total * (1 + safety / 100);
  if (!total) return null;
  return <div className="dossier-group">
    <div className="dossier-group-title"><strong>{group.name}</strong><span>Painel de LED no solo · {metadataString(group, 'install_mode')}</span></div>
    <table><thead><tr><th>Item</th><th>Área</th><th>Qtd.</th><th>Peso total</th></tr></thead><tbody>
      {panels.map((i) => { const eq = equipmentForItem(i, data.catalog); return <tr key={i.id}><td>{eq?.name ?? 'Painel'}</td><td>Vídeo</td><td>{i.quantity}</td><td>{itemWeightKg(i, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>; })}
      {support > 0 && <tr><td>Mãos francesas / barras / contrapesos</td><td>Estrutura LED</td><td>1</td><td>{support.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>}
      <tr className="total-row"><td>Total</td><td></td><td></td><td>{total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
      <tr><td>Margem de segurança ({safety}%)</td><td></td><td></td><td>{(withSafety - total).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
      <tr className="total-row"><td>Total com margem</td><td></td><td></td><td>{withSafety.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td></tr>
    </tbody></table>
  </div>;
}
