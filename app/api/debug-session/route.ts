/**
 * Debug API to check LeanCloud session cookies
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { detectBackend } from '@/lib/backend/detector'
import {
  LC_SESSION_COOKIE,
  LC_USER_ID_COOKIE,
  LC_USERNAME_COOKIE,
  LC_COMPANY_CODE_COOKIE,
  getLCSession
} from '@/lib/leancloud/cookies'

export async function GET() {
  const cookieStore = await cookies()
  const backend = detectBackend()

  // Read raw cookies
  const rawCookies = {
    lc_session: cookieStore.get(LC_SESSION_COOKIE)?.value ? '***SET***' : 'NOT SET',
    lc_user_id: cookieStore.get(LC_USER_ID_COOKIE)?.value || 'NOT SET',
    lc_username: cookieStore.get(LC_USERNAME_COOKIE)?.value || 'NOT SET',
    lc_company_code: cookieStore.get(LC_COMPANY_CODE_COOKIE)?.value || 'NOT SET',
  }

  // Read via getLCSession
  const session = await getLCSession()

  return NextResponse.json({
    backend,
    rawCookies,
    sessionFromGetLCSession: session ? {
      userId: session.userId,
      username: session.username,
      companyCode: session.companyCode,
      hasSessionToken: !!session.sessionToken,
    } : null,
    allCookieNames: cookieStore.getAll().map(c => c.name),
  })
}
