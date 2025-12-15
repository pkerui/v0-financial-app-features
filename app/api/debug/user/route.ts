import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { detectBackend } from '@/lib/backend/detector'

export async function GET() {
  const debug: Record<string, any> = {}

  try {
    const backend = detectBackend()
    debug.backend = backend

    // 列出所有 cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    debug.cookies = allCookies.map(c => ({ name: c.name, hasValue: !!c.value }))

    if (backend === 'leancloud') {
      // 从 Cookie 获取 session
      const { getLCSession } = await import('@/lib/leancloud/cookies')
      const session = await getLCSession()
      debug.session = session ? {
        hasToken: !!session.sessionToken,
        userId: session.userId,
        username: session.username,
        companyCode: session.companyCode,
      } : null

      if (!session) {
        return NextResponse.json({ backend, profile: null, debug })
      }

      // 测试 LeanCloud 连接
      const { lcRequest } = await import('@/lib/leancloud/init')
      try {
        await lcRequest('GET', '/date')
        debug.lcConnection = 'ok'
      } catch (e: any) {
        debug.lcConnection = e?.message || 'failed'
      }

      // 使用 session token 获取 profile
      const { ProfileModel } = await import('@/lib/leancloud/models')
      const profileResult = await ProfileModel.getByUserId(session.userId)
      debug.profileQuery = {
        hasData: !!profileResult.data,
        error: profileResult.error,
      }

      return NextResponse.json({
        backend,
        profile: profileResult.data ? {
          id: profileResult.data.id,
          company_id: profileResult.data.companyId,
          full_name: profileResult.data.fullName,
          role: profileResult.data.role,
        } : null,
        debug,
      })
    } else {
      // Supabase 模式
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ backend, profile: null, debug })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return NextResponse.json({
        backend,
        profile: profile ? {
          id: profile.id,
          company_id: profile.company_id,
          full_name: profile.full_name,
          role: profile.role,
        } : null,
        debug,
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || String(error),
      stack: error?.stack,
      profile: null,
      debug,
    }, { status: 500 })
  }
}
