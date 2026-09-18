import { demoCatalog } from './demoCatalog';
import type { Repository } from './repository';
import type { AuditEntry, Equipment, InventoryAvailability, Profile, Project, ProjectGroup, ProjectItem } from '../types/domain';
import { projectWindow, windowsOverlap } from '../utils/dates';

const DB_KEY = 'prepro_events_alpha_demo_db_v2';

type DemoDb = {
  projects: Project[];
  catalog: Equipment[];
  groups: ProjectGroup[];
  items: ProjectItem[];
  profiles: Profile[];
  audit: AuditEntry[];
  overrides: { id:string; project_id:string; equipment_id:string; extra_quantity:number; reason:string; created_at:string }[];
};

function uid(prefix: string) { return `${prefix}_${crypto.randomUUID()}`; }
function now() { return new Date().toISOString(); }

function initialDb(): DemoDb {
  return {
    projects: [], catalog: demoCatalog, groups: [], items: [],
    profiles: [
      { id:'demo-admin', full_name:'Administrador de demonstração', email:'admin@demo.local', role:'admin', approval_status:'approved', created_at:now(), updated_at:now() },
      { id:'demo-pending', full_name:'Usuário aguardando aprovação', email:'novo@demo.local', role:'viewer', approval_status:'pending', created_at:now(), updated_at:now() },
    ],
    audit: [], overrides: [],
  };
}

function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initialDb();
    const parsed = JSON.parse(raw) as Partial<DemoDb>;
    return {
      projects: parsed.projects ?? [],
      catalog: parsed.catalog?.length ? parsed.catalog : demoCatalog,
      groups: parsed.groups ?? [],
      items: parsed.items ?? [],
      profiles: parsed.profiles?.length ? parsed.profiles : initialDb().profiles,
      audit: parsed.audit ?? [],
      overrides: parsed.overrides ?? [],
    };
  } catch { return initialDb(); }
}
function writeDb(db: DemoDb) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function mustFind<T extends { id: string }>(rows: T[], id: string): T { const row = rows.find((x) => x.id === id); if (!row) throw new Error('Registro não encontrado.'); return row; }
function log(db: DemoDb, action: string, entityType: string, entityId: string, projectId: string | null, payload: Record<string, unknown> = {}) {
  db.audit.unshift({ id:uid('audit'), project_id:projectId, actor_id:'demo-admin', actor_name:'Administrador de demonstração', action, entity_type:entityType, entity_id:entityId, payload, created_at:now() });
  db.audit = db.audit.slice(0, 300);
}

function availabilityFromDb(db: DemoDb, equipmentId: string, projectId: string): InventoryAvailability {
  const eq = mustFind(db.catalog, equipmentId);
  const project = mustFind(db.projects, projectId);
  const window = projectWindow(project);
  let reserved = 0;
  if (window.start && window.end) {
    for (const otherProject of db.projects) {
      if (otherProject.id === projectId) continue;
      const otherWindow = projectWindow(otherProject);
      if (!windowsOverlap(window.start, window.end, otherWindow.start, otherWindow.end)) continue;
      reserved += db.items.filter((item) => item.project_id === otherProject.id && item.equipment_id === equipmentId).reduce((sum, item) => sum + item.quantity, 0);
    }
  }
  const ownReserved = db.items.filter(item=>item.project_id===projectId && item.equipment_id===equipmentId).reduce((sum,item)=>sum+item.quantity,0);
  const overrideQty = db.overrides.filter(o=>o.project_id===projectId && o.equipment_id===equipmentId).reduce((sum,o)=>sum+o.extra_quantity,0);
  const available = Math.max(0, eq.stock_total - eq.maintenance_qty - reserved - ownReserved + overrideQty);
  return { equipment_id:equipmentId, stock_total:eq.stock_total, maintenance_qty:eq.maintenance_qty, reserved_qty:reserved, available_qty:available, window_start:window.start, window_end:window.end };
}

export const demoRepository: Repository = {
  async listProjects() { return readDb().projects.sort((a,b) => b.updated_at.localeCompare(a.updated_at)); },
  async createProject(input) {
    const db=readDb(), ts=now();
    const project: Project = {
      id:uid('project'), name:input.name?.trim() || 'Novo projeto', client:input.client?.trim() || '', venue:input.venue?.trim() || '', address:input.address?.trim() || '', spaces:input.spaces?.trim() || '', commercial_responsible:input.commercial_responsible?.trim() || '', coordinator:input.coordinator?.trim() || '',
      assembly_start:input.assembly_start ?? null, assembly_end:input.assembly_end ?? null, event_start:input.event_start ?? null, event_end:input.event_end ?? null, release_end:input.release_end ?? null,
      status:input.status ?? 'draft', metadata:input.metadata ?? {}, created_by:'demo-admin', created_at:ts, updated_at:ts,
    };
    db.projects.push(project); log(db,'create','project',project.id,project.id,{name:project.name}); writeDb(db); return project;
  },
  async updateProject(id, patch) { const db=readDb(), current=mustFind(db.projects,id); Object.assign(current,patch,{updated_at:now()}); log(db,'update','project',id,id,patch as Record<string,unknown>); writeDb(db); return {...current}; },
  async deleteProject(id) { const db=readDb(); db.projects=db.projects.filter(x=>x.id!==id); const groupIds=new Set(db.groups.filter(x=>x.project_id===id).map(x=>x.id)); db.groups=db.groups.filter(x=>x.project_id!==id); db.items=db.items.filter(x=>x.project_id!==id && !groupIds.has(x.group_id ?? '')); log(db,'delete','project',id,id); writeDb(db); },

  async listCatalog() { return readDb().catalog.filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name)); },
  async createEquipment(input) {
    const db=readDb(), ts=now();
    const equipment: Equipment = {
      id:uid('eq'), name:input.name?.trim() || 'Novo equipamento', category:input.category ?? 'other', manufacturer:input.manufacturer?.trim() || '', model:input.model?.trim() || '', weight_kg:Number(input.weight_kg ?? 0), power_w:Number(input.power_w ?? 0), max_power_w:Number(input.max_power_w ?? input.power_w ?? 0), dmx_channels:Number(input.dmx_channels ?? 0), audio_inputs:Number(input.audio_inputs ?? 0), case_capacity:Number(input.case_capacity ?? 1), module_width_m:input.module_width_m ?? null, module_height_m:input.module_height_m ?? null, pixels_w:input.pixels_w ?? null, pixels_h:input.pixels_h ?? null, pitch_mm:input.pitch_mm ?? null, panel_type:input.panel_type ?? null, output_ports:input.output_ports ?? null, max_pixels:input.max_pixels ?? null, kg_per_m:input.kg_per_m ?? null, stock_total:Number(input.stock_total ?? 0), maintenance_qty:Number(input.maintenance_qty ?? 0), verification_status:input.verification_status ?? 'pending', notes:input.notes?.trim() || '', active:true, created_at:ts, updated_at:ts,
    };
    db.catalog.push(equipment); log(db,'create','equipment',equipment.id,null,{name:equipment.name}); writeDb(db); return equipment;
  },
  async updateEquipment(id, patch) { const db=readDb(), current=mustFind(db.catalog,id); Object.assign(current,patch,{updated_at:now()}); log(db,'update','equipment',id,null,patch as Record<string,unknown>); writeDb(db); return {...current}; },
  async archiveEquipment(id) { const db=readDb(), current=mustFind(db.catalog,id); current.active=false; current.updated_at=now(); log(db,'archive','equipment',id,null,{name:current.name}); writeDb(db); },
  async getAvailability(equipmentId, projectId) { return availabilityFromDb(readDb(),equipmentId,projectId); },
  async createReservationOverride(projectId,equipmentId,extraQuantity,reason) {
    const db=readDb(); const qty=Math.max(1,Math.trunc(extraQuantity));
    if(!reason.trim()) throw new Error('Justificativa obrigatória para forçar reserva.');
    db.overrides.push({id:uid('override'),project_id:projectId,equipment_id:equipmentId,extra_quantity:qty,reason:reason.trim(),created_at:now()});
    log(db,'override_inventory','reservation_override',equipmentId,projectId,{extra_quantity:qty,reason:reason.trim()}); writeDb(db);
  },

  async listGroups(projectId) { return readDb().groups.filter(x=>x.project_id===projectId).sort((a,b)=>a.created_at.localeCompare(b.created_at)); },
  async createGroup(projectId,input) {
    const db=readDb(), ts=now();
    const group: ProjectGroup = { id:uid('group'), project_id:projectId, area:input.area ?? 'structure', name:input.name?.trim() || 'Nova estrutura', mount_type:input.mount_type ?? 'floor', structure_type:input.structure_type?.trim() || '', length_m:Number(input.length_m ?? 0), points_count:Number(input.points_count ?? 0), metadata:input.metadata ?? {}, created_at:ts, updated_at:ts };
    db.groups.push(group); log(db,'create','group',group.id,projectId,{name:group.name,area:group.area}); writeDb(db); return group;
  },
  async updateGroup(id,patch) { const db=readDb(), current=mustFind(db.groups,id); Object.assign(current,patch,{updated_at:now()}); log(db,'update','group',id,current.project_id,patch as Record<string,unknown>); writeDb(db); return {...current}; },
  async deleteGroup(id) { const db=readDb(), current=mustFind(db.groups,id); db.groups=db.groups.filter(x=>x.id!==id); db.items=db.items.map(item=>item.group_id===id ? {...item,group_id:null} : item); log(db,'delete','group',id,current.project_id,{name:current.name}); writeDb(db); },

  async listItems(projectId) { return readDb().items.filter(x=>x.project_id===projectId).sort((a,b)=>a.created_at.localeCompare(b.created_at)); },
  async createItem(projectId,input) {
    const db=readDb(), ts=now(); if (!input.equipment_id) throw new Error('Equipamento obrigatório.');
    const qty=Math.max(1,Number(input.quantity ?? 1));
    const availability=availabilityFromDb(db,input.equipment_id,projectId);
    if (availability.stock_total > 0 && qty > availability.available_qty) throw new Error(`Estoque insuficiente. Disponíveis para adicionar neste período: ${availability.available_qty}.`);
    const item: ProjectItem = { id:uid('item'), project_id:projectId, group_id:input.group_id ?? null, area:input.area ?? 'structure', equipment_id:input.equipment_id, quantity:qty, position_name:input.position_name?.trim() || '', override_weight_kg:input.override_weight_kg ?? null, override_power_w:input.override_power_w ?? null, notes:input.notes?.trim() || '', created_at:ts, updated_at:ts };
    db.items.push(item); log(db,'create','item',item.id,projectId,{equipment_id:item.equipment_id,quantity:item.quantity,area:item.area}); writeDb(db); return item;
  },
  async updateItem(id,patch) {
    const db=readDb(), current=mustFind(db.items,id);
    if (patch.quantity !== undefined) {
      const availability=availabilityFromDb(db,current.equipment_id,current.project_id);
      const delta=Number(patch.quantity)-current.quantity;
      if (availability.stock_total > 0 && delta > availability.available_qty) throw new Error(`Estoque insuficiente. Disponíveis para adicionar neste período: ${availability.available_qty}.`);
    }
    Object.assign(current,patch,{updated_at:now()}); log(db,'update','item',id,current.project_id,patch as Record<string,unknown>); writeDb(db); return {...current};
  },
  async deleteItem(id) { const db=readDb(), current=mustFind(db.items,id); db.items=db.items.filter(x=>x.id!==id); log(db,'delete','item',id,current.project_id,{equipment_id:current.equipment_id}); writeDb(db); },

  async listProfiles() { return readDb().profiles.sort((a,b)=>a.full_name.localeCompare(b.full_name)); },
  async updateProfile(id,patch) { const db=readDb(), current=mustFind(db.profiles,id); Object.assign(current,patch,{updated_at:now()}); log(db,'update','profile',id,null,patch as Record<string,unknown>); writeDb(db); return {...current}; },
  async listAudit(projectId) { const rows=readDb().audit; return (projectId ? rows.filter(x=>x.project_id===projectId) : rows).slice(0,100); },
  async addAudit(input) { const db=readDb(); db.audit.unshift({...input,id:uid('audit'),created_at:now()}); writeDb(db); },
};
