import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
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

  // 检查 profiles 表记录数
  const { count: profileCount, error: profileError } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 获取用户列表
  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers()

  return NextResponse.json({
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
  })
}
