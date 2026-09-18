import { useMemo, useState } from 'react';
import { LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword } from '../utils/password';

export function LoginPage(){
  const auth=useAuth();
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const passwordIssues=useMemo(()=>mode==='register'&&password?validatePassword(password):[],[mode,password]);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');try{if(mode==='login')await auth.signIn(email,password);else{await auth.signUp(name,email,password);setMessage('Cadastro enviado. Confirme seu e-mail, se solicitado, e aguarde a aprovação da Gerência.');}}catch(err){setError(err instanceof Error?err.message:'Falha na autenticação.');}finally{setBusy(false);}}
  if(!auth.configured)return <div className="login-page"><div className="login-panel wide"><BrandMark/><div className="security-icon"><ShieldCheck/></div><h1>Ambiente ainda não configurado</h1><p>Produção exige Supabase próprio e autenticação. Para testar a interface use o modo DEMO.</p></div></div>;
  return <div className="login-page"><form className="login-panel" onSubmit={submit}><BrandMark/><div className="login-copy"><span className="eyebrow">Acesso protegido</span><h1>{mode==='login'?'Entrar no sistema':'Solicitar acesso'}</h1><p>{mode==='login'?'Use sua conta autorizada.':'Novos cadastros ficam bloqueados até aprovação da Gerência ou Administração.'}</p></div>
    {mode==='register'&&<label>Nome completo<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
    <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
    <label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'}/></label>
    {mode==='register'&&<div className="password-rules"><span className={password.length>=8?'ok':''}>8+ caracteres</span><span className={/[A-Z]/.test(password)?'ok':''}>Maiúscula</span><span className={/[a-z]/.test(password)?'ok':''}>Minúscula</span><span className={/[^A-Za-z0-9]/.test(password)?'ok':''}>Especial</span></div>}
    {passwordIssues.length>0&&password&&<div className="form-hint">{passwordIssues.join(' ')}</div>}
    {error&&<div className="form-error">{error}</div>}{message&&<div className="valid-box">{message}</div>}
    <button className="button primary full" disabled={busy||(mode==='register'&&passwordIssues.length>0)} type="submit">{mode==='login'?<LockKeyhole size={17}/>:<UserPlus size={17}/>} {busy?'Aguarde…':mode==='login'?'Entrar':'Criar conta'}</button>
    <button className="text-button" type="button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setMessage('');}}>{mode==='login'?'Ainda não tem conta? Solicitar acesso':'Já tem conta? Entrar'}</button>
  </form></div>;
}
