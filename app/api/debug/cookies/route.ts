import { NextRequest, NextResponse } from 'next/server'
import { getLCSessionFromRequest, LC_SESSION_COOKIE, LC_USER_ID_COOKIE, LC_USERNAME_COOKIE } from '@/lib/leancloud/cookies'

export async function GET(request: NextRequest) {
  // 列出请求中的所有 cookies
  const allCookies = request.cookies.getAll()

  // 尝试获取 LC session
  const lcSession = getLCSessionFromRequest(request)

  // 检查特定 cookies
  const lcSessionCookie = request.cookies.get(LC_SESSION_COOKIE)
  const lcUserIdCookie = request.cookies.get(LC_USER_ID_COOKIE)
  const lcUsernameCookie = request.cookies.get(LC_USERNAME_COOKIE)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    allCookies: allCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length
    })),
    lcCookies: {
      session: lcSessionCookie ? { hasValue: true, length: lcSessionCookie.value.length } : null,
      userId: lcUserIdCookie ? { hasValue: true, value: lcUserIdCookie.value } : null,
      username: lcUsernameCookie ? { hasValue: true, value: lcUsernameCookie.value } : null,
    },
    lcSession: lcSession ? {
      hasSessionToken: !!lcSession.sessionToken,
      userId: lcSession.userId,
      username: lcSession.username,
      companyCode: lcSession.companyCode,
    } : null,
    headers: {
      cookie: request.headers.get('cookie') ? 'present' : 'missing',
      host: request.headers.get('host'),
    }
  })
}
