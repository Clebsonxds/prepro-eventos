import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { canEditProjects } from '../utils/permissions';
import { equipmentForItem, groupOwnWeightKg, metadataBoolean, metadataNumber, metadataString, videoSupportWeightForStructure } from '../utils/calculations';
import type { MountType, ProjectGroup, StructureSource } from '../types/domain';

const trussTypes = ['Q15', 'Q20', 'Q25', 'Q30', 'Q50', 'OUTRA'];
const legacyKgM: Record<string, number> = { Q15: 2.5, Q20: 4, Q25: 6, Q30: 8 };

export function StructurePage() {
  const data = useData();
  const auth = useAuth();
  const editable = canEditProjects(auth.profile);
  const structures = data.groups.filter((g) => g.area === 'structure');
  const [name, setName] = useState('');
  const [mount, setMount] = useState<MountType>('aerial');
  const [type, setType] = useState('Q30');
  const [length, setLength] = useState('');
  const [source, setSource] = useState<StructureSource>('company');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!editable || !name.trim()) return;
    const kg = legacyKgM[type] ?? 0;
    await data.createGroup('structure', {
      name: name.trim(), mount_type: mount, structure_type: type, length_m: Number(length || 0),
      points_count: mount === 'aerial' ? 2 : 0,
      metadata: { source, kg_per_m: kg, uses_hoist: false, hoist_qty: 0, hoist_length_m: 0, point_capacity_kg: 500, contact_area_m2: 0 },
    });
    setName(''); setLength('');
  }

  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Estruturas compartilhadas</span><h2>Uma estrutura física, várias áreas</h2><p>Crie a trave, boxtruss ou apoio uma única vez. Som, Luz e Vídeo associam seus equipamentos à mesma estrutura e a carga é somada em conjunto.</p></div></section>
    {editable && <form className="panel structure-create" onSubmit={create}>
      <label>Nome da estrutura<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Trave principal"/></label>
      <label>Instalação<select value={mount} onChange={(e) => setMount(e.target.value as MountType)}><option value="aerial">Aérea</option><option value="floor">Solo</option><option value="mixed">Mista</option></select></label>
      <label>Treliça<select value={type} onChange={(e) => setType(e.target.value)}>{trussTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Comprimento (m)<input type="number" min="0" step="0.1" value={length} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setLength(e.target.value)} placeholder="Ex.: 12"/></label>
      <label>Origem<select value={source} onChange={(e) => setSource(e.target.value as StructureSource)}><option value="company">Estrutura da empresa</option><option value="venue">Estrutura já existente no local</option><option value="third_party">Terceiro / locada</option></select></label>
      <button className="button primary" type="submit"><Plus size={16}/> Criar estrutura</button>
    </form>}
    {structures.length === 0
      ? <div className="panel empty-state"><h3>Nenhuma estrutura cadastrada</h3><p>Crie primeiro as traves, boxtruss ou posições de solo. Depois associe equipamentos nas páginas de Som, Luz e Vídeo.</p></div>
      : <div className="stack-md">{structures.map((g) => <StructureCard key={g.id} group={g} editable={editable}/>)}</div>}
  </div></ProjectRequired>;
}

function StructureCard({ group, editable }: { group: ProjectGroup; editable: boolean }) {
  const data = useData();
  const [name, setName] = useState(group.name);
  const [mount, setMount] = useState<MountType>(group.mount_type);
  const [type, setType] = useState(group.structure_type || 'Q30');
  const [length, setLength] = useState(String(group.length_m || ''));
  const [points, setPoints] = useState(String(group.points_count || ''));
  const [source, setSource] = useState<StructureSource>(metadataString(group, 'source', 'company') as StructureSource);
  const [kgPerM, setKgPerM] = useState(String(metadataNumber(group, 'kg_per_m', legacyKgM[group.structure_type] ?? 0) || ''));
  const [usesHoist, setUsesHoist] = useState(metadataBoolean(group, 'uses_hoist'));
  const [hoistQty, setHoistQty] = useState(String(metadataNumber(group, 'hoist_qty') || ''));
  const [hoistLength, setHoistLength] = useState(String(metadataNumber(group, 'hoist_length_m') || ''));
  const [capacity, setCapacity] = useState(String(metadataNumber(group, 'point_capacity_kg', 500)));
  const [contactArea, setContactArea] = useState(String(metadataNumber(group, 'contact_area_m2') || ''));
  const [saved, setSaved] = useState(false);

  const assigned = data.items.filter((i) => i.group_id === group.id);
  const draft: ProjectGroup = {
    ...group, mount_type: mount, structure_type: type, length_m: Number(length || 0), points_count: Number(points || 0),
    metadata: { ...group.metadata, source, kg_per_m: Number(kgPerM || 0), uses_hoist: usesHoist, hoist_qty: Number(hoistQty || 0), hoist_length_m: Number(hoistLength || 0), point_capacity_kg: Number(capacity || 0), contact_area_m2: Number(contactArea || 0) },
  };
  const ownWeight = groupOwnWeightKg(draft);
  const equipmentWeight = assigned.reduce((s, i) => s + (equipmentForItem(i, data.catalog)?.weight_kg ?? 0) * i.quantity, 0);
  const linkedVideoSupport = videoSupportWeightForStructure(group.id, data.groups);
  const total = ownWeight + equipmentWeight + linkedVideoSupport;
  const perPoint = Number(points) > 0 ? total / Number(points) : 0;

  async function save() {
    await data.updateGroup(group.id, {
      name, mount_type: mount, structure_type: type, length_m: Number(length || 0), points_count: Number(points || 0),
      metadata: { ...group.metadata, source, kg_per_m: Number(kgPerM || 0), uses_hoist: usesHoist, hoist_qty: Number(hoistQty || 0), hoist_length_m: Number(hoistLength || 0), point_capacity_kg: Number(capacity || 0), contact_area_m2: Number(contactArea || 0) },
    });
    setSaved(true); setTimeout(() => setSaved(false), 1200);
  }

  return <section className="panel structure-card">
    <div className="group-header">
      <div><span className={`mount-badge ${mount}`}>{mount === 'aerial' ? 'AÉREA' : mount === 'floor' ? 'SOLO' : 'MISTA'}</span><h3>{name}</h3><p className="muted-text">{source === 'venue' ? 'Estrutura do local' : source === 'third_party' ? 'Estrutura de terceiro' : 'Estrutura da empresa'}</p></div>
      <div className="group-metrics"><span>{total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg total</span>{mount === 'aerial' && Number(points) > 0 && <span>{perPoint.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg/ponto</span>}{editable && <button className="icon-button danger" type="button" title="Excluir" onClick={() => void data.deleteGroup(group.id)}><Trash2 size={16}/></button>}</div>
    </div>

    <div className="form-grid four">
      <label>Nome<input disabled={!editable} value={name} onChange={(e) => setName(e.target.value)}/></label>
      <label>Instalação<select disabled={!editable} value={mount} onChange={(e) => setMount(e.target.value as MountType)}><option value="aerial">Aérea</option><option value="floor">Solo</option><option value="mixed">Mista</option></select></label>
      <label>Treliça<select disabled={!editable} value={type} onChange={(e) => { const v = e.target.value; setType(v); if (legacyKgM[v]) setKgPerM(String(legacyKgM[v])); }}>{trussTypes.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>Comprimento (m)<input disabled={!editable} type="number" min="0" step="0.1" value={length} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setLength(e.target.value)}/></label>
      <label>Peso linear (kg/m)<input disabled={!editable} type="number" min="0" step="0.1" value={kgPerM} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setKgPerM(e.target.value)}/></label>
      <label>Origem<select disabled={!editable} value={source} onChange={(e) => setSource(e.target.value as StructureSource)}><option value="company">Empresa</option><option value="venue">Já é do local</option><option value="third_party">Terceiro</option></select></label>
      <label>Pontos de fixação<input disabled={!editable || mount === 'floor'} type="number" min="0" value={points} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPoints(e.target.value)}/></label>
      <label>Capacidade informada/ponto (kg)<input disabled={!editable || mount === 'floor'} type="number" min="0" value={capacity} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setCapacity(e.target.value)}/></label>
      {mount !== 'aerial' && <label>Área de contato (m²)<input disabled={!editable} type="number" min="0" step="0.1" value={contactArea} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setContactArea(e.target.value)}/></label>}
      <label className="check-field"><input disabled={!editable} type="checkbox" checked={usesHoist} onChange={(e) => setUsesHoist(e.target.checked)}/>Usará talha</label>
      {usesHoist && <><label>Quantidade de talhas<input disabled={!editable} type="number" min="0" value={hoistQty} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setHoistQty(e.target.value)}/></label><label>Comprimento da corrente (m)<input disabled={!editable} type="number" min="0" step="0.5" value={hoistLength} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setHoistLength(e.target.value)}/></label></>}
    </div>

    <div className="mini-grid four">
      <div><span>Peso da estrutura</span><strong>{ownWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
      <div><span>Som + Luz + Vídeo</span><strong>{equipmentWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
      <div><span>Apoio derivado vídeo</span><strong>{linkedVideoSupport.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
      <div><span>Carga total</span><strong>{total.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
    </div>
    {mount === 'aerial' && <div className="mini-grid two"><div><span>Carga média/ponto</span><strong>{Number(points) > 0 ? `${perPoint.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'}</strong></div><div><span>Saldo por ponto</span><strong>{Number(capacity) > 0 && Number(points) > 0 ? `${(Number(capacity) - perPoint).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` : '—'}</strong></div></div>}

    {mount === 'aerial' && Number(capacity) > 0 && Number(points) > 0 && perPoint > Number(capacity) && <div className="issue error">Carga média por ponto acima da capacidade informada. Revise quantidade de pontos, capacidade e distribuição real.</div>}
    {mount !== 'aerial' && Number(contactArea) > 0 && <div className="technical-note">Distribuição simples de referência: {(total / Number(contactArea)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/m² antes da margem do memorial.</div>}
    {(type === 'Q50' || type === 'OUTRA') && !(Number(kgPerM) > 0) && <div className="issue warning">Informe o peso linear real desta estrutura para o memorial considerar o peso da própria trave.</div>}
    {assigned.length > 0 && <div className="structure-assigned"><strong>Equipamentos nesta estrutura</strong>{assigned.map((i) => { const eq = equipmentForItem(i, data.catalog); return <span key={i.id}>{i.area === 'audio' ? 'Som' : i.area === 'lighting' ? 'Luz' : i.area === 'video' ? 'Vídeo' : 'Estrutura'} · {i.quantity}× {eq?.name ?? 'Item'}</span>; })}</div>}
    {editable && <div className="form-actions end"><button className="button primary" type="button" onClick={() => void save()}><Save size={16}/>{saved ? 'Salvo' : 'Salvar estrutura'}</button></div>}
  </section>;
}
