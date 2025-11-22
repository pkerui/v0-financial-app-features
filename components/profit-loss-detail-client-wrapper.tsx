'use client'

/**
 * 利润表详情页面客户端包装器
 *
 * 功能：
 * 1. 使用统一的日期范围导航Hook
 * 2. 将dateValidation传递给内容组件
 * 3. 处理日期变化的路由导航
 */

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { ProfitLossDetailContent } from '@/components/profit-loss-detail-content'
import type { DateRangeValidationResult } from '@/lib/utils/date-range-server'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  transaction_nature?: 'operating' | 'non_operating' | null
  include_in_profit_loss?: boolean | null
}

type ProfitLossDetailClientWrapperProps = {
  detailType: 'operating' | 'non_operating' | 'all'
  allTransactions: Transaction[]
  dateValidation: DateRangeValidationResult
}

export function ProfitLossDetailClientWrapper({
  detailType,
  allTransactions,
  dateValidation
}: ProfitLossDetailClientWrapperProps) {
  // 使用统一的日期导航Hook
  const handleDateChange = useDateRangeNavigation()

  return (
    <ProfitLossDetailContent
      detailType={detailType}
      allTransactions={allTransactions}
      startDate={dateValidation.startDate}
      endDate={dateValidation.endDate}
      onDateChange={handleDateChange}
      initialBalanceDate={dateValidation.initialBalanceDate}
    />
  )
}
