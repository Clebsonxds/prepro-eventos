import { Printer } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { calculateTotals, equipmentForItem, itemPowerW, itemWeightKg } from '../utils/calculations';
import { formatDateTime } from '../utils/dates';

export function DossierPage() {
  const data = useData();
  const project = data.currentProject;
  if (!project) return <ProjectRequired><></></ProjectRequired>;
  const totals = calculateTotals(data.groups, data.items, data.catalog);

  return <ProjectRequired><div className="stack-lg dossier-page">
    <section className="hero-panel compact no-print"><div><span className="eyebrow">Dossiê do evento</span><h2>Prévia documental</h2><p>O documento é consequência do preenchimento técnico. A meta é eliminar redigitação e divergência entre planilha, memorial e briefing.</p></div><button className="button primary" type="button" onClick={() => window.print()}><Printer size={17} /> Imprimir / PDF</button></section>

    <article className="dossier-sheet">
      <div className="dossier-cover-band"><span>PROJETO TÉCNICO</span><h1>{project.name}</h1><p>{project.client || 'Cliente não informado'}</p></div>
      <section className="dossier-grid">
        <div><span>Local</span><strong>{project.venue || '—'}</strong><small>{project.address || ''}</small></div>
        <div><span>Salas / espaços</span><strong>{project.spaces || '—'}</strong></div>
        <div><span>Montagem</span><strong>{formatDateTime(project.assembly_start)}</strong><small>até {formatDateTime(project.assembly_end)}</small></div>
        <div><span>Evento</span><strong>{formatDateTime(project.event_start)}</strong><small>até {formatDateTime(project.event_end)}</small></div>
        <div><span>Comercial responsável</span><strong>{project.commercial_responsible || '—'}</strong></div>
        <div><span>Coordenação / produção</span><strong>{project.coordinator || '—'}</strong></div>
      </section>

      <section className="dossier-section"><h2>Resumo técnico</h2><div className="dossier-metrics"><div><span>Peso total cadastrado</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Carga aérea cadastrada</span><strong>{totals.aerialWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Potência cadastrada</span><strong>{(totals.totalPowerW/1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div></div></section>

      {(['audio','lighting','video'] as const).map((area) => {
        const groups = data.groups.filter((g) => g.area === area);
        if (!groups.length) return null;
        const title = area === 'audio' ? 'Áudio' : area === 'lighting' ? 'Iluminação' : 'Vídeo';
        return <section className="dossier-section" key={area}><h2>{title}</h2>{groups.map((group) => {
          const items = data.items.filter((i) => i.group_id === group.id);
          return <div className="dossier-group" key={group.id}><div className="dossier-group-title"><strong>{group.name}</strong><span>{group.mount_type}</span></div>{items.length === 0 ? <p>Sem equipamentos cadastrados.</p> : <table><thead><tr><th>Equipamento</th><th>Qtd.</th><th>Peso</th><th>Potência</th></tr></thead><tbody>{items.map((item) => { const eq = equipmentForItem(item, data.catalog); return <tr key={item.id}><td>{eq?.name ?? 'Item removido'}</td><td>{item.quantity}</td><td>{itemWeightKg(item, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</td><td>{(itemPowerW(item, eq)/1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</td></tr>; })}</tbody></table>}</div>;
        })}</section>;
      })}

      <section className="dossier-section disclaimer"><h2>Premissas</h2><p>Os valores consolidados são destinados à pré-produção e à organização técnica do evento. Cálculos estruturais, elétricos e demais responsabilidades legais devem ser revisados e validados pelo profissional habilitado conforme o escopo aplicável.</p></section>
    </article>
  </div></ProjectRequired>;
}
