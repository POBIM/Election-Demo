// User Roles
export type UserRole = 
  | 'super_admin'      // Full system access
  | 'regional_admin'   // Manage provinces in their region
  | 'province_admin'   // Manage districts in their province
  | 'district_official' // Input/verify votes for their district
  | 'voter';           // Can cast votes only

// Official Scope (for RBAC)
export interface OfficialScope {
  regionId?: string;    // For regional_admin
  provinceId?: string;  // For province_admin
  districtId?: string;  // For district_official
}

// Permission definitions
export type Permission = 
  // Election management
  | 'election:create'
  | 'election:read'
  | 'election:update'
  | 'election:delete'
  | 'election:manage_status'
  
  // Party/Candidate management
  | 'party:create'
  | 'party:read'
  | 'party:update'
  | 'party:delete'
  | 'candidate:create'
  | 'candidate:read'
  | 'candidate:update'
  | 'candidate:delete'
  
  // Vote management
  | 'vote:cast'           // For voters
  | 'vote:batch_upload'   // For officials
  | 'vote:batch_approve'  // For admins
  | 'vote:view_results'
  
  // User management
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete';

// Role -> Permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'election:create', 'election:read', 'election:update', 'election:delete', 'election:manage_status',
    'party:create', 'party:read', 'party:update', 'party:delete',
    'candidate:create', 'candidate:read', 'candidate:update', 'candidate:delete',
    'vote:batch_upload', 'vote:batch_approve', 'vote:view_results',
    'user:create', 'user:read', 'user:update', 'user:delete',
  ],
  regional_admin: [
    'election:read',
    'party:read',
    'candidate:read', 'candidate:create', 'candidate:update',
    'vote:batch_approve', 'vote:view_results',
    'user:read',
  ],
  province_admin: [
    'election:read',
    'party:read',
    'candidate:read', 'candidate:create', 'candidate:update',
    'vote:batch_approve', 'vote:view_results',
    'user:read',
  ],
  district_official: [
    'election:read',
    'party:read',
    'candidate:read',
    'vote:batch_upload', 'vote:view_results',
  ],
  voter: [
    'election:read',
    'party:read',
    'candidate:read',
    'vote:cast',
    'vote:view_results',
  ],
};

// Helper function to check permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper function to check scope access
export function canAccessDistrict(
  userRole: UserRole,
  userScope: OfficialScope | undefined,
  targetDistrictId: string,
  districtProvinceId: string,
  provinceRegionId: string
): boolean {
  if (userRole === 'super_admin') return true;
  if (userRole === 'voter') return false;
  
  if (!userScope) return false;
  
  switch (userRole) {
    case 'regional_admin':
      return userScope.regionId === provinceRegionId;
    case 'province_admin':
      return userScope.provinceId === districtProvinceId;
    case 'district_official':
      return userScope.districtId === targetDistrictId;
    default:
      return false;
  }
}
