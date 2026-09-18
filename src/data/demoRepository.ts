import { demoCatalog } from './demoCatalog';
import type { Repository } from './repository';
import type { Equipment, Project, ProjectGroup, ProjectItem } from '../types/domain';

const DB_KEY = 'prepro_events_alpha_demo_db_v1';

type DemoDb = {
  projects: Project[];
  catalog: Equipment[];
  groups: ProjectGroup[];
  items: ProjectItem[];
};

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

function initialDb(): DemoDb {
  return { projects: [], catalog: demoCatalog, groups: [], items: [] };
}

function readDb(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return initialDb();
    const parsed = JSON.parse(raw) as DemoDb;
    return {
      projects: parsed.projects ?? [],
      catalog: parsed.catalog?.length ? parsed.catalog : demoCatalog,
      groups: parsed.groups ?? [],
      items: parsed.items ?? [],
    };
  } catch {
    return initialDb();
  }
}

function writeDb(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function mustFind<T extends { id: string }>(rows: T[], id: string): T {
  const row = rows.find((x) => x.id === id);
  if (!row) throw new Error('Registro não encontrado.');
  return row;
}

export const demoRepository: Repository = {
  async listProjects() {
    return readDb().projects.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async createProject(input) {
    const db = readDb();
    const ts = now();
    const project: Project = {
      id: uid('project'),
      name: input.name?.trim() || 'Novo projeto',
      client: input.client?.trim() || '',
      venue: input.venue?.trim() || '',
      address: input.address?.trim() || '',
      spaces: input.spaces?.trim() || '',
      commercial_responsible: input.commercial_responsible?.trim() || '',
      coordinator: input.coordinator?.trim() || '',
      assembly_start: input.assembly_start ?? null,
      assembly_end: input.assembly_end ?? null,
      event_start: input.event_start ?? null,
      event_end: input.event_end ?? null,
      status: input.status ?? 'draft',
      metadata: input.metadata ?? {},
      created_by: 'demo-admin',
      created_at: ts,
      updated_at: ts,
    };
    db.projects.push(project);
    writeDb(db);
    return project;
  },
  async updateProject(id, patch) {
    const db = readDb();
    const current = mustFind(db.projects, id);
    Object.assign(current, patch, { updated_at: now() });
    writeDb(db);
    return { ...current };
  },
  async deleteProject(id) {
    const db = readDb();
    db.projects = db.projects.filter((x) => x.id !== id);
    const groupIds = new Set(db.groups.filter((x) => x.project_id === id).map((x) => x.id));
    db.groups = db.groups.filter((x) => x.project_id !== id);
    db.items = db.items.filter((x) => x.project_id !== id && !groupIds.has(x.group_id));
    writeDb(db);
  },

  async listCatalog() {
    return readDb().catalog.filter((x) => x.active).sort((a, b) => a.name.localeCompare(b.name));
  },
  async createEquipment(input) {
    const db = readDb();
    const ts = now();
    const equipment: Equipment = {
      id: uid('eq'),
      name: input.name?.trim() || 'Novo equipamento',
      category: input.category ?? 'other',
      manufacturer: input.manufacturer?.trim() || '',
      model: input.model?.trim() || '',
      weight_kg: Number(input.weight_kg ?? 0),
      power_w: Number(input.power_w ?? 0),
      dmx_channels: Number(input.dmx_channels ?? 0),
      audio_inputs: Number(input.audio_inputs ?? 0),
      case_capacity: Number(input.case_capacity ?? 1),
      module_width_m: input.module_width_m ?? null,
      module_height_m: input.module_height_m ?? null,
      pixels_w: input.pixels_w ?? null,
      pixels_h: input.pixels_h ?? null,
      notes: input.notes?.trim() || '',
      active: true,
      created_at: ts,
      updated_at: ts,
    };
    db.catalog.push(equipment);
    writeDb(db);
    return equipment;
  },
  async updateEquipment(id, patch) {
    const db = readDb();
    const current = mustFind(db.catalog, id);
    Object.assign(current, patch, { updated_at: now() });
    writeDb(db);
    return { ...current };
  },
  async archiveEquipment(id) {
    const db = readDb();
    const current = mustFind(db.catalog, id);
    current.active = false;
    current.updated_at = now();
    writeDb(db);
  },

  async listGroups(projectId) {
    return readDb().groups.filter((x) => x.project_id === projectId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async createGroup(projectId, input) {
    const db = readDb();
    const ts = now();
    const group: ProjectGroup = {
      id: uid('group'), project_id: projectId, area: input.area ?? 'lighting', name: input.name?.trim() || 'Novo grupo',
      mount_type: input.mount_type ?? 'floor', structure_type: input.structure_type?.trim() || '', length_m: Number(input.length_m ?? 0),
      points_count: Number(input.points_count ?? 0), metadata: input.metadata ?? {}, created_at: ts, updated_at: ts,
    };
    db.groups.push(group);
    writeDb(db);
    return group;
  },
  async updateGroup(id, patch) {
    const db = readDb();
    const current = mustFind(db.groups, id);
    Object.assign(current, patch, { updated_at: now() });
    writeDb(db);
    return { ...current };
  },
  async deleteGroup(id) {
    const db = readDb();
    db.groups = db.groups.filter((x) => x.id !== id);
    db.items = db.items.filter((x) => x.group_id !== id);
    writeDb(db);
  },

  async listItems(projectId) {
    return readDb().items.filter((x) => x.project_id === projectId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async createItem(projectId, input) {
    const db = readDb();
    const ts = now();
    if (!input.group_id || !input.equipment_id) throw new Error('Grupo e equipamento são obrigatórios.');
    const item: ProjectItem = {
      id: uid('item'), project_id: projectId, group_id: input.group_id, equipment_id: input.equipment_id,
      quantity: Math.max(1, Number(input.quantity ?? 1)), override_weight_kg: input.override_weight_kg ?? null,
      override_power_w: input.override_power_w ?? null, notes: input.notes?.trim() || '', created_at: ts, updated_at: ts,
    };
    db.items.push(item);
    writeDb(db);
    return item;
  },
  async updateItem(id, patch) {
    const db = readDb();
    const current = mustFind(db.items, id);
    Object.assign(current, patch, { updated_at: now() });
    writeDb(db);
    return { ...current };
  },
  async deleteItem(id) {
    const db = readDb();
    db.items = db.items.filter((x) => x.id !== id);
    writeDb(db);
  },
};
