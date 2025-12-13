/**
 * 服务器端日期范围验证和处理工具
 *
 * 功能：
 * 1. 验证日期范围合法性
 * 2. 检查并调整相对于期初余额日期的日期范围
 * 3. 提供统一的日期范围处理逻辑
 * 4. 支持按店铺或公司获取期初日期
 *
 * 使用场景：在服务器组件中调用，确保日期范围符合财务设置
 */

import { getStoreInitialBalanceDate, getEarliestStoreInitialBalanceDate } from '@/lib/api/stores'
import { getFirstDayOfMonth, getToday } from '@/lib/utils/date'
import { detectBackend } from '@/lib/backend/detector'

/**
 * 日期范围验证结果
 */
export type DateRangeValidationResult = {
  /** 验证后的起始日期 */
  startDate: string
  /** 验证后的结束日期 */
  endDate: string
  /** 期初余额日期（来自财务设置） */
  initialBalanceDate?: string
  /** 是否发生了日期调整 */
  dateAdjusted: boolean
  /** 调整前的原始起始日期（仅当dateAdjusted为true时有值） */
  originalStartDate?: string
  /** 调整原因 */
  adjustmentReason?: string
}

/**
 * 验证并调整日期范围
 *
 * @param requestedStartDate - 请求的起始日期（来自URL参数或其他来源）
 * @param requestedEndDate - 请求的结束日期（来自URL参数或其他来源）
 * @param options - 可选配置
 * @returns 验证结果，包含调整后的日期和调整信息
 *
 * @example
 * ```typescript
 * // 在服务器组件中使用（公司级别 - 使用最早店铺期初日期）
 * const validation = await validateDateRange(
 *   params.startDate,
 *   params.endDate
 * )
 *
 * // 单店使用（使用该店铺的期初日期）
 * const validation = await validateDateRange(
 *   params.startDate,
 *   params.endDate,
 *   { storeId: 'store-uuid' }
 * )
 *
 * // 使用验证后的日期
 * const transactions = await fetchTransactions(
 *   validation.startDate,
 *   validation.endDate
 * )
 *
 * // 显示调整提示
 * if (validation.dateAdjusted) {
 *   console.log(`日期已调整: ${validation.originalStartDate} -> ${validation.startDate}`)
 * }
 * ```
 */
export async function validateDateRange(
  requestedStartDate?: string,
  requestedEndDate?: string,
  options?: {
    /** 默认起始日期（未提供requestedStartDate时使用） */
    defaultStartDate?: string
    /** 默认结束日期（未提供requestedEndDate时使用） */
    defaultEndDate?: string
    /** 店铺ID - 如果提供则使用该店铺的期初日期，否则使用所有店铺中最早的期初日期 */
    storeId?: string
  }
): Promise<DateRangeValidationResult> {
  // 1. 设置默认日期
  const defaultStartDate = options?.defaultStartDate || getFirstDayOfMonth()
  const defaultEndDate = options?.defaultEndDate || getToday()

  let startDateStr = requestedStartDate || defaultStartDate
  const endDateStr = requestedEndDate || defaultEndDate

  // 2. 获取期初日期
  // 优先级：店铺级别 > 公司最早店铺日期 > 公司级别财务设置
  let initialBalanceDateStr: string | null = null

  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式：从 Store 表获取期初日期
    const { StoreModel, ProfileModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')

    if (options?.storeId) {
      // 单店模式：使用该店铺的期初日期
      const { data: store } = await StoreModel.getById(options.storeId)
      initialBalanceDateStr = store?.initialBalanceDate || null
    } else {
      // 公司/汇总模式：获取用户公司下所有店铺，找最早的期初日期
      const session = await getLCSession()
      if (session) {
        const { data: profile } = await ProfileModel.getByUserId(session.userId)
        if (profile?.companyId) {
          const { data: stores } = await StoreModel.getByCompanyId(profile.companyId)
          if (stores && stores.length > 0) {
            const dates = stores
              .map(s => s.initialBalanceDate)
              .filter((d): d is string => !!d)
              .sort()
            initialBalanceDateStr = dates[0] || null
          }
        }
      }
    }
  } else {
    // Supabase 模式：使用原有的 API 函数
    if (options?.storeId) {
      // 单店模式：使用该店铺的期初日期
      const { data: storeData } = await getStoreInitialBalanceDate(options.storeId)
      initialBalanceDateStr = storeData?.initial_balance_date || null
    } else {
      // 公司/汇总模式：使用所有店铺中最早的期初日期
      const { data: earliestDate } = await getEarliestStoreInitialBalanceDate()
      initialBalanceDateStr = earliestDate
    }
  }

  // 不再回退到公司级别财务设置，统一使用店铺数据

  // 3. 初始化返回结果
  const result: DateRangeValidationResult = {
    startDate: startDateStr,
    endDate: endDateStr,
    initialBalanceDate: initialBalanceDateStr || undefined,
    dateAdjusted: false,
  }

  // 4. 如果有期初余额日期设置，进行验证
  if (initialBalanceDateStr) {
    const queryStartDate = new Date(startDateStr)
    const initialBalanceDate = new Date(initialBalanceDateStr)

    // 检查查询起始日期是否早于期初余额日期
    if (queryStartDate < initialBalanceDate) {
      result.originalStartDate = startDateStr
      result.startDate = initialBalanceDateStr
      result.dateAdjusted = true
      result.adjustmentReason = '查询起始日期早于期初余额日期，已自动调整'
    }
  }

  return result
}

/**
 * 从搜索参数中提取并验证日期范围
 *
 * 这是一个便捷函数，专门用于Next.js服务器组件中处理searchParams
 *
 * @param searchParams - Next.js的searchParams（Promise或对象）
 * @param options - 可选配置
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * // 在Next.js服务器组件中使用（公司汇总 - 使用最早店铺期初日期）
 * export default async function Page({ searchParams }: PageProps) {
 *   const dateValidation = await validateDateRangeFromParams(searchParams)
 *   // ...
 * }
 *
 * // 单店使用（使用该店铺的期初日期）
 * export default async function Page({ searchParams }: PageProps) {
 *   const params = await searchParams
 *   const dateValidation = await validateDateRangeFromParams(searchParams, {
 *     storeId: params.store
 *   })
 *   // ...
 * }
 * ```
 */
export async function validateDateRangeFromParams(
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string }> | { startDate?: string; endDate?: string; store?: string },
  options?: {
    defaultStartDate?: string
    defaultEndDate?: string
    /** 店铺ID - 如果提供则使用该店铺的期初日期 */
    storeId?: string
  }
): Promise<DateRangeValidationResult> {
  // 处理Promise类型的searchParams（Next.js 15+）
  const params = searchParams instanceof Promise ? await searchParams : searchParams

  // 确定店铺ID：优先使用 options.storeId，其次使用 params.store
  const storeId = options?.storeId || params.store

  return validateDateRange(
    params.startDate,
    params.endDate,
    {
      defaultStartDate: options?.defaultStartDate,
      defaultEndDate: options?.defaultEndDate,
      storeId,
    }
  )
}

/**
 * 格式化日期范围显示文本
 *
 * @param startDate - 起始日期
 * @param endDate - 结束日期
 * @param format - 显示格式
 * @returns 格式化后的文本
 *
 * @example
 * ```typescript
 * formatDateRangeDisplay('2025-01-01', '2025-01-31')
 * // => "2025-01-01 至 2025-01-31"
 *
 * formatDateRangeDisplay('2025-01-01', '2025-01-31', 'localized')
 * // => "2025年1月1日 至 2025年1月31日"
 * ```
 */
export function formatDateRangeDisplay(
  startDate: string,
  endDate: string,
  format: 'simple' | 'localized' = 'simple'
): string {
  if (format === 'localized') {
    const start = new Date(startDate)
    const end = new Date(endDate)

    return `${start.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} 至 ${end.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`
  }

  return `${startDate} 至 ${endDate}`
}
