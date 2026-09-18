import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { ProjectRequired } from '../components/ProjectRequired';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { durationHours, validateProjectChronology } from '../utils/dates';
import { canEditProjects } from '../utils/permissions';
import type { Project } from '../types/domain';

function toLocal(value:string|null){return value?value.slice(0,16):'';}
function fromLocal(value:string){return value?new Date(value).toISOString():null;}

export function EventPage(){
  const data=useData(); const auth=useAuth(); const editable=canEditProjects(auth.profile);
  const p=data.currentProject;
  const [saved,setSaved]=useState(false);
  const [form,setForm]=useState({name:'',client:'',venue:'',address:'',spaces:'',commercial_responsible:'',coordinator:'',assembly_start:'',assembly_end:'',event_start:'',event_end:'',release_end:''});
  useEffect(()=>{if(p)setForm({name:p.name,client:p.client,venue:p.venue,address:p.address,spaces:p.spaces,commercial_responsible:p.commercial_responsible,coordinator:p.coordinator,assembly_start:toLocal(p.assembly_start),assembly_end:toLocal(p.assembly_end),event_start:toLocal(p.event_start),event_end:toLocal(p.event_end),release_end:toLocal(p.release_end)});},[p?.id]);
  const projected=useMemo<Project|null>(()=>p?{...p,...form,assembly_start:fromLocal(form.assembly_start),assembly_end:fromLocal(form.assembly_end),event_start:fromLocal(form.event_start),event_end:fromLocal(form.event_end),release_end:fromLocal(form.release_end)}:null,[p,form]);
  const issues=projected?validateProjectChronology(projected):[]; const hasErrors=issues.some(i=>i.level==='error');
  async function submit(e:React.FormEvent){e.preventDefault();if(!projected||hasErrors||!editable)return;await data.updateCurrentProject({name:form.name,client:form.client,venue:form.venue,address:form.address,spaces:form.spaces,commercial_responsible:form.commercial_responsible,coordinator:form.coordinator,assembly_start:projected.assembly_start,assembly_end:projected.assembly_end,event_start:projected.event_start,event_end:projected.event_end,release_end:projected.release_end});setSaved(true);setTimeout(()=>setSaved(false),1200);}
  return <ProjectRequired><form className="stack-lg" onSubmit={submit}>
    <section className="hero-panel compact"><div><span className="eyebrow">Dados do evento</span><h2>Informações e cronologia</h2><p>Esses dados alimentam o dossiê, os memoriais e a reserva de estoque.</p></div></section>
    <section className="panel"><div className="form-grid three"><label>Evento / projeto<input disabled={!editable} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Cliente<input disabled={!editable} value={form.client} onChange={e=>setForm({...form,client:e.target.value})}/></label><label>Local do evento<input disabled={!editable} value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label><label className="span-2">Endereço<input disabled={!editable} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Salas / espaços<input disabled={!editable} value={form.spaces} onChange={e=>setForm({...form,spaces:e.target.value})}/></label><label>Comercial responsável<input disabled={!editable} value={form.commercial_responsible} onChange={e=>setForm({...form,commercial_responsible:e.target.value})}/></label><label>Coordenação / produção<input disabled={!editable} value={form.coordinator} onChange={e=>setForm({...form,coordinator:e.target.value})}/></label></div></section>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Linha do tempo</span><h3>Montagem, operação e liberação</h3></div></div><div className="timeline-form five"><label><span>01 · Início montagem</span><input disabled={!editable} type="datetime-local" value={form.assembly_start} onChange={e=>setForm({...form,assembly_start:e.target.value})}/></label><label><span>02 · Fim montagem</span><input disabled={!editable} type="datetime-local" min={form.assembly_start||undefined} value={form.assembly_end} onChange={e=>setForm({...form,assembly_end:e.target.value})}/></label><label><span>03 · Início evento</span><input disabled={!editable} type="datetime-local" min={form.assembly_end||undefined} value={form.event_start} onChange={e=>setForm({...form,event_start:e.target.value})}/></label><label><span>04 · Fim evento</span><input disabled={!editable} type="datetime-local" min={form.event_start||undefined} value={form.event_end} onChange={e=>setForm({...form,event_end:e.target.value})}/></label><label><span>05 · Fim desmontagem / liberação</span><input disabled={!editable} type="datetime-local" min={form.event_end||undefined} value={form.release_end} onChange={e=>setForm({...form,release_end:e.target.value})}/></label></div>
    {issues.length>0?<div className="issue-box">{issues.map(i=><div key={i.id} className={`issue ${i.level}`}>{i.message}</div>)}</div>:projected?.assembly_start&&projected.release_end?<div className="valid-box"><CheckCircle2 size={18}/> Sequência válida · montagem {durationHours(projected.assembly_start,projected.assembly_end)?.toLocaleString('pt-BR')} h · evento {durationHours(projected.event_start,projected.event_end)?.toLocaleString('pt-BR')} h</div>:null}</section>
    {editable&&<div className="sticky-actions"><button className="button primary" type="submit" disabled={hasErrors}><Save size={17}/>{saved?'Salvo':'Salvar alterações'}</button></div>}
  </form></ProjectRequired>;
}
