import { supabase } from '../lib/supabase';
import type { Repository } from './repository';
import type { ApprovalStatus, AuditEntry, Equipment, InventoryAvailability, Profile, Project, ProjectGroup, ProjectItem, UserRole } from '../types/domain';

function client() { if (!supabase) throw new Error('Supabase não configurado.'); return supabase; }
function unwrap<T>(data: T | null, error: { message: string } | null): T { if (error) throw new Error(error.message); if (data == null) throw new Error('Resposta vazia do servidor.'); return data; }

export const supabaseRepository: Repository = {
  async listProjects() { const { data,error }=await client().from('projects').select('*').order('updated_at',{ascending:false}); return unwrap(data,error) as Project[]; },
  async createProject(input) {
    const { data:userData }=await client().auth.getUser(); if (!userData.user) throw new Error('Sessão inválida.');
    const payload={ name:input.name?.trim() || 'Novo projeto', client:input.client?.trim() || '', venue:input.venue?.trim() || '', address:input.address?.trim() || '', spaces:input.spaces?.trim() || '', commercial_responsible:input.commercial_responsible?.trim() || '', coordinator:input.coordinator?.trim() || '', assembly_start:input.assembly_start ?? null, assembly_end:input.assembly_end ?? null, event_start:input.event_start ?? null, event_end:input.event_end ?? null, release_end:input.release_end ?? null, status:input.status ?? 'draft', metadata:input.metadata ?? {}, created_by:userData.user.id };
    const { data,error }=await client().from('projects').insert(payload).select('*').single(); return unwrap(data,error) as Project;
  },
  async updateProject(id,patch) { const { data,error }=await client().from('projects').update(patch).eq('id',id).select('*').single(); return unwrap(data,error) as Project; },
  async deleteProject(id) { const { error }=await client().from('projects').delete().eq('id',id); if (error) throw new Error(error.message); },

  async listCatalog() { const { data,error }=await client().from('equipment_catalog').select('*').eq('active',true).order('name'); return unwrap(data,error) as Equipment[]; },
  async createEquipment(input) {
    const payload={ name:input.name?.trim() || 'Novo equipamento', category:input.category ?? 'other', manufacturer:input.manufacturer?.trim() || '', model:input.model?.trim() || '', weight_kg:Number(input.weight_kg ?? 0), power_w:Number(input.power_w ?? 0), max_power_w:Number(input.max_power_w ?? input.power_w ?? 0), dmx_channels:Number(input.dmx_channels ?? 0), audio_inputs:Number(input.audio_inputs ?? 0), case_capacity:Number(input.case_capacity ?? 1), module_width_m:input.module_width_m ?? null, module_height_m:input.module_height_m ?? null, pixels_w:input.pixels_w ?? null, pixels_h:input.pixels_h ?? null, pitch_mm:input.pitch_mm ?? null, panel_type:input.panel_type ?? null, output_ports:input.output_ports ?? null, max_pixels:input.max_pixels ?? null, kg_per_m:input.kg_per_m ?? null, stock_total:Number(input.stock_total ?? 0), maintenance_qty:Number(input.maintenance_qty ?? 0), verification_status:input.verification_status ?? 'pending', notes:input.notes?.trim() || '', active:true };
    const { data,error }=await client().from('equipment_catalog').insert(payload).select('*').single(); return unwrap(data,error) as Equipment;
  },
  async updateEquipment(id,patch) { const { data,error }=await client().from('equipment_catalog').update(patch).eq('id',id).select('*').single(); return unwrap(data,error) as Equipment; },
  async archiveEquipment(id) { const { error }=await client().from('equipment_catalog').update({active:false}).eq('id',id); if (error) throw new Error(error.message); },
  async getAvailability(equipmentId,projectId) {
    const { data,error }=await client().rpc('equipment_availability',{p_equipment_id:equipmentId,p_project_id:projectId});
    if (error) throw new Error(error.message);
    const row=Array.isArray(data) ? data[0] : data;
    return row as InventoryAvailability;
  },
  async createReservationOverride(projectId,equipmentId,extraQuantity,reason) {
    const { data:userData }=await client().auth.getUser();
    if (!userData.user) throw new Error('Sessão inválida.');
    if (!reason.trim()) throw new Error('Justificativa obrigatória para forçar reserva.');
    const { error }=await client().from('reservation_overrides').insert({project_id:projectId,equipment_id:equipmentId,extra_quantity:Math.max(1,Math.trunc(extraQuantity)),reason:reason.trim(),approved_by:userData.user.id});
    if (error) throw new Error(error.message);
  },

  async listGroups(projectId) { const { data,error }=await client().from('project_groups').select('*').eq('project_id',projectId).order('created_at'); return unwrap(data,error) as ProjectGroup[]; },
  async createGroup(projectId,input) { const payload={ project_id:projectId, area:input.area ?? 'structure', name:input.name?.trim() || 'Nova estrutura', mount_type:input.mount_type ?? 'floor', structure_type:input.structure_type?.trim() || '', length_m:Number(input.length_m ?? 0), points_count:Number(input.points_count ?? 0), metadata:input.metadata ?? {} }; const { data,error }=await client().from('project_groups').insert(payload).select('*').single(); return unwrap(data,error) as ProjectGroup; },
  async updateGroup(id,patch) { const { data,error }=await client().from('project_groups').update(patch).eq('id',id).select('*').single(); return unwrap(data,error) as ProjectGroup; },
  async deleteGroup(id) { const { error }=await client().from('project_groups').delete().eq('id',id); if (error) throw new Error(error.message); },

  async listItems(projectId) { const { data,error }=await client().from('project_items').select('*').eq('project_id',projectId).order('created_at'); return unwrap(data,error) as ProjectItem[]; },
  async createItem(projectId,input) { if (!input.equipment_id) throw new Error('Equipamento obrigatório.'); const payload={ project_id:projectId, group_id:input.group_id ?? null, area:input.area ?? 'structure', equipment_id:input.equipment_id, quantity:Math.max(1,Number(input.quantity ?? 1)), position_name:input.position_name?.trim() || '', override_weight_kg:input.override_weight_kg ?? null, override_power_w:input.override_power_w ?? null, notes:input.notes?.trim() || '' }; const { data,error }=await client().from('project_items').insert(payload).select('*').single(); return unwrap(data,error) as ProjectItem; },
  async updateItem(id,patch) { const { data,error }=await client().from('project_items').update(patch).eq('id',id).select('*').single(); return unwrap(data,error) as ProjectItem; },
  async deleteItem(id) { const { error }=await client().from('project_items').delete().eq('id',id); if (error) throw new Error(error.message); },

  async listProfiles() { const { data,error }=await client().from('profiles').select('id,full_name,email,role,approval_status,created_at,updated_at').order('full_name'); return unwrap(data,error) as Profile[]; },
  async updateProfile(id,patch:{role?:UserRole;approval_status?:ApprovalStatus;full_name?:string}) { const { data,error }=await client().from('profiles').update(patch).eq('id',id).select('id,full_name,email,role,approval_status,created_at,updated_at').single(); return unwrap(data,error) as Profile; },
  async listAudit(projectId) { let q=client().from('audit_log').select('*').order('created_at',{ascending:false}).limit(100); if (projectId) q=q.eq('project_id',projectId); const { data,error }=await q; return unwrap(data,error) as AuditEntry[]; },
};
