import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { calculateTotals, equipmentForItem, itemWeightKg } from '../utils/calculations';

export function StructurePage() {
  const data = useData();
  const totals = calculateTotals(data.groups, data.items, data.catalog);
  const rows = data.groups.map((group) => {
    const items = data.items.filter((i) => i.group_id === group.id);
    const weight = items.reduce((sum, item) => sum + itemWeightKg(item, equipmentForItem(item, data.catalog)), 0);
    return { group, weight, count: items.reduce((s, x) => s + x.quantity, 0) };
  }).filter((row) => row.count > 0);

  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Estrutura</span><h2>Consolidação de cargas</h2><p>Esta tela não pede que o produtor digite tudo de novo: ela recebe as classificações aéreas e de solo das áreas técnicas.</p></div></section>
    <div className="mini-grid three"><div><span>Carga aérea cadastrada</span><strong>{totals.aerialWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Carga de solo cadastrada</span><strong>{totals.floorWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Peso total</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div></div>
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Origem das cargas</span><h3>Grupos do projeto</h3></div></div>
      {rows.length === 0 ? <div className="empty-small">Ainda não há itens técnicos cadastrados.</div> : <div className="structure-list">{rows.map(({ group, weight, count }) => <div className="structure-row" key={group.id}><div><strong>{group.name}</strong><span>{group.area} · {group.mount_type} · {count} itens</span></div><div><strong>{weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong><span>{group.points_count > 0 && group.mount_type === 'aerial' ? `${(weight/group.points_count).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg/ponto (divisão simples)` : '—'}</span></div></div>)}</div>}
    </section>
    <div className="technical-note strong">As cargas exibidas são consolidações dos equipamentos cadastrados. Capacidade estrutural, reações, ângulos, fatores dinâmicos, vento, coeficientes de segurança e validação de pontos dependem de análise do responsável técnico.</div>
  </div></ProjectRequired>;
}
