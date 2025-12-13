// @ts-nocheck
/**
 * 统一 API 层入口文件
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 * 所有 API 通过后端适配器路由
 */

// ============================================
// 交易记录 API - 通过后端适配器路由
// ============================================
export {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  type Transaction,
  type TransactionFormData,
  type TransactionQueryParams,
  type TransactionType,
  type PaymentMethod,
  type InputMethod,
  type TransactionCashFlowActivity,
  type TransactionNature,
} from '@/lib/backend';

// Supabase 特有的函数（仅在 Supabase 模式下使用）
export {
  getMonthlySummary,
  getCategorySummary,
  type ActionResult,
} from './transactions';

// ============================================
// 交易分类 API - 通过后端适配器路由
// ============================================
export {
  getTransactionCategories,
  addTransactionCategory,
  updateTransactionCategory,
  getCategoryUsageCount,
  mergeTransactionCategories,
  deleteTransactionCategory,
  type TransactionCategory,
  type CategoryFormData,
  type CashFlowActivity,
  type CategoryType,
} from '@/lib/backend';

// ============================================
// 店铺管理 API - 通过后端适配器路由
// ============================================
export {
  getStores,
  getActiveStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  type Store,
  type CreateStoreData,
  type UpdateStoreData,
  type StoreType,
  type StoreStatus,
} from '@/lib/backend';

// Supabase 特有的店铺函数
export {
  getEarliestStoreInitialBalanceDate,
  getStoreInitialBalanceDate,
} from './stores';

// ============================================
// 用户管理 API - 直接使用 Supabase（需要后续适配）
// ============================================
export {
  getCompanyUsers,
  updateUserRole,
  updateUserStores,
  removeUser,
  getCurrentUserProfile,
  type CompanyUser,
} from './users';

// ============================================
// 财务设置 API - 通过后端适配器路由
// ============================================
export {
  getFinancialSettings,
  saveFinancialSettings,
  type FinancialSettings,
  type FinancialSettingsFormData,
} from '@/lib/backend';

// ============================================
// API 配置管理 - 直接使用 Supabase（桌面版不需要）
// ============================================
export {
  getApiConfig,
  updateApiConfig,
  getCompanyApiKeys,
  getCurrentUserApiKeys,
  type ApiConfig,
  type ApiConfigDisplay,
} from './api-config';

// ============================================
// 邀请系统 API - 通过后端适配器路由
// ============================================
export {
  createInvitation,
  getInvitations,
  verifyInvitation,
  acceptInvitation,
  deleteInvitation,
  resendInvitation,
  createUserAccount,
  type Invitation,
} from '@/lib/backend';

// ============================================
// 认证 API - 通过后端适配器路由
// ============================================
export {
  signIn,
  signUp,
  signOut,
  registerOwner,
  getUser,
  getCurrentUserId,
  getCurrentProfile,
  getCurrentCompanyId,
  getCurrentUserRole,
  checkSystemHasUsers,
  getSession,
  updatePassword,
  updateUserInfo,
  checkConnection,
  type User,
  type Profile,
  type Session,
} from '@/lib/backend';

// ============================================
// 后端检测
// ============================================
export {
  detectBackend,
  isLeanCloudMode,
  isSupabaseMode,
  getBackendInfo,
  type BackendType,
} from '@/lib/backend';
