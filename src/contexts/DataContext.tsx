import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AreaKey, Equipment, Project, ProjectGroup, ProjectItem } from '../types/domain';
import type { Repository } from '../data/repository';
import { demoRepository } from '../data/demoRepository';
import { supabaseRepository } from '../data/supabaseRepository';
import { isDemoMode } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CURRENT_PROJECT_KEY='prepro_events_alpha_current_project';
interface DataContextValue {
  repository:Repository; loading:boolean; error:string; projects:Project[]; catalog:Equipment[]; currentProject:Project|null; groups:ProjectGroup[]; items:ProjectItem[];
  setCurrentProjectId(id:string|null):void; refreshAll():Promise<void>; refreshCurrentProject():Promise<void>;
  createProject(input:Partial<Project>):Promise<Project>; updateCurrentProject(patch:Partial<Project>):Promise<Project>; deleteCurrentProject():Promise<void>;
  createEquipment(input:Partial<Equipment>):Promise<Equipment>; updateEquipment(id:string,patch:Partial<Equipment>):Promise<Equipment>; archiveEquipment(id:string):Promise<void>;
  createGroup(area:AreaKey,input?:Partial<ProjectGroup>):Promise<ProjectGroup>; updateGroup(id:string,patch:Partial<ProjectGroup>):Promise<ProjectGroup>; deleteGroup(id:string):Promise<void>;
  createItem(input:Partial<ProjectItem> & { equipment_id:string }):Promise<ProjectItem>; updateItem(id:string,patch:Partial<ProjectItem>):Promise<ProjectItem>; deleteItem(id:string):Promise<void>;
}
const DataContext=createContext<DataContextValue|null>(null);
export function DataProvider({children}:{children:ReactNode}) {
  const auth=useAuth(); const repository=isDemoMode?demoRepository:supabaseRepository;
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [projects,setProjects]=useState<Project[]>([]),[catalog,setCatalog]=useState<Equipment[]>([]),[groups,setGroups]=useState<ProjectGroup[]>([]),[items,setItems]=useState<ProjectItem[]>([]);
  const [currentProjectId,setCurrentProjectIdState]=useState<string|null>(()=>localStorage.getItem(CURRENT_PROJECT_KEY));
  const currentProject=projects.find(p=>p.id===currentProjectId)??null;
  const setCurrentProjectId=useCallback((id:string|null)=>{setCurrentProjectIdState(id);if(id)localStorage.setItem(CURRENT_PROJECT_KEY,id);else localStorage.removeItem(CURRENT_PROJECT_KEY);},[]);
  const refreshAll=useCallback(async()=>{if(!auth.authenticated)return;setLoading(true);setError('');try{const [p,c]=await Promise.all([repository.listProjects(),repository.listCatalog()]);setProjects(p);setCatalog(c);if(currentProjectId&&!p.some(x=>x.id===currentProjectId))setCurrentProjectId(null);}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar.');}finally{setLoading(false);}},[auth.authenticated,repository,currentProjectId,setCurrentProjectId]);
  const refreshCurrentProject=useCallback(async()=>{if(!auth.authenticated||!currentProjectId){setGroups([]);setItems([]);return;}try{const [g,i]=await Promise.all([repository.listGroups(currentProjectId),repository.listItems(currentProjectId)]);setGroups(g);setItems(i);}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar projeto.');}},[auth.authenticated,currentProjectId,repository]);
  useEffect(()=>{if(auth.authenticated)void refreshAll();else{setProjects([]);setCatalog([]);setGroups([]);setItems([]);}},[auth.authenticated]);
  useEffect(()=>{void refreshCurrentProject();},[currentProjectId,refreshCurrentProject]);
  const value=useMemo<DataContextValue>(()=>({repository,loading,error,projects,catalog,currentProject,groups,items,setCurrentProjectId,refreshAll,refreshCurrentProject,
    async createProject(input){const p=await repository.createProject(input);setProjects(prev=>[p,...prev]);setCurrentProjectId(p.id);return p;},
    async updateCurrentProject(patch){if(!currentProject)throw new Error('Nenhum projeto selecionado.');const p=await repository.updateProject(currentProject.id,patch);setProjects(prev=>prev.map(x=>x.id===p.id?p:x));return p;},
    async deleteCurrentProject(){if(!currentProject)return;await repository.deleteProject(currentProject.id);setProjects(prev=>prev.filter(x=>x.id!==currentProject.id));setGroups([]);setItems([]);setCurrentProjectId(null);},
    async createEquipment(input){const e=await repository.createEquipment(input);setCatalog(prev=>[...prev,e].sort((a,b)=>a.name.localeCompare(b.name)));return e;},
    async updateEquipment(id,patch){const e=await repository.updateEquipment(id,patch);setCatalog(prev=>prev.map(x=>x.id===id?e:x).sort((a,b)=>a.name.localeCompare(b.name)));return e;},
    async archiveEquipment(id){await repository.archiveEquipment(id);setCatalog(prev=>prev.filter(x=>x.id!==id));},
    async createGroup(area,input={}){if(!currentProject)throw new Error('Selecione um projeto.');const g=await repository.createGroup(currentProject.id,{...input,area});setGroups(prev=>[...prev,g]);return g;},
    async updateGroup(id,patch){const g=await repository.updateGroup(id,patch);setGroups(prev=>prev.map(x=>x.id===id?g:x));return g;},
    async deleteGroup(id){await repository.deleteGroup(id);setGroups(prev=>prev.filter(x=>x.id!==id));setItems(prev=>prev.map(x=>x.group_id===id?{...x,group_id:null}:x));},
    async createItem(input){if(!currentProject)throw new Error('Selecione um projeto.');const item=await repository.createItem(currentProject.id,input);setItems(prev=>[...prev,item]);return item;},
    async updateItem(id,patch){const item=await repository.updateItem(id,patch);setItems(prev=>prev.map(x=>x.id===id?item:x));return item;},
    async deleteItem(id){await repository.deleteItem(id);setItems(prev=>prev.filter(x=>x.id!==id));},
  }),[repository,loading,error,projects,catalog,currentProject,groups,items,setCurrentProjectId,refreshAll,refreshCurrentProject]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useData(){const v=useContext(DataContext);if(!v)throw new Error('useData fora do provider');return v;}
