'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TransactionCategory = {
  id: string
  company_id: string
  name: string
  type: 'income' | 'expense'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
  transaction_nature?: 'operating' | 'non_operating'
  include_in_profit_loss: boolean
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CategoryFormData = {
  name: string
  type: 'income' | 'expense'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
  transaction_nature?: 'operating' | 'non_operating'
  include_in_profit_loss?: boolean
  sort_order?: number
}

/**
 * 获取所有交易类型
 */
export async function getTransactionCategories(type?: 'income' | 'expense') {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 构建查询
  let query = supabase
    .from('transaction_categories')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  // 如果指定了类型，则过滤
  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) {
    console.error('获取交易类型失败:', error)
    return { error: '获取交易类型失败' }
  }

  return { data: data as TransactionCategory[] }
}

/**
 * 添加交易类型
 */
export async function addTransactionCategory(formData: CategoryFormData) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 检查名称是否已存在
  const { data: existing } = await supabase
    .from('transaction_categories')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('type', formData.type)
    .eq('name', formData.name)
    .single()

  if (existing) {
    return { error: '该类型名称已存在' }
  }

  // 添加类型
  const { error } = await supabase
    .from('transaction_categories')
    .insert({
      ...formData,
      company_id: profile.company_id,
      created_by: user.id,
      is_system: false,
    })

  if (error) {
    console.error('添加交易类型失败:', error)
    return { error: '添加交易类型失败' }
  }

  revalidatePath('/settings')
  return { success: true }
}

/**
 * 更新交易类型
 */
export async function updateTransactionCategory(id: string, formData: Partial<CategoryFormData>) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 获取原类型信息
  const { data: category } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!category) {
    return { error: '类型不存在' }
  }

  // 系统类型不能修改类型（income/expense），但可以修改名称
  if (category.is_system && formData.type && formData.type !== category.type) {
    return { error: '系统预设类型不能修改类型（收入/支出）' }
  }

  // 如果修改了名称，检查是否重复并级联更新交易记录
  if (formData.name && formData.name !== category.name) {
    const { data: existing } = await supabase
      .from('transaction_categories')
      .select('id')
      .eq('company_id', profile.company_id)
      .eq('type', category.type)
      .eq('name', formData.name)
      .neq('id', id)
      .single()

    if (existing) {
      return { error: '该类型名称已存在' }
    }

    // 级联更新：将所有使用旧名称的交易记录更新为新名称
    const { error: updateTransactionsError } = await supabase
      .from('transactions')
      .update({ category: formData.name })
      .eq('company_id', profile.company_id)
      .eq('category', category.name)

    if (updateTransactionsError) {
      console.error('级联更新交易记录失败:', updateTransactionsError)
      return { error: '级联更新交易记录失败' }
    }
  }

  // 更新类型
  const { error } = await supabase
    .from('transaction_categories')
    .update(formData)
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) {
    console.error('更新交易类型失败:', error)
    return { error: '更新交易类型失败' }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/income')
  revalidatePath('/expense')
  revalidatePath('/cash-flow')
  revalidatePath('/profit-loss')

  return { success: true }
}

/**
 * 获取分类使用次数
 */
export async function getCategoryUsageCount(categoryName: string) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 查询使用次数
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('category', categoryName)

  if (error) {
    console.error('获取分类使用次数失败:', error)
    return { error: '获取分类使用次数失败' }
  }

  return { count: count || 0 }
}

/**
 * 合并交易类型
 * @param sourceId 被合并的分类ID（将被删除）
 * @param targetId 目标分类ID（保留）
 */
export async function mergeTransactionCategories(sourceId: string, targetId: string) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 获取源分类信息
  const { data: sourceCategory } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('id', sourceId)
    .eq('company_id', profile.company_id)
    .single()

  if (!sourceCategory) {
    return { error: '源分类不存在' }
  }

  // 获取目标分类信息
  const { data: targetCategory } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('id', targetId)
    .eq('company_id', profile.company_id)
    .single()

  if (!targetCategory) {
    return { error: '目标分类不存在' }
  }

  // 确保两个分类类型相同
  if (sourceCategory.type !== targetCategory.type) {
    return { error: '只能合并相同类型（收入/支出）的分类' }
  }

  // 更新所有使用源分类的交易记录
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ category: targetCategory.name })
    .eq('company_id', profile.company_id)
    .eq('category', sourceCategory.name)

  if (updateError) {
    console.error('更新交易记录失败:', updateError)
    return { error: '更新交易记录失败' }
  }

  // 删除源分类
  const { error: deleteError } = await supabase
    .from('transaction_categories')
    .delete()
    .eq('id', sourceId)
    .eq('company_id', profile.company_id)

  if (deleteError) {
    console.error('删除源分类失败:', deleteError)
    return { error: '删除源分类失败' }
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/income')
  revalidatePath('/expense')
  revalidatePath('/cash-flow')
  revalidatePath('/profit-loss')

  return { success: true }
}

/**
 * 删除交易类型
 */
export async function deleteTransactionCategory(id: string) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 获取类型信息
  const { data: category } = await supabase
    .from('transaction_categories')
    .select('name')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!category) {
    return { error: '类型不存在' }
  }

  // 检查是否有交易记录使用了该类型
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('category', category.name)
    .limit(1)

  if (transactions && transactions.length > 0) {
    return { error: '该类型已被使用，无法删除' }
  }

  // 删除类型
  const { error } = await supabase
    .from('transaction_categories')
    .delete()
    .eq('id', id)
    .eq('company_id', profile.company_id)

  if (error) {
    console.error('删除交易类型失败:', error)
    return { error: '删除交易类型失败' }
  }

  revalidatePath('/settings')
  return { success: true }
}
