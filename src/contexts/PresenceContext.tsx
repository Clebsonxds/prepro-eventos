import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { isDemoMode, supabase } from '../lib/supabase';
import type { PresenceEntry } from '../types/domain';

const PresenceContext=createContext<PresenceEntry[]>([]);
export function PresenceProvider({children}:{children:ReactNode}){const auth=useAuth();const data=useData();const location=useLocation();const [entries,setEntries]=useState<PresenceEntry[]>([]);
  useEffect(()=>{
    if(!auth.profile)return;
    if(isDemoMode){setEntries([{user_id:auth.profile.id,full_name:auth.profile.full_name,role:auth.profile.role,project_id:data.currentProject?.id??null,project_name:data.currentProject?.name??null,route:location.pathname,online_at:new Date().toISOString()}]);return;}
    if(!supabase)return;
    const channel=supabase.channel('prepro-presence',{config:{presence:{key:auth.profile.id}}});
    channel.on('presence',{event:'sync'},()=>{const state=channel.presenceState();const rows:PresenceEntry[]=[];Object.values(state).flat().forEach(raw=>{const p=raw as unknown as PresenceEntry;if(p.user_id)rows.push(p)});setEntries(rows);});
    void channel.subscribe(async status=>{if(status==='SUBSCRIBED')await channel.track({user_id:auth.profile!.id,full_name:auth.profile!.full_name,role:auth.profile!.role,project_id:data.currentProject?.id??null,project_name:data.currentProject?.name??null,route:location.pathname,online_at:new Date().toISOString()});});
    return()=>{void supabase.removeChannel(channel)};
  },[auth.profile?.id,data.currentProject?.id,location.pathname]);
  const value=useMemo(()=>entries,[entries]);return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
export function usePresence(){return useContext(PresenceContext)}
