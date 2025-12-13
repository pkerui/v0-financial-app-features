/**
 * LeanCloud 服务端 Cookie 会话管理
 * 用于在 Next.js 中间件中验证 LeanCloud 用户会话
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Cookie 名称
export const LC_SESSION_COOKIE = 'lc_session'
export const LC_USER_ID_COOKIE = 'lc_user_id'
export const LC_USERNAME_COOKIE = 'lc_username'
export const LC_COMPANY_CODE_COOKIE = 'lc_company_code'

// Cookie 配置
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 天
}

/**
 * 会话数据接口
 */
export interface LCSessionData {
  sessionToken: string
  userId: string
  username: string
  companyCode?: string
}

/**
 * 从请求中获取 LeanCloud 会话信息（用于 middleware）
 */
export function getLCSessionFromRequest(request: NextRequest): LCSessionData | null {
  const sessionToken = request.cookies.get(LC_SESSION_COOKIE)?.value
  const userId = request.cookies.get(LC_USER_ID_COOKIE)?.value
  const username = request.cookies.get(LC_USERNAME_COOKIE)?.value
  const companyCode = request.cookies.get(LC_COMPANY_CODE_COOKIE)?.value

  if (!sessionToken || !userId || !username) {
    return null
  }

  return {
    sessionToken,
    userId,
    username,
    companyCode,
  }
}

/**
 * 在响应中设置 LeanCloud 会话 Cookie（用于 middleware）
 */
export function setLCSessionToResponse(
  response: NextResponse,
  session: LCSessionData
): void {
  response.cookies.set(LC_SESSION_COOKIE, session.sessionToken, COOKIE_OPTIONS)
  response.cookies.set(LC_USER_ID_COOKIE, session.userId, COOKIE_OPTIONS)
  response.cookies.set(LC_USERNAME_COOKIE, session.username, COOKIE_OPTIONS)
  if (session.companyCode) {
    response.cookies.set(LC_COMPANY_CODE_COOKIE, session.companyCode, COOKIE_OPTIONS)
  }
}

/**
 * 清除响应中的 LeanCloud 会话 Cookie（用于 middleware）
 */
export function clearLCSessionFromResponse(response: NextResponse): void {
  response.cookies.delete(LC_SESSION_COOKIE)
  response.cookies.delete(LC_USER_ID_COOKIE)
  response.cookies.delete(LC_USERNAME_COOKIE)
  response.cookies.delete(LC_COMPANY_CODE_COOKIE)
}

/**
 * 设置 LeanCloud 会话 Cookie（用于 Server Actions）
 */
export async function setLCSession(session: LCSessionData): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(LC_SESSION_COOKIE, session.sessionToken, COOKIE_OPTIONS)
  cookieStore.set(LC_USER_ID_COOKIE, session.userId, COOKIE_OPTIONS)
  cookieStore.set(LC_USERNAME_COOKIE, session.username, COOKIE_OPTIONS)
  if (session.companyCode) {
    cookieStore.set(LC_COMPANY_CODE_COOKIE, session.companyCode, COOKIE_OPTIONS)
  }
}

/**
 * 获取 LeanCloud 会话（用于 Server Actions / Server Components）
 */
export async function getLCSession(): Promise<LCSessionData | null> {
  try {
    const cookieStore = await cookies()

    const sessionToken = cookieStore.get(LC_SESSION_COOKIE)?.value
    const userId = cookieStore.get(LC_USER_ID_COOKIE)?.value
    const username = cookieStore.get(LC_USERNAME_COOKIE)?.value
    const companyCode = cookieStore.get(LC_COMPANY_CODE_COOKIE)?.value

    if (!sessionToken || !userId || !username) {
      return null
    }

    return {
      sessionToken,
      userId,
      username,
      companyCode,
    }
  } catch {
    // 在某些上下文中 cookies() 可能不可用
    return null
  }
}

/**
 * 清除 LeanCloud 会话 Cookie（用于 Server Actions）
 */
export async function clearLCSession(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.delete(LC_SESSION_COOKIE)
  cookieStore.delete(LC_USER_ID_COOKIE)
  cookieStore.delete(LC_USERNAME_COOKIE)
  cookieStore.delete(LC_COMPANY_CODE_COOKIE)
}

/**
 * 验证 LeanCloud 会话是否有效（调用 LeanCloud API）
 */
export async function verifyLCSession(sessionToken: string): Promise<boolean> {
  try {
    const { lcRequest } = await import('./init')

    // 尝试获取当前用户信息来验证 token
    await lcRequest('GET', '/users/me', undefined, sessionToken)
    return true
  } catch {
    return false
  }
}
