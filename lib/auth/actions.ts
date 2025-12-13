'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { usernameToEmail } from './username'

// 登录表单验证模式（包含公司码）
const loginSchema = z.object({
  companyCode: z.string().length(6, '公司码必须是6位'),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(6, '密码至少6位'),
})

// 老板注册表单验证模式
const registerOwnerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少6位'),
  fullName: z.string().min(2, '姓名至少2个字符'),
  companyName: z.string().min(2, '公司名称至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
})

export type FormState = {
  error?: string
  success?: string
  redirectTo?: string  // 用于客户端重定向
  companyCode?: string // 注册成功后的公司码
  username?: string    // 注册成功后的用户名
}

// ============================================
// 检查系统是否有用户
// ============================================

export async function checkSystemHasUsers(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('缺少 Supabase 配置')
    return true // 安全起见，假设有用户
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 检查是否有任何 profile 记录
  const { count, error } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('检查用户数量失败:', error)
    return true // 安全起见，假设有用户
  }

  return (count ?? 0) > 0
}

// ============================================
// 老板注册（仅系统首次使用时）
// ============================================

export async function registerOwner(prevState: FormState, formData: FormData): Promise<FormState> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const companyName = formData.get('companyName') as string
  const recoveryEmail = formData.get('email') as string || ''
  const redirectTo = formData.get('redirectTo') as string || '/stores'
  // 获取客户端生成的公司码
  const clientCompanyCode = (formData.get('companyCode') as string)?.toUpperCase()

  // 验证输入
  const validation = registerOwnerSchema.safeParse({
    username,
    password,
    fullName,
    companyName,
    email: recoveryEmail
  })
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // 使用统一后端适配器进行注册
  const { registerOwner: backendRegisterOwner, signIn, signOut, checkSystemHasUsers: backendCheckUsers } = await import('@/lib/backend/auth')

  // 检查是否已有用户（防止并发注册）
  // 注意：LeanCloud 模式下允许多个公司注册，所以跳过此检查
  const { detectBackend } = await import('@/lib/backend/detector')
  const backend = detectBackend()

  if (backend === 'supabase') {
    const hasUsers = await backendCheckUsers()
    if (hasUsers) {
      return { error: '系统已有管理员账户，请直接登录' }
    }
  }

  // 清除旧的登录状态，防止注册后 session 冲突
  try {
    await signOut()
  } catch (e) {
    // 忽略登出错误（可能本来就没登录）
    console.log('清除旧 session:', e)
  }

  // 调用统一后端适配器进行注册（传递客户端生成的公司码）
  const result = await backendRegisterOwner({
    username,
    password,
    fullName,
    companyName,
    email: recoveryEmail || undefined,
    companyCode: clientCompanyCode
  })

  if (result.error) {
    return { error: result.error }
  }

  // 获取公司码（使用客户端传入的或后端返回的）
  const companyCode = clientCompanyCode || (result as any).companyCode

  // 如果有公司码（LeanCloud 模式），返回成功状态让客户端显示弹窗
  if (companyCode && backend === 'leancloud') {
    // 尝试自动登录
    try {
      await signIn(username, password, companyCode)
    } catch (e) {
      console.error('自动登录失败:', e)
    }
    // 返回成功状态，让客户端显示弹窗
    return {
      success: '注册成功',
      companyCode,
      username
    }
  }

  // Supabase 模式：尝试自动登录
  const { session, error: loginError } = await signIn(username, password)

  if (loginError || !session) {
    return { error: '注册成功，但自动登录失败，请手动登录' }
  }

  // Supabase 模式直接返回重定向到店铺管理
  return { redirectTo }
}

/**
 * 用户登录（支持公司码）
 */
export async function login(prevState: FormState, formData: FormData): Promise<FormState> {
  const companyCode = (formData.get('companyCode') as string)?.toUpperCase()
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string || '/stores'

  // 验证输入
  const validation = loginSchema.safeParse({ companyCode, username, password })
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  // 使用统一后端适配器登录
  const { signIn } = await import('@/lib/backend/auth')
  const { session, error } = await signIn(username, password, companyCode)

  if (error || !session) {
    return { error: error || '公司码、用户名或密码错误' }
  }

  // 返回重定向地址，让客户端处理跳转
  // 这样确保 cookies 在跳转前被浏览器正确处理
  return { success: '登录成功', redirectTo }
}

/**
 * 用户登出
 */
export async function logout() {
  const { detectBackend } = await import('@/lib/backend/detector')
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式：使用统一后端适配器
    const { signOut } = await import('@/lib/backend/auth')
    await signOut()
  } else {
    // Supabase 模式
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  redirect('/')
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * 获取用户配置
 */
export async function getUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

// ============================================
// 忘记密码
// ============================================

/**
 * 发送密码重置邮件
 */
export async function requestPasswordReset(prevState: FormState, formData: FormData): Promise<FormState> {
  const username = formData.get('username') as string

  if (!username) {
    return { error: '请输入用户名' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: '系统配置错误' }
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 将用户名转换为内部邮箱
  const internalEmail = usernameToEmail(username)

  // 查找用户获取恢复邮箱
  const { data: userData, error: userError } = await adminClient.auth.admin.listUsers()

  if (userError) {
    return { error: '查询用户失败' }
  }

  const user = userData.users.find(u => u.email === internalEmail)

  if (!user) {
    // 不透露用户是否存在
    return { success: '如果该用户存在且绑定了邮箱，重置链接将发送到绑定的邮箱' }
  }

  const recoveryEmail = user.user_metadata?.recovery_email

  if (!recoveryEmail) {
    return { error: '该账户未绑定找回邮箱，请联系管理员重置密码' }
  }

  // 生成密码重置链接（发送到恢复邮箱）
  const { error: resetError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: internalEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
    },
  })

  if (resetError) {
    console.error('生成重置链接失败:', resetError)
    return { error: '发送重置邮件失败，请稍后重试' }
  }

  // 注意：Supabase 会发送邮件到用户的 email（internalEmail）
  // 但我们需要发送到 recovery_email，这需要自定义邮件发送
  // 简化方案：使用 Supabase 的 updateUser 临时更改邮箱

  // 临时更新用户邮箱为恢复邮箱以发送重置链接
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    email: recoveryEmail,
  })

  if (updateError) {
    console.error('更新邮箱失败:', updateError)
    return { error: '发送失败，请稍后重试' }
  }

  // 发送重置邮件
  const supabase = await createClient()
  const { error: sendError } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  // 恢复原来的内部邮箱
  await adminClient.auth.admin.updateUserById(user.id, {
    email: internalEmail,
  })

  if (sendError) {
    console.error('发送重置邮件失败:', sendError)
    return { error: '发送重置邮件失败' }
  }

  return { success: `重置链接已发送到 ${recoveryEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}` }
}

/**
 * 重置密码
 */
export async function resetPassword(prevState: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || password.length < 6) {
    return { error: '密码至少6位' }
  }

  if (password !== confirmPassword) {
    return { error: '两次密码输入不一致' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    console.error('重置密码失败:', error)
    return { error: '重置密码失败: ' + error.message }
  }

  return { success: '密码重置成功！' }
}
