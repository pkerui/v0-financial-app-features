import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 警告：此 API 会删除所有用户数据，仅用于开发测试！
export async function POST() {
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

  const results: string[] = []

  try {
    // 1. 先删除 transactions（引用了 profiles）
    const { error: txError } = await adminClient
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有
    if (txError) results.push(`transactions: ${txError.message}`)
    else results.push('transactions: 已清空')

    // 2. 删除 invitations
    const { error: invError } = await adminClient
      .from('invitations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (invError) results.push(`invitations: ${invError.message}`)
    else results.push('invitations: 已清空')

    // 3. 删除 stores
    const { error: storeError } = await adminClient
      .from('stores')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (storeError) results.push(`stores: ${storeError.message}`)
    else results.push('stores: 已清空')

    // 4. 删除 financial_settings
    const { error: fsError } = await adminClient
      .from('financial_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (fsError) results.push(`financial_settings: ${fsError.message}`)
    else results.push('financial_settings: 已清空')

    // 5. 删除 transaction_categories
    const { error: catError } = await adminClient
      .from('transaction_categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (catError) results.push(`transaction_categories: ${catError.message}`)
    else results.push('transaction_categories: 已清空')

    // 6. 删除 profiles（在删除 auth.users 之前）
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (profileError) results.push(`profiles: ${profileError.message}`)
    else results.push('profiles: 已清空')

    // 7. 删除 companies
    const { error: companyError } = await adminClient
      .from('companies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (companyError) results.push(`companies: ${companyError.message}`)
    else results.push('companies: 已清空')

    // 8. 删除所有 auth 用户
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    if (usersData?.users) {
      for (const user of usersData.users) {
        const { error: delError } = await adminClient.auth.admin.deleteUser(user.id)
        if (delError) {
          results.push(`auth.user ${user.email}: ${delError.message}`)
        } else {
          results.push(`auth.user ${user.email}: 已删除`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '系统已重置，请刷新登录页面查看注册界面',
      details: results,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      details: results,
    }, { status: 500 })
  }
}
