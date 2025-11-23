import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return NextResponse.json({ error: '用户未关联公司' }, { status: 400 })
  }

  // 查询所有分类
  const { data: allCategories, error: allError } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('type')
    .order('name')

  if (allError) {
    return NextResponse.json({ error: '查询失败', details: allError }, { status: 500 })
  }

  // 查询押金相关分类
  const depositCategories = allCategories?.filter(
    cat => cat.name === '押金收入' || cat.name === '押金退还'
  ) || []

  // 查询使用押金分类的交易数量
  const depositStats = await Promise.all(
    depositCategories.map(async cat => {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('category', cat.name)

      return {
        category: cat.name,
        type: cat.type,
        cash_flow_activity: cat.cash_flow_activity,
        transaction_nature: cat.transaction_nature,
        include_in_profit_loss: cat.include_in_profit_loss,
        is_system: cat.is_system,
        updated_at: cat.updated_at,
        transaction_count: count || 0,
      }
    })
  )

  return NextResponse.json({
    user_id: user.id,
    company_id: profile.company_id,
    total_categories: allCategories?.length || 0,
    all_categories: allCategories,
    deposit_categories: depositStats,
    timestamp: new Date().toISOString(),
  })
}
