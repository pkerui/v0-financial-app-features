/**
 * 登出 API 路由
 * 清除 LeanCloud 或 Supabase 会话 cookies
 */

import { NextResponse, type NextRequest } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'
import {
  LC_SESSION_COOKIE,
  LC_USER_ID_COOKIE,
  LC_USERNAME_COOKIE,
  LC_COMPANY_CODE_COOKIE,
} from '@/lib/leancloud/cookies'

export async function GET(request: NextRequest) {
  const backend = detectBackend()
  const redirectUrl = new URL('/', request.url)

  // 创建重定向响应
  const response = NextResponse.redirect(redirectUrl)

  if (backend === 'leancloud') {
    // 清除 LeanCloud session cookies
    response.cookies.delete(LC_SESSION_COOKIE)
    response.cookies.delete(LC_USER_ID_COOKIE)
    response.cookies.delete(LC_USERNAME_COOKIE)
    response.cookies.delete(LC_COMPANY_CODE_COOKIE)
  } else {
    // Supabase 模式：清除 Supabase cookies
    // Supabase 使用 sb-* 前缀的 cookies
    const cookieNames = request.cookies.getAll().map((c) => c.name)
    cookieNames.forEach((name) => {
      if (name.startsWith('sb-')) {
        response.cookies.delete(name)
      }
    })
  }

  return response
}
