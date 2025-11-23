/**
 * Store mode detection utilities for multi-store functionality
 *
 * Supports two modes:
 * - 'single': View data for a single store
 * - 'all': View aggregated data for all stores
 */

export type StoreMode = 'single' | 'all'

export interface StoreModeResult {
  mode: StoreMode
  storeId: string | null
}

/**
 * Get store mode from URL search params (server-side)
 *
 * @param searchParams - Next.js searchParams from page props
 * @returns Store mode and selected store ID
 *
 * @example
 * // In a server component
 * export default async function Page({ searchParams }: { searchParams: { store?: string } }) {
 *   const { mode, storeId } = getStoreModeServer(searchParams)
 *
 *   if (mode === 'all') {
 *     // Fetch data for all stores
 *   } else {
 *     // Fetch data for single store
 *   }
 * }
 */
export function getStoreModeServer(searchParams: { store?: string }): StoreModeResult {
  const storeParam = searchParams.store

  if (!storeParam || storeParam === 'all') {
    return { mode: 'all', storeId: null }
  }

  return { mode: 'single', storeId: storeParam }
}

/**
 * Get store mode from URL (client-side)
 *
 * @returns Store mode and selected store ID
 *
 * @example
 * // In a client component
 * const { mode, storeId } = getStoreModeClient()
 *
 * if (mode === 'all') {
 *   // Show aggregated view
 * } else {
 *   // Show single store view
 * }
 */
export function getStoreModeClient(): StoreModeResult {
  if (typeof window === 'undefined') {
    return { mode: 'all', storeId: null }
  }

  const params = new URLSearchParams(window.location.search)
  const storeParam = params.get('store')

  if (!storeParam || storeParam === 'all') {
    return { mode: 'all', storeId: null }
  }

  return { mode: 'single', storeId: storeParam }
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
