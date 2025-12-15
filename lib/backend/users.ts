// @ts-nocheck
'use server'

/**
 * 统一用户管理适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/auth/permissions'

// 类型定义
export interface CompanyUser {
  id: string
  email: string
  username: string | null
  full_name: string | null
  role: UserRole
  managed_store_ids: string[]
  created_at: string
  updated_at: string
}

export interface ActionResult<T = any> {
  data?: T
  error: string | null
}

// ============================================
// 动态导入后端模块
// ============================================

async function getUsersModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { ProfileModel, UserModel } = await import('@/lib/leancloud/models')
    // 使用服务端认证（从 Cookie 获取用户）而不是客户端认证
    const { getServerUser, getServerProfile } = await import('@/lib/auth/server')
    return {
      backend: 'leancloud' as const,
      ProfileModel,
      UserModel,
      getServerUser,
      getServerProfile,
    }
  } else {
    const { createClient } = await import('@/lib/supabase/server')
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    return {
      backend: 'supabase' as const,
      createClient,
      createAdminClient,
    }
  }
}

// ============================================
// 获取公司用户列表
// ============================================

export async function getCompanyUsers(): Promise<ActionResult<CompanyUser[]>> {
  const mod = await getUsersModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证（从 Cookie 获取用户）
      const user = await mod.getServerUser()
      if (!user) {
        return { data: [], error: '请先登录' }
      }

      // 获取当前用户的 profile（使用服务端方法）
      const currentProfile = await mod.getServerProfile()

      if (!currentProfile?.company_id) {
        return { data: [], error: '用户未关联公司' }
      }

      // 只有 owner 和 accountant 可以查看用户列表
      if (currentProfile.role !== 'owner' && currentProfile.role !== 'accountant') {
        return { data: [], error: '无权限查看用户列表' }
      }

      // 获取公司所有用户
      const { data: companyProfiles, error } = await mod.ProfileModel.getByCompanyId(currentProfile.company_id)

      if (error) {
        return { data: [], error: '获取用户列表失败' }
      }

      // 收集所有 userId，批量获取用户信息
      const userIds = (companyProfiles || []).map((p: any) => p.userId).filter(Boolean)

      // 批量获取用户信息（包含 username）
      const { getUsersByIds } = await import('@/lib/leancloud/auth')
      const { users: lcUsers } = await getUsersByIds(userIds)

      // 创建 userId -> user 的映射
      const userMap = new Map(lcUsers.map(u => [u.id, u]))

      // 转换为统一格式
      // 注意：LeanCloud 中 Profile.id 是 objectId，Profile.userId 是关联用户的 ID
      // 为了与 ProfileModel.update/delete 兼容，使用 userId 作为 CompanyUser.id
      const users: CompanyUser[] = (companyProfiles || []).map((p: any) => {
        const lcUser = userMap.get(p.userId)
        // 从用户名中提取原始用户名（移除公司码前缀）
        let displayUsername = lcUser?.username || null
        if (displayUsername && displayUsername.includes('_')) {
          displayUsername = displayUsername.split('_').slice(1).join('_')
        }

        return {
          id: p.userId || p.id, // 优先使用 userId
          email: lcUser?.email || p.email || '',
          username: displayUsername,
          full_name: p.fullName || lcUser?.fullName || null,
          role: p.role as UserRole,
          managed_store_ids: p.managedStoreIds || [],
          created_at: p.createdAt,
          updated_at: p.updatedAt,
        }
      })

      return { data: users, error: null }
    } catch (error: any) {
      console.error('获取用户列表异常:', error)
      return { data: [], error: error.message || '获取用户列表失败' }
    }
  } else {
    // Supabase 模式：调用原始 API
    const { getCompanyUsers: supabaseGetUsers } = await import('@/lib/api/users')
    return supabaseGetUsers()
  }
}

// ============================================
// 更新用户角色
// ============================================

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  managedStoreIds?: string[]
): Promise<ActionResult> {
  const mod = await getUsersModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '请先登录' }
      }

      // 获取当前用户的 profile（使用服务端方法）
      const currentProfile = await mod.getServerProfile()

      if (currentProfile?.role !== 'owner') {
        return { error: '只有老板可以修改用户角色' }
      }

      // 不能修改自己的角色
      if (userId === user.id) {
        return { error: '不能修改自己的角色' }
      }

      // 不能将用户设为 owner
      if (newRole === 'owner') {
        return { error: '不能将用户设为老板' }
      }

      // 验证目标用户是否属于同一公司
      const { data: targetProfile } = await mod.ProfileModel.getByUserId(userId, 3, session.sessionToken)

      if (!targetProfile || targetProfile.companyId !== currentProfile.company_id) {
        return { error: '无权限修改此用户' }
      }

      // 更新角色
      const updateData: { role: UserRole; managedStoreIds?: string[] } = {
        role: newRole,
      }

      // 如果是 manager 或 user，需要指定管理的店铺
      if (newRole === 'manager' || newRole === 'user') {
        updateData.managedStoreIds = managedStoreIds || []
      } else {
        updateData.managedStoreIds = []
      }

      const result = await mod.ProfileModel.update(userId, updateData)

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/stores/settings')

      return { error: null }
    } catch (error: any) {
      console.error('更新用户角色异常:', error)
      return { error: error.message || '更新用户角色失败' }
    }
  } else {
    const { updateUserRole: supabaseUpdate } = await import('@/lib/api/users')
    return supabaseUpdate(userId, newRole, managedStoreIds)
  }
}

// ============================================
// 更新用户管理的店铺
// ============================================

export async function updateUserStores(
  userId: string,
  storeIds: string[]
): Promise<ActionResult> {
  const mod = await getUsersModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '请先登录' }
      }

      // 获取当前用户的 profile（使用服务端方法）
      const currentProfile = await mod.getServerProfile()

      if (currentProfile?.role !== 'owner') {
        return { error: '只有老板可以修改用户权限' }
      }

      // 验证目标用户
      const { data: targetProfile } = await mod.ProfileModel.getByUserId(userId, 3, session.sessionToken)

      if (!targetProfile || targetProfile.companyId !== currentProfile?.company_id) {
        return { error: '无权限修改此用户' }
      }

      // owner 和 accountant 不需要指定店铺
      if (targetProfile.role === 'owner' || targetProfile.role === 'accountant') {
        return { error: '此角色不需要指定店铺' }
      }

      const result = await mod.ProfileModel.update(userId, {
        managedStoreIds: storeIds,
      })

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/stores/settings')

      return { error: null }
    } catch (error: any) {
      console.error('更新用户店铺异常:', error)
      return { error: error.message || '更新用户店铺失败' }
    }
  } else {
    const { updateUserStores: supabaseUpdate } = await import('@/lib/api/users')
    return supabaseUpdate(userId, storeIds)
  }
}

// ============================================
// 移除用户
// ============================================

export async function removeUser(userId: string): Promise<ActionResult> {
  const mod = await getUsersModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '请先登录' }
      }

      // 获取当前用户的 profile（使用服务端方法）
      const currentProfile = await mod.getServerProfile()

      if (currentProfile?.role !== 'owner') {
        return { error: '只有老板可以移除用户' }
      }

      // 不能移除自己
      if (userId === user.id) {
        return { error: '不能移除自己' }
      }

      // 验证目标用户
      const { data: targetProfile } = await mod.ProfileModel.getByUserId(userId, 3, session.sessionToken)

      if (!targetProfile || targetProfile.companyId !== currentProfile?.company_id) {
        return { error: '无权限移除此用户' }
      }

      // 不能移除 owner
      if (targetProfile.role === 'owner') {
        return { error: '不能移除老板' }
      }

      // 1. 删除 Profile
      const profileResult = await mod.ProfileModel.delete(userId)
      if (profileResult.error) {
        return { error: profileResult.error }
      }

      // 2. 删除 LeanCloud 用户账号（需要 Master Key）
      const { deleteUser } = await import('@/lib/leancloud/auth')
      const userResult = await deleteUser(userId)
      if (userResult.error) {
        console.error('删除 LeanCloud 用户失败:', userResult.error)
        // Profile 已删除，用户账号删除失败也返回成功（用户已无法登录）
        // 但记录日志以便后续清理
      }

      revalidatePath('/stores/settings')

      return { error: null }
    } catch (error: any) {
      console.error('移除用户异常:', error)
      return { error: error.message || '移除用户失败' }
    }
  } else {
    const { removeUser: supabaseRemove } = await import('@/lib/api/users')
    return supabaseRemove(userId)
  }
}

// ============================================
// 获取当前用户的完整 profile
// ============================================

export async function getCurrentUserProfile(): Promise<ActionResult<CompanyUser | null>> {
  const mod = await getUsersModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { data: null, error: '请先登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (!profile) {
        return { data: null, error: '获取用户信息失败' }
      }

      return {
        data: {
          id: user.id,
          email: user.email || '',
          username: user.username || null,
          full_name: profile.full_name || null,
          role: profile.role as UserRole,
          managed_store_ids: profile.managed_store_ids || [],
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        error: null,
      }
    } catch (error: any) {
      console.error('获取当前用户信息异常:', error)
      return { data: null, error: error.message || '获取用户信息失败' }
    }
  } else {
    const { getCurrentUserProfile: supabaseGet } = await import('@/lib/api/users')
    return supabaseGet()
  }
}
