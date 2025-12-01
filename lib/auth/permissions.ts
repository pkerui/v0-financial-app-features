/**
 * 权限管理工具函数
 *
 * 角色权限说明：
 * - owner: 老板，所有权限，可管理用户
 * - accountant: 财务，所有数据权限，不能管理用户
 * - manager: 店长，指定店铺的查看/录入/编辑/删除（店铺内所有交易）
 * - user: 员工，指定店铺的查看/录入
 */

export type UserRole = 'owner' | 'accountant' | 'manager' | 'user'

export interface UserProfile {
  id: string
  company_id: string | null
  full_name: string | null
  role: UserRole
  managed_store_ids: string[]
  avatar_url?: string | null
}

export interface Permission {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canManageUsers: boolean
  canManageStores: boolean
  canAccessAllStores: boolean
  accessibleStoreIds: string[]
}

/**
 * 角色权限配置
 */
const rolePermissions: Record<UserRole, Omit<Permission, 'accessibleStoreIds'>> = {
  owner: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canManageStores: true,
    canAccessAllStores: true,
  },
  accountant: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: false,
    canManageStores: true,
    canAccessAllStores: true,
  },
  manager: {
    canView: true,
    canCreate: true,
    canEdit: true, // 可以编辑自己管理店铺内的所有交易
    canDelete: true, // 可以删除自己管理店铺内的所有交易
    canManageUsers: false,
    canManageStores: false,
    canAccessAllStores: false,
  },
  user: {
    canView: true,
    canCreate: true,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canManageStores: false,
    canAccessAllStores: false,
  },
}

/**
 * 获取用户权限
 */
export function getUserPermissions(profile: UserProfile | null): Permission {
  if (!profile) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canManageUsers: false,
      canManageStores: false,
      canAccessAllStores: false,
      accessibleStoreIds: [],
    }
  }

  const basePermissions = rolePermissions[profile.role]

  return {
    ...basePermissions,
    accessibleStoreIds: basePermissions.canAccessAllStores ? [] : (profile.managed_store_ids || []),
  }
}

/**
 * 检查用户是否可以访问指定店铺
 */
export function canAccessStore(profile: UserProfile | null, storeId: string): boolean {
  if (!profile) return false

  const permissions = getUserPermissions(profile)

  if (permissions.canAccessAllStores) return true

  return permissions.accessibleStoreIds.includes(storeId)
}

/**
 * 检查用户是否可以编辑指定交易
 * - owner/accountant: 可以编辑所有
 * - manager: 可以编辑自己管理店铺内的所有交易
 * - user: 不能编辑
 */
export function canEditTransaction(
  profile: UserProfile | null,
  transaction: { created_by?: string | null; store_id?: string | null }
): boolean {
  if (!profile) return false

  const permissions = getUserPermissions(profile)

  if (!permissions.canEdit) return false

  // owner 和 accountant 可以编辑所有
  if (profile.role === 'owner' || profile.role === 'accountant') {
    return true
  }

  // manager 可以编辑自己管理店铺内的所有交易
  if (profile.role === 'manager') {
    const isOwnStore = transaction.store_id
      ? permissions.accessibleStoreIds.includes(transaction.store_id)
      : true

    return isOwnStore
  }

  return false
}

/**
 * 检查用户是否可以删除指定交易
 * - owner/accountant: 可以删除所有
 * - manager: 可以删除自己管理店铺内的所有交易
 * - user: 不能删除
 */
export function canDeleteTransaction(
  profile: UserProfile | null,
  transaction: { created_by?: string | null; store_id?: string | null }
): boolean {
  if (!profile) return false

  const permissions = getUserPermissions(profile)

  if (!permissions.canDelete) return false

  // owner 和 accountant 可以删除所有
  if (profile.role === 'owner' || profile.role === 'accountant') {
    return true
  }

  // manager 可以删除自己管理店铺内的所有交易
  if (profile.role === 'manager') {
    const isOwnStore = transaction.store_id
      ? permissions.accessibleStoreIds.includes(transaction.store_id)
      : true

    return isOwnStore
  }

  return false
}

/**
 * 检查用户是否是管理员（owner 或 accountant）
 */
export function isAdmin(profile: UserProfile | null): boolean {
  if (!profile) return false
  return profile.role === 'owner' || profile.role === 'accountant'
}

/**
 * 检查用户是否是老板
 */
export function isOwner(profile: UserProfile | null): boolean {
  if (!profile) return false
  return profile.role === 'owner'
}

/**
 * 获取角色显示名称
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    owner: '老板',
    accountant: '财务',
    manager: '店长',
    user: '员工',
  }
  return roleNames[role] || role
}

/**
 * 获取可邀请的角色列表（老板可以邀请除老板外的所有角色）
 */
export function getInvitableRoles(): { value: UserRole; label: string }[] {
  return [
    { value: 'accountant', label: '财务' },
    { value: 'manager', label: '店长' },
    { value: 'user', label: '员工' },
  ]
}
