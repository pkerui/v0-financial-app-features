import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 手动创建 owner 用户，绕过触发器问题
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: '缺少 Supabase 配置' }, { status: 500 })
  }

  const body = await request.json()
  const { username, password, fullName, companyName } = body

  if (!username || !password || !fullName || !companyName) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const internalEmail = `${username.toLowerCase()}@local.homestay`

  try {
    // 1. 先创建公司
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single()

    if (companyError) {
      return NextResponse.json({
        success: false,
        step: 'createCompany',
        error: companyError.message,
      })
    }

    // 2. 直接插入到 auth.users（使用 SQL）
    // 由于不能直接操作 auth.users，我们先禁用触发器再创建

    // 尝试直接用 admin API 创建，但指定不触发
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: username.toLowerCase(),
      },
    })

    if (createError) {
      // 回滚公司
      await adminClient.from('companies').delete().eq('id', company.id)

      // 如果是触发器错误，尝试检查是否用户已经被部分创建
      const { data: users } = await adminClient.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === internalEmail)

      if (existingUser) {
        // 用户被创建了但触发器失败，手动创建 profile
        const { error: profileError } = await adminClient
          .from('profiles')
          .upsert({
            id: existingUser.id,
            company_id: company.id,
            full_name: fullName,
            role: 'owner',
            managed_store_ids: [],
          })

        if (profileError) {
          return NextResponse.json({
            success: false,
            step: 'createProfile (recovery)',
            error: profileError.message,
          })
        }

        return NextResponse.json({
          success: true,
          message: '用户创建成功（通过恢复机制）',
          userId: existingUser.id,
          companyId: company.id,
        })
      }

      return NextResponse.json({
        success: false,
        step: 'createUser',
        error: createError.message,
      })
    }

    // 3. 手动创建/更新 profile（以防触发器没有正确执行）
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: newUser.user!.id,
        company_id: company.id,
        full_name: fullName,
        role: 'owner',
        managed_store_ids: [],
      })

    if (profileError) {
      return NextResponse.json({
        success: false,
        step: 'createProfile',
        error: profileError.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: '用户创建成功',
      userId: newUser.user!.id,
      companyId: company.id,
      email: internalEmail,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    })
  }
}
