import type { Profile } from '../types/domain';
export function canEditProjects(profile:Profile|null){return !!profile && ['admin','management','producer'].includes(profile.role) && profile.approval_status==='approved';}
export function canManageCatalog(profile:Profile|null){return !!profile && ['admin','management'].includes(profile.role) && profile.approval_status==='approved';}
export function canManageUsers(profile:Profile|null){return !!profile && ['admin','management'].includes(profile.role) && profile.approval_status==='approved';}
export function canPromoteManagement(profile:Profile|null){return profile?.role==='admin' && profile.approval_status==='approved';}
