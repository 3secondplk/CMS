// Permission types for future RBAC
export type Permission =
  | 'dashboard.read'
  | 'sales.read'
  | 'sales.write'
  | 'sales.claim'
  | 'sales.export'
  | 'sales.import'
  | 'tiktok.read'
  | 'tiktok.write'
  | 'tiktok.export'
  | 'tiktok.import'
  | 'crew.read'
  | 'crew.write'
  | 'group.read'
  | 'group.write'
  | 'data.export'
  | 'data.import'
  | 'data.delete'
  | 'report.read'
  | 'audit.read'
  | 'settings.manage'

// Current implementation: all authenticated admins have all permissions
// Future: check against role/permission table
export function hasPermission(_userId: string, _permission: Permission): boolean {
  // Phase 1: all authenticated users have all permissions
  // Phase 3+: check against role/permission database
  return true
}

export function requirePermission(userId: string, permission: Permission): boolean {
  return hasPermission(userId, permission)
}
