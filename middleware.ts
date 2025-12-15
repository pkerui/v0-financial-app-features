import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getLCSessionFromRequest, LC_SESSION_COOKIE } from '@/lib/leancloud/cookies'

// 检测后端类型（在 middleware 中使用）
function detectBackendInMiddleware(): 'supabase' | 'leancloud' {
  const envBackend = process.env.NEXT_PUBLIC_BACKEND?.toLowerCase()
  if (envBackend === 'leancloud') {
    return 'leancloud'
  }
  if (envBackend === 'supabase') {
    return 'supabase'
  }

  // 检查 Supabase 是否配置完整
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

  // 如果 Supabase 配置完整，使用 Supabase
  if (isSupabaseConfigured) {
    return 'supabase'
  }

  // 否则默认使用 LeanCloud（LeanCloud 有内置默认配置）
  return 'leancloud'
}

// 检测是否为移动设备
function isMobileDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(userAgent)
}

// 桌面端路由到移动端路由的映射
function getDesktopToMobileRoute(pathname: string): string {
  const routeMap: Record<string, string> = {
    '/': '/m',
    '/login': '/m/login',
    '/stores': '/m',
    '/dashboard': '/m',
    '/transactions': '/m/transactions',
    '/income': '/m/record',
    '/expense': '/m/record',
    '/voice-entry': '/m/record',
    '/cash-flow': '/m/report',
    '/profit-loss': '/m/report',
    '/settings': '/m',
  }

  // 精确匹配
  if (routeMap[pathname]) {
    return routeMap[pathname]
  }

  // 前缀匹配
  for (const [desktop, mobile] of Object.entries(routeMap)) {
    if (pathname.startsWith(desktop + '/')) {
      return mobile
    }
  }

  // 默认跳转到移动端首页
  return '/m'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const backend = detectBackendInMiddleware()
  let user: { id: string } | null = null

  // 根据后端类型检查用户认证状态
  if (backend === 'leancloud') {
    // LeanCloud 模式：从 Cookie 中获取会话
    const lcSession = getLCSessionFromRequest(request)
    if (lcSession) {
      user = { id: lcSession.userId }
    }
  } else {
    // Supabase 模式：使用 Supabase SSR 客户端
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // 刷新会话（如果过期）
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  }

  const pathname = request.nextUrl.pathname
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = isMobileDevice(userAgent)

  // ============================================
  // 移动端设备路由处理
  // ============================================
  if (isMobile) {
    // 移动端访问桌面端路由，重定向到移动端
    if (!pathname.startsWith('/m') && !pathname.startsWith('/api') && !pathname.startsWith('/auth')) {
      const mobileRoute = getDesktopToMobileRoute(pathname)
      return NextResponse.redirect(new URL(mobileRoute, request.url))
    }

    // 移动端保护路由（需要登录）
    const mobileProtectedRoutes = ['/m/transactions', '/m/record', '/m/report']
    const isMobileProtectedRoute = mobileProtectedRoutes.some((route) =>
      pathname.startsWith(route)
    ) || (pathname === '/m')

    if (isMobileProtectedRoute && !user) {
      return NextResponse.redirect(new URL('/m/login', request.url))
    }

    // 移动端已登录用户访问登录页，重定向到移动端首页
    if (pathname === '/m/login' && user) {
      return NextResponse.redirect(new URL('/m', request.url))
    }

    return response
  }

  // ============================================
  // 桌面端路由处理
  // ============================================

  // 保护需要登录的路由
  const protectedRoutes = ['/dashboard', '/voice-entry', '/income', '/expense', '/stores', '/transactions', '/cash-flow', '/profit-loss', '/settings']
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 如果已登录用户访问首页或登录页，重定向到店铺管理页面
  if ((pathname === '/' || pathname === '/login') && user) {
    return NextResponse.redirect(new URL('/stores', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - 公开文件 (robots.txt 等)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
