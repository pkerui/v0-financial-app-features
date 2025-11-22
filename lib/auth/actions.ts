'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// 登录表单验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位'),
})

// 注册表单验证模式
const signupSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位'),
  fullName: z.string().min(2, '姓名至少2个字符'),
})

export type FormState = {
  error?: string
  success?: string
}

/**
 * 用户登录
 */
export async function login(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 验证输入
  const validation = loginSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  const supabase = await createClient()

  // 尝试登录
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: '邮箱或密码错误' }
  }

  redirect('/dashboard')
}

/**
 * 用户注册
 */
export async function signup(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  // 验证输入
  const validation = signupSchema.safeParse({ email, password, fullName })
  if (!validation.success) {
    return { error: validation.error.errors[0].message }
  }

  const supabase = await createClient()

  // 创建用户
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: '注册失败，请稍后重试' }
  }

  return { success: '注册成功！请查收邮件进行验证' }
}

/**
 * 用户登出
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
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
