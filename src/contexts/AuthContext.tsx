import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Profile } from '../types/domain';
import { hasSupabaseConfig, isDemoMode, supabase } from '../lib/supabase';
import { validatePassword } from '../utils/password';

interface AuthContextValue {
  ready:boolean;
  authenticated:boolean;
  approved:boolean;
  profile:Profile|null;
  demo:boolean;
  configured:boolean;
  signIn(email:string,password:string):Promise<void>;
  signUp(fullName:string,email:string,password:string):Promise<void>;
  signOut():Promise<void>;
}
const AuthContext=createContext<AuthContextValue|null>(null);

export function AuthProvider({children}:{children:ReactNode}){
  const [ready,setReady]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);

  useEffect(()=>{
    let mounted=true;
    if(isDemoMode){
      setProfile({id:'demo-admin',full_name:'Administrador de demonstração',email:'admin@demo.local',role:'admin',approval_status:'approved'});
      setReady(true); return;
    }
    if(!supabase){setReady(true);return;}

    async function loadProfile(userId:string|null,email=''){
      if(!mounted)return;
      if(!userId){setProfile(null);setReady(true);return;}
      const {data,error}=await supabase!.from('profiles').select('id,full_name,email,role,approval_status').eq('id',userId).single();
      if(!mounted)return;
      if(error) setProfile({id:userId,full_name:email.split('@')[0]||'Usuário',email,role:'viewer',approval_status:'pending'});
      else setProfile(data as Profile);
      setReady(true);
    }
    void supabase.auth.getSession().then(({data})=>loadProfile(data.session?.user.id??null,data.session?.user.email??''));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{void loadProfile(session?.user.id??null,session?.user.email??'');});
    return()=>{mounted=false;listener.subscription.unsubscribe();};
  },[]);

  const value=useMemo<AuthContextValue>(()=>({
    ready,
    authenticated:Boolean(profile),
    approved:profile?.approval_status==='approved',
    profile,
    demo:isDemoMode,
    configured:isDemoMode||hasSupabaseConfig,
    async signIn(email,password){
      if(isDemoMode)return;
      if(!supabase)throw new Error('O Supabase ainda não foi configurado.');
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw new Error(error.message);
    },
    async signUp(fullName,email,password){
      if(isDemoMode)throw new Error('Cadastro real fica desativado no modo DEMO.');
      if(!supabase)throw new Error('O Supabase ainda não foi configurado.');
      const issues=validatePassword(password); if(issues.length)throw new Error(issues.join(' '));
      const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName.trim()}}});
      if(error)throw new Error(error.message);
    },
    async signOut(){if(isDemoMode)return;if(supabase)await supabase.auth.signOut();setProfile(null);},
  }),[ready,profile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('useAuth fora do provider');return v;}
