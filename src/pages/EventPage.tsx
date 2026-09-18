import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import type { Project } from '../types/domain';
import { durationHours, validateProjectChronology } from '../utils/dates';

function toLocalInput(value: string | null) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toIso(value: string) { return value ? new Date(value).toISOString() : null; }

export function EventPage() {
  const data = useData();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = data.currentProject;
    if (!p) return;
    setForm({
      name: p.name, client: p.client, venue: p.venue, address: p.address, spaces: p.spaces,
      commercial_responsible: p.commercial_responsible, coordinator: p.coordinator,
      assembly_start: toLocalInput(p.assembly_start), assembly_end: toLocalInput(p.assembly_end),
      event_start: toLocalInput(p.event_start), event_end: toLocalInput(p.event_end),
    });
  }, [data.currentProject?.id]);

  const projected = useMemo<Project | null>(() => data.currentProject ? {
    ...data.currentProject,
    name: form.name ?? '', client: form.client ?? '', venue: form.venue ?? '', address: form.address ?? '', spaces: form.spaces ?? '',
    commercial_responsible: form.commercial_responsible ?? '', coordinator: form.coordinator ?? '',
    assembly_start: toIso(form.assembly_start ?? ''), assembly_end: toIso(form.assembly_end ?? ''),
    event_start: toIso(form.event_start ?? ''), event_end: toIso(form.event_end ?? ''),
  } : null, [form, data.currentProject]);
  const issues = projected ? validateProjectChronology(projected) : [];
  const hasErrors = issues.some((x) => x.level === 'error');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!projected || hasErrors) return;
    await data.updateCurrentProject({
      name: projected.name, client: projected.client, venue: projected.venue, address: projected.address, spaces: projected.spaces,
      commercial_responsible: projected.commercial_responsible, coordinator: projected.coordinator,
      assembly_start: projected.assembly_start, assembly_end: projected.assembly_end,
      event_start: projected.event_start, event_end: projected.event_end,
    });
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  return <ProjectRequired><form className="stack-lg" onSubmit={save}>
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Identificação</span><h2>Dados do evento</h2><p>Uma única fonte para alimentar cálculos, memoriais e o dossiê final.</p></div></div>
      <div className="form-grid two">
        <label>Projeto / evento<input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Cliente<input value={form.client ?? ''} onChange={(e) => setForm({ ...form, client: e.target.value })} /></label>
        <label>Local do evento<input value={form.venue ?? ''} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Ex.: Centro de Convenções" /></label>
        <label>Salas / espaços<input value={form.spaces ?? ''} onChange={(e) => setForm({ ...form, spaces: e.target.value })} placeholder="Ex.: Plenária A + B" /></label>
        <label className="span-2">Endereço<input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label>Comercial responsável<input value={form.commercial_responsible ?? ''} onChange={(e) => setForm({ ...form, commercial_responsible: e.target.value })} /></label>
        <label>Coordenação / produção<input value={form.coordinator ?? ''} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} /></label>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Cronologia</span><h2>Montagem e operação</h2><p>As restrições abaixo impedem sequências impossíveis antes de o projeto avançar.</p></div></div>
      <div className="timeline-form">
        <label><span>01 · Início da montagem</span><input type="datetime-local" value={form.assembly_start ?? ''} onChange={(e) => setForm({ ...form, assembly_start: e.target.value })} /></label>
        <label><span>02 · Fim da montagem</span><input type="datetime-local" min={form.assembly_start || undefined} value={form.assembly_end ?? ''} onChange={(e) => setForm({ ...form, assembly_end: e.target.value })} /></label>
        <label><span>03 · Início do evento</span><input type="datetime-local" min={form.assembly_end || undefined} value={form.event_start ?? ''} onChange={(e) => setForm({ ...form, event_start: e.target.value })} /></label>
        <label><span>04 · Fim do evento</span><input type="datetime-local" min={form.event_start || undefined} value={form.event_end ?? ''} onChange={(e) => setForm({ ...form, event_end: e.target.value })} /></label>
      </div>
      {issues.length > 0 ? <div className="issue-box">{issues.map((i) => <div key={i.id} className={`issue ${i.level}`}>{i.message}</div>)}</div> : projected?.assembly_start && projected.event_end ? <div className="valid-box"><CheckCircle2 size={18} /> Sequência válida · montagem {durationHours(projected.assembly_start, projected.assembly_end)?.toLocaleString('pt-BR')} h · evento {durationHours(projected.event_start, projected.event_end)?.toLocaleString('pt-BR')} h</div> : null}
    </section>

    <div className="sticky-actions"><button className="button primary" type="submit" disabled={hasErrors}><Save size={17} /> {saved ? 'Salvo' : 'Salvar alterações'}</button></div>
  </form></ProjectRequired>;
}
