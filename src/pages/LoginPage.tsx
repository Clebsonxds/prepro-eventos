import { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await auth.signIn(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha no login.'); }
    finally { setBusy(false); }
  }

  if (!auth.configured) {
    return (
      <div className="login-page">
        <div className="login-panel wide">
          <BrandMark />
          <div className="security-icon"><ShieldCheck /></div>
          <h1>Ambiente ainda não configurado</h1>
          <p>Esta versão foi construída para não aceitar acesso anônimo em produção. Configure o Supabase no arquivo <code>.env</code> ou execute <code>npm run dev:demo</code> somente para testes locais.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <BrandMark />
        <div className="login-copy">
          <span className="eyebrow">Acesso protegido</span>
          <h1>Entrar no sistema</h1>
          <p>Use sua conta autorizada para acessar projetos, catálogo e memoriais.</p>
        </div>
        <label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label>Senha<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary full" disabled={busy} type="submit"><LockKeyhole size={17} />{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
