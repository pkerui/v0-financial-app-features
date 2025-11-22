import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getFinancialSettings } from '@/lib/api/financial-settings'

// 删除交易记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除交易记录失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除交易记录异常:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新交易记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('📥 接收到的完整请求数据:', JSON.stringify(body, null, 2))

    const { category, amount, description, date, payment_method, cash_flow_activity } = body

    // 验证必填字段
    if (!category || !amount || !date) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证交易日期不能早于期初余额日期
    const { data: financialSettings } = await getFinancialSettings()
    if (financialSettings?.initial_balance_date) {
      const transactionDate = new Date(date)
      const initialBalanceDate = new Date(financialSettings.initial_balance_date)

      if (transactionDate < initialBalanceDate) {
        return NextResponse.json(
          {
            error: `不能录入期初余额日期（${financialSettings.initial_balance_date}）之前的交易记录。如需调整期初余额，请前往财务设置页面修改。`
          },
          { status: 400 }
        )
      }
    }

    // 构建更新对象，只包含有效字段
    const updateData: any = {
      category,
      amount: parseFloat(amount),
      date,
      updated_at: new Date().toISOString(),
    }

    // 只在有值时更新可选字段
    if (description !== undefined && description !== null) {
      updateData.description = description
    }

    if (payment_method && payment_method !== 'undefined' && payment_method !== '') {
      updateData.payment_method = payment_method
    }

    // 支持更新现金流活动类型
    if (cash_flow_activity && ['operating', 'investing', 'financing'].includes(cash_flow_activity)) {
      updateData.cash_flow_activity = cash_flow_activity
    }

    console.log('更新数据:', updateData)

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新交易记录失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('更新交易记录异常:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
