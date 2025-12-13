// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type FinancialSettings = {
  id: string
  company_id: string
  initial_cash_balance: number
  initial_balance_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type FinancialSettingsFormData = {
  initial_cash_balance: number
  initial_balance_date: string
  notes?: string
}

/**
 * 获取财务设置
 */
export async function getFinancialSettings() {
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

  // 获取财务设置
  const { data, error } = await supabase
    .from('financial_settings')
    .select('*')
    .eq('company_id', profile.company_id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 是 "not found" 错误
    console.error('获取财务设置失败:', error)
    return { error: '获取财务设置失败' }
  }

  return { data: data as FinancialSettings | null }
}

/**
 * 保存或更新财务设置
 */
export async function saveFinancialSettings(formData: FinancialSettingsFormData) {
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

  // 检查是否已存在设置
  const { data: existing } = await supabase
    .from('financial_settings')
    .select('id')
    .eq('company_id', profile.company_id)
    .single()

  if (existing) {
    // 更新现有设置
    const { error } = await supabase
      .from('financial_settings')
      .update({
        ...formData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', profile.company_id)

    if (error) {
      console.error('更新财务设置失败:', error)
      return { error: '更新财务设置失败' }
    }
  } else {
    // 创建新设置
    const { error } = await supabase
      .from('financial_settings')
      .insert({
        ...formData,
        company_id: profile.company_id,
        updated_by: user.id,
      })

    if (error) {
      console.error('创建财务设置失败:', error)
      return { error: '创建财务设置失败' }
    }
  }

  revalidatePath('/settings')
  revalidatePath('/cash-flow')

  return { success: true }
}
