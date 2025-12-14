import { NextResponse } from 'next/server'
import { detectBackend, getBackendInfo } from '@/lib/backend/detector'

export async function GET() {
  const backend = detectBackend()
  const backendInfo = getBackendInfo()

  try {
    if (backend === 'leancloud') {
      // LeanCloud 模式
      const { lcRequest, config } = await import('@/lib/leancloud/init')

      let connectionOk = false
      let connectionError = null
      let profileCount = 0
      let profileError = null

      // 测试连接
      try {
        await lcRequest('GET', '/date')
        connectionOk = true
      } catch (e: any) {
        connectionError = e?.message || String(e)
      }

      // 检查 Profile 表
      try {
        const result = await lcRequest<{ results: any[] }>('GET', '/classes/Profile?limit=100')
        profileCount = result.results?.length || 0
      } catch (e: any) {
        profileError = e?.message || String(e)
      }

      return NextResponse.json({
        backend,
        backendInfo,
        leancloud: {
          config: {
            appId: config.appId ? config.appId.substring(0, 8) + '...' : null,
            serverURL: config.serverURL,
            hasMasterKey: !!config.masterKey,
          },
          connection: {
            ok: connectionOk,
            error: connectionError,
          },
          profiles: {
            count: profileCount,
            error: profileError,
          },
        },
        hasUsers: profileCount > 0,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Supabase 模式
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({
          backend,
          backendInfo,
          error: '缺少 Supabase 配置',
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!serviceRoleKey,
        })
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { count: profileCount, error: profileError } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers()

      return NextResponse.json({
        backend,
        backendInfo,
        profiles: {
          count: profileCount,
          error: profileError?.message,
        },
        users: {
          count: usersData?.users?.length ?? 0,
          list: usersData?.users?.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
          })),
          error: usersError?.message,
        },
        hasUsers: (profileCount ?? 0) > 0,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      backend,
      backendInfo,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
