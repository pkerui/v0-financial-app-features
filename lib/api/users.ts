'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/auth/permissions'
import { emailToUsername, USERNAME_EMAIL_SUFFIX } from '@/lib/auth/username'

// ============================================
// 类型定义
// ============================================

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

// ============================================
// 获取公司用户列表
// ============================================

export async function getCompanyUsers(): Promise<{
  data: CompanyUser[]
  error: string | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: '请先登录' }
  }

  // 获取当前用户的 profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!currentProfile?.company_id) {
    return { data: [], error: '用户未关联公司' }
  }

  // 只有 owner 和 accountant 可以查看用户列表
  if (currentProfile.role !== 'owner' && currentProfile.role !== 'accountant') {
    return { data: [], error: '无权限查看用户列表' }
  }

  // 获取公司所有用户
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      managed_store_ids,
      created_at,
      updated_at
    `)
    .eq('company_id', currentProfile.company_id)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: [], error: '获取用户列表失败' }
  }

  // 使用 Admin API 获取用户名信息
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let userMetadataMap: Map<string, { username?: string; email?: string }> = new Map()

  if (supabaseUrl && serviceRoleKey) {
    try {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      // 获取所有用户的 metadata
      const userIds = profiles?.map(p => p.id) || []
      for (const userId of userIds) {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
        if (userError) {
          console.error('获取用户信息失败:', userId, userError)
          continue
        }
        if (userData?.user) {
          const email = userData.user.email || ''
          // 优先使用 user_metadata 中的用户名，否则从邮箱提取
          let username = userData.user.user_metadata?.username || null
          if (!username && email.endsWith(USERNAME_EMAIL_SUFFIX)) {
            // 从内部邮箱格式提取用户名
            username = emailToUsername(email)
          }
          userMetadataMap.set(userId, {
            username,
            email,
          })
        }
      }
    } catch (e) {
      console.error('获取用户 metadata 失败:', e)
    }
  }

  const users: CompanyUser[] = (profiles || []).map((p) => {
    const metadata = userMetadataMap.get(p.id)
    return {
      id: p.id,
      email: metadata?.email || '',
      username: metadata?.username || null,
      full_name: p.full_name,
      role: p.role as UserRole,
      managed_store_ids: p.managed_store_ids || [],
      created_at: p.created_at,
      updated_at: p.updated_at,
    }
  })

  return { data: users, error: null }
}

// ============================================
// 更新用户角色
// ============================================

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  managedStoreIds?: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取当前用户的 profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

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
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (targetProfile?.company_id !== currentProfile?.company_id) {
    return { error: '无权限修改此用户' }
  }

  // 更新角色
  const updateData: { role: UserRole; managed_store_ids?: string[] } = {
    role: newRole,
  }

  // 如果是 manager 或 user，需要指定管理的店铺
  if (newRole === 'manager' || newRole === 'user') {
    updateData.managed_store_ids = managedStoreIds || []
  } else {
    // owner 和 accountant 不需要 managed_store_ids
    updateData.managed_store_ids = []
  }

  // 使用 Admin API 来更新角色（绕过 RLS 策略）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('缺少 Supabase 配置')
    return { error: '系统配置错误，请联系管理员' }
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await adminClient
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('更新用户角色失败:', error)
    return { error: '更新用户角色失败' }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}

// ============================================
// 更新用户管理的店铺
// ============================================

export async function updateUserStores(
  userId: string,
  storeIds: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取当前用户的 profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'owner') {
    return { error: '只有老板可以修改用户权限' }
  }

  // 验证目标用户
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userId)
    .single()

  if (targetProfile?.company_id !== currentProfile?.company_id) {
    return { error: '无权限修改此用户' }
  }

  // owner 和 accountant 不需要指定店铺
  if (targetProfile.role === 'owner' || targetProfile.role === 'accountant') {
    return { error: '此角色不需要指定店铺' }
  }

  // 使用 Admin API 来更新店铺（绕过 RLS 策略）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('缺少 Supabase 配置')
    return { error: '系统配置错误，请联系管理员' }
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await adminClient
    .from('profiles')
    .update({ managed_store_ids: storeIds })
    .eq('id', userId)

  if (error) {
    console.error('更新用户店铺失败:', error)
    return { error: '更新用户店铺失败' }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}

// ============================================
// 移除用户（从公司中移除，并删除用户账号）
// ============================================

export async function removeUser(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取当前用户的 profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'owner') {
    return { error: '只有老板可以移除用户' }
  }

  // 不能移除自己
  if (userId === user.id) {
    return { error: '不能移除自己' }
  }

  // 验证目标用户
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', userId)
    .single()

  if (targetProfile?.company_id !== currentProfile?.company_id) {
    return { error: '无权限移除此用户' }
  }

  // 不能移除 owner
  if (targetProfile.role === 'owner') {
    return { error: '不能移除老板' }
  }

  // 使用 Admin API 来删除用户（绕过 RLS 策略）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('缺少 Supabase 配置')
    return { error: '系统配置错误，请联系管理员' }
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 完全删除用户（包括 Auth 记录和 Profile 记录）
  // 这样用户名可以被重新使用
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) {
    console.error('删除用户失败:', error)
    return { error: '删除用户失败: ' + error.message }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}

// ============================================
// 获取当前用户的完整 profile
// ============================================

export async function getCurrentUserProfile(): Promise<{
  data: CompanyUser | null
  error: string | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '请先登录' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return { data: null, error: '获取用户信息失败' }
  }

  return {
    data: {
      id: profile.id,
      email: user.email || '',
      full_name: profile.full_name,
      role: profile.role as UserRole,
      managed_store_ids: profile.managed_store_ids || [],
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    },
    error: null,
  }
}
