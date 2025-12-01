'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { UserRole } from '@/lib/auth/permissions'
import { usernameToEmail } from '@/lib/auth/username'

// ============================================
// 类型定义
// ============================================

export interface Invitation {
  id: string
  company_id: string
  email: string
  role: UserRole
  managed_store_ids: string[]
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// ============================================
// 验证模式
// ============================================

const createInvitationSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  role: z.enum(['accountant', 'manager', 'user'], {
    errorMap: () => ({ message: '请选择有效的角色' }),
  }),
  managed_store_ids: z.array(z.string()).default([]),
})

// ============================================
// 生成邀请 Token
// ============================================

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// ============================================
// 创建邀请
// ============================================

export async function createInvitation(data: {
  email: string
  role: 'accountant' | 'manager' | 'user'
  managed_store_ids?: string[]
}): Promise<{ data: Invitation | null; error: string | null }> {
  const supabase = await createClient()

  // 验证输入
  const validation = createInvitationSchema.safeParse(data)
  if (!validation.success) {
    return { data: null, error: validation.error.errors[0].message }
  }

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '请先登录' }
  }

  // 获取用户 profile 和权限
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { data: null, error: '用户未关联公司' }
  }

  if (profile.role !== 'owner') {
    return { data: null, error: '只有老板可以邀请用户' }
  }

  // 检查邮箱是否已被邀请或已注册
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('email', data.email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvitation) {
    return { data: null, error: '该邮箱已有待处理的邀请' }
  }

  // 检查邮箱是否已注册
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', profile.company_id)
    .single()

  // 生成 token 和过期时间（7天后）
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // 创建邀请
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      company_id: profile.company_id,
      email: data.email,
      role: data.role,
      managed_store_ids: data.managed_store_ids || [],
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('创建邀请失败:', error)
    return { data: null, error: '创建邀请失败' }
  }

  revalidatePath('/stores/settings')

  return { data: invitation, error: null }
}

// ============================================
// 获取邀请列表
// ============================================

export async function getInvitations(): Promise<{
  data: Invitation[]
  error: string | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], error: '请先登录' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { data: [], error: '用户未关联公司' }
  }

  if (profile.role !== 'owner' && profile.role !== 'accountant') {
    return { data: [], error: '无权限查看邀请列表' }
  }

  const { data: invitations, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: '获取邀请列表失败' }
  }

  return { data: invitations || [], error: null }
}

// ============================================
// 验证邀请 Token
// ============================================

export async function verifyInvitation(token: string): Promise<{
  data: (Invitation & { company_name?: string }) | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(`
      *,
      companies (name)
    `)
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !invitation) {
    return { data: null, error: '邀请链接无效或已过期' }
  }

  return {
    data: {
      ...invitation,
      company_name: (invitation as any).companies?.name,
    },
    error: null,
  }
}

// ============================================
// 接受邀请并注册
// ============================================

export async function acceptInvitation(data: {
  token: string
  password: string
  fullName: string
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // 验证邀请
  const { data: invitation, error: verifyError } = await verifyInvitation(data.token)

  if (verifyError || !invitation) {
    return { error: verifyError || '邀请无效' }
  }

  // 创建用户
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: invitation.email,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
      },
    },
  })

  if (signUpError || !authData.user) {
    console.error('注册失败:', signUpError)
    return { error: '注册失败，请稍后重试' }
  }

  // 更新 profile（设置公司、角色、管理店铺）
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      company_id: invitation.company_id,
      role: invitation.role,
      managed_store_ids: invitation.managed_store_ids,
      full_name: data.fullName,
    })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('更新 profile 失败:', profileError)
    return { error: '设置用户信息失败' }
  }

  // 标记邀请为已接受
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { error: null }
}

// ============================================
// 删除邀请
// ============================================

export async function deleteInvitation(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { error: '只有老板可以删除邀请' }
  }

  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) {
    return { error: '删除邀请失败' }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}

// ============================================
// 重新发送邀请（生成新 token）
// ============================================

export async function resendInvitation(
  invitationId: string
): Promise<{ data: Invitation | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '请先登录' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return { data: null, error: '只有老板可以重新发送邀请' }
  }

  // 生成新 token 和过期时间
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabase
    .from('invitations')
    .update({
      token,
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', invitationId)
    .select()
    .single()

  if (error) {
    return { data: null, error: '重新发送邀请失败' }
  }

  revalidatePath('/stores/settings')

  return { data: invitation, error: null }
}

// ============================================
// 直接创建用户账号（无需邮件验证，使用用户名登录）
// ============================================

const createUserSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少6位'),
  fullName: z.string().min(1, '请输入姓名'),
  role: z.enum(['accountant', 'manager', 'user'], {
    errorMap: () => ({ message: '请选择有效的角色' }),
  }),
  managed_store_ids: z.array(z.string()).default([]),
})

export async function createUserAccount(data: {
  username: string
  password: string
  fullName: string
  role: 'accountant' | 'manager' | 'user'
  managed_store_ids?: string[]
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // 验证输入
  const validation = createUserSchema.safeParse(data)
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户 profile 和权限
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  if (profile.role !== 'owner') {
    return { error: '只有老板可以创建用户' }
  }

  // 使用 Admin API 创建用户（需要 service_role key）
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

  // 将用户名转换为内部邮箱格式
  const email = usernameToEmail(data.username)

  // 创建用户
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true, // 自动确认，无需验证
    user_metadata: {
      full_name: data.fullName,
      username: data.username.toLowerCase(),
    },
  })

  if (createError) {
    console.error('创建用户失败:', createError)
    if (createError.message.includes('already been registered')) {
      return { error: '该用户名已被使用' }
    }
    return { error: '创建用户失败: ' + createError.message }
  }

  if (!newUser.user) {
    return { error: '创建用户失败' }
  }

  // 更新 profile（设置公司、角色、管理店铺）
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      company_id: profile.company_id,
      role: data.role,
      managed_store_ids: data.managed_store_ids || [],
      full_name: data.fullName,
    })
    .eq('id', newUser.user.id)

  if (profileError) {
    console.error('更新 profile 失败:', profileError)
    // 如果 profile 更新失败，尝试删除刚创建的用户
    await adminClient.auth.admin.deleteUser(newUser.user.id)
    return { error: '设置用户信息失败' }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}
