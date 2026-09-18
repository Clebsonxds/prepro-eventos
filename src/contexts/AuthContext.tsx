import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Profile } from '../types/domain';
import { hasSupabaseConfig, isDemoMode, supabase } from '../lib/supabase';

interface AuthContextValue {
  ready: boolean;
  authenticated: boolean;
  profile: Profile | null;
  demo: boolean;
  configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    if (isDemoMode) {
      setProfile({ id: 'demo-admin', full_name: 'Usuário de demonstração', role: 'admin' });
      setReady(true);
      return;
    }

    if (!supabase) {
      setReady(true);
      return;
    }

    async function loadProfile(userId: string | null) {
      if (!mounted) return;
      if (!userId) {
        setProfile(null);
        setReady(true);
        return;
      }
      const { data, error } = await supabase!.from('profiles').select('id, full_name, role').eq('id', userId).single();
      if (!mounted) return;
      if (error) {
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
      setReady(true);
    }

    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    authenticated: Boolean(profile),
    profile,
    demo: isDemoMode,
    configured: isDemoMode || hasSupabaseConfig,
    async signIn(email, password) {
      if (isDemoMode) return;
      if (!supabase) throw new Error('O Supabase ainda não foi configurado.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      if (isDemoMode) return;
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
    },
  }), [profile, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
}
