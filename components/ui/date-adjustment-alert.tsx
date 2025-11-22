'use client'

/**
 * 日期调整提示组件
 *
 * 功能：
 * 1. 显示日期自动调整信息
 * 2. 统一的提示UI样式
 * 3. 可配置的显示方式
 *
 * 使用场景：当服务器端调整了日期范围时，显示提示信息给用户
 */

import { Info } from 'lucide-react'
import type { DateRangeValidationResult } from '@/lib/utils/date-range-server'

export type DateAdjustmentAlertProps = {
  /** 日期验证结果 */
  validation: DateRangeValidationResult
  /** 自定义样式类名 */
  className?: string
  /** 是否显示详细信息（默认true） */
  showDetails?: boolean
}

/**
 * 日期调整提示组件
 *
 * @example
 * ```typescript
 * // 在页面组件中使用
 * export default async function Page({ searchParams }) {
 *   const dateValidation = await validateDateRangeFromParams(searchParams)
 *
 *   return (
 *     <div>
 *       <DateAdjustmentAlert validation={dateValidation} />
 *       {/* 其他内容 *\/}
 *     </div>
 *   )
 * }
 * ```
 */
export function DateAdjustmentAlert({
  validation,
  className = '',
  showDetails = true
}: DateAdjustmentAlertProps) {
  // 如果没有调整，不显示任何内容
  if (!validation.dateAdjusted) {
    return null
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          <Info className="h-3 w-3" />
        </div>

        {/* 内容 */}
        <div className="flex-1">
          {/* 主要信息 */}
          <p className="text-sm text-blue-900">
            <span className="font-semibold">查询日期已自动调整：</span>
            查询开始日期已从{' '}
            <span className="font-mono bg-blue-100 px-1 rounded">
              {validation.originalStartDate}
            </span>
            {' '}调整为期初余额设定日期{' '}
            <span className="font-mono bg-blue-100 px-1 rounded">
              {validation.initialBalanceDate}
            </span>
          </p>

          {/* 详细说明 */}
          {showDetails && validation.initialBalanceDate && (
            <p className="text-xs text-blue-700 mt-1">
              期初余额设定日期之前无交易数据，期初余额为 {validation.initialBalanceDate} 的余额。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 简化版日期调整提示（单行显示）
 *
 * @example
 * ```typescript
 * <DateAdjustmentAlertCompact validation={dateValidation} />
 * ```
 */
export function DateAdjustmentAlertCompact({
  validation,
  className = ''
}: Omit<DateAdjustmentAlertProps, 'showDetails'>) {
  if (!validation.dateAdjusted) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 text-xs text-blue-800 ${className}`}>
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>
        日期已调整：{validation.originalStartDate} → {validation.startDate}
      </span>
    </div>
  )
}
