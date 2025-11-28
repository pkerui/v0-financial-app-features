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
import type { NewStoreCapitalInvestment } from '@/lib/services/cash-flow'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
  store_id?: string
  store_name?: string
}

type StoreOption = {
  id: string
  name: string
}

type CashFlowSummaryDetailClientWrapperProps = {
  detailType: 'total-inflow' | 'total-outflow' | 'ending-balance'
  allTransactions: Transaction[]
  dateValidation: DateRangeValidationResult
  beginningBalance?: number
  storeId?: string
  storeName?: string
  /** 多店模式下的店铺ID数组 */
  storeIds?: string[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
  /** 新店资本投入（仅全局模式） */
  newStoreCapitalInvestments?: NewStoreCapitalInvestment[]
  /** 已存在店铺数量（仅全局模式） */
  existingStoreCount?: number
  /** 新店数量（仅全局模式） */
  newStoreCount?: number
  /** 可用店铺列表（用于筛选下拉框，仅全局模式） */
  availableStores?: StoreOption[]
}

export function CashFlowSummaryDetailClientWrapper({
  detailType,
  allTransactions,
  dateValidation,
  beginningBalance = 0,
  storeId,
  storeName,
  storeIds,
  isGlobalMode,
  newStoreCapitalInvestments,
  existingStoreCount,
  newStoreCount,
  availableStores = []
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
      storeIds={storeIds}
      isGlobalMode={isGlobalMode}
      newStoreCapitalInvestments={newStoreCapitalInvestments}
      existingStoreCount={existingStoreCount}
      newStoreCount={newStoreCount}
      availableStores={availableStores}
    />
  )
}
