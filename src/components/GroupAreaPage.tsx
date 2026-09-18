import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ProjectRequired } from './ProjectRequired';
import { useData } from '../contexts/DataContext';
import type { AreaKey, EquipmentCategory, MountType, ProjectGroup } from '../types/domain';
import { equipmentForItem, itemPowerW, itemWeightKg } from '../utils/calculations';

interface Props {
  area: AreaKey;
  title: string;
  eyebrow: string;
  description: string;
  allowedCategories: EquipmentCategory[];
  groupExamples: string;
}

export function GroupAreaPage({ area, title, eyebrow, description, allowedCategories, groupExamples }: Props) {
  const data = useData();
  const [newName, setNewName] = useState('');
  const [newMount, setNewMount] = useState<MountType>('floor');
  const areaGroups = data.groups.filter((g) => g.area === area);
  const catalog = useMemo(() => data.catalog.filter((eq) => allowedCategories.includes(eq.category)), [data.catalog, allowedCategories]);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await data.createGroup(area, { name: newName.trim(), mount_type: newMount });
    setNewName('');
  }

  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
    </section>

    <form className="panel inline-create" onSubmit={addGroup}>
      <label>Nome do grupo<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={groupExamples} /></label>
      <label>Instalação<select value={newMount} onChange={(e) => setNewMount(e.target.value as MountType)}><option value="floor">Solo</option><option value="aerial">Aéreo / suspenso</option><option value="mixed">Misto</option></select></label>
      <button className="button primary" type="submit"><Plus size={17} /> Criar grupo</button>
    </form>

    {areaGroups.length === 0 ? <div className="panel empty-state"><h3>Nenhum grupo criado</h3><p>Organize o sistema por localização física. Isso permite calcular peso e potência por conjunto, não apenas o total do evento.</p></div> : (
      <div className="stack-md">
        {areaGroups.map((group) => <GroupCard key={group.id} group={group} catalog={catalog} />)}
      </div>
    )}
  </div></ProjectRequired>;
}

function GroupCard({ group, catalog }: { group: ProjectGroup; catalog: ReturnType<typeof useData>['catalog'] }) {
  const data = useData();
  const [equipmentId, setEquipmentId] = useState(catalog[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const groupItems = data.items.filter((i) => i.group_id === group.id);
  const totalWeight = groupItems.reduce((sum, item) => sum + itemWeightKg(item, equipmentForItem(item, data.catalog)), 0);
  const totalPower = groupItems.reduce((sum, item) => sum + itemPowerW(item, equipmentForItem(item, data.catalog)), 0);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!equipmentId) return;
    await data.createItem(group.id, equipmentId, Math.max(1, quantity));
    setQuantity(1);
  }

  return <section className="panel group-card">
    <div className="group-header">
      <div><span className={`mount-badge ${group.mount_type}`}>{group.mount_type === 'aerial' ? 'AÉREO' : group.mount_type === 'floor' ? 'SOLO' : 'MISTO'}</span><h3>{group.name}</h3></div>
      <div className="group-metrics"><span>{totalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span><span>{(totalPower/1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</span><button className="icon-button danger" title="Excluir grupo" type="button" onClick={() => void data.deleteGroup(group.id)}><Trash2 size={17} /></button></div>
    </div>

    <div className="group-config form-grid four">
      <label>Nome<input value={group.name} onChange={(e) => void data.updateGroup(group.id, { name: e.target.value })} /></label>
      <label>Instalação<select value={group.mount_type} onChange={(e) => void data.updateGroup(group.id, { mount_type: e.target.value as MountType })}><option value="floor">Solo</option><option value="aerial">Aéreo</option><option value="mixed">Misto</option></select></label>
      <label>Estrutura<input value={group.structure_type} onChange={(e) => void data.updateGroup(group.id, { structure_type: e.target.value })} placeholder="Ex.: Q30" /></label>
      <label>Pontos<input type="number" min="0" value={group.points_count} onChange={(e) => void data.updateGroup(group.id, { points_count: Number(e.target.value) })} /></label>
    </div>

    {groupItems.length > 0 && <div className="items-table">
      <div className="items-head"><span>Equipamento</span><span>Qtd.</span><span>Peso</span><span>Potência</span><span></span></div>
      {groupItems.map((item) => {
        const eq = equipmentForItem(item, data.catalog);
        return <div className="items-row" key={item.id}>
          <span><strong>{eq?.name ?? 'Equipamento removido'}</strong><small>{eq?.manufacturer} {eq?.model}</small></span>
          <span><input className="qty-input" type="number" min="1" value={item.quantity} onChange={(e) => void data.updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })} /></span>
          <span>{itemWeightKg(item, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
          <span>{(itemPowerW(item, eq)/1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</span>
          <span><button className="icon-button danger" type="button" title="Remover" onClick={() => void data.deleteItem(item.id)}><Trash2 size={16} /></button></span>
        </div>;
      })}
    </div>}

    <form className="add-item-row" onSubmit={addItem}>
      <select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
        <option value="">Selecionar equipamento…</option>
        {catalog.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
      </select>
      <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-label="Quantidade" />
      <button className="button secondary" type="submit" disabled={!equipmentId}><Plus size={16} /> Adicionar</button>
    </form>
  </section>;
}
