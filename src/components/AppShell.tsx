import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, BookOpenText, Boxes, Building2, Cable, ClipboardCheck, Gauge, LayoutDashboard, Lightbulb, LogOut, Settings2, ShieldCheck, Video, Users, History } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { usePresence } from '../contexts/PresenceContext';
import { calculateTotals } from '../utils/calculations';
import { validateProjectChronology } from '../utils/dates';
import type { AuditEntry } from '../types/domain';

const links = [
  ['/', 'Central', LayoutDashboard], ['/evento', 'Dados do evento', Building2], ['/audio', 'Áudio', AudioLines],
  ['/iluminacao', 'Iluminação', Lightbulb], ['/video', 'Vídeo', Video], ['/estrutura', 'Estrutura', Boxes],
  ['/eletrica', 'Elétrica', Cable], ['/dossie', 'Dossiê', BookOpenText], ['/catalogo', 'Catálogo', Settings2],
] as const;
const roleName = { viewer: 'Visualizador', producer: 'Produtor', management: 'Gerência', admin: 'Admin' } as const;

function relativeTime(iso?: string) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60); if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60); if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const data = useData();
  const online = usePresence();
  const navigate = useNavigate();
  const totals = calculateTotals(data.groups, data.items, data.catalog);
  const issues = data.currentProject ? validateProjectChronology(data.currentProject) : [];
  const manage = ['management', 'admin'].includes(auth.profile?.role ?? '');
  const [lastAudit, setLastAudit] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let active = true;
    if (!data.currentProject) { setLastAudit(null); return; }
    void data.repository.listAudit(data.currentProject.id).then((rows) => { if (active) setLastAudit(rows[0] ?? null); }).catch(() => { if (active) setLastAudit(null); });
    return () => { active = false; };
  }, [data.currentProject?.id, data.groups, data.items, data.currentProject?.updated_at]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><BrandMark/></div>
      <nav className="main-nav" aria-label="Navegação principal">
        {links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}${!data.currentProject && !['/', '/catalogo'].includes(to) ? ' muted' : ''}`}><Icon size={18}/><span>{label}</span></NavLink>)}
        {manage && <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><ShieldCheck size={18}/><span>Administração</span></NavLink>}
      </nav>
      <div className="sidebar-footer"><div className="profile-chip"><div className="avatar">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'U'}</div><div><strong>{auth.profile?.full_name}</strong><span>{auth.profile ? roleName[auth.profile.role] : ''}</span></div></div><button className="icon-button" type="button" title="Sair" onClick={() => void auth.signOut()}><LogOut size={18}/></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div><span className="eyebrow">Projeto ativo</span><h1>{data.currentProject?.name || 'Nenhum projeto selecionado'}</h1></div><div className="topbar-actions">{auth.demo && <span className="status-pill warning">MODO DEMO</span>}<span className="status-pill"><Users size={14}/>{online.length} online</span><button className="button primary" type="button" onClick={() => navigate('/dossie')} disabled={!data.currentProject}><ClipboardCheck size={17}/> Revisar e gerar documentos</button></div></header>

      <div className="content-wrap">
        <section className="page-content">{data.error && <div className="global-error">{data.error}</div>}{children}</section>
        <aside className="context-panel">
          <div className="context-card"><div className="card-heading"><Gauge size={18}/><strong>Resumo vivo</strong></div><div className="metrics-mini"><div><span>Peso cadastrado</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Carga aérea</span><strong>{totals.aerialWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div><div><span>Potência</span><strong>{(totals.totalPowerW / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div><div><span>Itens</span><strong>{totals.itemCount}</strong></div></div></div>
          <div className="context-card"><div className="card-heading"><ClipboardCheck size={18}/><strong>Validação</strong></div>{!data.currentProject ? <p className="muted-text">Crie ou selecione um projeto.</p> : issues.length === 0 ? <div className="validation-ok"><span>✓</span> Cronologia consistente</div> : <ul className="issue-list">{issues.slice(0, 5).map((i) => <li key={i.id} className={i.level}>{i.message}</li>)}</ul>}</div>
          {data.currentProject && <div className="context-card"><div className="card-heading"><History size={18}/><strong>Última alteração</strong></div>{lastAudit ? <div className="last-change"><strong>{lastAudit.actor_name || 'Usuário'}</strong><span>{lastAudit.action} · {lastAudit.entity_type}</span><small>{relativeTime(lastAudit.created_at)}</small></div> : <p className="muted-text">Nenhuma alteração registrada ainda.</p>}</div>}
        </aside>
      </div>
    </main>
  </div>;
}
