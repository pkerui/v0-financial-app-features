// @ts-nocheck
'use server'

/**
 * 统一店铺管理适配器
 * 根据后端类型自动选择使用 Supabase 或 LeanCloud
 *
 * 返回签名与 @/lib/api/stores 完全一致，可作为 drop-in 替换
 */

import { detectBackend } from './detector'
import { revalidatePath } from 'next/cache'

// 类型定义 - 与 Supabase API 兼容
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

// ============================================
// 动态导入后端模块
// ============================================

async function getStoresModule() {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    const { StoreModel, ProfileModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    return {
      backend: 'leancloud' as const,
      StoreModel,
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
// 辅助函数：LeanCloud 数据转换为 Supabase 格式
// ============================================

function convertLCStoreToSupabaseFormat(lcStore: any): Store {
  return {
    id: lcStore.objectId || lcStore.id,
    company_id: lcStore.companyId,
    name: lcStore.name,
    code: lcStore.code,
    type: lcStore.type === 'store' ? 'direct' : lcStore.type || 'direct',
    status: lcStore.status || 'active',
    city: lcStore.city,
    province: lcStore.province,
    address: lcStore.address,
    manager_name: lcStore.manager || lcStore.manager_name,
    manager_phone: lcStore.phone || lcStore.manager_phone,
    initial_balance_date: lcStore.initialBalanceDate,
    initial_balance: lcStore.initialBalance,
    created_at: lcStore.createdAt instanceof Date ? lcStore.createdAt.toISOString() : lcStore.createdAt || new Date().toISOString(),
    updated_at: lcStore.updatedAt instanceof Date ? lcStore.updatedAt.toISOString() : lcStore.updatedAt || new Date().toISOString(),
  }
}

// ============================================
// 统一 API 接口
// ============================================

/**
 * 获取店铺列表
 */
export async function getStores(): Promise<{ data: Store[] | null; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { data: null, error: '未授权访问' }
      }

      const { data: profile, error: profileError } = await mod.ProfileModel.getByUserId(session.userId)

      if (profileError || !profile?.companyId) {
        console.error('获取用户资料失败:', profileError, 'userId:', session.userId)
        return { data: null, error: '无法获取用户信息' }
      }

      const result = await mod.StoreModel.getByCompanyId(profile.companyId)
      console.log('[getStores] Raw LeanCloud data:', JSON.stringify(result.data, null, 2))

      if (result.error) {
        return { data: null, error: `获取店铺列表失败: ${result.error}` }
      }

      const stores = (result.data || []).map(convertLCStoreToSupabaseFormat)
      console.log('[getStores] Converted stores:', JSON.stringify(stores, null, 2))
      return { data: stores, error: null }
    } catch (error: any) {
      console.error('获取店铺列表异常:', error)
      return { data: null, error: '获取店铺列表失败' }
    }
  } else {
    const { getStores: supabaseGet } = await import('@/lib/api/stores')
    return supabaseGet()
  }
}

/**
 * 获取活跃店铺列表
 */
export async function getActiveStores(): Promise<{ data: Store[] | null; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { data: null, error: '未授权访问' }
      }

      const { data: profile, error: profileError } = await mod.ProfileModel.getByUserId(session.userId)

      if (profileError || !profile?.companyId) {
        console.error('获取用户资料失败:', profileError, 'userId:', session.userId)
        return { data: null, error: '无法获取用户信息' }
      }

      const result = await mod.StoreModel.getByCompanyId(profile.companyId)

      if (result.error) {
        return { data: null, error: `获取活跃店铺列表失败: ${result.error}` }
      }

      // 过滤出活跃店铺
      const activeStores = (result.data || [])
        .filter((s: any) => s.status === 'active')
        .map(convertLCStoreToSupabaseFormat)

      return { data: activeStores, error: null }
    } catch (error: any) {
      console.error('获取活跃店铺列表异常:', error)
      return { data: null, error: '获取活跃店铺列表失败' }
    }
  } else {
    const { getActiveStores: supabaseGet } = await import('@/lib/api/stores')
    return supabaseGet()
  }
}

/**
 * 获取单个店铺
 */
export async function getStore(id: string): Promise<{ data: Store | null; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { data: null, error: '未授权访问' }
      }

      const result = await mod.StoreModel.getById(id)

      if (result.error) {
        return { data: null, error: `获取店铺详情失败: ${result.error}` }
      }

      if (!result.data) {
        return { data: null, error: '店铺不存在' }
      }

      return { data: convertLCStoreToSupabaseFormat(result.data), error: null }
    } catch (error: any) {
      console.error('获取店铺异常:', error)
      return { data: null, error: '获取店铺详情失败' }
    }
  } else {
    const { getStore: supabaseGet } = await import('@/lib/api/stores')
    return supabaseGet(id)
  }
}

/**
 * 创建店铺
 */
export async function createStore(
  storeData: CreateStoreData
): Promise<{ data: Store | null; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      console.log('[createStore] Session:', session ? { userId: session.userId, hasToken: !!session.sessionToken } : null)
      if (!session) {
        return { data: null, error: '未授权访问' }
      }

      const { data: profile, error: profileError } = await mod.ProfileModel.getByUserId(session.userId)
      console.log('[createStore] Profile:', profile ? { companyId: profile.companyId, role: profile.role } : null, 'error:', profileError)

      if (profileError || !profile?.companyId) {
        console.error('获取用户资料失败:', profileError, 'userId:', session.userId)
        return { data: null, error: '无法获取用户信息' }
      }

      // Validate required fields
      if (!storeData.name || storeData.name.trim() === '') {
        return { data: null, error: '店铺名称不能为空' }
      }

      console.log('[createStore] Creating store with token:', session.sessionToken ? 'present' : 'missing')
      console.log('[createStore] Input storeData:', JSON.stringify(storeData, null, 2))

      // 转换为 LeanCloud 格式
      const lcData = {
        companyId: profile.companyId,
        name: storeData.name,
        code: storeData.code,
        type: storeData.type === 'direct' ? 'store' : storeData.type || 'store',
        status: storeData.status || 'active',
        address: storeData.address,
        phone: storeData.manager_phone,
        manager: storeData.manager_name,
        city: storeData.city,
        province: storeData.province,
        initialBalanceDate: storeData.initial_balance_date,
        initialBalance: storeData.initial_balance,
      }
      console.log('[createStore] LeanCloud lcData:', JSON.stringify(lcData, null, 2))

      const result = await mod.StoreModel.create(lcData, session.sessionToken)
      console.log('[createStore] Result:', result)

      if (result.error) {
        return { data: null, error: `创建店铺失败: ${result.error}` }
      }

      revalidatePath('/stores')
      revalidatePath('/dashboard')

      return { data: convertLCStoreToSupabaseFormat(result.data), error: null }
    } catch (error: any) {
      console.error('创建店铺异常:', error)
      return { data: null, error: '创建店铺失败' }
    }
  } else {
    const { createStore: supabaseCreate } = await import('@/lib/api/stores')
    return supabaseCreate(storeData)
  }
}

/**
 * 更新店铺
 */
export async function updateStore(
  id: string,
  storeData: UpdateStoreData
): Promise<{ data: Store | null; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { data: null, error: '未授权访问' }
      }

      // 转换为 LeanCloud 格式
      const lcData: any = {}
      if (storeData.name !== undefined) lcData.name = storeData.name
      if (storeData.code !== undefined) lcData.code = storeData.code
      if (storeData.type !== undefined) lcData.type = storeData.type === 'direct' ? 'store' : storeData.type
      if (storeData.status !== undefined) lcData.status = storeData.status
      if (storeData.address !== undefined) lcData.address = storeData.address
      if (storeData.manager_phone !== undefined) lcData.phone = storeData.manager_phone
      if (storeData.manager_name !== undefined) lcData.manager = storeData.manager_name
      if (storeData.city !== undefined) lcData.city = storeData.city
      if (storeData.province !== undefined) lcData.province = storeData.province
      if (storeData.initial_balance_date !== undefined) lcData.initialBalanceDate = storeData.initial_balance_date
      if (storeData.initial_balance !== undefined) lcData.initialBalance = storeData.initial_balance

      const result = await mod.StoreModel.update(id, lcData)

      if (result.error) {
        return { data: null, error: `更新店铺失败: ${result.error}` }
      }

      revalidatePath('/stores')
      revalidatePath('/dashboard')

      return { data: convertLCStoreToSupabaseFormat(result.data), error: null }
    } catch (error: any) {
      console.error('更新店铺异常:', error)
      return { data: null, error: '更新店铺失败' }
    }
  } else {
    const { updateStore: supabaseUpdate } = await import('@/lib/api/stores')
    return supabaseUpdate(id, storeData)
  }
}

/**
 * 删除店铺
 * 注意：如果店铺有关联的交易记录，不允许删除
 */
export async function deleteStore(id: string): Promise<{ success: boolean; error: string | null }> {
  const mod = await getStoresModule()

  if (mod.backend === 'leancloud') {
    try {
      const session = await mod.getLCSession()
      if (!session) {
        return { success: false, error: '未授权访问' }
      }

      // 检查是否有关联的交易记录
      const { TransactionModel } = await import('@/lib/leancloud/models')
      const { data: transactions } = await TransactionModel.getByStoreId(id, { limit: 1 })

      if (transactions && transactions.length > 0) {
        return { success: false, error: '该店铺存在交易记录，无法删除。如需删除，请先删除或转移所有相关交易记录。' }
      }

      const result = await mod.StoreModel.delete(id)

      if (result.error) {
        return { success: false, error: `删除店铺失败: ${result.error}` }
      }

      revalidatePath('/stores')
      revalidatePath('/dashboard')

      return { success: true, error: null }
    } catch (error: any) {
      console.error('删除店铺异常:', error)
      return { success: false, error: '删除店铺失败' }
    }
  } else {
    const { deleteStore: supabaseDelete } = await import('@/lib/api/stores')
    return supabaseDelete(id)
  }
}
