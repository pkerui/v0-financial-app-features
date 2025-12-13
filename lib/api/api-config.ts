// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/lib/auth/permissions'

// ============================================
// 类型定义
// ============================================

export interface ApiConfig {
  deepseek_api_key: string | null
  tencent_secret_id: string | null
  tencent_secret_key: string | null
}

export interface ApiConfigDisplay {
  deepseek_configured: boolean
  tencent_configured: boolean
  deepseek_api_key_masked: string | null
  deepseek_api_key_full: string | null
  tencent_secret_id_masked: string | null
  tencent_secret_id_full: string | null
  tencent_secret_key_full: string | null
}

// Supabase 查询结果类型
type ProfileResult = { company_id: string | null; role: UserRole }
type ProfileCompanyResult = { company_id: string | null }
type CompanyApiResult = {
  deepseek_api_key: string | null
  tencent_secret_id: string | null
  tencent_secret_key: string | null
}

// ============================================
// 辅助函数：掩码显示 API Key
// ============================================

function maskApiKey(key: string | null): string | null {
  if (!key) return null
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}

// ============================================
// 获取 API 配置（仅 owner 可查看）
// ============================================

export async function getApiConfig(): Promise<{
  data: ApiConfigDisplay | null
  error: string | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: '请先登录' }
  }

  // 获取用户 profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single() as { data: ProfileResult | null; error: any }

  if (!profile?.company_id) {
    return { data: null, error: '用户未关联公司' }
  }

  // 只有 owner 可以查看 API 配置
  if (profile.role !== 'owner') {
    return { data: null, error: '只有老板可以查看 API 配置' }
  }

  // 获取公司的 API 配置
  const { data: company, error } = await supabase
    .from('companies')
    .select('deepseek_api_key, tencent_secret_id, tencent_secret_key')
    .eq('id', profile.company_id)
    .single() as { data: CompanyApiResult | null; error: any }

  if (error) {
    console.error('获取 API 配置失败:', error)
    return { data: null, error: '获取配置失败' }
  }

  // 返回配置信息（包含掩码和完整值）
  return {
    data: {
      deepseek_configured: !!company?.deepseek_api_key,
      tencent_configured: !!company?.tencent_secret_id && !!company?.tencent_secret_key,
      deepseek_api_key_masked: maskApiKey(company?.deepseek_api_key ?? null),
      deepseek_api_key_full: company?.deepseek_api_key || null,
      tencent_secret_id_masked: maskApiKey(company?.tencent_secret_id ?? null),
      tencent_secret_id_full: company?.tencent_secret_id || null,
      tencent_secret_key_full: company?.tencent_secret_key || null,
    },
    error: null,
  }
}

// ============================================
// 更新 API 配置（仅 owner 可修改）
// ============================================

export async function updateApiConfig(config: {
  deepseek_api_key?: string | null
  tencent_secret_id?: string | null
  tencent_secret_key?: string | null
}): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '请先登录' }
  }

  // 获取用户 profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single() as { data: ProfileResult | null; error: any }

  if (!profile?.company_id) {
    return { error: '用户未关联公司' }
  }

  // 只有 owner 可以修改 API 配置
  if (profile.role !== 'owner') {
    return { error: '只有老板可以修改 API 配置' }
  }

  // 构建更新数据（只更新传入的字段）
  const updateData: Record<string, string | null> = {}

  if (config.deepseek_api_key !== undefined) {
    updateData.deepseek_api_key = config.deepseek_api_key || null
  }
  if (config.tencent_secret_id !== undefined) {
    updateData.tencent_secret_id = config.tencent_secret_id || null
  }
  if (config.tencent_secret_key !== undefined) {
    updateData.tencent_secret_key = config.tencent_secret_key || null
  }

  if (Object.keys(updateData).length === 0) {
    return { error: '没有要更新的配置' }
  }

  const { error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', profile.company_id)

  if (error) {
    console.error('更新 API 配置失败:', error)
    return { error: '更新配置失败' }
  }

  revalidatePath('/stores/settings')

  return { error: null }
}

// ============================================
// 获取公司的 API 密钥（内部使用，用于 API 调用）
// ============================================

export async function getCompanyApiKeys(companyId: string): Promise<ApiConfig | null> {
  const supabase = await createClient()

  const { data: company, error } = await supabase
    .from('companies')
    .select('deepseek_api_key, tencent_secret_id, tencent_secret_key')
    .eq('id', companyId)
    .single() as { data: CompanyApiResult | null; error: any }

  if (error || !company) {
    return null
  }

  return {
    deepseek_api_key: company.deepseek_api_key,
    tencent_secret_id: company.tencent_secret_id,
    tencent_secret_key: company.tencent_secret_key,
  }
}

// ============================================
// 根据当前用户获取 API 密钥（内部使用）
// ============================================

export async function getCurrentUserApiKeys(): Promise<ApiConfig | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 获取用户的 company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single() as { data: ProfileCompanyResult | null; error: any }

  if (!profile?.company_id) {
    return null
  }

  return getCompanyApiKeys(profile.company_id)
}
