/**
 * 导航工具函数
 * 用于统一处理页面间的导航逻辑，特别是权限相关的返回链接
 */

import type { UserRole } from '@/lib/auth/permissions'

/**
 * 根据用户角色和当前店铺模式生成返回链接
 *
 * @param userRole - 用户角色
 * @param storeId - 单店ID（如果有）
 * @param storeIds - 多店ID数组（如果有）
 * @returns 返回链接URL
 *
 * 规则：
 * - owner/accountant: 返回到对应的 dashboard
 * - manager/user: 返回到店铺管理页面 /stores
 */
export function getBackUrl(
  userRole: UserRole,
  storeId?: string | null,
  storeIds?: string[]
): string {
  // 检查用户是否可以查看全局数据（owner 和 accountant 可以）
  const canViewGlobalData = userRole === 'owner' || userRole === 'accountant'

  if (canViewGlobalData) {
    // 有权限的用户返回到 dashboard
    if (storeId) {
      return `/dashboard?store=${storeId}`
    } else if (storeIds && storeIds.length > 0) {
      return `/dashboard?stores=${storeIds.join(',')}`
    }
    return '/dashboard'
  } else {
    // 单店权限用户返回到店铺管理页面
    return '/stores'
  }
}

/**
 * 检查用户是否可以查看全局数据
 *
 * @param userRole - 用户角色
 * @returns 是否可以查看全局数据
 */
export function canViewGlobalData(userRole: UserRole): boolean {
  return userRole === 'owner' || userRole === 'accountant'
}
