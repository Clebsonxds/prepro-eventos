import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AudioLines,
  BookOpenText,
  Boxes,
  Building2,
  Cable,
  ClipboardCheck,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Settings2,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { calculateTotals } from '../utils/calculations';
import { validateProjectChronology } from '../utils/dates';

const links = [
  ['/', 'Central', LayoutDashboard],
  ['/evento', 'Dados do evento', Building2],
  ['/audio', 'Áudio', AudioLines],
  ['/iluminacao', 'Iluminação', Lightbulb],
  ['/video', 'Vídeo', Video],
  ['/estrutura', 'Estrutura', Boxes],
  ['/eletrica', 'Elétrica', Cable],
  ['/dossie', 'Dossiê', BookOpenText],
  ['/catalogo', 'Catálogo', Settings2],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const data = useData();
  const navigate = useNavigate();
  const totals = calculateTotals(data.groups, data.items, data.catalog);
  const issues = data.currentProject ? validateProjectChronology(data.currentProject) : [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><BrandMark /></div>
        <nav className="main-nav" aria-label="Navegação principal">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}${!data.currentProject && to !== '/' && to !== '/catalogo' ? ' muted' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          {auth.profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <ShieldCheck size={18} /><span>Administração</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="profile-chip">
            <div className="avatar">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'U'}</div>
            <div><strong>{auth.profile?.full_name}</strong><span>{auth.profile?.role}</span></div>
          </div>
          <button className="icon-button" type="button" title="Sair" onClick={() => void auth.signOut()}><LogOut size={18} /></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">Projeto ativo</span>
            <h1>{data.currentProject?.name || 'Nenhum projeto selecionado'}</h1>
          </div>
          <div className="topbar-actions">
            {auth.demo && <span className="status-pill warning">MODO DEMO</span>}
            <button className="button secondary" type="button" onClick={() => navigate('/dossie')} disabled={!data.currentProject}>
              <ClipboardCheck size={17} /> Revisar projeto
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-content">{data.error && <div className="global-error">{data.error}</div>}{children}</section>
          <aside className="context-panel">
            <div className="context-card">
              <div className="card-heading"><Gauge size={18} /><strong>Resumo vivo</strong></div>
              <div className="metrics-mini">
                <div><span>Peso cadastrado</span><strong>{totals.totalWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
                <div><span>Carga aérea</span><strong>{totals.aerialWeightKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</strong></div>
                <div><span>Potência</span><strong>{(totals.totalPowerW / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kW</strong></div>
                <div><span>Itens</span><strong>{totals.itemCount}</strong></div>
              </div>
            </div>
            <div className="context-card">
              <div className="card-heading"><ClipboardCheck size={18} /><strong>Validação</strong></div>
              {!data.currentProject ? (
                <p className="muted-text">Crie ou selecione um projeto para iniciar.</p>
              ) : issues.length === 0 ? (
                <div className="validation-ok"><span>✓</span> Cronologia consistente</div>
              ) : (
                <ul className="issue-list">
                  {issues.slice(0, 4).map((issue) => <li key={issue.id} className={issue.level}>{issue.message}</li>)}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
