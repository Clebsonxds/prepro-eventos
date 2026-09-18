import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import type { Equipment, MountType, ProjectGroup } from '../types/domain';

function numberMeta(group: ProjectGroup, key: string, fallback = 0) {
  const value = group.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function stringMeta(group: ProjectGroup, key: string, fallback = '') {
  const value = group.metadata?.[key];
  return typeof value === 'string' ? value : fallback;
}

export function VideoPage() {
  const data = useData();
  const videoGroups = data.groups.filter((g) => g.area === 'video');
  async function addSystem() {
    await data.createGroup('video', { name: `LED ${videoGroups.length + 1}`, mount_type: 'floor', metadata: { width_m: 0, height_m: 0, panel_id: '', processor_id: '' } });
  }
  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Vídeo</span><h2>Sistemas de LED e processamento</h2><p>Cada tela é independente. Dimensão, montagem, módulos, peso e consumo são calculados a partir do catálogo homologado.</p></div><button className="button primary" type="button" onClick={() => void addSystem()}><Plus size={17} /> Novo sistema</button></section>
    {videoGroups.length === 0 ? <div className="panel empty-state"><h3>Nenhum sistema de vídeo</h3><p>Crie um painel principal, lateral, foyer ou qualquer outra tela do projeto.</p></div> : videoGroups.map((group) => <VideoSystemCard key={group.id} group={group} />)}
  </div></ProjectRequired>;
}

function VideoSystemCard({ group }: { group: ProjectGroup }) {
  const data = useData();
  const panels = useMemo(() => data.catalog.filter((eq) => eq.category === 'video_panel'), [data.catalog]);
  const processors = useMemo(() => data.catalog.filter((eq) => eq.category === 'video_processor'), [data.catalog]);
  const [name, setName] = useState(group.name);
  const [mount, setMount] = useState<MountType>(group.mount_type);
  const [panelId, setPanelId] = useState(stringMeta(group, 'panel_id'));
  const [processorId, setProcessorId] = useState(stringMeta(group, 'processor_id'));
  const [width, setWidth] = useState(numberMeta(group, 'width_m'));
  const [height, setHeight] = useState(numberMeta(group, 'height_m'));
  const [points, setPoints] = useState(group.points_count);
  const [saved, setSaved] = useState(false);
  const panel = panels.find((p) => p.id === panelId);

  const moduleCount = useMemo(() => {
    if (!panel?.module_width_m || !panel?.module_height_m || width <= 0 || height <= 0) return 0;
    return Math.ceil(width / panel.module_width_m) * Math.ceil(height / panel.module_height_m);
  }, [panel, width, height]);
  const effectiveWidth = panel?.module_width_m ? Math.ceil(width / panel.module_width_m) * panel.module_width_m : 0;
  const effectiveHeight = panel?.module_height_m ? Math.ceil(height / panel.module_height_m) * panel.module_height_m : 0;
  const panelWeight = (panel?.weight_kg ?? 0) * moduleCount;
  const panelPower = (panel?.power_w ?? 0) * moduleCount;

  async function save() {
    await data.updateGroup(group.id, {
      name,
      mount_type: mount,
      points_count: points,
      metadata: { ...group.metadata, panel_id: panelId, processor_id: processorId, width_m: width, height_m: height },
    });
    const groupItems = data.items.filter((i) => i.group_id === group.id);
    for (const item of groupItems) await data.deleteItem(item.id);
    if (panelId && moduleCount > 0) await data.createItem(group.id, panelId, moduleCount);
    if (processorId) await data.createItem(group.id, processorId, 1);
    setSaved(true); setTimeout(() => setSaved(false), 1400);
  }

  return <section className="panel video-card">
    <div className="group-header"><div><span className={`mount-badge ${mount}`}>{mount === 'aerial' ? 'SUSPENSO' : mount === 'floor' ? 'SOLO' : 'MISTO'}</span><h3>{name}</h3></div><button className="icon-button danger" type="button" title="Excluir sistema" onClick={() => void data.deleteGroup(group.id)}><Trash2 size={17} /></button></div>
    <div className="form-grid three">
      <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Painel<select value={panelId} onChange={(e) => setPanelId(e.target.value)}><option value="">Selecionar…</option>{panels.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Processadora<select value={processorId} onChange={(e) => setProcessorId(e.target.value)}><option value="">Nenhuma / definir depois</option>{processors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Largura desejada (m)<input type="number" min="0" step="0.1" value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
      <label>Altura desejada (m)<input type="number" min="0" step="0.1" value={height} onChange={(e) => setHeight(Number(e.target.value))} /></label>
      <label>Montagem<select value={mount} onChange={(e) => setMount(e.target.value as MountType)}><option value="floor">Solo / estacado</option><option value="aerial">Suspenso</option><option value="mixed">Misto / especial</option></select></label>
      {mount === 'aerial' && <label>Pontos de suspensão<input type="number" min="1" value={points} onChange={(e) => setPoints(Number(e.target.value))} /></label>}
    </div>
    <div className="mini-grid four">
      <div><span>Módulos</span><strong>{moduleCount || '—'}</strong></div>
      <div><span>Dimensão efetiva</span><strong>{effectiveWidth && effectiveHeight ? `${effectiveWidth.toFixed(2)} × ${effectiveHeight.toFixed(2)} m` : '—'}</strong></div>
      <div><span>Peso do painel</span><strong>{panelWeight ? `${panelWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'}</strong></div>
      <div><span>Potência</span><strong>{panelPower ? `${(panelPower/1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW` : '—'}</strong></div>
    </div>
    {mount === 'aerial' && points > 0 && panelWeight > 0 && <div className="technical-note">Divisão aritmética inicial: {(panelWeight / points).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg/ponto. Isto não substitui cálculo estrutural nem validação do responsável técnico.</div>}
    <div className="form-actions end"><button className="button primary" type="button" onClick={() => void save()}><Save size={17} /> {saved ? 'Salvo' : 'Salvar sistema'}</button></div>
  </section>;
}
