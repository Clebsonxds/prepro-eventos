import type { Repository } from './repository';
import type { Equipment, Project, ProjectGroup, ProjectItem } from '../types/domain';
import { supabase } from '../lib/supabase';

function client() {
  if (!supabase) throw new Error('Supabase ainda não foi configurado.');
  return supabase;
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('A operação não retornou dados.');
  return data;
}

export const supabaseRepository: Repository = {
  async listProjects() {
    const { data, error } = await client().from('projects').select('*').order('updated_at', { ascending: false });
    return unwrap(data, error) as Project[];
  },
  async createProject(input) {
    const { data: userData, error: userError } = await client().auth.getUser();
    if (userError || !userData.user) throw new Error('Sessão inválida.');
    const payload = {
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
      created_by: userData.user.id,
    };
    const { data, error } = await client().from('projects').insert(payload).select('*').single();
    return unwrap(data, error) as Project;
  },
  async updateProject(id, patch) {
    const { data, error } = await client().from('projects').update(patch).eq('id', id).select('*').single();
    return unwrap(data, error) as Project;
  },
  async deleteProject(id) {
    const { error } = await client().from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listCatalog() {
    const { data, error } = await client().from('equipment_catalog').select('*').eq('active', true).order('name');
    return unwrap(data, error) as Equipment[];
  },
  async createEquipment(input) {
    const payload = {
      name: input.name?.trim() || 'Novo equipamento', category: input.category ?? 'other',
      manufacturer: input.manufacturer?.trim() || '', model: input.model?.trim() || '',
      weight_kg: Number(input.weight_kg ?? 0), power_w: Number(input.power_w ?? 0),
      dmx_channels: Number(input.dmx_channels ?? 0), audio_inputs: Number(input.audio_inputs ?? 0),
      case_capacity: Number(input.case_capacity ?? 1), module_width_m: input.module_width_m ?? null,
      module_height_m: input.module_height_m ?? null, pixels_w: input.pixels_w ?? null, pixels_h: input.pixels_h ?? null,
      notes: input.notes?.trim() || '', active: true,
    };
    const { data, error } = await client().from('equipment_catalog').insert(payload).select('*').single();
    return unwrap(data, error) as Equipment;
  },
  async updateEquipment(id, patch) {
    const { data, error } = await client().from('equipment_catalog').update(patch).eq('id', id).select('*').single();
    return unwrap(data, error) as Equipment;
  },
  async archiveEquipment(id) {
    const { error } = await client().from('equipment_catalog').update({ active: false }).eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listGroups(projectId) {
    const { data, error } = await client().from('project_groups').select('*').eq('project_id', projectId).order('created_at');
    return unwrap(data, error) as ProjectGroup[];
  },
  async createGroup(projectId, input) {
    const payload = {
      project_id: projectId, area: input.area ?? 'lighting', name: input.name?.trim() || 'Novo grupo',
      mount_type: input.mount_type ?? 'floor', structure_type: input.structure_type?.trim() || '',
      length_m: Number(input.length_m ?? 0), points_count: Number(input.points_count ?? 0), metadata: input.metadata ?? {},
    };
    const { data, error } = await client().from('project_groups').insert(payload).select('*').single();
    return unwrap(data, error) as ProjectGroup;
  },
  async updateGroup(id, patch) {
    const { data, error } = await client().from('project_groups').update(patch).eq('id', id).select('*').single();
    return unwrap(data, error) as ProjectGroup;
  },
  async deleteGroup(id) {
    const { error } = await client().from('project_groups').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listItems(projectId) {
    const { data, error } = await client().from('project_items').select('*').eq('project_id', projectId).order('created_at');
    return unwrap(data, error) as ProjectItem[];
  },
  async createItem(projectId, input) {
    if (!input.group_id || !input.equipment_id) throw new Error('Grupo e equipamento são obrigatórios.');
    const payload = {
      project_id: projectId, group_id: input.group_id, equipment_id: input.equipment_id,
      quantity: Math.max(1, Number(input.quantity ?? 1)), override_weight_kg: input.override_weight_kg ?? null,
      override_power_w: input.override_power_w ?? null, notes: input.notes?.trim() || '',
    };
    const { data, error } = await client().from('project_items').insert(payload).select('*').single();
    return unwrap(data, error) as ProjectItem;
  },
  async updateItem(id, patch) {
    const { data, error } = await client().from('project_items').update(patch).eq('id', id).select('*').single();
    return unwrap(data, error) as ProjectItem;
  },
  async deleteItem(id) {
    const { error } = await client().from('project_items').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
