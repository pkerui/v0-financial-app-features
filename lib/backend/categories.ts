// @ts-nocheck
'use server'

/**
 * 统一交易分类适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'

// 类型定义 - 使用 snake_case 与 Supabase API 保持兼容
export type CashFlowActivity = 'operating' | 'investing' | 'financing'
export type TransactionNature = 'operating' | 'non_operating' | 'income_tax'
export type CategoryType = 'income' | 'expense'

export interface TransactionCategory {
  id: string
  company_id: string
  name: string
  type: CategoryType
  cash_flow_activity: CashFlowActivity
  transaction_nature?: TransactionNature
  include_in_profit_loss: boolean
  is_system: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CategoryFormData {
  name: string
  type: CategoryType
  cash_flow_activity: CashFlowActivity
  transaction_nature?: TransactionNature
  include_in_profit_loss?: boolean
  sort_order?: number
}

export interface ActionResult<T = any> {
  success?: boolean
  error?: string
  data?: T
  count?: number
}

// ============================================
// 动态导入后端模块
// ============================================

async function getCategoriesModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { TransactionCategoryModel, TransactionModel, ProfileModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    return {
      backend: 'leancloud' as const,
      TransactionCategoryModel,
      TransactionModel,
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
 * 获取交易分类列表
 */
export async function getTransactionCategories(type?: CategoryType): Promise<ActionResult<TransactionCategory[]>> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录', data: [] }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司', data: [] }
      }

      const result = await mod.TransactionCategoryModel.getByCompanyId(profile.companyId)

      if (result.error) {
        return { error: result.error, data: [] }
      }

      // 转换 camelCase 到 snake_case 并根据类型过滤
      let categories: TransactionCategory[] = (result.data || []).map((c: any) => ({
        id: c.id,
        company_id: c.companyId,
        name: c.name,
        type: c.type,
        cash_flow_activity: c.cashFlowActivity,
        transaction_nature: c.transactionNature,
        include_in_profit_loss: c.includeInProfitLoss ?? true,
        is_system: c.isSystem ?? false,
        sort_order: c.sortOrder ?? 0,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }))

      if (type) {
        categories = categories.filter(c => c.type === type)
      }

      // 排序
      categories.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order
        }
        return a.name.localeCompare(b.name)
      })

      return { success: true, data: categories }
    } catch (error: any) {
      console.error('获取交易分类异常:', error)
      return { error: error.message || '获取交易分类失败', data: [] }
    }
  } else {
    const { getTransactionCategories: supabaseGet } = await import('@/lib/api/transaction-categories')
    return supabaseGet(type)
  }
}

/**
 * 添加交易分类
 */
export async function addTransactionCategory(formData: CategoryFormData): Promise<ActionResult> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 检查名称是否已存在
      const { data: existingCategories } = await mod.TransactionCategoryModel.getByCompanyId(profile.companyId)
      const existing = existingCategories?.find(
        (c: any) => c.type === formData.type && c.name === formData.name
      )

      if (existing) {
        return { error: '该类型名称已存在' }
      }

      // 添加分类 - 兼容 snake_case 和 camelCase
      const fd = formData as any
      const result = await mod.TransactionCategoryModel.create({
        companyId: profile.companyId,
        name: formData.name,
        type: formData.type,
        cashFlowActivity: fd.cash_flow_activity || fd.cashFlowActivity || 'operating',
        transactionNature: fd.transaction_nature || fd.transactionNature || 'operating',
        includeInProfitLoss: fd.include_in_profit_loss ?? fd.includeInProfitLoss ?? true,
        isSystem: false,
        sortOrder: fd.sort_order ?? fd.sortOrder ?? 0,
        createdBy: session.userId,
      })

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/settings')
      return { success: true }
    } catch (error: any) {
      console.error('添加交易分类异常:', error)
      return { error: error.message || '添加交易分类失败' }
    }
  } else {
    const { addTransactionCategory: supabaseAdd } = await import('@/lib/api/transaction-categories')
    return supabaseAdd(formData)
  }
}

/**
 * 更新交易分类
 */
export async function updateTransactionCategory(
  id: string,
  formData: Partial<CategoryFormData>
): Promise<ActionResult> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 获取原分类信息
      const { data: category } = await mod.TransactionCategoryModel.getById(id)

      if (!category) {
        return { error: '分类不存在' }
      }

      // 系统分类不能修改类型 (category 是 LeanCloud 返回的 camelCase 数据)
      if ((category as any).isSystem && formData.type && formData.type !== category.type) {
        return { error: '系统预设类型不能修改类型（收入/支出）' }
      }

      // 检查名称重复
      if (formData.name && formData.name !== category.name) {
        const { data: existingCategories } = await mod.TransactionCategoryModel.getByCompanyId(profile.companyId)
        const existing = existingCategories?.find(
          (c: any) => c.type === category.type && c.name === formData.name && c.id !== id
        )

        if (existing) {
          return { error: '该类型名称已存在' }
        }
      }

      // 级联更新交易记录 (category 是 LeanCloud 返回的 camelCase 数据)
      // 兼容 snake_case 和 camelCase
      const fd = formData as any
      const cashFlowActivity = fd.cash_flow_activity || fd.cashFlowActivity
      const transactionNature = fd.transaction_nature ?? fd.transactionNature
      const includeInProfitLoss = fd.include_in_profit_loss ?? fd.includeInProfitLoss

      const lcCategory = category as any
      const shouldCascadeUpdate =
        (formData.name && formData.name !== lcCategory.name) ||
        (cashFlowActivity && cashFlowActivity !== lcCategory.cashFlowActivity) ||
        (transactionNature !== undefined && transactionNature !== lcCategory.transactionNature) ||
        (includeInProfitLoss !== undefined && includeInProfitLoss !== lcCategory.includeInProfitLoss)

      if (shouldCascadeUpdate) {
        // 获取所有使用该分类的交易记录并更新
        const { data: transactions } = await mod.TransactionModel.getByCompanyId(profile.companyId)
        const relatedTransactions = transactions?.filter((t: any) => t.category === lcCategory.name) || []

        for (const transaction of relatedTransactions) {
          const updates: any = {}
          if (formData.name) updates.category = formData.name
          if (cashFlowActivity) updates.cashFlowActivity = cashFlowActivity
          if (transactionNature !== undefined) updates.transactionNature = transactionNature
          if (includeInProfitLoss !== undefined) updates.includeInProfitLoss = includeInProfitLoss

          if (transaction.id) {
            await mod.TransactionModel.update(transaction.id, updates)
          }
        }
      }

      // 更新分类 - 兼容 snake_case 和 camelCase
      const lcFormData: any = {}
      if (formData.name !== undefined) lcFormData.name = formData.name
      if (formData.type !== undefined) lcFormData.type = formData.type
      if (cashFlowActivity !== undefined) lcFormData.cashFlowActivity = cashFlowActivity
      if (transactionNature !== undefined) lcFormData.transactionNature = transactionNature
      if (includeInProfitLoss !== undefined) lcFormData.includeInProfitLoss = includeInProfitLoss
      if (fd.sort_order !== undefined || fd.sortOrder !== undefined) lcFormData.sortOrder = fd.sort_order ?? fd.sortOrder

      const result = await mod.TransactionCategoryModel.update(id, lcFormData)

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/settings')
      revalidatePath('/dashboard')
      revalidatePath('/transactions')
      revalidatePath('/income')
      revalidatePath('/expense')
      revalidatePath('/cash-flow')
      revalidatePath('/profit-loss')

      return { success: true }
    } catch (error: any) {
      console.error('更新交易分类异常:', error)
      return { error: error.message || '更新交易分类失败' }
    }
  } else {
    const { updateTransactionCategory: supabaseUpdate } = await import('@/lib/api/transaction-categories')
    return supabaseUpdate(id, formData)
  }
}

/**
 * 获取分类使用次数
 */
export async function getCategoryUsageCount(categoryName: string): Promise<ActionResult> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 获取所有交易并统计
      const { data: transactions } = await mod.TransactionModel.getByCompanyId(profile.companyId)
      const count = transactions?.filter((t: any) => t.category === categoryName).length || 0

      return { count }
    } catch (error: any) {
      console.error('获取分类使用次数异常:', error)
      return { error: error.message || '获取分类使用次数失败' }
    }
  } else {
    const { getCategoryUsageCount: supabaseGet } = await import('@/lib/api/transaction-categories')
    return supabaseGet(categoryName)
  }
}

/**
 * 合并交易分类
 */
export async function mergeTransactionCategories(sourceId: string, targetId: string): Promise<ActionResult> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 获取源分类和目标分类
      const { data: sourceCategory } = await mod.TransactionCategoryModel.getById(sourceId)
      const { data: targetCategory } = await mod.TransactionCategoryModel.getById(targetId)

      if (!sourceCategory) {
        return { error: '源分类不存在' }
      }

      if (!targetCategory) {
        return { error: '目标分类不存在' }
      }

      if (sourceCategory.type !== targetCategory.type) {
        return { error: '只能合并相同类型（收入/支出）的分类' }
      }

      // 更新所有使用源分类的交易记录
      const { data: transactions } = await mod.TransactionModel.getByCompanyId(profile.companyId)
      const relatedTransactions = transactions?.filter((t: any) => t.category === sourceCategory.name) || []

      for (const transaction of relatedTransactions) {
        if (transaction.id) {
          await mod.TransactionModel.update(transaction.id, {
            category: targetCategory.name,
            cashFlowActivity: targetCategory.cashFlowActivity,
            transactionNature: targetCategory.transactionNature,
          })
        }
      }

      // 删除源分类
      await mod.TransactionCategoryModel.delete(sourceId)

      revalidatePath('/settings')
      revalidatePath('/dashboard')
      revalidatePath('/transactions')
      revalidatePath('/income')
      revalidatePath('/expense')
      revalidatePath('/cash-flow')
      revalidatePath('/profit-loss')

      return { success: true }
    } catch (error: any) {
      console.error('合并交易分类异常:', error)
      return { error: error.message || '合并交易分类失败' }
    }
  } else {
    const { mergeTransactionCategories: supabaseMerge } = await import('@/lib/api/transaction-categories')
    return supabaseMerge(sourceId, targetId)
  }
}

/**
 * 删除交易分类
 */
export async function deleteTransactionCategory(id: string): Promise<ActionResult> {
  const mod = await getCategoriesModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId)

      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 获取分类信息
      const { data: category } = await mod.TransactionCategoryModel.getById(id)

      if (!category) {
        return { error: '分类不存在' }
      }

      // 检查是否有交易记录使用该分类
      const { data: transactions } = await mod.TransactionModel.getByCompanyId(profile.companyId)
      const hasUsage = transactions?.some((t: any) => t.category === category.name)

      if (hasUsage) {
        return { error: '该类型已被使用，无法删除' }
      }

      // 删除分类
      const result = await mod.TransactionCategoryModel.delete(id)

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/settings')
      return { success: true }
    } catch (error: any) {
      console.error('删除交易分类异常:', error)
      return { error: error.message || '删除交易分类失败' }
    }
  } else {
    const { deleteTransactionCategory: supabaseDelete } = await import('@/lib/api/transaction-categories')
    return supabaseDelete(id)
  }
}

// ============================================
// 别名导出（为了兼容旧代码）
// ============================================

export { getTransactionCategories as getCategories }
