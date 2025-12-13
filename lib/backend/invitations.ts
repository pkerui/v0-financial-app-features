// @ts-nocheck
'use server'

/**
 * 统一邀请管理适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/auth/permissions'

// 类型定义
export interface Invitation {
  id: string
  companyId: string
  email: string
  role: UserRole
  managedStoreIds: string[]
  invitedBy: string
  token: string
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
}

export interface ActionResult<T = any> {
  success?: boolean
  error?: string | null
  data?: T
}

// ============================================
// 动态导入后端模块
// ============================================

async function getInvitationsModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { InvitationModel, ProfileModel, CompanyModel } = await import('@/lib/leancloud/models')
    const { register, verifyToken } = await import('@/lib/leancloud/auth')
    // 使用服务端认证（从 Cookie 获取用户）而不是客户端认证
    const { getServerUser, getServerProfile } = await import('@/lib/auth/server')
    return {
      backend: 'leancloud' as const,
      InvitationModel,
      ProfileModel,
      CompanyModel,
      getServerUser,
      getServerProfile,
      register,
      verifyToken,
    }
  } else {
    const { createClient } = await import('@/lib/supabase/server')
    return {
      backend: 'supabase' as const,
      createClient,
    }
  }
}

// 生成邀请 Token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// ============================================
// 统一 API 接口
// ============================================

/**
 * 创建邀请
 */
export async function createInvitation(data: {
  email: string
  role: 'accountant' | 'manager' | 'user'
  managed_store_ids?: string[]
}): Promise<ActionResult<Invitation>> {
  const mod = await getInvitationsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { data: undefined, error: '未登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (!profile?.company_id) {
        return { data: undefined, error: '用户未关联公司' }
      }

      if (profile.role !== 'owner') {
        return { data: undefined, error: '只有老板可以邀请用户' }
      }

      // 检查邮箱是否已被邀请
      const { data: existingInvitations } = await mod.InvitationModel.getByCompanyId(profile.company_id)
      const pendingInvitation = existingInvitations?.find(
        (inv: any) =>
          inv.email === data.email &&
          !inv.acceptedAt &&
          new Date(inv.expiresAt) > new Date()
      )

      if (pendingInvitation) {
        return { data: undefined, error: '该邮箱已有待处理的邀请' }
      }

      // 生成 token 和过期时间（7天后）
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // 创建邀请
      const result = await mod.InvitationModel.create({
        companyId: profile.company_id,
        email: data.email,
        role: data.role,
        managedStoreIds: data.managed_store_ids || [],
        invitedBy: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      })

      if (result.error) {
        return { data: undefined, error: result.error }
      }

      revalidatePath('/stores/settings')

      return { data: result.data as Invitation, error: null }
    } catch (error: any) {
      console.error('创建邀请异常:', error)
      return { data: undefined, error: error.message || '创建邀请失败' }
    }
  } else {
    const { createInvitation: supabaseCreate } = await import('@/lib/api/invitations')
    return supabaseCreate(data)
  }
}

/**
 * 获取邀请列表
 */
export async function getInvitations(): Promise<ActionResult<Invitation[]>> {
  const mod = await getInvitationsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { data: [], error: '未登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (!profile?.company_id) {
        return { data: [], error: '用户未关联公司' }
      }

      if (profile.role !== 'owner' && profile.role !== 'accountant') {
        return { data: [], error: '无权限查看邀请列表' }
      }

      const result = await mod.InvitationModel.getByCompanyId(profile.company_id)

      if (result.error) {
        return { data: [], error: result.error }
      }

      return { data: result.data as Invitation[], error: null }
    } catch (error: any) {
      console.error('获取邀请列表异常:', error)
      return { data: [], error: error.message || '获取邀请列表失败' }
    }
  } else {
    const { getInvitations: supabaseGet } = await import('@/lib/api/invitations')
    return supabaseGet()
  }
}

/**
 * 删除邀请
 */
export async function deleteInvitation(invitationId: string): Promise<ActionResult> {
  const mod = await getInvitationsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '未登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (profile?.role !== 'owner') {
        return { error: '只有老板可以删除邀请' }
      }

      const result = await mod.InvitationModel.delete(invitationId)

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/stores/settings')

      return { error: null }
    } catch (error: any) {
      console.error('删除邀请异常:', error)
      return { error: error.message || '删除邀请失败' }
    }
  } else {
    const { deleteInvitation: supabaseDelete } = await import('@/lib/api/invitations')
    return supabaseDelete(invitationId)
  }
}

/**
 * 重新发送邀请（生成新 token）
 */
export async function resendInvitation(invitationId: string): Promise<ActionResult<Invitation>> {
  const mod = await getInvitationsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { data: undefined, error: '未登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (profile?.role !== 'owner') {
        return { data: undefined, error: '只有老板可以重新发送邀请' }
      }

      // 生成新 token 和过期时间
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const result = await mod.InvitationModel.update(invitationId, {
        token,
        expiresAt: expiresAt.toISOString(),
      })

      if (result.error) {
        return { data: undefined, error: result.error }
      }

      revalidatePath('/stores/settings')

      return { data: result.data as Invitation, error: null }
    } catch (error: any) {
      console.error('重新发送邀请异常:', error)
      return { data: undefined, error: error.message || '重新发送邀请失败' }
    }
  } else {
    const { resendInvitation: supabaseResend } = await import('@/lib/api/invitations')
    return supabaseResend(invitationId)
  }
}

/**
 * 直接创建用户账号（无需邮件验证，使用用户名登录）
 */
export async function createUserAccount(data: {
  username: string
  password: string
  fullName: string
  role: 'accountant' | 'manager' | 'user'
  managed_store_ids?: string[]
}): Promise<ActionResult> {
  const mod = await getInvitationsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '未登录' }
      }

      // 使用服务端方法获取 profile
      const profile = await mod.getServerProfile()

      if (!profile?.company_id) {
        return { error: '用户未关联公司' }
      }

      if (profile.role !== 'owner') {
        return { error: '只有老板可以创建用户' }
      }

      // 获取当前用户所属公司的 code
      const { data: company } = await mod.CompanyModel.getById(profile.company_id)
      if (!company?.code) {
        return { error: '无法获取公司信息' }
      }

      // 注册新用户（使用公司码构建命名空间用户名）
      const registerResult = await mod.register({
        username: data.username,
        password: data.password,
        fullName: data.fullName,
        companyCode: company.code,
      })

      if (registerResult.error) {
        if (registerResult.error.includes('已存在') ||
            registerResult.error.includes('already')) {
          return { error: '该用户名已被使用' }
        }
        return { error: registerResult.error }
      }

      if (!registerResult.user) {
        return { error: '创建用户失败' }
      }

      // 创建 profile 并关联到公司
      const createProfileResult = await mod.ProfileModel.create({
        userId: registerResult.user.id,
        companyId: profile.company_id,
        role: data.role,
        managedStoreIds: data.managed_store_ids || [],
        fullName: data.fullName,
        username: data.username,
      })

      if (createProfileResult.error) {
        console.error('创建用户 profile 失败:', createProfileResult.error)
        // 即使 profile 创建失败，用户已经创建成功，只是没有关联到公司
      }

      revalidatePath('/stores/settings')

      return { error: null }
    } catch (error: any) {
      console.error('创建用户账号异常:', error)
      return { error: error.message || '创建用户账号失败' }
    }
  } else {
    const { createUserAccount: supabaseCreate } = await import('@/lib/api/invitations')
    return supabaseCreate(data)
  }
}
