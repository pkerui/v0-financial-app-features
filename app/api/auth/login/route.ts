import { NextRequest, NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyCode, username, password } = body

    // 验证输入
    if (!companyCode || companyCode.length !== 6) {
      return NextResponse.json({ error: '公司码必须是6位' }, { status: 400 })
    }
    if (!username) {
      return NextResponse.json({ error: '请输入用户名' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }

    const backend = detectBackend()

    if (backend === 'leancloud') {
      // LeanCloud 登录
      const { login: lcLogin, extractCompanyCode } = await import('@/lib/leancloud/auth')
      const { ProfileModel } = await import('@/lib/leancloud/models')

      const { user, error } = await lcLogin(username, password, companyCode.toUpperCase())

      if (error || !user) {
        return NextResponse.json({ error: error || '公司码、用户名或密码错误' }, { status: 401 })
      }

      // 获取 profile
      const profileResult = await ProfileModel.getByUserId(user.id, 3, user.sessionToken)

      // 创建响应
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
        },
        profile: profileResult.data ? {
          id: profileResult.data.id,
          companyId: profileResult.data.companyId,
          fullName: profileResult.data.fullName,
          role: profileResult.data.role,
        } : null,
      })

      // 设置 cookies - 直接在 response 上设置
      const cookieOptions = {
        httpOnly: true,
        secure: false, // CloudBase 内部是 HTTP
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 天
      }

      const userCompanyCode = user.username ? extractCompanyCode(user.username) : undefined

      response.cookies.set('lc_session', user.sessionToken, cookieOptions)
      response.cookies.set('lc_user_id', user.id, cookieOptions)
      response.cookies.set('lc_username', user.username, cookieOptions)
      if (userCompanyCode) {
        response.cookies.set('lc_company_code', userCompanyCode, cookieOptions)
      }

      console.log('[API Login] Cookies set:', {
        session: user.sessionToken.substring(0, 10) + '...',
        userId: user.id,
        username: user.username,
        companyCode: userCompanyCode,
      })

      return response
    } else {
      // Supabase 模式
      return NextResponse.json({ error: '请使用 Supabase 登录' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[API Login] Error:', error)
    return NextResponse.json({ error: error.message || '登录失败' }, { status: 500 })
  }
}
