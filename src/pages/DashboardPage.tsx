import { useMemo, useState } from 'react';
import { ArrowRight, CalendarRange, FolderPlus, MapPin, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { canEditProjects } from '../utils/permissions';
import { calculateTotals } from '../utils/calculations';
import { formatDateTime, validateProjectChronology } from '../utils/dates';

export function DashboardPage() {
  const data = useData();
  const auth = useAuth();
  const editable = canEditProjects(auth.profile);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [creating, setCreating] = useState(false);
  const totals = useMemo(() => calculateTotals(data.groups, data.items, data.catalog), [data.groups, data.items, data.catalog]);
  const issues = data.currentProject ? validateProjectChronology(data.currentProject) : [];

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await data.createProject({ name, client });
    setName(''); setClient(''); setCreating(false);
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Central do projeto</span>
          <h2>{data.currentProject ? 'Continue a pré-produção' : 'Comece por um projeto'}</h2>
          <p>{data.currentProject ? 'As áreas técnicas, cálculos e documentos nascem do mesmo conjunto de dados.' : 'Crie o evento e depois avance apenas pelas áreas que realmente serão utilizadas.'}</p>
        </div>
        {editable && <button type="button" className="button primary" onClick={() => setCreating((v) => !v)}><FolderPlus size={18} /> Novo projeto</button>}
      </section>

      {creating && (
        <form className="panel form-grid compact-form" onSubmit={createProject}>
          <label>Nome do projeto<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Convenção 2026" required /></label>
          <label>Cliente<input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Cliente / contratante" /></label>
          <div className="form-actions"><button className="button primary" type="submit"><Plus size={17} /> Criar</button><button className="button secondary" type="button" onClick={() => setCreating(false)}>Cancelar</button></div>
        </form>
      )}

      <section className="two-column">
        <div className="panel">
          <div className="section-heading"><div><span className="eyebrow">Projetos</span><h3>Seus trabalhos</h3></div><span className="count-badge">{data.projects.length}</span></div>
          {data.projects.length === 0 ? (
            <div className="empty-small">Nenhum projeto criado ainda.</div>
          ) : (
            <div className="project-list">
              {data.projects.map((project) => (
                <button type="button" key={project.id} className={`project-row${data.currentProject?.id === project.id ? ' selected' : ''}`} onClick={() => data.setCurrentProjectId(project.id)}>
                  <div><strong>{project.name}</strong><span>{project.client || 'Sem cliente informado'}</span></div>
                  <div className="project-row-meta"><span>{project.venue || 'Local pendente'}</span><ArrowRight size={16} /></div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-heading"><div><span className="eyebrow">Projeto selecionado</span><h3>{data.currentProject?.name || '—'}</h3></div></div>
          {!data.currentProject ? <div className="empty-small">Selecione um projeto para ver o resumo.</div> : (
            <div className="project-summary">
              <div className="summary-line"><MapPin size={17} /><div><span>Local</span><strong>{data.currentProject.venue || 'Não informado'}</strong></div></div>
              <div className="summary-line"><CalendarRange size={17} /><div><span>Montagem</span><strong>{formatDateTime(data.currentProject.assembly_start)} → {formatDateTime(data.currentProject.assembly_end)}</strong></div></div>
              <div className="summary-line"><CalendarRange size={17} /><div><span>Evento</span><strong>{formatDateTime(data.currentProject.event_start)} → {formatDateTime(data.currentProject.event_end)}</strong></div></div>
              <div className="mini-grid">
                <div><span>Peso</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR')} kg</strong></div>
                <div><span>Potência</span><strong>{(totals.totalPowerW / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div>
                <div><span>Pendências</span><strong>{issues.length}</strong></div>
              </div>
              <Link className="button primary full" to="/evento">Abrir dados do evento <ArrowRight size={17} /></Link>
            </div>
          )}
        </div>
      </section>

      {data.currentProject && (
        <section className="module-grid">
          {[
            ['/audio', 'Áudio', 'Mesa, caixas, subs, peso e consumo'],
            ['/iluminacao', 'Iluminação', 'Aparelhos associados às estruturas compartilhadas'],
            ['/video', 'Vídeo', 'Painéis, processamento, pixels e montagem'],
            ['/estrutura', 'Estrutura', 'Consolidação de cargas aéreas e de solo'],
            ['/eletrica', 'Elétrica', 'Demanda consolidada e premissas'],
            ['/dossie', 'Dossiê', 'Descritivo + memoriais aéreo e de solo'],
          ].map(([to, title, description]) => (
            <Link key={to} to={to} className="module-card"><span className="module-index">{title}</span><strong>{description}</strong><span className="module-go">Abrir <ArrowRight size={15} /></span></Link>
          ))}
        </section>
      )}
    </div>
  );
}
