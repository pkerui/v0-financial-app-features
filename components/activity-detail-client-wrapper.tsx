'use client'

/**
 * 活动详情页面客户端包装器
 *
 * 功能：
 * 1. 使用统一的日期范围导航Hook
 * 2. 将dateValidation传递给内容组件
 * 3. 处理日期变化的路由导航
 */

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { ActivityDetailContent } from '@/components/activity-detail-content'
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

type ActivityDetailClientWrapperProps = {
  activity: 'operating' | 'investing' | 'financing'
  allTransactions: Transaction[]
  dateValidation: DateRangeValidationResult
  storeId?: string
  storeName?: string
  /** 多店模式下的店铺ID数组 */
  storeIds?: string[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
  /** 可用店铺列表（用于筛选下拉框，仅全局模式） */
  availableStores?: StoreOption[]
  /** 新店资本投入（仅筹资活动 + 全局模式） */
  newStoreCapitalInvestments?: NewStoreCapitalInvestment[]
}

export function ActivityDetailClientWrapper({
  activity,
  allTransactions,
  dateValidation,
  storeId,
  storeName,
  storeIds,
  isGlobalMode,
  availableStores = [],
  newStoreCapitalInvestments = []
}: ActivityDetailClientWrapperProps) {
  // 使用统一的日期导航Hook
  const handleDateChange = useDateRangeNavigation()

  return (
    <ActivityDetailContent
      activity={activity}
      allTransactions={allTransactions}
      startDate={dateValidation.startDate}
      endDate={dateValidation.endDate}
      onDateChange={handleDateChange}
      initialBalanceDate={dateValidation.initialBalanceDate}
      storeId={storeId}
      storeName={storeName}
      storeIds={storeIds}
      isGlobalMode={isGlobalMode}
      availableStores={availableStores}
      newStoreCapitalInvestments={newStoreCapitalInvestments}
    />
  )
}
