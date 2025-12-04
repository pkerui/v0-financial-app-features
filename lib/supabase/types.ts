/**
 * Supabase 数据库类型定义
 * 与 lib/database/schema.ts 保持完全同步
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================
// 枚举类型
// =====================================

export type UserRole = 'owner' | 'accountant' | 'manager' | 'user'
export type StoreType = 'direct' | 'franchise'
export type StoreStatus = 'active' | 'inactive' | 'preparing' | 'closed'
export type TransactionType = 'income' | 'expense'
export type CashFlowActivity = 'operating' | 'investing' | 'financing'
export type TransactionNature = 'operating' | 'non_operating'
export type PaymentMethod = 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card'
export type InputMethod = 'voice' | 'text' | 'manual'

// =====================================
// 数据库表类型定义
// =====================================

export interface Database {
  public: {
    Tables: {
      // =====================================
      // 1. companies 表 - 公司
      // =====================================
      companies: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          settings: Json
          deepseek_api_key: string | null
          tencent_secret_id: string | null
          tencent_secret_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json
          deepseek_api_key?: string | null
          tencent_secret_id?: string | null
          tencent_secret_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json
          deepseek_api_key?: string | null
          tencent_secret_id?: string | null
          tencent_secret_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================
      // 2. profiles 表 - 用户配置
      // =====================================
      profiles: {
        Row: {
          id: string
          company_id: string | null
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          managed_store_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          managed_store_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          managed_store_ids?: string[]
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================
      // 3. stores 表 - 店铺
      // =====================================
      stores: {
        Row: {
          id: string
          company_id: string
          name: string
          code: string | null
          type: StoreType
          status: StoreStatus
          city: string | null
          province: string | null
          address: string | null
          manager_name: string | null
          manager_phone: string | null
          initial_balance_date: string | null
          initial_balance: number
          // 兼容旧字段
          phone: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          code?: string | null
          type?: StoreType
          status?: StoreStatus
          city?: string | null
          province?: string | null
          address?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          initial_balance_date?: string | null
          initial_balance?: number
          phone?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          code?: string | null
          type?: StoreType
          status?: StoreStatus
          city?: string | null
          province?: string | null
          address?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          initial_balance_date?: string | null
          initial_balance?: number
          phone?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================
      // 4. transaction_categories 表 - 交易类型
      // =====================================
      transaction_categories: {
        Row: {
          id: string
          company_id: string
          name: string
          type: TransactionType
          cash_flow_activity: CashFlowActivity
          transaction_nature: TransactionNature | null
          include_in_profit_loss: boolean
          is_system: boolean
          sort_order: number
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          type: TransactionType
          cash_flow_activity: CashFlowActivity
          transaction_nature?: TransactionNature | null
          include_in_profit_loss?: boolean
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          type?: TransactionType
          cash_flow_activity?: CashFlowActivity
          transaction_nature?: TransactionNature | null
          include_in_profit_loss?: boolean
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }

      // =====================================
      // 5. transactions 表 - 交易记录
      // =====================================
      transactions: {
        Row: {
          id: string
          company_id: string
          store_id: string | null
          category_id: string | null
          type: TransactionType
          category: string
          amount: number
          description: string | null
          date: string
          payment_method: PaymentMethod | null
          invoice_number: string | null
          cash_flow_activity: CashFlowActivity
          transaction_nature: TransactionNature | null
          created_by: string | null
          input_method: InputMethod | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          store_id?: string | null
          category_id?: string | null
          type: TransactionType
          category: string
          amount: number
          description?: string | null
          date?: string
          payment_method?: PaymentMethod | null
          invoice_number?: string | null
          cash_flow_activity?: CashFlowActivity
          transaction_nature?: TransactionNature | null
          created_by?: string | null
          input_method?: InputMethod | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          store_id?: string | null
          category_id?: string | null
          type?: TransactionType
          category?: string
          amount?: number
          description?: string | null
          date?: string
          payment_method?: PaymentMethod | null
          invoice_number?: string | null
          cash_flow_activity?: CashFlowActivity
          transaction_nature?: TransactionNature | null
          created_by?: string | null
          input_method?: InputMethod | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }

      // =====================================
      // 6. financial_settings 表 - 财务设置
      // =====================================
      financial_settings: {
        Row: {
          id: string
          company_id: string
          store_id: string | null
          initial_cash_balance: number
          initial_balance_date: string
          notes: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          company_id: string
          store_id?: string | null
          initial_cash_balance?: number
          initial_balance_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          store_id?: string | null
          initial_cash_balance?: number
          initial_balance_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }

      // =====================================
      // 7. invitations 表 - 邀请
      // =====================================
      invitations: {
        Row: {
          id: string
          company_id: string
          email: string
          role: Exclude<UserRole, 'owner'>
          managed_store_ids: string[]
          invited_by: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          role?: Exclude<UserRole, 'owner'>
          managed_store_ids?: string[]
          invited_by: string
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          role?: Exclude<UserRole, 'owner'>
          managed_store_ids?: string[]
          invited_by?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
    }

    // =====================================
    // 视图
    // =====================================
    Views: {
      monthly_summary: {
        Row: {
          company_id: string
          store_id: string | null
          month: string
          type: TransactionType
          total_amount: number
          transaction_count: number
        }
      }
      category_summary: {
        Row: {
          company_id: string
          store_id: string | null
          category: string
          type: TransactionType
          month: string
          total_amount: number
          transaction_count: number
        }
      }
    }

    Functions: {
      [_ in never]: never
    }

    Enums: {
      user_role: UserRole
      store_type: StoreType
      store_status: StoreStatus
      transaction_type: TransactionType
      cash_flow_activity: CashFlowActivity
      transaction_nature: TransactionNature
      payment_method: PaymentMethod
      input_method: InputMethod
    }
  }
}

// =====================================
// 便捷类型别名
// =====================================

export type Company = Database['public']['Tables']['companies']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type TransactionCategory = Database['public']['Tables']['transaction_categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type FinancialSettings = Database['public']['Tables']['financial_settings']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']

export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type TransactionCategoryInsert = Database['public']['Tables']['transaction_categories']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type FinancialSettingsInsert = Database['public']['Tables']['financial_settings']['Insert']
export type InvitationInsert = Database['public']['Tables']['invitations']['Insert']

export type CompanyUpdate = Database['public']['Tables']['companies']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']
export type TransactionCategoryUpdate = Database['public']['Tables']['transaction_categories']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type FinancialSettingsUpdate = Database['public']['Tables']['financial_settings']['Update']
export type InvitationUpdate = Database['public']['Tables']['invitations']['Update']
