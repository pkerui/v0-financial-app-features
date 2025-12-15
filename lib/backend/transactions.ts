// @ts-nocheck
'use server'

/**
 * 统一交易记录适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'

// 类型定义
export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card'
export type InputMethod = 'voice' | 'text' | 'manual'
export type CashFlowActivity = 'operating' | 'investing' | 'financing'
export type TransactionNature = 'operating' | 'non_operating'

export interface Transaction {
  id: string
  companyId: string
  storeId?: string
  type: TransactionType
  category: string
  categoryId?: string
  amount: number
  description?: string
  date: string
  cashFlowActivity: CashFlowActivity
  transactionNature?: TransactionNature
  paymentMethod?: PaymentMethod
  invoiceNumber?: string
  inputMethod?: InputMethod
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface TransactionFormData {
  type: TransactionType
  category: string
  amount: number
  description?: string
  date?: string
  payment_method?: PaymentMethod
  invoice_number?: string
  input_method?: InputMethod
  store_id?: string
}

export interface ActionResult<T = any> {
  success?: boolean
  error?: string
  data?: T
}

export interface TransactionQueryParams {
  limit?: number
  offset?: number
  type?: TransactionType
  storeId?: string
  startDate?: string
  endDate?: string
}

// ============================================
// 动态导入后端模块
// ============================================

async function getTransactionsModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // 使用 LeanCloud 实现
    const { TransactionModel, TransactionCategoryModel, ProfileModel, FinancialSettingsModel, StoreModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')

    return {
      backend: 'leancloud' as const,
      TransactionModel,
      TransactionCategoryModel,
      ProfileModel,
      FinancialSettingsModel,
      StoreModel,
      getLCSession,
    }
  } else {
    // 使用 Supabase 实现
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
 * 创建交易记录
 */
export async function createTransaction(data: TransactionFormData): Promise<ActionResult<Transaction>> {
  const mod = await getTransactionsModule()

  if (mod.backend === 'leancloud') {
    try {
      // LeanCloud 实现 - 使用服务端 session
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      // 获取用户的 profile (返回单个对象，不是数组)
      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId, 3, session.sessionToken)

      if (!profile?.companyId) {
        return { error: '用户未关联公司，请联系管理员' }
      }

      // 获取期初日期并验证交易日期
      const storeId = data.store_id || ''
      console.log('[createTransaction] 验证日期 - storeId:', storeId, ', companyId:', profile.companyId, ', date:', data.date)

      // 获取期初日期：优先从 Store 表获取，如果没有则从 FinancialSettings 获取
      let initialBalanceDateStr: string | null = null

      // 1. 首先尝试从 Store 表获取期初日期
      if (storeId) {
        const { data: store } = await mod.StoreModel.getById(storeId, session.sessionToken)
        if (store?.initialBalanceDate) {
          initialBalanceDateStr = store.initialBalanceDate
          console.log('[createTransaction] 从 Store 表获取期初日期:', {
            storeId,
            initialBalanceDate: store.initialBalanceDate
          })
        }
      }

      // 2. 如果 Store 没有期初日期，尝试从 FinancialSettings 获取（公司级别）
      if (!initialBalanceDateStr && profile.companyId) {
        const { data: companySettings } = await mod.FinancialSettingsModel.getByCompanyId(profile.companyId, session.sessionToken)
        if (companySettings?.initialBalanceDate) {
          initialBalanceDateStr = companySettings.initialBalanceDate
          console.log('[createTransaction] 从 FinancialSettings 获取公司级别期初日期:', {
            companyId: profile.companyId,
            initialBalanceDate: companySettings.initialBalanceDate
          })
        }
      }

      console.log('[createTransaction] 最终期初日期:', {
        hasInitialBalanceDate: !!initialBalanceDateStr,
        initialBalanceDate: initialBalanceDateStr
      })

      if (initialBalanceDateStr) {
        const transactionDate = new Date(data.date || new Date().toISOString().split('T')[0])
        const initialBalanceDate = new Date(initialBalanceDateStr)

        console.log('[createTransaction] 日期比较:', {
          transactionDate: transactionDate.toISOString(),
          initialBalanceDate: initialBalanceDate.toISOString(),
          isBefore: transactionDate < initialBalanceDate
        })

        if (transactionDate < initialBalanceDate) {
          return {
            error: `不能录入期初余额日期（${initialBalanceDateStr}）之前的交易记录。如需调整期初余额，请前往财务设置页面修改。`
          }
        }
      }

      // 获取分类信息
      let cashFlowActivity: CashFlowActivity = 'operating'
      let transactionNature: TransactionNature = 'operating'
      let categoryId: string | undefined

      const { data: categories } = await mod.TransactionCategoryModel.getByCompanyId(profile.companyId)
      const category = categories?.find((c: any) => c.type === data.type && c.name === data.category)

      if (category) {
        categoryId = category.id
        cashFlowActivity = category.cashFlowActivity || 'operating'
        transactionNature = category.transactionNature || 'operating'
      }

      // 创建交易记录
      const result = await mod.TransactionModel.create({
        companyId: profile.companyId,
        storeId: data.store_id || '',
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: data.date || new Date().toISOString().split('T')[0],
        cashFlowActivity,
        nature: transactionNature,
        paymentMethod: data.payment_method,
        inputMethod: data.input_method,
        createdBy: session.userId,
      })

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/dashboard')
      revalidatePath('/voice-entry')

      return { success: true, data: result.data as Transaction }
    } catch (error: any) {
      console.error('创建交易记录异常:', error)
      return { error: error.message || '创建交易记录失败' }
    }
  } else {
    // Supabase 实现 - 调用原有的 Server Action
    const { createTransaction: supabaseCreate } = await import('@/lib/api/transactions')
    return supabaseCreate(data)
  }
}

/**
 * 获取交易记录列表
 */
export async function getTransactions(params?: TransactionQueryParams): Promise<ActionResult<Transaction[]>> {
  const mod = await getTransactionsModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录', data: [] }
      }

      // 获取用户的 profile (返回单个对象，不是数组)
      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId, 3, session.sessionToken)

      if (!profile?.companyId) {
        return { error: '用户未关联公司', data: [] }
      }

      // 根据 storeId 或 companyId 查询
      let result
      if (params?.storeId) {
        result = await mod.TransactionModel.getByStoreId(params.storeId, {
          limit: params?.limit,
          skip: params?.offset,
          type: params?.type,
          startDate: params?.startDate,
          endDate: params?.endDate,
        }, session.sessionToken)
      } else {
        result = await mod.TransactionModel.getByCompanyId(profile.companyId, {
          limit: params?.limit,
          skip: params?.offset,
          type: params?.type,
          startDate: params?.startDate,
          endDate: params?.endDate,
        }, session.sessionToken)
      }

      if (result.error) {
        return { error: result.error, data: [] }
      }

      return { success: true, data: result.data as Transaction[] }
    } catch (error: any) {
      console.error('获取交易记录异常:', error)
      return { error: error.message || '获取交易记录失败', data: [] }
    }
  } else {
    // Supabase 实现
    const { getTransactions: supabaseGet } = await import('@/lib/api/transactions')
    const result = await supabaseGet({
      limit: params?.limit,
      offset: params?.offset,
      type: params?.type,
      store_id: params?.storeId,
      start_date: params?.startDate,
      end_date: params?.endDate,
    })
    return result
  }
}

/**
 * 更新交易记录
 */
export async function updateTransaction(
  id: string,
  data: Partial<TransactionFormData>
): Promise<ActionResult<Transaction>> {
  const mod = await getTransactionsModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { error: '未登录' }
      }

      // 获取用户的 profile
      const { data: profile } = await mod.ProfileModel.getByUserId(session.userId, 3, session.sessionToken)
      if (!profile?.companyId) {
        return { error: '用户未关联公司' }
      }

      // 如果更新了日期，需要验证日期
      if (data.date && data.store_id) {
        // 首先从 Store 表获取期初日期
        const { data: store } = await mod.StoreModel.getById(data.store_id, session.sessionToken)
        const initialBalanceDateStr = store?.initialBalanceDate

        if (initialBalanceDateStr) {
          const transactionDate = new Date(data.date)
          const initialBalanceDate = new Date(initialBalanceDateStr)

          if (transactionDate < initialBalanceDate) {
            return {
              error: `不能将交易日期修改为期初余额日期（${initialBalanceDateStr}）之前。如需调整期初余额，请前往财务设置页面修改。`
            }
          }
        }
      }

      // 准备更新数据
      const updateData: Record<string, any> = {
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: data.date,
        paymentMethod: data.payment_method,
        invoiceNumber: data.invoice_number,
        inputMethod: data.input_method,
        storeId: data.store_id,
      }

      // 如果分类有变化，需要更新 cashFlowActivity 和 transactionNature
      // 注意：前端可能不传递 type 字段，所以只需要 category 存在就查找
      if (data.category) {
        const { data: categories } = await mod.TransactionCategoryModel.getByCompanyId(profile.companyId, undefined, session.sessionToken)
        // 如果有 type，精确匹配；否则只按名称匹配
        const category = data.type
          ? categories?.find((c: any) => c.type === data.type && c.name === data.category)
          : categories?.find((c: any) => c.name === data.category)

        if (category) {
          updateData.cashFlowActivity = category.cashFlowActivity || 'operating'
          updateData.nature = category.transactionNature || 'operating'
          console.log('[updateTransaction] 分类已更新，同步更新属性:', {
            category: data.category,
            categoryType: category.type,
            cashFlowActivity: updateData.cashFlowActivity,
            transactionNature: updateData.nature,
          })
        } else {
          console.log('[updateTransaction] 未找到匹配的分类:', {
            categoryName: data.category,
            dataType: data.type,
            availableCategories: categories?.map((c: any) => ({ name: c.name, type: c.type }))
          })
        }
      }

      const result = await mod.TransactionModel.update(id, updateData)

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/dashboard')
      revalidatePath('/transactions')

      return { success: true, data: result.data as Transaction }
    } catch (error: any) {
      console.error('更新交易记录异常:', error)
      return { error: error.message || '更新交易记录失败' }
    }
  } else {
    // Supabase 实现
    const { updateTransaction: supabaseUpdate } = await import('@/lib/api/transactions')
    return supabaseUpdate(id, data)
  }
}

/**
 * 删除交易记录
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  const mod = await getTransactionsModule()

  if (mod.backend === 'leancloud') {
    try {
      // 获取服务端 session token
      const session = await mod.getLCSession()
      console.log('[deleteTransaction] Session 状态:', {
        hasSession: !!session,
        userId: session?.userId,
        hasSessionToken: !!session?.sessionToken,
        sessionTokenLength: session?.sessionToken?.length,
      })

      if (!session) {
        return { error: '未登录' }
      }

      console.log('[deleteTransaction] 准备删除交易:', {
        transactionId: id,
        sessionToken: session.sessionToken?.substring(0, 10) + '...',
      })

      const result = await mod.TransactionModel.delete(id, session.sessionToken)

      console.log('[deleteTransaction] 删除结果:', {
        hasError: !!result.error,
        error: result.error,
      })

      if (result.error) {
        return { error: result.error }
      }

      revalidatePath('/dashboard')
      revalidatePath('/transactions')

      return { success: true }
    } catch (error: any) {
      console.error('删除交易记录异常:', error)
      return { error: error.message || '删除交易记录失败' }
    }
  } else {
    // Supabase 实现
    const { deleteTransaction: supabaseDelete } = await import('@/lib/api/transactions')
    return supabaseDelete(id)
  }
}
