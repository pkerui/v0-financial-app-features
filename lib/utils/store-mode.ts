/**
 * Store mode detection utilities for multi-store functionality
 *
 * Supports three modes:
 * - 'single': View data for a single store
 * - 'multi': View aggregated data for selected stores
 * - 'all': View aggregated data for all stores
 */

export type StoreMode = 'single' | 'multi' | 'all'

export interface StoreModeResult {
  mode: StoreMode
  storeId: string | null
  storeIds: string[]
}

/**
 * Get store mode from URL search params (server-side)
 *
 * @param searchParams - Next.js searchParams from page props
 * @returns Store mode, selected store ID, and selected store IDs array
 *
 * @example
 * // In a server component
 * export default async function Page({ searchParams }: { searchParams: { store?: string; stores?: string } }) {
 *   const { mode, storeId, storeIds } = getStoreModeServer(searchParams)
 *
 *   if (mode === 'single') {
 *     // Fetch data for single store
 *     query = query.eq('store_id', storeId)
 *   } else if (mode === 'multi' || mode === 'all') {
 *     // Fetch data for multiple stores
 *     if (storeIds.length > 0) {
 *       query = query.in('store_id', storeIds)
 *     }
 *   }
 * }
 */
export function getStoreModeServer(searchParams: { store?: string; stores?: string }): StoreModeResult {
  const singleStoreParam = searchParams.store
  const multiStoreParam = searchParams.stores

  // Priority 1: Multiple stores parameter
  if (multiStoreParam) {
    // 特殊处理 'all' 值，直接返回全局模式
    // 从全局总览页面导航时使用 stores=all 保持全局视图
    if (multiStoreParam === 'all') {
      return { mode: 'all', storeId: null, storeIds: [] }
    }

    const storeIds = multiStoreParam.split(',').filter(Boolean)
    if (storeIds.length > 1) {
      return { mode: 'multi', storeId: null, storeIds }
    } else if (storeIds.length === 1) {
      // Edge case: stores param with single ID - 仍视为单店模式
      // 注意：从全局总览导航应使用 stores=all，不会进入这里
      return { mode: 'single', storeId: storeIds[0], storeIds: [storeIds[0]] }
    }
  }

  // Priority 2: Single store parameter
  if (singleStoreParam && singleStoreParam !== 'all') {
    return { mode: 'single', storeId: singleStoreParam, storeIds: [singleStoreParam] }
  }

  // Default: All stores mode
  return { mode: 'all', storeId: null, storeIds: [] }
}

/**
 * Get store mode from URL (client-side)
 *
 * @returns Store mode, selected store ID, and selected store IDs array
 *
 * @example
 * // In a client component
 * const { mode, storeId, storeIds } = getStoreModeClient()
 *
 * if (mode === 'single') {
 *   // Show single store view
 * } else if (mode === 'multi') {
 *   // Show multi-store aggregated view
 * } else {
 *   // Show all stores aggregated view
 * }
 */
export function getStoreModeClient(): StoreModeResult {
  if (typeof window === 'undefined') {
    return { mode: 'all', storeId: null, storeIds: [] }
  }

  const params = new URLSearchParams(window.location.search)
  const singleStoreParam = params.get('store')
  const multiStoreParam = params.get('stores')

  // Priority 1: Multiple stores parameter
  if (multiStoreParam) {
    // 特殊处理 'all' 值，直接返回全局模式
    if (multiStoreParam === 'all') {
      return { mode: 'all', storeId: null, storeIds: [] }
    }

    const storeIds = multiStoreParam.split(',').filter(Boolean)
    if (storeIds.length > 1) {
      return { mode: 'multi', storeId: null, storeIds }
    } else if (storeIds.length === 1) {
      return { mode: 'single', storeId: storeIds[0], storeIds: [storeIds[0]] }
    }
  }

  // Priority 2: Single store parameter
  if (singleStoreParam && singleStoreParam !== 'all') {
    return { mode: 'single', storeId: singleStoreParam, storeIds: [singleStoreParam] }
  }

  // Default: All stores mode
  return { mode: 'all', storeId: null, storeIds: [] }
}

/**
 * Build URL with store parameter
 *
 * @param basePath - Base path (e.g., '/income', '/cash-flow')
 * @param storeId - Store ID or 'all'
 * @param additionalParams - Additional query parameters
 * @returns URL with store parameter
 *
 * @example
 * const url = buildStoreUrl('/income', 'store-123', { startDate: '2025-01-01' })
 * // Returns: '/income?store=store-123&startDate=2025-01-01'
 */
export function buildStoreUrl(
  basePath: string,
  storeId: string | 'all',
  additionalParams?: Record<string, string>
): string {
  const params = new URLSearchParams()

  params.set('store', storeId)

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value)
    })
  }

  return `${basePath}?${params.toString()}`
}

/**
 * Store selection in localStorage for persistence
 */
const STORE_SELECTION_KEY = 'selectedStore'

export function saveStoreSelection(storeId: string | 'all'): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_SELECTION_KEY, storeId)
}

export function getStoredSelection(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORE_SELECTION_KEY)
}

export function clearStoredSelection(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORE_SELECTION_KEY)
}
