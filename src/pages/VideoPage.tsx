import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { canEditProjects } from '../utils/permissions';
import type { ProjectGroup } from '../types/domain';
import { calculateLedSystem, metadataNumber, metadataString } from '../utils/calculations';

const modes = [
  ['ground_simple', 'Solo · mão francesa simples'],
  ['ground_double', 'Solo · mão francesa dupla'],
  ['elevation_bar', 'Barra de elevação'],
  ['suspended', 'Suspenso / talha'],
] as const;

export function VideoPage() {
  const data = useData();
  const auth = useAuth();
  const editable = canEditProjects(auth.profile);
  const systems = data.groups.filter((g) => g.area === 'video');

  async function add() {
    await data.createGroup('video', {
      name: `LED ${systems.length + 1}`,
      mount_type: 'floor',
      metadata: {
        install_mode: 'ground_simple', panel_id: '', processor_id: '', structure_id: '',
        width_m: 0, height_m: 0, front_hand_m: 4, rear_hand_m: 4, counterweight_kg: 60,
      },
    });
  }

  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact">
      <div>
        <span className="eyebrow">Vídeo</span>
        <h2>Painéis de LED</h2>
        <p>Informe o tamanho final em metros e selecione o modelo físico. O sistema deriva placas, resolução, portas, energia, cabeamento e estrutura de apoio.</p>
      </div>
      {editable && <button className="button primary" type="button" onClick={() => void add()}><Plus size={17}/> Novo painel</button>}
    </section>
    {systems.length === 0
      ? <div className="panel empty-state"><h3>Nenhum painel cadastrado</h3><p>Crie um painel principal, lateral, foyer ou outra tela.</p></div>
      : systems.map((g) => <VideoCard key={g.id} group={g} editable={editable}/>) }
  </div></ProjectRequired>;
}

function VideoCard({ group, editable }: { group: ProjectGroup; editable: boolean }) {
  const data = useData();
  const panels = useMemo(() => data.catalog.filter((e) => e.category === 'video_panel'), [data.catalog]);
  const processors = useMemo(() => data.catalog.filter((e) => e.category === 'video_processor'), [data.catalog]);
  const structures = data.groups.filter((g) => g.area === 'structure' && (g.mount_type === 'aerial' || g.mount_type === 'mixed'));

  const [name, setName] = useState(group.name);
  const [panelId, setPanelId] = useState(metadataString(group, 'panel_id'));
  const [processorId, setProcessorId] = useState(metadataString(group, 'processor_id'));
  const [structureId, setStructureId] = useState(metadataString(group, 'structure_id'));
  const [mode, setMode] = useState(metadataString(group, 'install_mode', 'ground_simple'));
  const [width, setWidth] = useState(metadataNumber(group, 'width_m') ? String(metadataNumber(group, 'width_m')) : '');
  const [height, setHeight] = useState(metadataNumber(group, 'height_m') ? String(metadataNumber(group, 'height_m')) : '');
  const [frontM, setFrontM] = useState(String(metadataNumber(group, 'front_hand_m', 4)));
  const [rearM, setRearM] = useState(String(metadataNumber(group, 'rear_hand_m', 4)));
  const [counterKg, setCounterKg] = useState(String(metadataNumber(group, 'counterweight_kg', 60)));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const panel = panels.find((p) => p.id === panelId);
  const processor = processors.find((p) => p.id === processorId);
  const calc = calculateLedSystem(panel, Number(width || 0), Number(height || 0), mode);
  const processorOk = !processor || ((processor.output_ports ?? Infinity) >= calc.networkPorts && (processor.max_pixels ?? Infinity) >= calc.totalPixels);
  const cases = panel?.case_capacity ? Math.ceil(calc.moduleCount / panel.case_capacity) : 0;

  // Referências estruturais do protótipo legado, mantidas apenas como prévia.
  const bars2 = mode === 'elevation_bar' ? Math.floor(Number(width || 0) / 2) : 0;
  const bars1 = mode === 'elevation_bar' && Number(width || 0) - bars2 * 2 > 0 ? 1 : 0;
  const counterweights = (mode === 'ground_simple' ? calc.frontFrenchHands : mode === 'ground_double' || mode === 'elevation_bar' ? calc.rearFrenchHands : 0) * 2;
  const frenchWeight = (calc.frontFrenchHands + calc.lateralFrenchHands) * Number(frontM || 0) + (calc.rearFrenchHands * Number(rearM || 0));
  const counterWeightTotal = counterweights * Number(counterKg || 0);
  const groundSupportWeight = frenchWeight + counterWeightTotal + bars2 * 7 + bars1 * 5;
  // Em painel suspenso, a talha real é cadastrada na trave compartilhada. Aqui entra apenas o bumper para não contar talha duas vezes.
  const suspendedSupportWeight = calc.bumpers * 3;
  const derivedStructureWeight = mode === 'suspended' ? suspendedSupportWeight : groundSupportWeight;

  async function save() {
    if (!editable) return;
    setError('');
    if (!panelId) { setError('Selecione o modelo físico do painel.'); return; }
    if (!(Number(width) > 0) || !(Number(height) > 0)) { setError('Informe largura e altura maiores que zero.'); return; }
    if (mode === 'suspended' && !structureId) { setError('Painel suspenso precisa estar associado a uma estrutura aérea compartilhada.'); return; }

    try {
      await data.updateGroup(group.id, {
        name,
        mount_type: mode === 'suspended' ? 'aerial' : 'floor',
        metadata: {
          ...group.metadata,
          install_mode: mode,
          panel_id: panelId,
          processor_id: processorId,
          structure_id: mode === 'suspended' ? structureId : '',
          width_m: Number(width),
          height_m: Number(height),
          front_hand_m: Number(frontM || 0),
          rear_hand_m: Number(rearM || 0),
          counterweight_kg: Number(counterKg || 0),
          derived_structure_weight_kg: derivedStructureWeight,
          network_ports: calc.networkPorts,
          power_feeds: calc.powerFeeds,
          signal_jumps: calc.signalJumps,
          power_jumps: calc.powerJumps,
          french_hands: calc.totalFrenchHands,
          bumpers: calc.bumpers,
          suggested_hoists: calc.suggestedHoists,
          cases,
          module_count: calc.moduleCount,
          effective_width_m: calc.effectiveWidthM,
          effective_height_m: calc.effectiveHeightM,
          resolution_w: calc.resolutionW,
          resolution_h: calc.resolutionH,
        },
      });

      const old = data.items.filter((i) => i.area === 'video' && i.position_name === `video:${group.id}`);
      for (const item of old) await data.deleteItem(item.id);
      if (panelId && calc.moduleCount > 0) {
        await data.createItem({
          area: 'video', group_id: mode === 'suspended' ? structureId : null,
          equipment_id: panelId, quantity: calc.moduleCount, position_name: `video:${group.id}`,
        });
      }
      if (processorId) {
        await data.createItem({ area: 'video', group_id: null, equipment_id: processorId, quantity: 1, position_name: `video:${group.id}` });
      }
      setSaved(true); setTimeout(() => setSaved(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar painel.');
    }
  }

  return <section className="panel video-card">
    <div className="group-header">
      <div><span className={`mount-badge ${mode === 'suspended' ? 'aerial' : 'floor'}`}>{mode === 'suspended' ? 'SUSPENSO' : 'SOLO'}</span><h3>{name}</h3></div>
      {editable && <button className="icon-button danger" type="button" title="Excluir" onClick={() => void data.deleteGroup(group.id)}><Trash2 size={16}/></button>}
    </div>

    <div className="form-grid four">
      <label>Nome<input disabled={!editable} value={name} onChange={(e) => setName(e.target.value)}/></label>
      <label className="span-2">Modelo do painel
        <select disabled={!editable} value={panelId} onChange={(e) => setPanelId(e.target.value)}>
          <option value="">Selecionar modelo…</option>
          {panels.map((p) => <option key={p.id} value={p.id}>{p.name}{p.pitch_mm ? ` · P${p.pitch_mm}` : ''}{p.panel_type ? ` · ${p.panel_type}` : ''}{p.module_width_m && p.module_height_m ? ` · ${p.module_width_m * 100}×${p.module_height_m * 100}cm` : ''}</option>)}
        </select>
      </label>
      <label>Processadora
        <select disabled={!editable} value={processorId} onChange={(e) => setProcessorId(e.target.value)}>
          <option value="">Definir depois</option>{processors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label>Largura desejada (m)<input disabled={!editable} type="number" min="0" step="0.1" value={width} placeholder="Ex.: 6" onFocus={(e) => e.currentTarget.select()} onChange={(e) => setWidth(e.target.value)}/></label>
      <label>Altura desejada (m)<input disabled={!editable} type="number" min="0" step="0.1" value={height} placeholder="Ex.: 3" onFocus={(e) => e.currentTarget.select()} onChange={(e) => setHeight(e.target.value)}/></label>
      <label className="span-2">Tipo de montagem<select disabled={!editable} value={mode} onChange={(e) => setMode(e.target.value)}>{modes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {mode === 'suspended' && <label className="span-2">Estrutura aérea compartilhada
        <select disabled={!editable} value={structureId} onChange={(e) => setStructureId(e.target.value)}>
          <option value="">Selecionar trave…</option>{structures.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.structure_type} · {s.length_m}m</option>)}
        </select>
      </label>}
      {mode !== 'suspended' && <>
        <label>Comprimento MF frente (m)<input disabled={!editable} type="number" min="0" step="0.1" value={frontM} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setFrontM(e.target.value)}/></label>
        {(mode === 'ground_double' || mode === 'elevation_bar') && <label>Comprimento MF trás (m)<input disabled={!editable} type="number" min="0" step="0.1" value={rearM} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setRearM(e.target.value)}/></label>}
        <label>Peso contrapeso (kg)<input disabled={!editable} type="number" min="0" value={counterKg} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setCounterKg(e.target.value)}/></label>
      </>}
    </div>

    <div className="mini-grid four">
      <div><span>Placas</span><strong>{calc.moduleCount || '—'}</strong><small>{calc.columns && calc.rows ? `${calc.columns} × ${calc.rows}` : ''}</small></div>
      <div><span>Dimensão efetiva</span><strong>{calc.moduleCount ? `${calc.effectiveWidthM.toFixed(2)} × ${calc.effectiveHeightM.toFixed(2)} m` : '—'}</strong></div>
      <div><span>Portas de rede</span><strong>{calc.networkPorts || '—'}</strong><small>{calc.totalPixels ? `${calc.totalPixels.toLocaleString('pt-BR')} px` : ''}</small></div>
      <div><span>Alimentações</span><strong>{calc.powerFeeds || '—'}</strong></div>
      <div><span>Jump sinal</span><strong>{calc.signalJumps || '—'}</strong></div>
      <div><span>Jump energia</span><strong>{calc.powerJumps || '—'}</strong></div>
      <div><span>Cases estimados</span><strong>{cases || '—'}</strong></div>
      <div><span>Peso placas</span><strong>{calc.panelWeightKg ? `${calc.panelWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'}</strong></div>
    </div>

    <div className="video-derived">
      <strong>Estrutura e acessórios calculados</strong>
      {mode !== 'suspended' && <span>Mãos francesas: {calc.totalFrenchHands} ({calc.frontFrenchHands} frente · {calc.rearFrenchHands} trás · {calc.lateralFrenchHands} laterais)</span>}
      {mode === 'elevation_bar' && <span>Barras de elevação: {bars2}×2m + {bars1}×1m</span>}
      {mode === 'suspended' && <span>Bumpers: {calc.bumpers} · Talhas sugeridas: {calc.suggestedHoists} (cadastre as talhas reais na trave)</span>}
      {mode !== 'suspended' && <span>Contrapesos: {counterweights} × {Number(counterKg || 0)} kg</span>}
      <span>Peso derivado de apoio (prévia): {derivedStructureWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
    </div>

    {panel?.verification_status === 'pending' && <div className="issue warning">Modelo importado como referência e ainda não homologado. Confira peso, consumo, dimensões e resolução antes do uso técnico.</div>}
    {processor && !processorOk && <div className="issue error">A processadora selecionada não atende, pelos dados cadastrados, à quantidade de portas/pixels necessária.</div>}
    {error && <div className="form-error">{error}</div>}
    {editable && <div className="form-actions end"><button className="button primary" type="button" onClick={() => void save()}><Save size={16}/>{saved ? 'Salvo' : 'Salvar painel'}</button></div>}
  </section>;
}
