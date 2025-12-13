// @ts-nocheck
/**
 * LeanCloud 认证模块
 * 使用 LeanCloud 云后端进行用户认证
 * 与 supabase.ts 保持接口一致
 */

import {
  login as lcLogin,
  logout as lcLogout,
  register as lcRegister,
  getCurrentUser as lcGetCurrentUser,
  changePassword as lcChangePassword,
  updateUserInfo as lcUpdateUserInfo,
  checkSystemHasUsers as lcCheckSystemHasUsers,
  getSessionToken,
  extractOriginalUsername,
  extractCompanyCode,
} from '@/lib/leancloud/auth'
import {
  setLCSession,
  clearLCSession,
} from '@/lib/leancloud/cookies'
import {
  CompanyModel,
  ProfileModel,
} from '@/lib/leancloud/models'
import type { UserRole } from '@/lib/auth/permissions'
import { z } from 'zod'

// ============================================
// 类型定义 (与 supabase.ts 保持一致)
// ============================================

export interface User {
  id: string
  username: string | null
  email: string | null
}

export interface Profile {
  id: string
  company_id: string | null
  full_name: string | null
  role: UserRole
  managed_store_ids: string[]
  created_at: string
  updated_at: string
}

export interface Session {
  user: User
  profile: Profile | null
}

// ============================================
// 验证模式
// ============================================

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(6, '密码至少6位'),
})

const registerOwnerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少6位'),
  fullName: z.string().min(2, '姓名至少2个字符'),
  companyName: z.string().min(2, '公司名称至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
})

// ============================================
// 用户登录（支持公司码）
// ============================================

const loginWithCodeSchema = z.object({
  companyCode: z.string().length(6, '公司码必须是6位'),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(6, '密码至少6位'),
})

export async function signIn(
  username: string,
  password: string,
  companyCode?: string
): Promise<{ session: Session | null; error: string | null }> {
  try {
    // 验证输入
    if (companyCode) {
      // 使用公司码登录
      const validation = loginWithCodeSchema.safeParse({ companyCode, username, password })
      if (!validation.success) {
        return { session: null, error: validation.error.errors[0].message }
      }
    } else {
      // 传统登录
      const validation = loginSchema.safeParse({ username, password })
      if (!validation.success) {
        return { session: null, error: validation.error.errors[0].message }
      }
    }

    // 使用公司码登录
    const { user, error } = await lcLogin(username, password, companyCode)

    if (error || !user) {
      return { session: null, error: error || '公司码、用户名或密码错误' }
    }

    // 设置服务端 Cookie（用于 middleware 认证）
    const userCompanyCode = user.username ? extractCompanyCode(user.username) : undefined
    console.log('[LeanCloud Auth] Setting session cookies:', {
      userId: user.id,
      username: user.username,
      companyCode: userCompanyCode,
      hasSessionToken: !!user.sessionToken,
    })
    try {
      await setLCSession({
        sessionToken: user.sessionToken,
        userId: user.id,
        username: user.username,
        companyCode: userCompanyCode || undefined,
      })
      console.log('[LeanCloud Auth] Session cookies set successfully')
    } catch (cookieError) {
      console.error('[LeanCloud Auth] Failed to set session cookies:', cookieError)
    }

    // 获取用户的 profile
    const profileResult = await ProfileModel.getByUserId(user.id)

    // 从用户名中提取原始用户名（移除公司码前缀）
    const displayUsername = user.username ? extractOriginalUsername(user.username) : null

    return {
      session: {
        user: {
          id: user.id,
          username: displayUsername,
          email: user.email || null,
        },
        profile: profileResult.data
          ? {
              id: profileResult.data.id,
              company_id: profileResult.data.companyId || null,
              full_name: profileResult.data.fullName || null,
              role: profileResult.data.role as UserRole,
              managed_store_ids: profileResult.data.managedStoreIds || [],
              created_at: profileResult.data.createdAt,
              updated_at: profileResult.data.updatedAt,
            }
          : null,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('登录异常:', error)
    return { session: null, error: error.message || '登录失败' }
  }
}

// ============================================
// 用户注册（普通用户）
// ============================================

export async function signUp(data: {
  username: string
  password: string
  fullName?: string
  email?: string
}): Promise<{ user: User | null; error: string | null }> {
  try {
    const { user, error } = await lcRegister({
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      email: data.email,
    })

    if (error || !user) {
      return { user: null, error: error || '注册失败' }
    }

    return {
      user: {
        id: user.id,
        username: user.username || null,
        email: user.email || null,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('注册异常:', error)
    return { user: null, error: error.message || '注册失败' }
  }
}

// ============================================
// 老板注册（系统首次使用）
// ============================================

export async function registerOwner(data: {
  username: string
  password: string
  fullName: string
  companyName: string
  email?: string
  companyCode?: string  // 客户端生成的公司码
}): Promise<{ error: string | null; companyCode?: string }> {
  try {
    // 验证输入
    const validation = registerOwnerSchema.safeParse(data)
    if (!validation.success) {
      return { error: validation.error.errors[0].message }
    }

    // 检查是否已有用户（仅限全局检查，允许不同公司注册）
    // 注意：这里我们不再限制，因为不同公司可以有自己的老板
    // const hasUsers = await lcCheckSystemHasUsers()
    // if (hasUsers) {
    //   return { error: '系统已有管理员账户，请直接登录' }
    // }

    // 1. 创建公司（使用客户端传入的公司码或自动生成）
    const companyResult = await CompanyModel.create(data.companyName, data.companyCode)
    if (companyResult.error || !companyResult.data) {
      console.error('创建公司失败:', companyResult.error)
      return { error: companyResult.error || '创建公司失败' }
    }

    const companyCode = companyResult.data.code

    // 2. 使用公司码+用户名的格式注册用户
    const { user, error: registerError } = await lcRegister({
      username: data.username,
      password: data.password,
      fullName: data.fullName,
      email: data.email,
      companyCode: companyCode,  // 传递公司码，用户名将存储为 {companyCode}_{username}
    })

    if (registerError || !user) {
      // 如果注册失败，尝试删除已创建的公司
      await CompanyModel.delete(companyResult.data.objectId)
      return { error: registerError || '创建用户失败' }
    }

    // 3. 创建 profile
    const profileResult = await ProfileModel.create({
      userId: user.id,
      companyId: companyResult.data.objectId,
      fullName: data.fullName,
      role: 'owner',
      managedStoreIds: [],
    })

    if (profileResult.error) {
      console.error('创建 profile 失败:', profileResult.error)
      return { error: '设置用户信息失败' }
    }

    // 返回公司码，供用户保存
    return { error: null, companyCode }
  } catch (error: any) {
    console.error('老板注册异常:', error)
    return { error: error.message || '注册失败' }
  }
}

// ============================================
// 退出登录
// ============================================

export async function signOut(): Promise<void> {
  try {
    // 清除服务端 Cookie
    await clearLCSession()
    // 清除客户端 localStorage
    await lcLogout()
  } catch (error) {
    console.error('退出登录异常:', error)
  }
}

// ============================================
// 获取当前用户
// ============================================

export async function getUser(): Promise<{ user: User | null; error: string | null }> {
  try {
    const user = await lcGetCurrentUser()

    if (!user) {
      return { user: null, error: '未登录' }
    }

    return {
      user: {
        id: user.id,
        username: user.username || null,
        email: user.email || null,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('获取用户异常:', error)
    return { user: null, error: error.message || '获取用户失败' }
  }
}

// ============================================
// 获取当前用户 ID
// ============================================

export async function getCurrentUserId(): Promise<string | null> {
  const user = await lcGetCurrentUser()
  return user?.id || null
}

// ============================================
// 获取当前用户的 profile
// ============================================

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await lcGetCurrentUser()

  if (!user) return null

  const profileResult = await ProfileModel.getByUserId(user.id)

  if (!profileResult.data) return null

  return {
    id: profileResult.data.id,
    company_id: profileResult.data.companyId || null,
    full_name: profileResult.data.fullName || null,
    role: profileResult.data.role as UserRole,
    managed_store_ids: profileResult.data.managedStoreIds || [],
    created_at: profileResult.data.createdAt,
    updated_at: profileResult.data.updatedAt,
  }
}

// ============================================
// 获取当前用户的公司 ID
// ============================================

export async function getCurrentCompanyId(): Promise<string | null> {
  const profile = await getCurrentProfile()
  return profile?.company_id || null
}

// ============================================
// 检查当前用户角色
// ============================================

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentProfile()
  return profile?.role || null
}

// ============================================
// 检查系统是否有用户
// ============================================

export async function checkSystemHasUsers(): Promise<boolean> {
  return lcCheckSystemHasUsers()
}

// ============================================
// 获取会话信息
// ============================================

export async function getSession(): Promise<Session | null> {
  const user = await lcGetCurrentUser()

  if (!user) return null

  const profile = await getCurrentProfile()

  return {
    user: {
      id: user.id,
      username: user.username || null,
      email: user.email || null,
    },
    profile,
  }
}

// ============================================
// 更新密码
// ============================================

export async function updatePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    if (newPassword.length < 6) {
      return { error: '新密码至少6位' }
    }

    const result = await lcChangePassword(oldPassword, newPassword)
    return { error: result.error }
  } catch (error: any) {
    console.error('更新密码异常:', error)
    return { error: error.message || '更新密码失败' }
  }
}

// ============================================
// 更新用户信息
// ============================================

export async function updateUserInfo(data: {
  fullName?: string
  email?: string
}): Promise<{ error: string | null }> {
  try {
    const user = await lcGetCurrentUser()

    if (!user) {
      return { error: '请先登录' }
    }

    // 更新 LeanCloud 用户信息
    const result = await lcUpdateUserInfo(data)
    if (result.error) {
      return { error: result.error }
    }

    // 更新 profile
    if (data.fullName !== undefined) {
      const profileResult = await ProfileModel.getByUserId(user.id)
      if (profileResult.data) {
        await ProfileModel.update(user.id, {
          fullName: data.fullName,
        })
      }
    }

    return { error: null }
  } catch (error: any) {
    console.error('更新用户信息异常:', error)
    return { error: error.message || '更新用户信息失败' }
  }
}

// ============================================
// 获取公司信息
// ============================================

export interface Company {
  id: string
  name: string
  code: string
  created_at: string
  updated_at: string
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const result = await CompanyModel.getById(companyId)
    if (!result.data) return null

    return {
      id: result.data.id,
      name: result.data.name,
      code: result.data.code || '',
      created_at: result.data.createdAt,
      updated_at: result.data.updatedAt,
    }
  } catch (error) {
    console.error('获取公司信息失败:', error)
    return null
  }
}

// ============================================
// 检查 LeanCloud 连接状态
// ============================================

export async function checkConnection(): Promise<boolean> {
  try {
    const { checkConnection: lcCheckConnection } = await import('@/lib/leancloud/init')
    return await lcCheckConnection()
  } catch (error) {
    console.error('LeanCloud 连接检查失败:', error)
    return false
  }
}
