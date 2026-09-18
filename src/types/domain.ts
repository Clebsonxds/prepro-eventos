export type UserRole = 'admin' | 'producer' | 'viewer';
export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'archived';
export type AreaKey = 'audio' | 'lighting' | 'video' | 'structure';
export type MountType = 'aerial' | 'floor' | 'mixed';
export type EquipmentCategory =
  | 'audio_console'
  | 'audio_box'
  | 'audio_stagebox'
  | 'lighting_fixture'
  | 'lighting_console'
  | 'video_panel'
  | 'video_processor'
  | 'structure'
  | 'power'
  | 'other';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  venue: string;
  address: string;
  spaces: string;
  commercial_responsible: string;
  coordinator: string;
  assembly_start: string | null;
  assembly_end: string | null;
  event_start: string | null;
  event_end: string | null;
  status: ProjectStatus;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  manufacturer: string;
  model: string;
  weight_kg: number;
  power_w: number;
  dmx_channels: number;
  audio_inputs: number;
  case_capacity: number;
  module_width_m: number | null;
  module_height_m: number | null;
  pixels_w: number | null;
  pixels_h: number | null;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectGroup {
  id: string;
  project_id: string;
  area: AreaKey;
  name: string;
  mount_type: MountType;
  structure_type: string;
  length_m: number;
  points_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectItem {
  id: string;
  project_id: string;
  group_id: string;
  equipment_id: string;
  quantity: number;
  override_weight_kg: number | null;
  override_power_w: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  area: 'event' | AreaKey | 'electrical' | 'dossier';
  message: string;
}

export interface ProjectTotals {
  totalWeightKg: number;
  aerialWeightKg: number;
  floorWeightKg: number;
  totalPowerW: number;
  dmxChannels: number;
  audioInputs: number;
  itemCount: number;
}
