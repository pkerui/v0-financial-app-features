/**
 * LeanCloud 数据类型定义
 * 与 Supabase 类型保持一致，确保迁移兼容性
 */

// ============================================
// 枚举类型
// ============================================

export type UserRole = 'owner' | 'accountant' | 'manager' | 'user'
export type StoreType = 'retail' | 'wholesale' | 'online' | 'other'
export type StoreStatus = 'active' | 'inactive' | 'closed'
export type TransactionType = 'income' | 'expense'
export type CashFlowActivity = 'operating' | 'investing' | 'financing'
export type TransactionNature = 'cash' | 'non_cash' | 'internal_transfer' | 'accounts_receivable' | 'accounts_payable'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'alipay' | 'wechat' | 'credit_card' | 'other'
export type InputMethod = 'manual' | 'voice' | 'import'

// ============================================
// LeanCloud 数据类名
// ============================================

export const LC_CLASSES = {
  Company: 'Company',
  Profile: 'Profile',
  Store: 'Store',
  TransactionCategory: 'TransactionCategory',
  Transaction: 'Transaction',
  FinancialSettings: 'FinancialSettings',
  Invitation: 'Invitation',
} as const

// ============================================
// 基础接口
// ============================================

export interface BaseRecord {
  objectId: string
  id?: string  // 格式化后添加, 兼容后端适配器
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Company 公司
// ============================================

export interface Company extends BaseRecord {
  name: string
  code: string  // 6位唯一公司码，用于跨设备登录识别
  // API 配置字段
  deepseekApiKey?: string | null
  tencentSecretId?: string | null
  tencentSecretKey?: string | null
}

// ============================================
// Profile 用户资料
// ============================================

export interface Profile extends BaseRecord {
  userId: string  // 关联 LeanCloud User
  companyId: string | null
  role: UserRole
  fullName: string | null
  managedStoreIds: string[]
}

// ============================================
// Store 店铺
// ============================================

export interface Store extends BaseRecord {
  companyId: string
  name: string
  type: StoreType
  status: StoreStatus
  address: string | null
  phone: string | null
  description: string | null
  initialBalanceDate?: string | null  // 期初余额日期
  initialBalance?: number | null      // 期初余额
}

// ============================================
// TransactionCategory 交易分类
// ============================================

export interface TransactionCategory extends BaseRecord {
  companyId: string
  storeId: string | null
  name: string
  type: TransactionType
  cashFlowActivity: CashFlowActivity
  transactionNature?: TransactionNature  // 交易性质：operating, non_operating, income_tax
  isDefault: boolean
  description: string | null
}

// ============================================
// Transaction 交易记录
// ============================================

export interface Transaction extends BaseRecord {
  companyId: string
  storeId: string
  type: TransactionType
  amount: number
  category: string
  subcategory: string | null
  description: string | null
  date: string  // ISO date string YYYY-MM-DD
  paymentMethod: PaymentMethod
  inputMethod: InputMethod
  cashFlowActivity: CashFlowActivity
  nature: TransactionNature
  createdBy: string | null
}

// ============================================
// FinancialSettings 财务设置
// ============================================

export interface FinancialSettings extends BaseRecord {
  companyId: string
  storeId?: string  // 可选: 店铺级别设置
  initialBalance: number
  initialCashBalance?: number  // 兼容不同字段名
  initialBalanceDate: string  // ISO date string
  fiscalYearStart?: string
  notes?: string
}

// ============================================
// Invitation 邀请
// ============================================

export interface Invitation extends BaseRecord {
  companyId: string
  email: string
  role: UserRole
  managedStoreIds: string[]
  invitedBy: string
  token: string
  expiresAt: string  // ISO datetime string
  acceptedAt: string | null
}

// ============================================
// API 响应类型
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface ApiListResponse<T> {
  data: T[]
  error: string | null
}
