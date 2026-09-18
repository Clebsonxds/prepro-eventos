export type UserRole = 'admin' | 'management' | 'producer' | 'viewer';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ProjectRole = 'owner' | 'editor' | 'viewer';
export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'archived';
export type AreaKey = 'audio' | 'lighting' | 'video' | 'structure';
export type MountType = 'aerial' | 'floor' | 'mixed';
export type VerificationStatus = 'pending' | 'verified';
export type PanelType = 'flat' | 'curved' | 'flexible' | 'other';
export type StructureSource = 'company' | 'venue' | 'third_party';
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
  email: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  created_at?: string;
  updated_at?: string;
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
  release_end: string | null;
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
  max_power_w: number;
  dmx_channels: number;
  audio_inputs: number;
  case_capacity: number;
  module_width_m: number | null;
  module_height_m: number | null;
  pixels_w: number | null;
  pixels_h: number | null;
  pitch_mm: number | null;
  panel_type: PanelType | null;
  output_ports: number | null;
  max_pixels: number | null;
  kg_per_m: number | null;
  stock_total: number;
  maintenance_qty: number;
  verification_status: VerificationStatus;
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
  group_id: string | null;
  area: AreaKey;
  equipment_id: string;
  quantity: number;
  position_name: string;
  override_weight_kg: number | null;
  override_power_w: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string | number;
  project_id: string | null;
  actor_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface InventoryAvailability {
  equipment_id: string;
  stock_total: number;
  maintenance_qty: number;
  reserved_qty: number;
  available_qty: number;
  window_start: string | null;
  window_end: string | null;
}

export interface PresenceEntry {
  user_id: string;
  full_name: string;
  role: UserRole;
  project_id: string | null;
  project_name: string | null;
  route: string;
  online_at: string;
}

export interface ValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  area: 'event' | AreaKey | 'electrical' | 'dossier' | 'inventory';
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
  structureWeightKg: number;
}
