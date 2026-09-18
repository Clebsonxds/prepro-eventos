import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { AreaKey, EquipmentCategory, InventoryAvailability } from '../types/domain';
import { equipmentForItem, itemPowerW, itemWeightKg } from '../utils/calculations';

export function EquipmentPlacementTable({ area, categories, excludeCategories = [], editable = true }: { area: AreaKey; categories: EquipmentCategory[]; excludeCategories?: EquipmentCategory[]; editable?: boolean }) {
  const data = useData();
  const auth = useAuth();
  const canOverride = ['management', 'admin'].includes(auth.profile?.role ?? '');
  const catalog = useMemo(() => data.catalog.filter((eq) => categories.includes(eq.category) && !excludeCategories.includes(eq.category)), [data.catalog, categories, excludeCategories]);
  const structures = data.groups.filter((g) => g.area === 'structure');
  const areaItems = data.items.filter((i) => i.area === area && !excludeCategories.includes(equipmentForItem(i, data.catalog)?.category ?? 'other'));
  const [equipmentId, setEquipmentId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [groupId, setGroupId] = useState('');
  const [position, setPosition] = useState('');
  const [availability, setAvailability] = useState<InventoryAvailability | null>(null);
  const [error, setError] = useState('');
  const [stockFailure, setStockFailure] = useState(false);

  useEffect(() => { setEquipmentId((prev) => prev && catalog.some((x) => x.id === prev) ? prev : (catalog[0]?.id ?? '')); }, [catalog]);
  useEffect(() => {
    setAvailability(null); setStockFailure(false);
    if (equipmentId && data.currentProject) void data.repository.getAvailability(equipmentId, data.currentProject.id).then(setAvailability).catch(() => setAvailability(null));
  }, [equipmentId, data.currentProject?.id, data.items.length]);

  async function createSelectedItem() {
    await data.createItem({ area, group_id: groupId || null, equipment_id: equipmentId, quantity: Math.max(1, quantity), position_name: position });
    setQuantity(1); setPosition(''); setStockFailure(false);
    if (data.currentProject) void data.repository.getAvailability(equipmentId, data.currentProject.id).then(setAvailability);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setError(''); setStockFailure(false); if (!equipmentId) return;
    try { await createSelectedItem(); }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao adicionar.';
      setError(message); setStockFailure(/estoque insuficiente/i.test(message));
    }
  }

  async function forceReservation() {
    if (!canOverride || !data.currentProject || !equipmentId) return;
    const reason = window.prompt('Justificativa obrigatória para a Gerência forçar esta reserva:');
    if (!reason?.trim()) return;
    const available = availability?.available_qty ?? 0;
    const extra = Math.max(1, Math.max(1, quantity) - available);
    try {
      await data.repository.createReservationOverride(data.currentProject.id, equipmentId, extra, reason.trim());
      setAvailability(await data.repository.getAvailability(equipmentId, data.currentProject.id));
      setError(''); setStockFailure(false);
      await createSelectedItem();
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao autorizar exceção.'); }
  }

  return <div className="stack-md">
    {areaItems.length > 0 && <div className="items-table">
      <div className="items-head placement"><span>Equipamento</span><span>Local / estrutura</span><span>Qtd.</span><span>Peso</span><span>Consumo</span><span></span></div>
      {areaItems.map((item) => {
        const eq = equipmentForItem(item, data.catalog); const group = structures.find((g) => g.id === item.group_id);
        return <div className="items-row placement" key={item.id}>
          <span><strong>{eq?.name ?? 'Item removido'}</strong><small>{eq?.manufacturer} {eq?.model}</small></span>
          <span>{group?.name || item.position_name || 'Solo / sem estrutura'}</span>
          <span>{editable ? <input className="qty-input" type="number" min="1" value={item.quantity} onChange={(e) => void data.updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}/> : item.quantity}</span>
          <span>{itemWeightKg(item, eq).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
          <span>{(itemPowerW(item, eq) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</span>
          <span>{editable && <button className="icon-button danger" type="button" title="Remover" onClick={() => void data.deleteItem(item.id)}><Trash2 size={16}/></button>}</span>
        </div>;
      })}
    </div>}

    {editable && <form className="placement-add" onSubmit={add}>
      <label>Equipamento<select value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}><option value="">Selecionar…</option>{catalog.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}{eq.verification_status === 'pending' ? ' · não homologado' : ''}</option>)}</select></label>
      <label>Estrutura compartilhada<select value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Sem estrutura / solo</option>{structures.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.structure_type || 'sem treliça'} · {g.length_m || 0}m</option>)}</select></label>
      <label>Posição<input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ex.: FOH, palco, lateral"/></label>
      <label>Qtd.<input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}/></label>
      <button className="button primary" type="submit" disabled={!equipmentId}><Plus size={16}/> Adicionar</button>
    </form>}

    {availability && availability.stock_total > 0 && <div className={`stock-note ${quantity > availability.available_qty ? 'danger' : ''}`}>Estoque no período: <strong>{availability.available_qty}</strong> disponível(is) · {availability.reserved_qty} reservado(s) · {availability.maintenance_qty} em manutenção · {availability.stock_total} total</div>}
    {availability && availability.stock_total === 0 && <div className="stock-note warning">Este item ainda não tem estoque homologado. A Alpha permite o uso para teste, mas ele não deve ser considerado disponível de forma definitiva.</div>}
    {error && <div className="form-error">{error}</div>}
    {stockFailure && canOverride && <div className="manager-override"><span><ShieldAlert size={16}/> Gerência pode autorizar uma exceção de estoque com justificativa. A decisão ficará no histórico.</span><button className="button danger small" type="button" onClick={() => void forceReservation()}>Forçar reserva</button></div>}
  </div>;
}
