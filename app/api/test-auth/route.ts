import { NextResponse } from 'next/server'
import { initLeanCloud } from '@/lib/leancloud'
import {
  checkSystemHasUsers,
  registerOwner,
  signIn,
  signOut,
  getSession,
  getCurrentProfile
} from '@/lib/auth/leancloud'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'check'

    // Initialize LeanCloud
    initLeanCloud()

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      action,
    }

    switch (action) {
      case 'check':
        // Check if system has users
        const hasUsers = await checkSystemHasUsers()
        results.hasUsers = hasUsers
        results.message = hasUsers ? '系统已有用户' : '系统无用户，可以注册老板账号'
        break

      case 'register':
        // Test owner registration (only if no users exist)
        const hasExisting = await checkSystemHasUsers()
        if (hasExisting) {
          results.success = false
          results.error = '系统已有用户，无法注册新老板'
        } else {
          const registerResult = await registerOwner({
            username: 'testowner',
            password: 'test123456',
            fullName: '测试老板',
            companyName: '测试公司',
            email: 'test@example.com',
          })
          results.success = !registerResult.error
          results.error = registerResult.error
          results.message = registerResult.error || '注册成功'
        }
        break

      case 'login':
        // Test login
        const username = url.searchParams.get('username') || 'testowner'
        const password = url.searchParams.get('password') || 'test123456'

        const loginResult = await signIn(username, password)
        results.success = !!loginResult.session
        results.error = loginResult.error
        results.session = loginResult.session ? {
          userId: loginResult.session.user.id,
          username: loginResult.session.user.username,
          profile: loginResult.session.profile ? {
            id: loginResult.session.profile.id,
            company_id: loginResult.session.profile.company_id,
            full_name: loginResult.session.profile.full_name,
            role: loginResult.session.profile.role,
          } : null
        } : null
        break

      case 'session':
        // Get current session
        const session = await getSession()
        results.hasSession = !!session
        results.session = session ? {
          userId: session.user.id,
          username: session.user.username,
          profile: session.profile ? {
            id: session.profile.id,
            company_id: session.profile.company_id,
            full_name: session.profile.full_name,
            role: session.profile.role,
          } : null
        } : null
        break

      case 'profile':
        // Get current profile
        const profile = await getCurrentProfile()
        results.hasProfile = !!profile
        results.profile = profile
        break

      case 'logout':
        // Test logout
        await signOut()
        results.success = true
        results.message = '已退出登录'
        break

      default:
        results.error = '未知操作'
        results.availableActions = ['check', 'register', 'login', 'session', 'profile', 'logout']
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('[Test Auth] 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '未知错误',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
