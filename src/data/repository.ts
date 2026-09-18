import type { Equipment, Project, ProjectGroup, ProjectItem } from '../types/domain';

export interface Repository {
  listProjects(): Promise<Project[]>;
  createProject(input: Partial<Project>): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  listCatalog(): Promise<Equipment[]>;
  createEquipment(input: Partial<Equipment>): Promise<Equipment>;
  updateEquipment(id: string, patch: Partial<Equipment>): Promise<Equipment>;
  archiveEquipment(id: string): Promise<void>;

  listGroups(projectId: string): Promise<ProjectGroup[]>;
  createGroup(projectId: string, input: Partial<ProjectGroup>): Promise<ProjectGroup>;
  updateGroup(id: string, patch: Partial<ProjectGroup>): Promise<ProjectGroup>;
  deleteGroup(id: string): Promise<void>;

  listItems(projectId: string): Promise<ProjectItem[]>;
  createItem(projectId: string, input: Partial<ProjectItem>): Promise<ProjectItem>;
  updateItem(id: string, patch: Partial<ProjectItem>): Promise<ProjectItem>;
  deleteItem(id: string): Promise<void>;
}
