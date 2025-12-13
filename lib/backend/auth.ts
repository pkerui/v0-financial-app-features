/**
 * 统一认证适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'

// 类型重新导出
export type { User, Profile, Session } from '@/lib/auth/supabase'

// ============================================
// 动态导入后端模块
// ============================================

async function getAuthModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    return await import('@/lib/auth/leancloud')
  } else {
    return await import('@/lib/auth/supabase')
  }
}

// ============================================
// 代理函数
// ============================================

export async function signIn(username: string, password: string, companyCode?: string) {
  const auth = await getAuthModule()
  return auth.signIn(username, password, companyCode)
}

export async function signUp(data: {
  username: string
  password: string
  fullName?: string
  email?: string
}) {
  const auth = await getAuthModule()
  return auth.signUp(data)
}

export async function registerOwner(data: {
  username: string
  password: string
  fullName: string
  companyName: string
  email?: string
  companyCode?: string  // 客户端生成的公司码
}) {
  const auth = await getAuthModule()
  return auth.registerOwner(data)
}

export async function signOut() {
  const auth = await getAuthModule()
  return auth.signOut()
}

export async function getUser() {
  const auth = await getAuthModule()
  return auth.getUser()
}

export async function getCurrentUserId() {
  const auth = await getAuthModule()
  return auth.getCurrentUserId()
}

export async function getCurrentProfile() {
  const auth = await getAuthModule()
  return auth.getCurrentProfile()
}

export async function getCurrentCompanyId() {
  const auth = await getAuthModule()
  return auth.getCurrentCompanyId()
}

export async function getCurrentUserRole() {
  const auth = await getAuthModule()
  return auth.getCurrentUserRole()
}

export async function checkSystemHasUsers() {
  const auth = await getAuthModule()
  return auth.checkSystemHasUsers()
}

export async function getSession() {
  const auth = await getAuthModule()
  return auth.getSession()
}

export async function updatePassword(oldPassword: string, newPassword: string) {
  const auth = await getAuthModule()
  return auth.updatePassword(oldPassword, newPassword)
}

export async function updateUserInfo(data: { fullName?: string; email?: string }) {
  const auth = await getAuthModule()
  return auth.updateUserInfo(data)
}

export async function checkConnection() {
  const auth = await getAuthModule()
  return auth.checkConnection()
}

export async function getCompanyById(companyId: string) {
  const auth = await getAuthModule()
  return auth.getCompanyById(companyId)
}
