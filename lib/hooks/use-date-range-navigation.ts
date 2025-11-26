'use client'

/**
 * 客户端日期范围导航Hook
 *
 * 功能：
 * 1. 统一的日期变化处理逻辑
 * 2. 使用Next.js router.push进行平滑页面导航
 * 3. 自动管理URL参数
 *
 * 使用场景：在客户端包装组件中使用，处理DateRangePicker的onChange事件
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/**
 * 日期范围导航配置
 */
export type UseDateRangeNavigationOptions = {
  /**
   * 基础路径（默认使用当前路径）
   * @example '/cash-flow' 或 '/profit-loss'
   */
  basePath?: string

  /**
   * 是否保留其他查询参数（默认true）
   */
  preserveOtherParams?: boolean
}

/**
 * 日期范围导航Hook
 *
 * @param options - 配置选项
 * @returns 日期变化处理函数
 *
 * @example
 * ```typescript
 * 'use client'
 *
 * export function MyClientWrapper({ initialStartDate, initialEndDate }) {
 *   const handleDateChange = useDateRangeNavigation()
 *
 *   return (
 *     <DateRangePicker
 *       startDate={initialStartDate}
 *       endDate={initialEndDate}
 *       onDateChange={handleDateChange}
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * ```typescript
 * // 自定义基础路径
 * const handleDateChange = useDateRangeNavigation({
 *   basePath: '/custom-path'
 * })
 * ```
 *
 * @example
 * ```typescript
 * // 不保留其他查询参数
 * const handleDateChange = useDateRangeNavigation({
 *   preserveOtherParams: false
 * })
 * ```
 */
export function useDateRangeNavigation(
  options: UseDateRangeNavigationOptions = {}
): (startDate: string, endDate: string) => void {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    basePath,
    preserveOtherParams = true
  } = options

  const handleDateChange = useCallback((newStartDate: string, newEndDate: string) => {
    // 1. 构建新的URL参数
    // 注意：动态读取当前的 searchParams，而不是使用闭包中的值
    const currentParams = new URLSearchParams(window.location.search)
    const params = preserveOtherParams
      ? currentParams
      : new URLSearchParams()

    params.set('startDate', newStartDate)
    params.set('endDate', newEndDate)

    // 2. 构建目标路径
    const targetPath = basePath || window.location.pathname
    const newUrl = `${targetPath}?${params.toString()}`

    // 3. 使用router.push进行平滑导航
    router.push(newUrl)
  }, [router, basePath, preserveOtherParams])

  return handleDateChange
}

/**
 * 获取当前URL中的日期参数
 *
 * @param defaultStartDate - 默认起始日期
 * @param defaultEndDate - 默认结束日期
 * @returns 日期参数对象
 *
 * @example
 * ```typescript
 * const { startDate, endDate } = useCurrentDateParams()
 * ```
 */
export function useCurrentDateParams(
  defaultStartDate?: string,
  defaultEndDate?: string
): {
  startDate: string | null
  endDate: string | null
} {
  const searchParams = useSearchParams()

  return {
    startDate: searchParams.get('startDate') || defaultStartDate || null,
    endDate: searchParams.get('endDate') || defaultEndDate || null,
  }
}
