// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCategoryMapping } from '@/lib/cash-flow-config'
import { getToday, formatDateToLocal } from '@/lib/utils/date'
import { getFinancialSettings } from '@/lib/api/financial-settings'

// 交易记录表单验证模式
// store_id 支持 UUID 格式（Supabase）和 24 位十六进制字符串（LeanCloud objectId）
const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: '请选择交易类型',
  }),
  category: z.string().min(1, '请选择分类'),
  amount: z.number().positive('金额必须大于0'),
  description: z.string().optional(),
  date: z.string().optional(),
  payment_method: z.enum(['cash', 'transfer', 'wechat', 'alipay', 'card']).optional(),
  invoice_number: z.string().optional(),
  input_method: z.enum(['voice', 'text', 'manual']).optional(),
  store_id: z.string().min(1).optional(),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

export type ActionResult = {
  error?: string
  success?: boolean
  data?: any
}

// Supabase 查询结果类型
type ProfileResult = { company_id: string | null }
type CategoryResult = {
  id: string
  cash_flow_activity: string
  transaction_nature: string | null
}
type TransactionTypeCategory = {
  type: 'income' | 'expense'
  category: string
}

/**
 * 创建交易记录
 */
export async function createTransaction(
  data: TransactionFormData
): Promise<ActionResult> {
  try {
    // 验证数据
    const validated = transactionSchema.parse(data)

    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 获取用户配置以获取 company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single() as { data: ProfileResult | null; error: any }

    if (!profile?.company_id) {
      return { error: '用户未关联公司，请联系管理员' }
    }

    // 获取财务设置并验证交易日期
    const { data: financialSettings } = await getFinancialSettings()
    if (financialSettings?.initial_balance_date) {
      const transactionDate = new Date(validated.date || getToday())
      const initialBalanceDate = new Date(financialSettings.initial_balance_date)

      if (transactionDate < initialBalanceDate) {
        return {
          error: `不能录入期初余额日期（${financialSettings.initial_balance_date}）之前的交易记录。如需调整期初余额，请前往财务设置页面修改。`
        }
      }
    }

    // 查询 transaction_categories 表以获取 category_id、cash_flow_activity 和 transaction_nature
    const { data: categoryData } = await supabase
      .from('transaction_categories')
      .select('id, cash_flow_activity, transaction_nature')
      .eq('company_id', profile.company_id)
      .eq('type', validated.type)
      .eq('name', validated.category)
      .single() as { data: CategoryResult | null; error: any }

    // 设置 category_id、cash_flow_activity 和 transaction_nature
    let category_id: string | null = null
    let cash_flow_activity = 'operating'
    let transaction_nature: 'operating' | 'non_operating' | null = null

    if (categoryData) {
      // 如果从数据库找到分类，使用数据库中的数据
      category_id = categoryData.id
      cash_flow_activity = categoryData.cash_flow_activity
      transaction_nature = (categoryData.transaction_nature as 'operating' | 'non_operating') || null
    } else {
      // 如果数据库中没有找到（迁移未执行或新分类），回退到配置文件
      const mapping = getCategoryMapping(validated.type, validated.category)
      cash_flow_activity = mapping?.activity || 'operating'
      // 默认为营业内
      transaction_nature = 'operating'
    }

    // 创建交易记录
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        type: validated.type,
        category: validated.category,
        amount: validated.amount,
        description: validated.description,
        date: validated.date || getToday(),
        payment_method: validated.payment_method,
        invoice_number: validated.invoice_number,
        input_method: validated.input_method,
        store_id: validated.store_id,
        category_id,
        company_id: profile.company_id,
        created_by: user.id,
        cash_flow_activity,
        transaction_nature,
      })
      .select()
      .single()

    if (error) {
      console.error('创建交易记录失败:', error)
      return { error: '创建交易记录失败' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/voice-entry')

    return { success: true, data: transaction }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('创建交易记录异常:', error)
    return { error: '创建交易记录失败' }
  }
}

/**
 * 获取交易记录列表
 */
export async function getTransactions(params?: {
  limit?: number
  offset?: number
  type?: 'income' | 'expense'
  store_id?: string
  start_date?: string
  end_date?: string
}) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single() as { data: ProfileResult | null; error: any }

    if (!profile?.company_id) {
      return { error: '用户未关联公司' }
    }

    // 构建查询
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // 应用过滤条件
    if (params?.type) {
      query = query.eq('type', params.type)
    }
    if (params?.store_id) {
      query = query.eq('store_id', params.store_id)
    }
    if (params?.start_date) {
      query = query.gte('date', params.start_date)
    }
    if (params?.end_date) {
      query = query.lte('date', params.end_date)
    }

    // 应用分页
    if (params?.limit) {
      query = query.limit(params.limit)
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
    }

    const { data: transactions, error, count } = await query

    if (error) {
      console.error('获取交易记录失败:', error)
      return { error: '获取交易记录失败' }
    }

    return { success: true, data: transactions, count }
  } catch (error) {
    console.error('获取交易记录异常:', error)
    return { error: '获取交易记录失败' }
  }
}

/**
 * 更新交易记录
 */
export async function updateTransaction(
  id: string,
  data: Partial<TransactionFormData>
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 获取用户配置以获取 company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single() as { data: ProfileResult | null; error: any }

    if (!profile?.company_id) {
      return { error: '用户未关联公司，请联系管理员' }
    }

    // 获取财务设置并验证交易日期（如果更新了日期）
    if (data.date) {
      const { data: financialSettings } = await getFinancialSettings()
      if (financialSettings?.initial_balance_date) {
        const transactionDate = new Date(data.date)
        const initialBalanceDate = new Date(financialSettings.initial_balance_date)

        if (transactionDate < initialBalanceDate) {
          return {
            error: `不能录入期初余额日期（${financialSettings.initial_balance_date}）之前的交易记录。如需调整期初余额，请前往财务设置页面修改。`
          }
        }
      }
    }

    // 准备更新数据
    const updateData: Record<string, any> = { ...data }

    // 如果更新了分类或类型，需要重新查询 category_id 和 cash_flow_activity
    if (data.category || data.type) {
      // 获取当前交易记录以确定类型
      const { data: currentTransaction } = await supabase
        .from('transactions')
        .select('type, category')
        .eq('id', id)
        .single() as { data: TransactionTypeCategory | null; error: any }

      const newType = data.type || currentTransaction?.type
      const newCategory = data.category || currentTransaction?.category

      if (newType && newCategory) {
        // 查询新的 category_id、cash_flow_activity 和 transaction_nature
        const { data: categoryData } = await supabase
          .from('transaction_categories')
          .select('id, cash_flow_activity, transaction_nature')
          .eq('company_id', profile.company_id)
          .eq('type', newType)
          .eq('name', newCategory)
          .single() as { data: CategoryResult | null; error: any }

        if (categoryData) {
          updateData.category_id = categoryData.id
          updateData.cash_flow_activity = categoryData.cash_flow_activity
          updateData.transaction_nature = categoryData.transaction_nature || null
        } else {
          // 回退到配置文件
          const mapping = getCategoryMapping(newType, newCategory)
          updateData.category_id = null
          updateData.cash_flow_activity = mapping?.activity || 'operating'
          updateData.transaction_nature = 'operating'  // 默认为营业内
        }
      }
    }

    // 更新交易记录（RLS 策略会自动验证权限）
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新交易记录失败:', error)
      return { error: '更新交易记录失败' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/voice-entry')
    revalidatePath('/transactions')
    revalidatePath('/income')
    revalidatePath('/expense')
    revalidatePath('/cash-flow')
    revalidatePath('/profit-loss')

    return { success: true, data: transaction }
  } catch (error) {
    console.error('更新交易记录异常:', error)
    return { error: '更新交易记录失败' }
  }
}

/**
 * 删除交易记录
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 删除交易记录（RLS 策略会自动验证权限）
    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      console.error('删除交易记录失败:', error)
      return { error: '删除交易记录失败' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/voice-entry')

    return { success: true }
  } catch (error) {
    console.error('删除交易记录异常:', error)
    return { error: '删除交易记录失败' }
  }
}

/**
 * 获取月度汇总数据
 */
export async function getMonthlySummary(year?: number, month?: number) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single() as { data: ProfileResult | null; error: any }

    if (!profile?.company_id) {
      return { error: '用户未关联公司' }
    }

    // 构建日期范围
    const targetYear = year || new Date().getFullYear()
    const startDate = month
      ? `${targetYear}-${String(month).padStart(2, '0')}-01`
      : `${targetYear}-01-01`
    const endDate = month
      ? formatDateToLocal(new Date(targetYear, month, 0))
      : `${targetYear}-12-31`

    // 查询月度汇总视图
    const { data, error } = await supabase
      .from('monthly_summary')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('month', startDate)
      .lte('month', endDate)

    if (error) {
      console.error('获取月度汇总失败:', error)
      return { error: '获取月度汇总失败' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('获取月度汇总异常:', error)
    return { error: '获取月度汇总失败' }
  }
}

/**
 * 获取分类汇总数据
 */
export async function getCategorySummary(year?: number, month?: number) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: '未登录' }
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single() as { data: ProfileResult | null; error: any }

    if (!profile?.company_id) {
      return { error: '用户未关联公司' }
    }

    // 构建日期范围
    const targetYear = year || new Date().getFullYear()
    const targetMonth = month || new Date().getMonth() + 1
    const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

    // 查询分类汇总视图
    const { data, error } = await supabase
      .from('category_summary')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('month', monthStr)

    if (error) {
      console.error('获取分类汇总失败:', error)
      return { error: '获取分类汇总失败' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('获取分类汇总异常:', error)
    return { error: '获取分类汇总失败' }
  }
}
