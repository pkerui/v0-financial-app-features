import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: '缺少 Supabase 配置' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const testEmail = 'test_' + Date.now() + '@local.homestay'

  try {
    // 尝试创建用户
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'test123456',
      email_confirm: true,
      user_metadata: {
        full_name: '测试用户',
        username: 'test',
      },
    })

    if (createError) {
      return NextResponse.json({
        success: false,
        step: 'createUser',
        error: createError.message,
        details: createError,
      })
    }

    // 检查 profile 是否被创建
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', newUser.user?.id)
      .single()

    // 清理测试用户
    if (newUser.user) {
      await adminClient.from('profiles').delete().eq('id', newUser.user.id)
      await adminClient.from('companies').delete().eq('owner_id', newUser.user.id)
      await adminClient.auth.admin.deleteUser(newUser.user.id)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user?.id,
        email: newUser.user?.email,
      },
      profile: profile,
      profileError: profileError?.message,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    })
  }
}
