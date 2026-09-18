import { useMemo, useState } from 'react';
import { Archive, Plus, Search } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import type { EquipmentCategory } from '../types/domain';

const categories: { value: EquipmentCategory; label: string }[] = [
  ['audio_console','Mesa de áudio'],['audio_box','Caixa / PA'],['audio_stagebox','Stagebox / expansão'],
  ['lighting_fixture','Aparelho de luz'],['lighting_console','Mesa de luz'],['video_panel','Painel de LED'],
  ['video_processor','Processadora de vídeo'],['structure','Estrutura'],['power','Elétrica'],['other','Outro'],
].map(([value,label]) => ({ value: value as EquipmentCategory, label: label as string }));

export function CatalogPage() {
  const data = useData();
  const auth = useAuth();
  const canEdit = auth.profile?.role === 'admin';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | EquipmentCategory>('all');
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(() => data.catalog.filter((eq) => {
    const matchesCategory = category === 'all' || eq.category === category;
    const q = query.trim().toLowerCase();
    return matchesCategory && (!q || `${eq.name} ${eq.manufacturer} ${eq.model}`.toLowerCase().includes(q));
  }), [data.catalog, query, category]);

  return <div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Catálogo técnico</span><h2>Fonte única dos equipamentos</h2><p>Peso, potência e demais parâmetros devem existir aqui uma vez e alimentar todo o sistema.</p></div>{canEdit && <button className="button primary" type="button" onClick={() => setShowForm((v) => !v)}><Plus size={17} /> Novo equipamento</button>}</section>
    {showForm && canEdit && <EquipmentForm onDone={() => setShowForm(false)} />}
    <section className="panel">
      <div className="catalog-toolbar"><label className="search-field"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar equipamento…" /></label><select value={category} onChange={(e) => setCategory(e.target.value as 'all' | EquipmentCategory)}><option value="all">Todas as categorias</option>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
      <div className="catalog-list">
        {filtered.length === 0 ? <div className="empty-small">Nenhum equipamento encontrado.</div> : filtered.map((eq) => <div className="catalog-row" key={eq.id}>
          <div><strong>{eq.name}</strong><span>{eq.manufacturer} {eq.model}</span></div>
          <div className="catalog-specs"><span>{eq.weight_kg} kg</span><span>{eq.power_w} W</span>{eq.dmx_channels > 0 && <span>{eq.dmx_channels} DMX</span>}</div>
          {canEdit ? <button className="icon-button danger" type="button" title="Arquivar" onClick={() => { if (confirm(`Arquivar ${eq.name}?`)) void data.archiveEquipment(eq.id); }}><Archive size={16} /></button> : <span></span>}
        </div>)}
      </div>
    </section>
  </div>;
}

function EquipmentForm({ onDone }: { onDone(): void }) {
  const data = useData();
  const [form, setForm] = useState({ name:'', category:'other' as EquipmentCategory, manufacturer:'', model:'', weight_kg:'0', power_w:'0', dmx_channels:'0', audio_inputs:'0', case_capacity:'1', module_width_m:'', module_height_m:'', pixels_w:'', pixels_h:'', notes:'' });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await data.createEquipment({
      name: form.name, category: form.category, manufacturer: form.manufacturer, model: form.model,
      weight_kg: Number(form.weight_kg), power_w: Number(form.power_w), dmx_channels: Number(form.dmx_channels), audio_inputs: Number(form.audio_inputs), case_capacity: Number(form.case_capacity),
      module_width_m: form.module_width_m ? Number(form.module_width_m) : null, module_height_m: form.module_height_m ? Number(form.module_height_m) : null,
      pixels_w: form.pixels_w ? Number(form.pixels_w) : null, pixels_h: form.pixels_h ? Number(form.pixels_h) : null, notes: form.notes,
    });
    onDone();
  }
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const isPanel = form.category === 'video_panel';
  return <form className="panel stack-md" onSubmit={submit}>
    <div className="section-heading"><div><span className="eyebrow">Cadastro</span><h3>Novo equipamento</h3></div></div>
    <div className="form-grid four">
      <label className="span-2">Nome<input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome usado pelos produtores" /></label>
      <label>Categoria<select value={form.category} onChange={(e) => set('category', e.target.value as EquipmentCategory)}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label>Fabricante<input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} /></label>
      <label>Modelo<input value={form.model} onChange={(e) => set('model', e.target.value)} /></label>
      <label>Peso unitário (kg)<input type="number" min="0" step="0.01" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} /></label>
      <label>Potência unitária (W)<input type="number" min="0" step="1" value={form.power_w} onChange={(e) => set('power_w', e.target.value)} /></label>
      <label>Canais DMX<input type="number" min="0" value={form.dmx_channels} onChange={(e) => set('dmx_channels', e.target.value)} /></label>
      <label>Entradas de áudio<input type="number" min="0" value={form.audio_inputs} onChange={(e) => set('audio_inputs', e.target.value)} /></label>
      <label>Unid. por case<input type="number" min="1" value={form.case_capacity} onChange={(e) => set('case_capacity', e.target.value)} /></label>
      {isPanel && <><label>Largura módulo (m)<input type="number" min="0" step="0.01" value={form.module_width_m} onChange={(e) => set('module_width_m', e.target.value)} /></label><label>Altura módulo (m)<input type="number" min="0" step="0.01" value={form.module_height_m} onChange={(e) => set('module_height_m', e.target.value)} /></label><label>Pixels largura<input type="number" min="0" value={form.pixels_w} onChange={(e) => set('pixels_w', e.target.value)} /></label><label>Pixels altura<input type="number" min="0" value={form.pixels_h} onChange={(e) => set('pixels_h', e.target.value)} /></label></>}
      <label className="span-4">Observações<textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>
    </div>
    <div className="form-actions end"><button className="button secondary" type="button" onClick={onDone}>Cancelar</button><button className="button primary" type="submit">Salvar equipamento</button></div>
  </form>;
}
