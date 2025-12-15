// @ts-nocheck
/**
 * LeanCloud 数据模型操作 (REST API 版本)
 * 封装 CRUD 操作，提供与 Supabase 相似的 API 风格
 */

import { lcRequest } from './init'
import { getSessionToken } from './auth'
import {
  LC_CLASSES,
  type Company,
  type Profile,
  type Store,
  type TransactionCategory,
  type Transaction,
  type FinancialSettings,
  type Invitation,
  type ApiResponse,
  type ApiListResponse,
  type UserRole,
  type StoreType,
  type StoreStatus,
  type TransactionType,
  type CashFlowActivity,
  type TransactionNature,
  type PaymentMethod,
  type InputMethod,
} from './types'

// ============================================
// 辅助函数
// ============================================

/**
 * 构建查询 URL 参数
 */
function buildQueryParams(params: Record<string, any>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${key}=${encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}`)
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

/**
 * 将 LeanCloud 返回的对象格式化
 * 添加 id 字段 (objectId 的别名) 和驼峰转下划线的字段别名
 */
function formatObject<T>(obj: any): T {
  const result: any = {
    ...obj,
    // 添加 id 作为 objectId 的别名
    id: obj.objectId,
  }
  return result as T
}

/**
 * 格式化 Profile 对象，添加 snake_case 字段别名
 */
function formatProfile(obj: any): Profile {
  return {
    ...obj,
    id: obj.objectId,
    // 保留 camelCase 字段
    userId: obj.userId,
    companyId: obj.companyId,
    fullName: obj.fullName,
    managedStoreIds: obj.managedStoreIds || [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 格式化 Store 对象
 */
function formatStore(obj: any): Store {
  return {
    ...obj,
    id: obj.objectId,
    companyId: obj.companyId,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 格式化 Transaction 对象
 */
function formatTransaction(obj: any): Transaction {
  // 注意：不要在这里默认 nature 为 'operating'
  // 让调用方根据分类信息决定默认值
  return {
    ...obj,
    id: obj.objectId,
    companyId: obj.companyId,
    storeId: obj.storeId,
    store_id: obj.storeId, // snake_case 别名供报表页面使用
    cashFlowActivity: obj.cashFlowActivity,
    nature: obj.nature || null,  // 保持为 null，让页面从分类获取
    // 添加 snake_case 别名供 UI 组件使用
    cash_flow_activity: obj.cashFlowActivity,
    transaction_nature: obj.nature || null,  // 保持为 null，让页面从分类获取
    paymentMethod: obj.paymentMethod,
    inputMethod: obj.inputMethod,
    createdBy: obj.createdBy,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 格式化 FinancialSettings 对象
 */
function formatFinancialSettings(obj: any): FinancialSettings {
  return {
    ...obj,
    id: obj.objectId,
    companyId: obj.companyId,
    storeId: obj.storeId,
    initialBalance: obj.initialBalance || obj.initialCashBalance || 0,
    // 兼容不同字段名: initialCashBalance (from form) 和 initialBalance (in LeanCloud)
    initialCashBalance: obj.initialCashBalance || obj.initialBalance || 0,
    initialBalanceDate: obj.initialBalanceDate,
    fiscalYearStart: obj.fiscalYearStart,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 格式化 Invitation 对象
 */
function formatInvitation(obj: any): Invitation {
  return {
    ...obj,
    id: obj.objectId,
    companyId: obj.companyId,
    managedStoreIds: obj.managedStoreIds || [],
    invitedBy: obj.invitedBy,
    expiresAt: obj.expiresAt,
    acceptedAt: obj.acceptedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 中文到英文的映射表
 */
const CASH_FLOW_ACTIVITY_MAP: Record<string, string> = {
  '操作': 'operating',
  '经营': 'operating',
  '投资': 'investing',
  '融资': 'financing',
  'operating': 'operating',
  'investing': 'investing',
  'financing': 'financing',
}

const TRANSACTION_NATURE_MAP: Record<string, string> = {
  '营业': 'operating',
  '营业内': 'operating',
  '非营业': 'non_operating',
  '营业外': 'non_operating',
  '所得税': 'income_tax',
  'operating': 'operating',
  'non_operating': 'non_operating',
  'income_tax': 'income_tax',
}

const CATEGORY_TYPE_MAP: Record<string, string> = {
  '收入': 'income',
  '支出': 'expense',
  '费用': 'expense',
  'income': 'income',
  'expense': 'expense',
}

/**
 * 格式化 TransactionCategory 对象
 * 支持中文值到英文枚举值的转换
 */
function formatTransactionCategory(obj: any): TransactionCategory {
  // 转换中文值到英文枚举值
  const cashFlowActivity = CASH_FLOW_ACTIVITY_MAP[obj.cashFlowActivity] || obj.cashFlowActivity || 'operating'
  const transactionNature = TRANSACTION_NATURE_MAP[obj.transactionNature] || obj.transactionNature || 'operating'
  const type = CATEGORY_TYPE_MAP[obj.type] || obj.type || 'expense'

  return {
    ...obj,
    id: obj.objectId,
    companyId: obj.companyId,
    storeId: obj.storeId,
    type: type,
    cashFlowActivity: cashFlowActivity,
    transactionNature: transactionNature,
    includeInProfitLoss: obj.includeInProfitLoss ?? true,
    isSystem: obj.isSystem || false,
    isDefault: obj.isDefault || false,
    sortOrder: obj.sortOrder ?? 0,
    // 添加 snake_case 别名供 UI 组件使用
    cash_flow_activity: cashFlowActivity,
    transaction_nature: transactionNature,
    include_in_profit_loss: obj.includeInProfitLoss ?? true,
    is_system: obj.isSystem || false,
    sort_order: obj.sortOrder ?? 0,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  }
}

/**
 * 获取会话 token
 * 优先使用传入的 token，否则尝试从 localStorage 获取（客户端）
 */
function getToken(providedToken?: string): string | undefined {
  if (providedToken) {
    return providedToken
  }
  // 客户端回退到 localStorage
  return getSessionToken() || undefined
}

// ============================================
// 公司码生成工具
// ============================================

/**
 * 生成6位唯一公司码
 * 格式：大写字母+数字混合，如 ABC123, XYZ789
 */
function generateCompanyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除容易混淆的 I, O, 0, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ============================================
// Company 公司模型
// ============================================

export const CompanyModel = {
  /**
   * 创建公司
   * @param name 公司名称
   * @param providedCode 可选的客户端提供的公司码，如果不提供则自动生成
   */
  async create(name: string, providedCode?: string): Promise<ApiResponse<Company>> {
    try {
      let code = ''

      if (providedCode) {
        // 使用客户端提供的公司码
        code = providedCode.toUpperCase()
        // 检查公司码是否已存在
        const existing = await this.getByCode(code)
        if (existing.data) {
          return { data: null, error: '该公司码已被使用，请重新生成' }
        }
      } else {
        // 自动生成唯一公司码，最多尝试10次
        let attempts = 0
        const maxAttempts = 10

        while (attempts < maxAttempts) {
          code = generateCompanyCode()
          // 检查公司码是否已存在
          const existing = await this.getByCode(code)
          if (!existing.data) {
            break // 公司码可用
          }
          attempts++
        }

        if (attempts >= maxAttempts) {
          return { data: null, error: '生成公司码失败，请重试' }
        }
      }

      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.Company}`, { name, code }, getToken())
      // LeanCloud POST 只返回 objectId 和 createdAt，需要合并原始数据
      return { data: formatObject<Company>({ name, code, ...result }), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建公司失败:', error)
      return { data: null, error: error.message || '创建公司失败' }
    }
  },

  async getById(id: string): Promise<ApiResponse<Company>> {
    try {
      const result = await lcRequest<any>('GET', `/classes/${LC_CLASSES.Company}/${id}`, undefined, getToken())
      return { data: formatObject<Company>(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取公司失败:', error)
      return { data: null, error: error.message || '获取公司失败' }
    }
  },

  /**
   * 通过公司码查找公司
   */
  async getByCode(code: string): Promise<ApiResponse<Company>> {
    try {
      const where = JSON.stringify({ code: code.toUpperCase() })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Company}?where=${encodeURIComponent(where)}`, undefined, getToken())
      if (!result.results || result.results.length === 0) {
        return { data: null, error: '公司不存在' }
      }
      return { data: formatObject<Company>(result.results[0]), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 通过公司码查找公司失败:', error)
      return { data: null, error: error.message || '查找公司失败' }
    }
  },

  async update(id: string, name: string): Promise<ApiResponse<Company>> {
    try {
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Company}/${id}`, { name }, getToken())
      return { data: formatObject<Company>(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新公司失败:', error)
      return { data: null, error: error.message || '更新公司失败' }
    }
  },

  /**
   * 更新公司 API 配置
   */
  async updateApiConfig(id: string, config: {
    deepseekApiKey?: string | null
    tencentSecretId?: string | null
    tencentSecretKey?: string | null
  }): Promise<ApiResponse<Company>> {
    try {
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Company}/${id}`, config, getToken())
      return { data: formatObject<Company>(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新公司 API 配置失败:', error)
      return { data: null, error: error.message || '更新 API 配置失败' }
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await lcRequest('DELETE', `/classes/${LC_CLASSES.Company}/${id}`, undefined, getToken())
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除公司失败:', error)
      return { data: null, error: error.message || '删除公司失败' }
    }
  },
}

// ============================================
// Profile 用户资料模型
// ============================================

export const ProfileModel = {
  async create(data: {
    userId: string
    companyId?: string | null
    role?: UserRole
    fullName?: string | null
    managedStoreIds?: string[]
  }): Promise<ApiResponse<Profile>> {
    try {
      const payload = {
        userId: data.userId,
        companyId: data.companyId || null,
        role: data.role || 'user',
        fullName: data.fullName || null,
        managedStoreIds: data.managedStoreIds || [],
      }
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.Profile}`, payload, getToken())
      return { data: formatProfile({ ...payload, ...result }), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建用户资料失败:', error)
      return { data: null, error: error.message || '创建用户资料失败' }
    }
  },

  async getByUserId(userId: string, retries = 3, sessionToken?: string): Promise<ApiResponse<Profile>> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const where = JSON.stringify({ userId })
        const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Profile}?where=${encodeURIComponent(where)}`, undefined, getToken(sessionToken))
        if (!result.results || result.results.length === 0) {
          return { data: null, error: '用户资料不存在' }
        }
        return { data: formatProfile(result.results[0]), error: null }
      } catch (error: any) {
        console.error(`[LeanCloud] 获取用户资料失败 (尝试 ${attempt}/${retries}):`, error)
        // 如果是超时错误且还有重试机会，等待后重试
        if (attempt < retries && (error.code === 124 || error.message?.includes('timeout'))) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // 递增等待时间
          continue
        }
        return { data: null, error: error.message || '获取用户资料失败' }
      }
    }
    return { data: null, error: '获取用户资料失败：多次重试后仍然超时' }
  },

  async getByCompanyId(companyId: string): Promise<ApiListResponse<Profile>> {
    try {
      const where = JSON.stringify({ companyId })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Profile}?where=${encodeURIComponent(where)}&order=createdAt`, undefined, getToken())
      return { data: result.results.map((obj) => formatProfile(obj)), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取公司用户列表失败:', error)
      return { data: [], error: error.message || '获取公司用户列表失败' }
    }
  },

  async update(
    userId: string,
    data: Partial<Omit<Profile, 'objectId' | 'createdAt' | 'updatedAt' | 'userId'>>
  ): Promise<ApiResponse<Profile>> {
    try {
      // 先查找 profile
      const where = JSON.stringify({ userId })
      const findResult = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Profile}?where=${encodeURIComponent(where)}`, undefined, getToken())
      if (!findResult.results || findResult.results.length === 0) {
        return { data: null, error: '用户资料不存在' }
      }
      const profile = findResult.results[0]

      // 更新
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Profile}/${profile.objectId}`, data, getToken())
      return { data: formatProfile({ ...profile, ...data, ...result }), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新用户资料失败:', error)
      return { data: null, error: error.message || '更新用户资料失败' }
    }
  },

  async delete(userId: string): Promise<ApiResponse<null>> {
    try {
      // 先查找 profile
      const where = JSON.stringify({ userId })
      const findResult = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Profile}?where=${encodeURIComponent(where)}`, undefined, getToken())
      if (findResult.results && findResult.results.length > 0) {
        await lcRequest('DELETE', `/classes/${LC_CLASSES.Profile}/${findResult.results[0].objectId}`, undefined, getToken())
      }
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除用户资料失败:', error)
      return { data: null, error: error.message || '删除用户资料失败' }
    }
  },
}

// ============================================
// Store 店铺模型
// ============================================

export const StoreModel = {
  async create(data: {
    companyId: string
    name: string
    code?: string | null
    type?: StoreType
    status?: StoreStatus
    address?: string | null
    phone?: string | null
    manager?: string | null
    city?: string | null
    province?: string | null
    description?: string | null
    initialBalanceDate?: string | null
    initialBalance?: number | null
  }, sessionToken?: string): Promise<ApiResponse<Store>> {
    try {
      const payload = {
        companyId: data.companyId,
        name: data.name,
        code: data.code || null,
        type: data.type || 'retail',
        status: data.status || 'active',
        address: data.address || null,
        phone: data.phone || null,
        manager: data.manager || null,
        city: data.city || null,
        province: data.province || null,
        description: data.description || null,
        initialBalanceDate: data.initialBalanceDate || null,
        initialBalance: data.initialBalance ?? null,
      }
      const token = sessionToken || getToken()
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.Store}`, payload, token)
      // LeanCloud POST 只返回 objectId 和 createdAt，需要合并 payload 获取完整数据
      return { data: formatStore({ ...payload, ...result }), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建店铺失败:', error)
      return { data: null, error: error.message || '创建店铺失败' }
    }
  },

  async getByCompanyId(companyId: string, sessionToken?: string): Promise<ApiListResponse<Store>> {
    try {
      const where = JSON.stringify({ companyId })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Store}?where=${encodeURIComponent(where)}&order=createdAt`, undefined, getToken(sessionToken))
      return { data: result.results.map((obj) => formatStore(obj)), error: null }
    } catch (error: any) {
      // 错误码 101 表示类不存在（第一次使用时没有店铺数据）
      // 这种情况应该返回空数组而不是错误
      if (error.code === 101) {
        console.log('[LeanCloud] Store 类不存在，返回空数组（首次使用）')
        return { data: [], error: null }
      }
      console.error('[LeanCloud] 获取店铺列表失败:', error)
      return { data: [], error: error.message || '获取店铺列表失败' }
    }
  },

  async getById(id: string, sessionToken?: string): Promise<ApiResponse<Store>> {
    try {
      console.log('[LeanCloud] StoreModel.getById 查询:', { id })
      const result = await lcRequest<any>('GET', `/classes/${LC_CLASSES.Store}/${id}`, undefined, getToken(sessionToken))
      console.log('[LeanCloud] StoreModel.getById 结果:', {
        objectId: result?.objectId,
        name: result?.name,
        initialBalanceDate: result?.initialBalanceDate,
        hasInitialBalanceDate: 'initialBalanceDate' in result
      })
      return { data: formatStore(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取店铺失败:', error)
      return { data: null, error: error.message || '获取店铺失败' }
    }
  },

  async update(
    id: string,
    data: Partial<Omit<Store, 'objectId' | 'createdAt' | 'updatedAt' | 'companyId'>>
  ): Promise<ApiResponse<Store>> {
    try {
      await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Store}/${id}`, data, getToken())
      // LeanCloud PUT 只返回更新的字段，需要重新获取完整数据
      const fullStore = await lcRequest<any>('GET', `/classes/${LC_CLASSES.Store}/${id}`, undefined, getToken())
      return { data: formatStore(fullStore), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新店铺失败:', error)
      return { data: null, error: error.message || '更新店铺失败' }
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await lcRequest('DELETE', `/classes/${LC_CLASSES.Store}/${id}`, undefined, getToken())
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除店铺失败:', error)
      return { data: null, error: error.message || '删除店铺失败' }
    }
  },
}

// ============================================
// TransactionCategory 交易分类模型
// ============================================

export const TransactionCategoryModel = {
  async create(data: {
    companyId: string
    storeId?: string | null
    name: string
    type: TransactionType
    cashFlowActivity?: CashFlowActivity
    transactionNature?: TransactionNature
    includeInProfitLoss?: boolean
    isSystem?: boolean
    isDefault?: boolean
    sortOrder?: number
    description?: string | null
    createdBy?: string | null
  }): Promise<ApiResponse<TransactionCategory>> {
    try {
      const payload = {
        companyId: data.companyId,
        storeId: data.storeId || null,
        name: data.name,
        type: data.type,
        cashFlowActivity: data.cashFlowActivity || 'operating',
        transactionNature: data.transactionNature || 'operating',
        includeInProfitLoss: data.includeInProfitLoss ?? true,
        isSystem: data.isSystem || false,
        isDefault: data.isDefault || false,
        sortOrder: data.sortOrder ?? 0,
        description: data.description || null,
        createdBy: data.createdBy || null,
      }
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.TransactionCategory}`, payload, getToken())
      return { data: formatTransactionCategory(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建分类失败:', error)
      return { data: null, error: error.message || '创建分类失败' }
    }
  },

  async getByCompanyId(companyId: string, storeId?: string, sessionToken?: string): Promise<ApiListResponse<TransactionCategory>> {
    try {
      let where: any
      if (storeId) {
        // 获取公司级别和店铺级别的分类
        where = {
          companyId,
          '$or': [
            { storeId: { '$exists': false } },
            { storeId: null },
            { storeId }
          ]
        }
      } else {
        where = { companyId }
      }
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.TransactionCategory}?where=${encodeURIComponent(JSON.stringify(where))}&order=name`, undefined, getToken(sessionToken))
      return { data: result.results.map((obj) => formatTransactionCategory(obj)), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取分类列表失败:', error)
      // 如果 Class 不存在，返回空数组（LeanCloud 会在首次写入时自动创建 Class）
      if (error.message?.includes("doesn't exist") || error.message?.includes('Class or object')) {
        console.log('[LeanCloud] TransactionCategory Class 尚未创建，返回空数组')
        return { data: [], error: null }
      }
      return { data: [], error: error.message || '获取分类列表失败' }
    }
  },

  async getById(id: string): Promise<ApiResponse<TransactionCategory>> {
    try {
      const result = await lcRequest<any>('GET', `/classes/${LC_CLASSES.TransactionCategory}/${id}`, undefined, getToken())
      return { data: formatTransactionCategory(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取分类失败:', error)
      return { data: null, error: error.message || '获取分类失败' }
    }
  },

  async update(
    id: string,
    data: Partial<Omit<TransactionCategory, 'objectId' | 'createdAt' | 'updatedAt' | 'companyId'>>
  ): Promise<ApiResponse<TransactionCategory>> {
    try {
      // 确保字段名称正确（使用 camelCase）
      const payload: any = {}
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.cashFlowActivity !== undefined) payload.cashFlowActivity = data.cashFlowActivity
      if (data.transactionNature !== undefined) payload.transactionNature = data.transactionNature
      if (data.includeInProfitLoss !== undefined) payload.includeInProfitLoss = data.includeInProfitLoss
      if (data.isSystem !== undefined) payload.isSystem = data.isSystem
      if (data.isDefault !== undefined) payload.isDefault = data.isDefault
      if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder
      if (data.description !== undefined) payload.description = data.description

      console.log('[LeanCloud] TransactionCategoryModel.update 请求:', {
        id,
        payload,
        originalData: data,
      })

      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.TransactionCategory}/${id}`, payload, getToken())

      console.log('[LeanCloud] TransactionCategoryModel.update 响应:', result)

      // PUT 请求只返回 updatedAt，需要重新获取完整数据
      const { data: updatedCategory } = await this.getById(id)
      return { data: updatedCategory, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新分类失败:', error)
      return { data: null, error: error.message || '更新分类失败' }
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await lcRequest('DELETE', `/classes/${LC_CLASSES.TransactionCategory}/${id}`, undefined, getToken())
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除分类失败:', error)
      return { data: null, error: error.message || '删除分类失败' }
    }
  },
}

// ============================================
// Transaction 交易记录模型
// ============================================

export const TransactionModel = {
  async create(data: {
    companyId: string
    storeId: string
    type: TransactionType
    amount: number
    category: string
    subcategory?: string | null
    description?: string | null
    date: string
    paymentMethod?: PaymentMethod
    inputMethod?: InputMethod
    cashFlowActivity?: CashFlowActivity
    nature?: TransactionNature
    createdBy?: string | null
  }): Promise<ApiResponse<Transaction>> {
    try {
      const payload = {
        companyId: data.companyId,
        storeId: data.storeId,
        type: data.type,
        amount: data.amount,
        category: data.category,
        subcategory: data.subcategory || null,
        description: data.description || null,
        date: data.date,
        paymentMethod: data.paymentMethod || 'cash',
        inputMethod: data.inputMethod || 'manual',
        cashFlowActivity: data.cashFlowActivity || 'operating',
        nature: data.nature || 'cash',
        createdBy: data.createdBy || null,
      }
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.Transaction}`, payload, getToken())
      return { data: formatTransaction(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建交易失败:', error)
      return { data: null, error: error.message || '创建交易失败' }
    }
  },

  async getByStoreId(
    storeId: string,
    options?: {
      startDate?: string
      endDate?: string
      type?: TransactionType
      limit?: number
      skip?: number
    },
    sessionToken?: string
  ): Promise<ApiListResponse<Transaction>> {
    try {
      const where: any = { storeId }
      if (options?.startDate) {
        where.date = where.date || {}
        where.date['$gte'] = options.startDate
      }
      if (options?.endDate) {
        where.date = where.date || {}
        where.date['$lte'] = options.endDate
      }
      if (options?.type) {
        where.type = options.type
      }

      let url = `/classes/${LC_CLASSES.Transaction}?where=${encodeURIComponent(JSON.stringify(where))}&order=-date,-createdAt`
      if (options?.limit) {
        url += `&limit=${options.limit}`
      }
      if (options?.skip) {
        url += `&skip=${options.skip}`
      }

      const result = await lcRequest<{ results: any[] }>('GET', url, undefined, getToken(sessionToken))
      return { data: result.results.map((obj) => formatTransaction(obj)), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取交易列表失败:', error)
      // 如果 Class 不存在，返回空数组（LeanCloud 会在首次写入时自动创建 Class）
      if (error.message?.includes("doesn't exist") || error.message?.includes('Class or object')) {
        console.log('[LeanCloud] Transaction Class 尚未创建，返回空数组')
        return { data: [], error: null }
      }
      return { data: [], error: error.message || '获取交易列表失败' }
    }
  },

  async getByCompanyId(
    companyId: string,
    options?: {
      storeIds?: string[]
      startDate?: string
      endDate?: string
      type?: TransactionType
      limit?: number
      skip?: number
    },
    sessionToken?: string
  ): Promise<ApiListResponse<Transaction>> {
    try {
      const where: any = { companyId }
      if (options?.storeIds && options.storeIds.length > 0) {
        where.storeId = { '$in': options.storeIds }
      }
      if (options?.startDate) {
        where.date = where.date || {}
        where.date['$gte'] = options.startDate
      }
      if (options?.endDate) {
        where.date = where.date || {}
        where.date['$lte'] = options.endDate
      }
      if (options?.type) {
        where.type = options.type
      }

      let url = `/classes/${LC_CLASSES.Transaction}?where=${encodeURIComponent(JSON.stringify(where))}&order=-date,-createdAt`
      if (options?.limit) {
        url += `&limit=${options.limit}`
      }
      if (options?.skip) {
        url += `&skip=${options.skip}`
      }

      const result = await lcRequest<{ results: any[] }>('GET', url, undefined, getToken(sessionToken))
      return { data: result.results.map((obj) => formatTransaction(obj)), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取交易列表失败:', error)
      // 如果 Class 不存在，返回空数组（LeanCloud 会在首次写入时自动创建 Class）
      if (error.message?.includes("doesn't exist") || error.message?.includes('Class or object')) {
        console.log('[LeanCloud] Transaction Class 尚未创建，返回空数组')
        return { data: [], error: null }
      }
      return { data: [], error: error.message || '获取交易列表失败' }
    }
  },

  async update(
    id: string,
    data: Partial<Omit<Transaction, 'objectId' | 'createdAt' | 'updatedAt' | 'companyId' | 'storeId'>>
  ): Promise<ApiResponse<Transaction>> {
    try {
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Transaction}/${id}`, data, getToken())
      return { data: formatTransaction(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新交易失败:', error)
      return { data: null, error: error.message || '更新交易失败' }
    }
  },

  async delete(id: string, sessionToken?: string): Promise<ApiResponse<null>> {
    try {
      const token = sessionToken || getToken()
      console.log('[TransactionModel.delete] 删除请求:', {
        transactionId: id,
        hasSessionToken: !!sessionToken,
        hasFallbackToken: !!getToken(),
        tokenUsed: token ? token.substring(0, 10) + '...' : 'undefined',
        tokenLength: token?.length,
      })

      await lcRequest('DELETE', `/classes/${LC_CLASSES.Transaction}/${id}`, undefined, token)
      console.log('[TransactionModel.delete] 删除成功')
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除交易失败:', {
        error: error.message,
        code: error.code,
        transactionId: id,
      })
      return { data: null, error: error.message || '删除交易失败' }
    }
  },

  async batchDelete(ids: string[], sessionToken?: string): Promise<ApiResponse<null>> {
    try {
      // LeanCloud REST API 批量操作
      const requests = ids.map((id) => ({
        method: 'DELETE',
        path: `/1.1/classes/${LC_CLASSES.Transaction}/${id}`,
      }))
      await lcRequest('POST', '/batch', { requests }, sessionToken || getToken())
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 批量删除交易失败:', error)
      return { data: null, error: error.message || '批量删除交易失败' }
    }
  },
}

// ============================================
// FinancialSettings 财务设置模型
// ============================================

export const FinancialSettingsModel = {
  async create(data: {
    companyId: string
    storeId?: string
    initialBalance?: number
    initialCashBalance?: number  // 兼容表单字段名
    initialBalanceDate?: string
    fiscalYearStart?: string
    notes?: string
    updatedBy?: string
  }, sessionToken?: string): Promise<ApiResponse<FinancialSettings>> {
    try {
      // 兼容两种字段名: initialCashBalance (from form) 和 initialBalance (原字段)
      const balance = data.initialCashBalance ?? data.initialBalance ?? 0
      const payload: any = {
        companyId: data.companyId,
        initialBalance: balance,
        initialCashBalance: balance,  // 保存两个字段以便兼容
        initialBalanceDate: data.initialBalanceDate || new Date().toISOString().split('T')[0],
        fiscalYearStart: data.fiscalYearStart || '01-01',
      }
      // storeId 是可选的，如果提供则添加
      if (data.storeId) {
        payload.storeId = data.storeId
      }
      if (data.notes) {
        payload.notes = data.notes
      }
      if (data.updatedBy) {
        payload.updatedBy = data.updatedBy
      }

      console.log('[FinancialSettingsModel.create] 准备创建财务设置:', {
        companyId: data.companyId,
        initialBalance: balance,
        initialBalanceDate: payload.initialBalanceDate,
        hasSessionToken: !!sessionToken,
      })

      const token = sessionToken || getToken()
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.FinancialSettings}`, payload, token)

      console.log('[FinancialSettingsModel.create] 创建成功:', {
        objectId: result.objectId,
        createdAt: result.createdAt,
      })

      return { data: formatFinancialSettings({ ...payload, ...result }), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建财务设置失败:', error)
      return { data: null, error: error.message || '创建财务设置失败' }
    }
  },

  async getByStoreId(storeId: string): Promise<ApiResponse<FinancialSettings>> {
    try {
      const where = JSON.stringify({ storeId })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.FinancialSettings}?where=${encodeURIComponent(where)}`, undefined, getToken())
      if (!result.results || result.results.length === 0) {
        // 返回 null 而不是错误，表示设置不存在但不是错误
        return { data: null, error: null }
      }
      return { data: formatFinancialSettings(result.results[0]), error: null }
    } catch (error: any) {
      // 错误码 101 表示类不存在（首次使用时没有财务设置数据）
      // 这种情况应该返回 null 而不是错误
      if (error.code === 101 || error.message?.includes("doesn't exist") || error.message?.includes('Class or object')) {
        console.log('[LeanCloud] FinancialSettings 类不存在，返回 null（首次使用）')
        return { data: null, error: null }
      }
      console.error('[LeanCloud] 获取财务设置失败:', error)
      return { data: null, error: error.message || '获取财务设置失败' }
    }
  },

  async getByCompanyId(companyId: string, sessionToken?: string): Promise<ApiResponse<FinancialSettings>> {
    try {
      const where = JSON.stringify({ companyId })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.FinancialSettings}?where=${encodeURIComponent(where)}&limit=1`, undefined, getToken(sessionToken))
      if (!result.results || result.results.length === 0) {
        // 返回 null 而不是错误，表示设置不存在但不是错误
        return { data: null, error: null }
      }
      return { data: formatFinancialSettings(result.results[0]), error: null }
    } catch (error: any) {
      // 错误码 101 表示类不存在（首次使用时没有财务设置数据）
      // 这种情况应该返回 null 而不是错误
      if (error.code === 101 || error.message?.includes("doesn't exist") || error.message?.includes('Class or object')) {
        console.log('[LeanCloud] FinancialSettings 类不存在，返回 null（首次使用）')
        return { data: null, error: null }
      }
      console.error('[LeanCloud] 获取公司财务设置失败:', error)
      return { data: null, error: error.message || '获取公司财务设置失败' }
    }
  },

  async update(
    id: string,
    data: {
      initialBalance?: number
      initialCashBalance?: number
      initialBalanceDate?: string
      notes?: string
      updatedBy?: string
    },
    sessionToken?: string
  ): Promise<ApiResponse<FinancialSettings>> {
    try {
      // 构建更新数据，兼容两种字段名
      const updateData: any = {}
      const balance = data.initialCashBalance ?? data.initialBalance
      if (balance !== undefined) {
        updateData.initialBalance = balance
        updateData.initialCashBalance = balance
      }
      if (data.initialBalanceDate !== undefined) {
        updateData.initialBalanceDate = data.initialBalanceDate
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes
      }
      if (data.updatedBy !== undefined) {
        updateData.updatedBy = data.updatedBy
      }

      console.log('[FinancialSettingsModel.update] 准备更新财务设置:', {
        id,
        updateData,
        hasSessionToken: !!sessionToken,
      })

      const token = sessionToken || getToken()

      // 直接通过 objectId 更新
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.FinancialSettings}/${id}`, updateData, token)

      // 获取更新后的完整数据
      const getResult = await lcRequest<any>('GET', `/classes/${LC_CLASSES.FinancialSettings}/${id}`, undefined, token)
      return { data: formatFinancialSettings(getResult), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新财务设置失败:', error)
      return { data: null, error: error.message || '更新财务设置失败' }
    }
  },
}

// ============================================
// Invitation 邀请模型
// ============================================

export const InvitationModel = {
  async create(data: {
    companyId: string
    email: string
    role: UserRole
    managedStoreIds?: string[]
    invitedBy: string
    token: string
    expiresAt: string
  }): Promise<ApiResponse<Invitation>> {
    try {
      const payload = {
        companyId: data.companyId,
        email: data.email,
        role: data.role,
        managedStoreIds: data.managedStoreIds || [],
        invitedBy: data.invitedBy,
        token: data.token,
        expiresAt: data.expiresAt,
        acceptedAt: null,
      }
      const result = await lcRequest<any>('POST', `/classes/${LC_CLASSES.Invitation}`, payload, getToken())
      return { data: formatInvitation(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 创建邀请失败:', error)
      return { data: null, error: error.message || '创建邀请失败' }
    }
  },

  async getByCompanyId(companyId: string): Promise<ApiListResponse<Invitation>> {
    try {
      const where = JSON.stringify({ companyId })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Invitation}?where=${encodeURIComponent(where)}&order=-createdAt`, undefined, getToken())
      return { data: result.results.map((obj) => formatInvitation(obj)), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取邀请列表失败:', error)
      return { data: [], error: error.message || '获取邀请列表失败' }
    }
  },

  async getByToken(token: string): Promise<ApiResponse<Invitation>> {
    try {
      const now = new Date().toISOString()
      const where = JSON.stringify({
        token,
        acceptedAt: { '$exists': false },
        expiresAt: { '$gt': now }
      })
      const result = await lcRequest<{ results: any[] }>('GET', `/classes/${LC_CLASSES.Invitation}?where=${encodeURIComponent(where)}`, undefined, getToken())
      if (!result.results || result.results.length === 0) {
        return { data: null, error: '邀请链接无效或已过期' }
      }
      return { data: formatInvitation(result.results[0]), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 获取邀请失败:', error)
      return { data: null, error: error.message || '获取邀请失败' }
    }
  },

  async markAccepted(id: string): Promise<ApiResponse<Invitation>> {
    try {
      const result = await lcRequest<any>('PUT', `/classes/${LC_CLASSES.Invitation}/${id}`, { acceptedAt: new Date().toISOString() }, getToken())
      return { data: formatInvitation(result), error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 更新邀请状态失败:', error)
      return { data: null, error: error.message || '更新邀请状态失败' }
    }
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    try {
      await lcRequest('DELETE', `/classes/${LC_CLASSES.Invitation}/${id}`, undefined, getToken())
      return { data: null, error: null }
    } catch (error: any) {
      console.error('[LeanCloud] 删除邀请失败:', error)
      return { data: null, error: error.message || '删除邀请失败' }
    }
  },
}
