import type { AuditEntry, Equipment, InventoryAvailability, Profile, Project, ProjectGroup, ProjectItem, UserRole, ApprovalStatus, AreaKey } from '../types/domain';

export interface Repository {
  listProjects(): Promise<Project[]>;
  createProject(input: Partial<Project>): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  listCatalog(): Promise<Equipment[]>;
  createEquipment(input: Partial<Equipment>): Promise<Equipment>;
  updateEquipment(id: string, patch: Partial<Equipment>): Promise<Equipment>;
  archiveEquipment(id: string): Promise<void>;
  getAvailability(equipmentId: string, projectId: string): Promise<InventoryAvailability>;
  createReservationOverride(projectId: string, equipmentId: string, extraQuantity: number, reason: string): Promise<void>;

  listGroups(projectId: string): Promise<ProjectGroup[]>;
  createGroup(projectId: string, input: Partial<ProjectGroup>): Promise<ProjectGroup>;
  updateGroup(id: string, patch: Partial<ProjectGroup>): Promise<ProjectGroup>;
  deleteGroup(id: string): Promise<void>;

  listItems(projectId: string): Promise<ProjectItem[]>;
  createItem(projectId: string, input: Partial<ProjectItem>): Promise<ProjectItem>;
  updateItem(id: string, patch: Partial<ProjectItem>): Promise<ProjectItem>;
  deleteItem(id: string): Promise<void>;

  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: { role?: UserRole; approval_status?: ApprovalStatus; full_name?: string }): Promise<Profile>;
  listAudit(projectId?: string | null): Promise<AuditEntry[]>;
  addAudit?(input: Omit<AuditEntry, 'id' | 'created_at'>): Promise<void>;
}

export type CreateProjectItemInput = {
  area: AreaKey;
  group_id?: string | null;
  equipment_id: string;
  quantity: number;
  position_name?: string;
  notes?: string;
};
