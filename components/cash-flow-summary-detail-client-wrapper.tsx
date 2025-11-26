'use client'

/**
 * 现金流汇总详情页面客户端包装器
 *
 * 功能：
 * 1. 使用统一的日期范围导航Hook
 * 2. 将dateValidation传递给内容组件
 * 3. 处理日期变化的路由导航
 */

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { CashFlowSummaryDetailContent } from '@/components/cash-flow-summary-detail-content'
import type { DateRangeValidationResult } from '@/lib/utils/date-range-server'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
}

type CashFlowSummaryDetailClientWrapperProps = {
  detailType: 'total-inflow' | 'total-outflow' | 'ending-balance'
  allTransactions: Transaction[]
  dateValidation: DateRangeValidationResult
  beginningBalance?: number
  storeId?: string
  storeName?: string
}

export function CashFlowSummaryDetailClientWrapper({
  detailType,
  allTransactions,
  dateValidation,
  beginningBalance = 0,
  storeId,
  storeName
}: CashFlowSummaryDetailClientWrapperProps) {
  // 使用统一的日期导航Hook
  const handleDateChange = useDateRangeNavigation()

  return (
    <CashFlowSummaryDetailContent
      detailType={detailType}
      allTransactions={allTransactions}
      startDate={dateValidation.startDate}
      endDate={dateValidation.endDate}
      onDateChange={handleDateChange}
      initialBalanceDate={dateValidation.initialBalanceDate}
      beginningBalance={beginningBalance}
      storeId={storeId}
      storeName={storeName}
    />
  )
}
