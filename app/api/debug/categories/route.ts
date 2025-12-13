// @ts-nocheck
import { NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'

export async function GET() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式
    const { TransactionCategoryModel, ProfileModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')

    const session = await getLCSession()
    if (!session) {
      return NextResponse.json({ error: '未登录', backend }, { status: 401 })
    }

    // 获取用户配置
    const { data: profile } = await ProfileModel.getByUserId(session.userId)
    if (!profile?.companyId) {
      return NextResponse.json({ error: '用户未关联公司', backend }, { status: 400 })
    }

    // 查询所有分类
    const { data: allCategories, error } = await TransactionCategoryModel.getByCompanyId(profile.companyId)
    if (error) {
      return NextResponse.json({ error: '查询失败', details: error, backend }, { status: 500 })
    }

    // 格式化输出，显示关键字段
    const formattedCategories = allCategories?.map(cat => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      cashFlowActivity: cat.cashFlowActivity,
      transactionNature: cat.transactionNature,
      includeInProfitLoss: cat.includeInProfitLoss,
      isSystem: cat.isSystem,
      // snake_case 别名
      cash_flow_activity: cat.cash_flow_activity,
      transaction_nature: cat.transaction_nature,
      include_in_profit_loss: cat.include_in_profit_loss,
    })) || []

    // 按类型分组
    const incomeCategories = formattedCategories.filter(c => c.type === 'income')
    const expenseCategories = formattedCategories.filter(c => c.type === 'expense')

    return NextResponse.json({
      backend,
      user_id: session.userId,
      company_id: profile.companyId,
      total_categories: allCategories?.length || 0,
      income_categories: incomeCategories,
      expense_categories: expenseCategories,
      all_categories: formattedCategories,
      timestamp: new Date().toISOString(),
    })
  } else {
    // Supabase 模式
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录', backend }, { status: 401 })
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: '用户未关联公司', backend }, { status: 400 })
    }

    // 查询所有分类
    const { data: allCategories, error: allError } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('type')
      .order('name')

    if (allError) {
      return NextResponse.json({ error: '查询失败', details: allError, backend }, { status: 500 })
    }

    // 按类型分组
    const incomeCategories = allCategories?.filter(c => c.type === 'income') || []
    const expenseCategories = allCategories?.filter(c => c.type === 'expense') || []

    return NextResponse.json({
      backend,
      user_id: user.id,
      company_id: profile.company_id,
      total_categories: allCategories?.length || 0,
      income_categories: incomeCategories,
      expense_categories: expenseCategories,
      all_categories: allCategories,
      timestamp: new Date().toISOString(),
    })
  }
}
