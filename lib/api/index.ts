/**
 * Supabase API 层入口文件
 * 导出所有 Supabase API 函数，用于统一 API 调用
 * 使用 Supabase (国际云服务) 作为云后端
 */

// 交易记录 API
export {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getCategorySummary,
  type TransactionFormData,
  type ActionResult,
} from './transactions';

// 交易分类 API
export {
  getTransactionCategories,
  addTransactionCategory,
  updateTransactionCategory,
  getCategoryUsageCount,
  mergeTransactionCategories,
  deleteTransactionCategory,
  type TransactionCategory,
  type CategoryFormData,
} from './transaction-categories';

// 店铺管理 API
export {
  getStores,
  getActiveStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  getEarliestStoreInitialBalanceDate,
  getStoreInitialBalanceDate,
  type Store,
  type CreateStoreData,
  type UpdateStoreData,
} from './stores';

// 用户管理 API
export {
  getCompanyUsers,
  updateUserRole,
  updateUserStores,
  removeUser,
  getCurrentUserProfile,
  type CompanyUser,
} from './users';

// 财务设置 API
export {
  getFinancialSettings,
  saveFinancialSettings,
  type FinancialSettings,
  type FinancialSettingsFormData,
} from './financial-settings';

// API 配置管理
export {
  getApiConfig,
  updateApiConfig,
  getCompanyApiKeys,
  getCurrentUserApiKeys,
  type ApiConfig,
  type ApiConfigDisplay,
} from './api-config';

// 邀请系统 API
export {
  createInvitation,
  getInvitations,
  verifyInvitation,
  acceptInvitation,
  deleteInvitation,
  resendInvitation,
  createUserAccount,
  type Invitation,
} from './invitations';

// 认证 API - 从 supabase auth 模块导出
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
} from '@/lib/auth/supabase';
