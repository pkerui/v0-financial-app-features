'use server'

/**
 * 统一 API 配置适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'

// 类型定义
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

// ============================================
// 辅助函数
// ============================================

function maskApiKey(key: string | null): string | null {
  if (!key) return null
  if (key.length <= 8) return '****'
  return key.substring(0, 4) + '****' + key.substring(key.length - 4)
}

// ============================================
// 动态导入后端模块
// ============================================

async function getApiConfigModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { CompanyModel } = await import('@/lib/leancloud/models')
    const { getServerUser, getServerProfile } = await import('@/lib/auth/server')
    return {
      backend: 'leancloud' as const,
      CompanyModel,
      getServerUser,
      getServerProfile,
    }
  } else {
    const { createClient } = await import('@/lib/supabase/server')
    return {
      backend: 'supabase' as const,
      createClient,
    }
  }
}

// ============================================
// 统一 API 接口
// ============================================

/**
 * 获取 API 配置（仅 owner 可查看）
 */
export async function getApiConfig(): Promise<{
  data: ApiConfigDisplay | null
  error: string | null
}> {
  const mod = await getApiConfigModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { data: null, error: '请先登录' }
      }

      // 获取用户 profile
      const profile = await mod.getServerProfile()
      if (!profile?.company_id) {
        return { data: null, error: '用户未关联公司' }
      }

      // 只有 owner 可以查看 API 配置
      if (profile.role !== 'owner') {
        return { data: null, error: '只有老板可以查看 API 配置' }
      }

      // 获取公司信息（包含 API 配置）
      const { data: company, error } = await mod.CompanyModel.getById(profile.company_id)
      if (error || !company) {
        console.error('获取公司 API 配置失败:', error)
        return { data: null, error: '获取配置失败' }
      }

      // 返回配置信息（包含掩码和完整值）
      return {
        data: {
          deepseek_configured: !!company.deepseekApiKey,
          tencent_configured: !!company.tencentSecretId && !!company.tencentSecretKey,
          deepseek_api_key_masked: maskApiKey(company.deepseekApiKey || null),
          deepseek_api_key_full: company.deepseekApiKey || null,
          tencent_secret_id_masked: maskApiKey(company.tencentSecretId || null),
          tencent_secret_id_full: company.tencentSecretId || null,
          tencent_secret_key_full: company.tencentSecretKey || null,
        },
        error: null,
      }
    } catch (error: any) {
      console.error('获取 API 配置异常:', error)
      return { data: null, error: error.message || '获取配置失败' }
    }
  } else {
    // Supabase 模式：使用原有实现
    const { getApiConfig: supabaseGet } = await import('@/lib/api/api-config')
    return supabaseGet()
  }
}

/**
 * 更新 API 配置（仅 owner 可修改）
 */
export async function updateApiConfig(config: {
  deepseek_api_key?: string | null
  tencent_secret_id?: string | null
  tencent_secret_key?: string | null
}): Promise<{ error: string | null }> {
  const mod = await getApiConfigModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端认证
      const user = await mod.getServerUser()
      if (!user) {
        return { error: '请先登录' }
      }

      // 获取用户 profile
      const profile = await mod.getServerProfile()
      if (!profile?.company_id) {
        return { error: '用户未关联公司' }
      }

      // 只有 owner 可以修改 API 配置
      if (profile.role !== 'owner') {
        return { error: '只有老板可以修改 API 配置' }
      }

      // 构建更新数据（转换字段名：snake_case -> camelCase）
      const updateData: Record<string, string | null> = {}
      if (config.deepseek_api_key !== undefined) {
        updateData.deepseekApiKey = config.deepseek_api_key || null
      }
      if (config.tencent_secret_id !== undefined) {
        updateData.tencentSecretId = config.tencent_secret_id || null
      }
      if (config.tencent_secret_key !== undefined) {
        updateData.tencentSecretKey = config.tencent_secret_key || null
      }

      if (Object.keys(updateData).length === 0) {
        return { error: '没有要更新的配置' }
      }

      // 更新公司 API 配置
      const { error } = await mod.CompanyModel.updateApiConfig(profile.company_id, updateData)
      if (error) {
        console.error('更新 API 配置失败:', error)
        return { error: '更新配置失败' }
      }

      revalidatePath('/stores/settings')
      return { error: null }
    } catch (error: any) {
      console.error('更新 API 配置异常:', error)
      return { error: error.message || '更新配置失败' }
    }
  } else {
    // Supabase 模式：使用原有实现
    const { updateApiConfig: supabaseUpdate } = await import('@/lib/api/api-config')
    return supabaseUpdate(config)
  }
}

/**
 * 获取公司的 API 密钥（内部使用，用于 API 调用）
 */
export async function getCompanyApiKeys(companyId: string): Promise<ApiConfig | null> {
  const mod = await getApiConfigModule()

  if (mod.backend === 'leancloud') {
    try {
      const { data: company, error } = await mod.CompanyModel.getById(companyId)
      if (error || !company) {
        return null
      }

      return {
        deepseek_api_key: company.deepseekApiKey || null,
        tencent_secret_id: company.tencentSecretId || null,
        tencent_secret_key: company.tencentSecretKey || null,
      }
    } catch (error) {
      console.error('获取公司 API 密钥失败:', error)
      return null
    }
  } else {
    const { getCompanyApiKeys: supabaseGet } = await import('@/lib/api/api-config')
    return supabaseGet(companyId)
  }
}

/**
 * 根据当前用户获取 API 密钥（内部使用）
 */
export async function getCurrentUserApiKeys(): Promise<ApiConfig | null> {
  const mod = await getApiConfigModule()

  if (mod.backend === 'leancloud') {
    try {
      const user = await mod.getServerUser()
      if (!user) {
        return null
      }

      const profile = await mod.getServerProfile()
      if (!profile?.company_id) {
        return null
      }

      return getCompanyApiKeys(profile.company_id)
    } catch (error) {
      console.error('获取当前用户 API 密钥失败:', error)
      return null
    }
  } else {
    const { getCurrentUserApiKeys: supabaseGet } = await import('@/lib/api/api-config')
    return supabaseGet()
  }
}
