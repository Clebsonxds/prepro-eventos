import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { calculateTotals, estimateElectrical } from '../utils/calculations';

export function ElectricalPage() {
  const data = useData();
  const metadata = (data.currentProject?.metadata ?? {}) as Record<string, unknown>;
  const electrical = (metadata.electrical ?? {}) as Record<string, unknown>;
  const [voltage, setVoltage] = useState(Number(electrical.voltage ?? 220));
  const [phases, setPhases] = useState(Number(electrical.phases ?? 3));
  const [powerFactor, setPowerFactor] = useState(Number(electrical.powerFactor ?? 0.9));
  const [reservePct, setReservePct] = useState(Number(electrical.reservePct ?? 20));
  const totals = useMemo(() => calculateTotals(data.groups, data.items, data.catalog), [data.groups, data.items, data.catalog]);
  const est = estimateElectrical(totals.totalPowerW, voltage, phases, powerFactor, reservePct);

  async function save() {
    await data.updateCurrentProject({ metadata: { ...metadata, electrical: { voltage, phases, powerFactor, reservePct } } });
  }

  return <ProjectRequired><div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Elétrica</span><h2>Demanda consolidada</h2><p>O consumo vem automaticamente dos equipamentos. Aqui o produtor define somente as premissas de alimentação.</p></div></section>
    <section className="panel">
      <div className="form-grid four"><label>Tensão (V)<input type="number" min="1" value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} /></label><label>Fases<select value={phases} onChange={(e) => setPhases(Number(e.target.value))}><option value="1">Monofásico</option><option value="3">Trifásico</option></select></label><label>Fator de potência<input type="number" min="0.1" max="1" step="0.01" value={powerFactor} onChange={(e) => setPowerFactor(Number(e.target.value))} /></label><label>Reserva operacional (%)<input type="number" min="0" max="100" value={reservePct} onChange={(e) => setReservePct(Number(e.target.value))} /></label></div>
      <div className="form-actions end"><button className="button secondary" type="button" onClick={() => void save()}><Save size={17} /> Salvar premissas</button></div>
    </section>
    <div className="mini-grid three"><div><span>Potência cadastrada</span><strong>{est.kw.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div><div><span>Demanda estimada</span><strong>{est.kva.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kVA</strong></div><div><span>Corrente estimada</span><strong>{est.currentA.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} A</strong></div></div>
    <div className="technical-note strong">Estimativa operacional para pré-produção. Dimensionamento de alimentadores, proteção, seletividade, aterramento e demais critérios do projeto elétrico devem ser validados por profissional habilitado.</div>
  </div></ProjectRequired>;
}
