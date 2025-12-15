// @ts-nocheck
/**
 * 统一的服务端认证模块
 * 根据后端类型（Supabase 或 LeanCloud）提供统一的认证接口
 */

import { detectBackend, isLeanCloudMode } from '@/lib/backend/detector'
import type { UserRole } from '@/lib/auth/permissions'

// ============================================
// 类型定义
// ============================================

export interface ServerUser {
  id: string
  username: string | null
  email: string | null
}

export interface ServerProfile {
  id: string
  company_id: string | null
  full_name: string | null
  role: UserRole
  managed_store_ids: string[]
  created_at: string
  updated_at: string
}

export interface ServerSession {
  user: ServerUser
  profile: ServerProfile | null
}

// ============================================
// 获取当前用户（服务端）
// ============================================

export async function getServerUser(): Promise<ServerUser | null> {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式：从 Cookie 获取会话
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    const { extractOriginalUsername } = await import('@/lib/leancloud/auth')

    const session = await getLCSession()
    if (!session) return null

    // 从用户名中提取原始用户名（移除公司码前缀）
    const displayUsername = session.username
      ? extractOriginalUsername(session.username)
      : null

    return {
      id: session.userId,
      username: displayUsername,
      email: null, // LeanCloud Cookie 不存储 email
    }
  } else {
    // Supabase 模式
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return {
      id: user.id,
      username: user.email?.split('@')[0] || null,
      email: user.email || null,
    }
  }
}

// ============================================
// 获取当前用户的 Profile（服务端）
// ============================================

export async function getServerProfile(): Promise<ServerProfile | null> {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式：从 Cookie 获取会话和 profile
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    const { ProfileModel } = await import('@/lib/leancloud/models')

    const session = await getLCSession()
    if (!session) return null

    // 传递 sessionToken 到 ProfileModel
    const profileResult = await ProfileModel.getByUserId(session.userId, 3, session.sessionToken)

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

  // Supabase 模式
  const user = await getServerUser()
  if (!user) return null

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: profile.id,
    company_id: profile.company_id,
    full_name: profile.full_name,
    role: profile.role as UserRole,
    managed_store_ids: profile.managed_store_ids || [],
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  }
}

// ============================================
// 获取完整会话信息（服务端）
// ============================================

export async function getServerSession(): Promise<ServerSession | null> {
  const user = await getServerUser()
  if (!user) return null

  const profile = await getServerProfile()

  return {
    user,
    profile,
  }
}

// ============================================
// 获取当前用户的公司 ID（服务端）
// ============================================

export async function getServerCompanyId(): Promise<string | null> {
  const profile = await getServerProfile()
  return profile?.company_id || null
}

// ============================================
// 获取当前用户角色（服务端）
// ============================================

export async function getServerUserRole(): Promise<UserRole | null> {
  const profile = await getServerProfile()
  return profile?.role || null
}
