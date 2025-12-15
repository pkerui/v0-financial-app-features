import { NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'

export async function GET() {
  try {
    const backend = detectBackend()

    if (backend === 'leancloud') {
      // 从 Cookie 获取 session
      const { getLCSession } = await import('@/lib/leancloud/cookies')
      const session = await getLCSession()

      if (!session) {
        return NextResponse.json({ backend, profile: null, debug: 'no session cookie' })
      }

      // 使用 session token 获取 profile
      const { ProfileModel } = await import('@/lib/leancloud/models')
      const profileResult = await ProfileModel.getByUserId(session.userId)

      return NextResponse.json({
        backend,
        profile: profileResult.data ? {
          id: profileResult.data.id,
          company_id: profileResult.data.companyId,
          full_name: profileResult.data.fullName,
          role: profileResult.data.role,
        } : null,
        session: {
          userId: session.userId,
          username: session.username,
          companyCode: session.companyCode,
        },
      })
    } else {
      // Supabase 模式
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ backend, profile: null })
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
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || String(error),
      profile: null,
    }, { status: 500 })
  }
}
