'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Store {
  id: string
  company_id: string
  name: string
  code?: string
  type?: 'direct' | 'franchise'
  status: 'active' | 'inactive' | 'preparing' | 'closed'
  city?: string
  province?: string
  address?: string
  manager_name?: string
  manager_phone?: string
  initial_balance_date?: string
  initial_balance?: number
  created_at: string
  updated_at: string
}

export interface CreateStoreData {
  name: string
  code?: string
  type?: 'direct' | 'franchise'
  status?: 'active' | 'inactive' | 'preparing' | 'closed'
  city?: string
  province?: string
  address?: string
  manager_name?: string
  manager_phone?: string
  initial_balance_date?: string
  initial_balance?: number
}

export interface UpdateStoreData {
  name?: string
  code?: string
  type?: 'direct' | 'franchise'
  status?: 'active' | 'inactive' | 'preparing' | 'closed'
  city?: string
  province?: string
  address?: string
  manager_name?: string
  manager_phone?: string
  initial_balance_date?: string
  initial_balance?: number
}

/**
 * Get all stores for the current user's company
 */
export async function getStores(): Promise<{ data: Store[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    // Get all stores for this company
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: `获取店铺列表失败: ${error.message}` }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching stores:', error)
    return { data: null, error: '获取店铺列表失败' }
  }
}

/**
 * Get active stores only
 */
export async function getActiveStores(): Promise<{ data: Store[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: `获取活跃店铺列表失败: ${error.message}` }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching active stores:', error)
    return { data: null, error: '获取活跃店铺列表失败' }
  }
}

/**
 * Get a single store by ID
 */
export async function getStore(id: string): Promise<{ data: Store | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      return { data: null, error: `获取店铺详情失败: ${error.message}` }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching store:', error)
    return { data: null, error: '获取店铺详情失败' }
  }
}

/**
 * Create a new store
 */
export async function createStore(
  storeData: CreateStoreData
): Promise<{ data: Store | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    // Validate required fields
    if (!storeData.name || storeData.name.trim() === '') {
      return { data: null, error: '店铺名称不能为空' }
    }

    // Check if store code already exists (if provided)
    if (storeData.code) {
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('code', storeData.code)
        .single()

      if (existingStore) {
        return { data: null, error: '店铺编码已存在' }
      }
    }

    // Create store
    const { data, error } = await supabase
      .from('stores')
      .insert({
        company_id: profile.company_id,
        name: storeData.name,
        code: storeData.code,
        type: storeData.type || 'direct',
        status: storeData.status || 'active',
        city: storeData.city,
        province: storeData.province,
        address: storeData.address,
        manager_name: storeData.manager_name,
        manager_phone: storeData.manager_phone,
        initial_balance_date: storeData.initial_balance_date,
        initial_balance: storeData.initial_balance,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: `创建店铺失败: ${error.message}` }
    }

    // Revalidate stores page
    revalidatePath('/stores')
    revalidatePath('/dashboard')

    return { data, error: null }
  } catch (error) {
    console.error('Error creating store:', error)
    return { data: null, error: '创建店铺失败' }
  }
}

/**
 * Update a store
 */
export async function updateStore(
  id: string,
  storeData: UpdateStoreData
): Promise<{ data: Store | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    // Verify store belongs to user's company
    const { data: existingStore, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single()

    if (fetchError || !existingStore) {
      return { data: null, error: '店铺不存在或无权限访问' }
    }

    // Check if store code already exists (if being updated)
    if (storeData.code) {
      const { data: codeExists } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('code', storeData.code)
        .neq('id', id)
        .single()

      if (codeExists) {
        return { data: null, error: '店铺编码已存在' }
      }
    }

    // Update store
    const { data, error } = await supabase
      .from('stores')
      .update({
        ...storeData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return { data: null, error: `更新店铺失败: ${error.message}` }
    }

    // Revalidate stores page
    revalidatePath('/stores')
    revalidatePath('/dashboard')

    return { data, error: null }
  } catch (error) {
    console.error('Error updating store:', error)
    return { data: null, error: '更新店铺失败' }
  }
}

/**
 * Soft delete a store (set status to 'closed')
 */
export async function deleteStore(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: '无法获取用户信息' }
    }

    // Verify store belongs to user's company
    const { data: existingStore, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single()

    if (fetchError || !existingStore) {
      return { success: false, error: '店铺不存在或无权限访问' }
    }

    // Check if store has transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('store_id', id)
      .limit(1)

    if (txError) {
      return { success: false, error: '检查店铺交易记录失败' }
    }

    if (transactions && transactions.length > 0) {
      // 有财务数据，拒绝删除
      return { success: false, error: '该店铺有历史财务数据，无法删除。如需停用，请将店铺状态改为"已关闭"。' }
    }

    // Check if store has associated users (managers/employees)
    // 只检查 manager 和 user 角色，owner 和 accountant 有全局权限不需要检查
    // managed_store_ids 是 UUID[] 类型，使用 contains 查询
    const { data: associatedUsers, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('company_id', profile.company_id)
      .in('role', ['manager', 'user'])
      .contains('managed_store_ids', [id])

    if (userError) {
      console.error('Error checking associated users:', userError)
      return { success: false, error: `检查店铺关联用户失败: ${userError.message}` }
    }

    if (associatedUsers && associatedUsers.length > 0) {
      const userNames = associatedUsers.map(u => u.full_name || '未命名用户').join('、')
      return {
        success: false,
        error: `该店铺有关联的团队成员（${userNames}），请先在团队管理中取消这些成员与该店铺的关联后再删除。`
      }
    }

    // 无交易记录，可以删除
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: `删除店铺失败: ${error.message}` }
    }

    // Revalidate stores page
    revalidatePath('/stores')
    revalidatePath('/dashboard')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting store:', error)
    return { success: false, error: '删除店铺失败' }
  }
}

/**
 * Get the earliest initial balance date among all stores
 * Returns null if no stores have initial_balance_date set
 */
export async function getEarliestStoreInitialBalanceDate(): Promise<{
  data: string | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    // Get earliest initial_balance_date from all stores
    const { data, error } = await supabase
      .from('stores')
      .select('initial_balance_date')
      .eq('company_id', profile.company_id)
      .not('initial_balance_date', 'is', null)
      .order('initial_balance_date', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      // No stores with initial_balance_date - this is not an error
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      return { data: null, error: `获取店铺期初日期失败: ${error.message}` }
    }

    return { data: data?.initial_balance_date || null, error: null }
  } catch (error) {
    console.error('Error fetching earliest store initial balance date:', error)
    return { data: null, error: '获取店铺期初日期失败' }
  }
}

/**
 * Get initial balance date for a specific store
 */
export async function getStoreInitialBalanceDate(storeId: string): Promise<{
  data: { initial_balance_date: string | null; initial_balance: number | null } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { data: null, error: '未授权访问' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { data: null, error: '无法获取用户信息' }
    }

    const { data, error } = await supabase
      .from('stores')
      .select('initial_balance_date, initial_balance')
      .eq('id', storeId)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: '店铺不存在' }
      }
      return { data: null, error: `获取店铺期初日期失败: ${error.message}` }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching store initial balance date:', error)
    return { data: null, error: '获取店铺期初日期失败' }
  }
}
