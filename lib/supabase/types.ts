export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          company_id: string | null
          full_name: string | null
          role: 'owner' | 'accountant' | 'manager' | 'user'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          full_name?: string | null
          role?: 'owner' | 'accountant' | 'manager' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          full_name?: string | null
          role?: 'owner' | 'accountant' | 'manager' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          owner_id: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          company_id: string
          name: string
          address: string | null
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
          address?: string | null
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
          address?: string | null
          phone?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          company_id: string
          store_id: string | null
          type: 'income' | 'expense'
          category: string
          amount: number
          description: string | null
          date: string
          payment_method: 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card' | null
          invoice_number: string | null
          created_by: string | null
          input_method: 'voice' | 'text' | 'manual' | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          store_id?: string | null
          type: 'income' | 'expense'
          category: string
          amount: number
          description?: string | null
          date?: string
          payment_method?: 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card' | null
          invoice_number?: string | null
          created_by?: string | null
          input_method?: 'voice' | 'text' | 'manual' | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          store_id?: string | null
          type?: 'income' | 'expense'
          category?: string
          amount?: number
          description?: string | null
          date?: string
          payment_method?: 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card' | null
          invoice_number?: string | null
          created_by?: string | null
          input_method?: 'voice' | 'text' | 'manual' | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          company_id: string | null
          type: 'income' | 'expense'
          name: string
          name_en: string | null
          icon: string | null
          color: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          type: 'income' | 'expense'
          name: string
          name_en?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          type?: 'income' | 'expense'
          name?: string
          name_en?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      monthly_summary: {
        Row: {
          company_id: string
          store_id: string | null
          month: string
          type: 'income' | 'expense'
          total_amount: number
          transaction_count: number
        }
      }
      category_summary: {
        Row: {
          company_id: string
          store_id: string | null
          category: string
          type: 'income' | 'expense'
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
      [_ in never]: never
    }
  }
}
