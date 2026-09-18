import { useEffect, useState } from 'react';
import { Check, Clock3, ShieldCheck, Users, X, Ban, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { usePresence } from '../contexts/PresenceContext';
import { canManageUsers, canPromoteManagement } from '../utils/permissions';
import type { AuditEntry, Profile, UserRole } from '../types/domain';

const roleLabel: Record<UserRole, string> = { viewer: 'Visualizador', producer: 'Produtor', management: 'Gerência', admin: 'Admin' };

export function AdminPage() {
  const auth = useAuth();
  const data = useData();
  const online = usePresence();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const allowed = canManageUsers(auth.profile);
  const isAdmin = auth.profile?.role === 'admin';

  async function refresh() {
    if (!allowed) return;
    const [p, a] = await Promise.all([data.repository.listProfiles(), data.repository.listAudit(null)]);
    setProfiles(p); setAudit(a);
  }
  useEffect(() => { void refresh(); }, [allowed]);

  if (!allowed) return <div className="panel empty-state"><h2>Acesso restrito</h2><p>Somente Gerência e Administração acessam esta área.</p></div>;

  async function approve(p: Profile, role: UserRole) { await data.repository.updateProfile(p.id, { role, approval_status: 'approved' }); await refresh(); }
  async function reject(p: Profile) { await data.repository.updateProfile(p.id, { approval_status: 'rejected' }); await refresh(); }
  async function changeRole(p: Profile, role: UserRole) { if (p.role === role) return; await data.repository.updateProfile(p.id, { role }); await refresh(); }
  async function toggleSuspend(p: Profile) { await data.repository.updateProfile(p.id, { approval_status: p.approval_status === 'suspended' ? 'approved' : 'suspended' }); await refresh(); }

  const pending = profiles.filter((p) => p.approval_status === 'pending');
  const operational = profiles.filter((p) => ['approved', 'suspended'].includes(p.approval_status));

  return <div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Administração</span><h2>Usuários, presença e auditoria</h2><p>Gerência controla acesso operacional. Acesso ao código-fonte continua separado e é controlado no GitHub.</p></div><ShieldCheck size={34}/></section>

    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Solicitações</span><h3>Contas aguardando aprovação</h3></div></div>
      {pending.length === 0 ? <div className="empty-small">Nenhum cadastro pendente.</div> : <div className="user-list">{pending.map((p) => <div className="user-row" key={p.id}><div><strong>{p.full_name}</strong><span>{p.email}</span></div><div className="user-actions">
        <button className="button primary small" type="button" onClick={() => void approve(p, 'viewer')}><Check size={14}/> Visualizador</button>
        <button className="button primary small" type="button" onClick={() => void approve(p, 'producer')}><Check size={14}/> Produtor</button>
        {canPromoteManagement(auth.profile) && <button className="button secondary small" type="button" onClick={() => void approve(p, 'management')}>Gerência</button>}
        {isAdmin && <button className="button secondary small" type="button" onClick={() => void approve(p, 'admin')}>Admin</button>}
        <button className="button danger small" type="button" onClick={() => void reject(p)}><X size={14}/> Rejeitar</button>
      </div></div>)}</div>}
    </section>

    <section className="two-column">
      <div className="panel"><div className="card-heading"><Users size={18}/><strong>Usuários do sistema</strong></div>
        <div className="user-list compact">{operational.map((p) => {
          const privilegedTarget = ['management', 'admin'].includes(p.role);
          const managementCanEdit = auth.profile?.role === 'management' && !privilegedTarget;
          const canEditRole = isAdmin || managementCanEdit;
          return <div className={`user-row ${p.approval_status === 'suspended' ? 'suspended' : ''}`} key={p.id}>
            <div><strong>{p.full_name}</strong><span>{p.email} · {p.approval_status === 'suspended' ? 'SUSPENSO' : 'ativo'}</span></div>
            <div className="user-actions">
              {canEditRole ? <select className="role-select" value={p.role} onChange={(e) => void changeRole(p, e.target.value as UserRole)}>
                <option value="viewer">Visualizador</option><option value="producer">Produtor</option>{isAdmin && <option value="management">Gerência</option>}{isAdmin && <option value="admin">Admin</option>}
              </select> : <span className="role-pill">{roleLabel[p.role]}</span>}
              {(isAdmin || managementCanEdit) && p.id !== auth.profile?.id && <button className={`icon-button ${p.approval_status === 'suspended' ? '' : 'danger'}`} type="button" title={p.approval_status === 'suspended' ? 'Reativar' : 'Suspender'} onClick={() => void toggleSuspend(p)}>{p.approval_status === 'suspended' ? <RotateCcw size={15}/> : <Ban size={15}/>}</button>}
            </div>
          </div>;
        })}</div>
      </div>

      <div className="panel"><div className="card-heading"><span className="online-dot"/><strong>Online agora</strong></div>{online.length === 0 ? <div className="empty-small">Ninguém conectado.</div> : <div className="user-list compact">{online.map((p, idx) => <div className="user-row" key={`${p.user_id}-${idx}`}><div><strong>{p.full_name}</strong><span>{p.project_name ? `${p.project_name} · ${p.route}` : 'Sem projeto aberto'}</span></div><span className="role-pill">{roleLabel[p.role]}</span></div>)}</div>}</div>
    </section>

    <section className="panel"><div className="card-heading"><Clock3 size={18}/><strong>Últimas alterações</strong></div>{audit.length === 0 ? <div className="empty-small">Nenhuma alteração registrada.</div> : <div className="audit-list">{audit.slice(0, 30).map((a) => <div className="audit-row" key={String(a.id)}><span>{new Date(a.created_at).toLocaleString('pt-BR')}</span><strong>{a.actor_name || a.actor_id || 'Sistema'}</strong><span>{a.action} · {a.entity_type}</span></div>)}</div>}</section>
    <div className="technical-note strong">Gerência pode aprovar Visualizadores e Produtores e administrar contas operacionais. Somente Admin pode promover ou alterar Gerência/Admin. O papel Admin dentro do sistema não concede acesso ao repositório: código-fonte é controlado separadamente no GitHub.</div>
  </div>;
}
