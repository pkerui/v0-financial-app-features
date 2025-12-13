// @ts-nocheck
/**
 * 后端模块统一入口
 * 提供后端检测和统一 API 访问
 */

// 后端检测
export {
  detectBackend,
  isLeanCloudMode,
  isSupabaseMode,
  getBackendInfo,
  type BackendType,
} from './detector'

// 统一认证 API
export {
  signIn,
  signUp,
  registerOwner,
  signOut,
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
} from './auth'

// 统一交易 API
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
  type CashFlowActivity as TransactionCashFlowActivity,
  type TransactionNature,
} from './transactions'

// 统一店铺 API
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
} from './stores'

// 统一分类 API
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
} from './categories'

// 统一财务设置 API
export {
  getFinancialSettings,
  saveFinancialSettings,
  type FinancialSettings,
  type FinancialSettingsFormData,
} from './financial-settings'

// 统一邀请管理 API
export {
  createInvitation,
  getInvitations,
  deleteInvitation,
  resendInvitation,
  createUserAccount,
  type Invitation,
} from './invitations'

// 统一用户管理 API
export {
  getCompanyUsers,
  updateUserRole,
  updateUserStores,
  removeUser,
  getCurrentUserProfile,
  type CompanyUser,
} from './users'
