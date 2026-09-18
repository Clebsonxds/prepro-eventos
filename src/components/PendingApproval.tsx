import { Clock3, LogOut, ShieldCheck } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useAuth } from '../contexts/AuthContext';
export function PendingApproval(){const auth=useAuth();return <div className="login-page"><div className="login-panel wide"><BrandMark/><div className="security-icon"><Clock3/></div><h1>Acesso aguardando aprovação</h1><p>Sua conta foi criada, mas ainda não recebeu permissão para acessar projetos e inventário. Um usuário da Gerência ou Administração precisa aprovar seu cadastro.</p><div className="status-pill warning"><ShieldCheck size={14}/> {auth.profile?.email}</div><button className="button secondary" type="button" onClick={()=>void auth.signOut()}><LogOut size={16}/> Sair</button></div></div>}
