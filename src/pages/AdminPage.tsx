import { ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AdminPage() {
  const auth = useAuth();
  if (auth.profile?.role !== 'admin') return <div className="panel empty-state"><h2>Acesso restrito</h2><p>Somente administradores podem acessar esta área.</p></div>;
  return <div className="stack-lg">
    <section className="hero-panel compact"><div><span className="eyebrow">Administração</span><h2>Segurança e usuários</h2><p>Esta área deliberadamente não contém uma chave administrativa no navegador. Convites e criação de usuários devem ocorrer pelo Supabase Dashboard ou, futuramente, por uma Edge Function protegida.</p></div><ShieldCheck size={34} /></section>
    <section className="panel"><div className="card-heading"><Users size={18} /><strong>Modelo de permissões da Alpha</strong></div><div className="permission-grid"><div><strong>Admin</strong><span>Gerencia catálogo, papéis e todos os projetos.</span></div><div><strong>Producer</strong><span>Cria e edita os projetos dos quais participa.</span></div><div><strong>Viewer</strong><span>Consulta projetos autorizados sem alterar cálculos.</span></div></div></section>
    <div className="technical-note strong">Nunca coloque a <code>service_role</code> do Supabase em arquivos do frontend ou no GitHub. A aplicação usa somente a chave pública <code>anon</code>; a proteção dos dados fica nas políticas RLS do banco.</div>
  </div>;
}
