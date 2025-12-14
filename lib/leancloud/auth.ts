/**
 * LeanCloud 认证模块 (REST API 版本)
 * 提供用户注册、登录、登出等功能
 */

import { lcRequest, lcRequestWithMasterKey, getHeaders, getApiUrl, config } from './init'

// ============================================
// 类型定义
// ============================================

export interface AuthUser {
  id: string
  username: string
  email?: string
  sessionToken: string
  fullName?: string
}

export interface AuthResponse {
  user: AuthUser | null
  error: string | null
}

// LeanCloud REST API 返回的用户数据格式
interface LCUserResponse {
  objectId: string
  username: string
  email?: string
  sessionToken: string
  fullName?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// Session 管理
// ============================================

// 在客户端使用 localStorage 存储会话
const SESSION_KEY = 'lc_session_token'
const USER_KEY = 'lc_current_user'

/**
 * 保存会话 token
 */
export function saveSessionToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, token)
  }
}

/**
 * 获取会话 token
 */
export function getSessionToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_KEY)
  }
  return null
}

/**
 * 清除会话 token
 */
export function clearSessionToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

/**
 * 保存当前用户信息
 */
function saveCurrentUser(user: AuthUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

/**
 * 获取缓存的当前用户
 */
function getCachedUser(): AuthUser | null {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(USER_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return null
      }
    }
  }
  return null
}

// ============================================
// 认证功能
// ============================================

/**
 * 构建带公司码的用户名
 * 格式: {companyCode}_{username}
 */
export function buildNamespacedUsername(companyCode: string, username: string): string {
  return `${companyCode.toUpperCase()}_${username.toLowerCase()}`
}

/**
 * 从命名空间用户名中提取原始用户名
 */
export function extractOriginalUsername(namespacedUsername: string): string {
  const parts = namespacedUsername.split('_')
  if (parts.length >= 2) {
    // 移除公司码前缀，返回原始用户名
    return parts.slice(1).join('_')
  }
  return namespacedUsername
}

/**
 * 从命名空间用户名中提取公司码
 */
export function extractCompanyCode(namespacedUsername: string): string | null {
  const parts = namespacedUsername.split('_')
  if (parts.length >= 2) {
    return parts[0]
  }
  return null
}

/**
 * 用户注册（带公司码）
 * 用户名存储格式: {companyCode}_{username}
 */
export async function register(data: {
  username: string
  password: string
  fullName?: string
  email?: string
  companyCode?: string  // 可选：如果提供则使用命名空间用户名
}): Promise<AuthResponse> {
  try {
    // 如果提供了公司码，构建命名空间用户名
    const actualUsername = data.companyCode
      ? buildNamespacedUsername(data.companyCode, data.username)
      : data.username.toLowerCase()

    const payload: Record<string, string> = {
      username: actualUsername,
      password: data.password,
    }

    if (data.email) {
      payload.email = data.email
    }
    if (data.fullName) {
      payload.fullName = data.fullName
    }

    const result = await lcRequest<LCUserResponse>('POST', '/users', payload)

    const user: AuthUser = {
      id: result.objectId,
      username: result.username,
      email: result.email,
      sessionToken: result.sessionToken,
      fullName: result.fullName,
    }

    saveSessionToken(result.sessionToken)
    saveCurrentUser(user)

    return { user, error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 注册失败:', error)
    if (error.code === 202) {
      return { user: null, error: '用户名已存在' }
    }
    if (error.code === 203) {
      return { user: null, error: '邮箱已被使用' }
    }
    return { user: null, error: error.message || '注册失败' }
  }
}

/**
 * 用户登录（支持公司码）
 * @param username 用户名
 * @param password 密码
 * @param companyCode 可选：公司码，如果提供则构建命名空间用户名
 */
export async function login(
  username: string,
  password: string,
  companyCode?: string
): Promise<AuthResponse> {
  try {
    // 如果提供了公司码，构建命名空间用户名
    const actualUsername = companyCode
      ? buildNamespacedUsername(companyCode, username)
      : username.toLowerCase()

    // Debug logging to trace login attempts
    console.log('[LeanCloud Auth] Login attempt:', {
      inputUsername: username,
      inputCompanyCode: companyCode,
      actualUsername: actualUsername,
    })

    const result = await lcRequest<LCUserResponse>('POST', '/login', {
      username: actualUsername,
      password,
    })

    const user: AuthUser = {
      id: result.objectId,
      username: result.username,
      email: result.email,
      sessionToken: result.sessionToken,
      fullName: result.fullName,
    }

    saveSessionToken(result.sessionToken)
    saveCurrentUser(user)

    return { user, error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 登录失败:', error)
    if (error.code === 210 || error.code === 211) {
      return { user: null, error: '公司码、用户名或密码错误' }
    }
    return { user: null, error: error.message || '登录失败' }
  }
}

/**
 * 用户登出
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    // REST API 模式下只需要清除本地 token
    clearSessionToken()
    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 登出失败:', error)
    clearSessionToken() // 即使失败也清除本地 token
    return { error: error.message || '登出失败' }
  }
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      return null
    }

    // 先检查缓存
    const cachedUser = getCachedUser()

    // 验证 session token 是否有效
    try {
      const result = await lcRequest<LCUserResponse>('GET', '/users/me', undefined, sessionToken)
      const user: AuthUser = {
        id: result.objectId,
        username: result.username,
        email: result.email,
        sessionToken: sessionToken,
        fullName: result.fullName,
      }
      saveCurrentUser(user)
      return user
    } catch (e) {
      // Token 无效，清除
      clearSessionToken()
      return null
    }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 获取当前用户失败:', error)
    return null
  }
}

/**
 * 检查是否已登录
 */
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

/**
 * 修改密码
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      return { error: '请先登录' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { error: '请先登录' }
    }

    // 先验证旧密码（通过重新登录）
    try {
      await lcRequest<LCUserResponse>('POST', '/login', {
        username: currentUser.username,
        password: oldPassword,
      })
    } catch (e) {
      return { error: '原密码错误' }
    }

    // 修改密码
    await lcRequest(
      'PUT',
      `/users/${currentUser.id}`,
      { password: newPassword },
      sessionToken
    )

    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 修改密码失败:', error)
    return { error: error.message || '修改密码失败' }
  }
}

/**
 * 重置密码（通过邮箱）
 */
export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  try {
    await lcRequest('POST', '/requestPasswordReset', { email })
    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 发送重置邮件失败:', error)
    return { error: error.message || '发送重置邮件失败' }
  }
}

/**
 * 更新用户信息
 */
export async function updateUserInfo(data: {
  fullName?: string
  email?: string
}): Promise<{ error: string | null }> {
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      return { error: '请先登录' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { error: '请先登录' }
    }

    const updateData: Record<string, string> = {}
    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName
    }
    if (data.email !== undefined) {
      updateData.email = data.email
    }

    await lcRequest('PUT', `/users/${currentUser.id}`, updateData, sessionToken)

    // 更新本地缓存
    const updatedUser: AuthUser = {
      ...currentUser,
      ...data,
    }
    saveCurrentUser(updatedUser)

    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 更新用户信息失败:', error)
    return { error: error.message || '更新用户信息失败' }
  }
}

/**
 * 删除用户账户
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  try {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      return { error: '请先登录' }
    }

    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return { error: '请先登录' }
    }

    // 删除用户
    await lcRequest('DELETE', `/users/${currentUser.id}`, undefined, sessionToken)
    clearSessionToken()

    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 删除账户失败:', error)
    return { error: error.message || '删除账户失败' }
  }
}

// ============================================
// 管理员功能
// ============================================

/**
 * 创建用户（管理员功能）
 */
export async function createUser(data: {
  username: string
  password: string
  fullName?: string
  email?: string
}): Promise<AuthResponse> {
  // 使用注册功能
  return register(data)
}

/**
 * 删除其他用户（管理员功能）
 * 使用 Master Key 权限删除用户
 */
export async function deleteUser(userId: string): Promise<{ error: string | null }> {
  try {
    // 检查是否配置了 Master Key
    if (!config.masterKey) {
      return { error: 'Master Key 未配置，无法删除用户。请联系管理员。' }
    }

    // 使用 Master Key 删除用户
    await lcRequestWithMasterKey('DELETE', `/users/${userId}`)

    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 删除用户失败:', error)
    return { error: error.message || '删除用户失败' }
  }
}

/**
 * 通过 ID 获取用户信息
 * 使用 Master Key 权限获取用户详情
 */
export async function getUserById(userId: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    // 检查是否配置了 Master Key
    if (!config.masterKey) {
      return { user: null, error: 'Master Key 未配置' }
    }

    const result = await lcRequestWithMasterKey<LCUserResponse>('GET', `/users/${userId}`)

    return {
      user: {
        id: result.objectId,
        username: result.username,
        email: result.email,
        fullName: result.fullName,
      },
      error: null,
    }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 获取用户失败:', error)
    return { user: null, error: error.message || '获取用户失败' }
  }
}

/**
 * 批量获取用户信息
 * 使用 Master Key 权限获取多个用户详情
 */
export async function getUsersByIds(userIds: string[]): Promise<{ users: AuthUser[]; error: string | null }> {
  try {
    if (!config.masterKey) {
      return { users: [], error: 'Master Key 未配置' }
    }

    if (userIds.length === 0) {
      return { users: [], error: null }
    }

    // 使用 $in 查询批量获取用户
    const where = JSON.stringify({ objectId: { '$in': userIds } })
    const result = await lcRequestWithMasterKey<{ results: LCUserResponse[] }>(
      'GET',
      `/users?where=${encodeURIComponent(where)}&limit=${userIds.length}`
    )

    const users: AuthUser[] = result.results.map(u => ({
      id: u.objectId,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
    }))

    return { users, error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 批量获取用户失败:', error)
    return { users: [], error: error.message || '批量获取用户失败' }
  }
}

/**
 * 检查系统是否有用户
 * 查询 Profile 表判断（Profile 表公开可读，无需 Master Key）
 */
export async function checkSystemHasUsers(): Promise<boolean> {
  try {
    // 直接查询 Profile 表，因为 _User 表需要 Master Key
    const { ProfileModel } = await import('./models')
    const { data: profiles, error } = await ProfileModel.getAll()

    if (error) {
      console.error('[LeanCloud Auth] 查询 Profile 失败:', error)
      return true // 安全起见，假设有用户
    }

    return profiles && profiles.length > 0
  } catch (error: any) {
    console.error('[LeanCloud Auth] 检查用户数量失败:', error)
    return true // 安全起见，假设有用户
  }
}

/**
 * 通过邮箱找回公司码
 * 查找绑定该邮箱的用户，获取其公司码并发送邮件
 */
export async function recoverCompanyCode(email: string): Promise<{ error: string | null }> {
  try {
    // 1. 查找绑定该邮箱的用户
    const encodedEmail = encodeURIComponent(email)
    const userResult = await lcRequest<{ results: LCUserResponse[] }>(
      'GET',
      `/users?where={"email":"${encodedEmail}"}&limit=1`
    )

    if (!userResult.results || userResult.results.length === 0) {
      // 不透露用户是否存在，返回统一提示
      return { error: null }
    }

    const user = userResult.results[0]
    const companyCode = extractCompanyCode(user.username)

    if (!companyCode) {
      // 用户存在但没有公司码（可能是旧用户）
      return { error: null }
    }

    // 2. 使用 LeanCloud 的请求重置密码 API 来发送邮件
    // LeanCloud 会发送一封包含重置链接的邮件
    // 我们可以在邮件模板中添加公司码信息

    // 由于 LeanCloud 的邮件发送需要配置邮件模板，
    // 这里我们简单地调用 requestEmailVerify 或自定义云函数
    // 暂时先记录日志，后续可以配置真正的邮件发送

    console.log(`[LeanCloud Auth] 找回公司码请求 - 邮箱: ${email}, 公司码: ${companyCode}`)

    // TODO: 配置 LeanCloud 云函数发送包含公司码的邮件
    // 目前先返回成功，让用户知道如果邮箱正确会收到邮件

    return { error: null }
  } catch (error: any) {
    console.error('[LeanCloud Auth] 找回公司码失败:', error)
    // 不透露具体错误，返回通用错误
    return { error: '系统错误，请稍后重试' }
  }
}
