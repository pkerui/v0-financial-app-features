// @ts-nocheck
/**
 * 统一财务设置适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'

// 类型定义 - 使用 snake_case 与 Supabase API 保持兼容
export interface FinancialSettings {
  id: string
  company_id: string
  initial_cash_balance: number
  initial_balance_date: string
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface FinancialSettingsFormData {
  initial_cash_balance: number
  initial_balance_date: string
  notes?: string
}

export interface ActionResult<T = any> {
  success?: boolean
  error?: string
  data?: T
}

// ============================================
// 动态导入后端模块
// ============================================

async function getFinancialSettingsModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { FinancialSettingsModel, ProfileModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    return {
      backend: 'leancloud' as const,
      FinancialSettingsModel,
      ProfileModel,
      getLCSession,
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
 * 获取财务设置
 */
export async function getFinancialSettings(): Promise<ActionResult<FinancialSettings | null>> {
  const mod = await getFinancialSettingsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端 session
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      // ProfileModel.getByUserId 返回单个对象，不是数组
      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      const result = await mod.FinancialSettingsModel.getByCompanyId(profile.companyId)

      if (result.error) {
        // 如果有错误，返回错误信息
        return { error: result.error }
      }

      // 如果没有设置（data 为 null），返回空数据（不是错误）
      if (!result.data) {
        return { success: true, data: null }
      }

      // 转换 camelCase 到 snake_case
      const settings: FinancialSettings = {
        id: result.data.id,
        company_id: result.data.companyId,
        initial_cash_balance: result.data.initialCashBalance,
        initial_balance_date: result.data.initialBalanceDate,
        notes: result.data.notes,
        created_at: result.data.createdAt,
        updated_at: result.data.updatedAt,
      }
      return { success: true, data: settings }
    } catch (error: any) {
      console.error('获取财务设置异常:', error)
      return { error: error.message || '获取财务设置失败' }
    }
  } else {
    const { getFinancialSettings: supabaseGet } = await import('@/lib/api/financial-settings')
    return supabaseGet()
  }
}

/**
 * 保存或更新财务设置
 */
export async function saveFinancialSettings(formData: FinancialSettingsFormData): Promise<ActionResult> {
  const mod = await getFinancialSettingsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 使用服务端 session
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      // ProfileModel.getByUserId 返回单个对象，不是数组
      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 检查是否已存在设置
      const { data: existing } = await mod.FinancialSettingsModel.getByCompanyId(profile.companyId)

      // 转换 snake_case 到 camelCase
      const lcFormData = {
        initialCashBalance: formData.initial_cash_balance,
        initialBalanceDate: formData.initial_balance_date,
        notes: formData.notes,
      }

      console.log('[saveFinancialSettings] 检查现有设置:', {
        hasExisting: !!existing,
        existingId: existing?.id,
        companyId: profile.companyId,
        formData: lcFormData,
      })

      if (existing) {
        // 更新现有设置
        console.log('[saveFinancialSettings] 更新现有设置:', existing.id)
        const result = await mod.FinancialSettingsModel.update(existing.id, {
          ...lcFormData,
          updatedBy: session.userId,
        }, session.sessionToken)

        if (result.error) {
          console.error('[saveFinancialSettings] 更新失败:', result.error)
          return { error: result.error }
        }
        console.log('[saveFinancialSettings] 更新成功')
      } else {
        // 创建新设置
        console.log('[saveFinancialSettings] 创建新设置')
        const result = await mod.FinancialSettingsModel.create({
          companyId: profile.companyId,
          ...lcFormData,
          updatedBy: session.userId,
        }, session.sessionToken)

        if (result.error) {
          console.error('[saveFinancialSettings] 创建失败:', result.error)
          return { error: result.error }
        }
        console.log('[saveFinancialSettings] 创建成功:', result.data?.id)
      }

      revalidatePath('/settings')
      revalidatePath('/cash-flow')

      return { success: true }
    } catch (error: any) {
      console.error('保存财务设置异常:', error)
      return { error: error.message || '保存财务设置失败' }
    }
  } else {
    const { saveFinancialSettings: supabaseSave } = await import('@/lib/api/financial-settings')
    return supabaseSave(formData)
  }
}
