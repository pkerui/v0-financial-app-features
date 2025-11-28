'use client'

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { CashFlowStatement } from '@/components/cash-flow-statement'
import type { CashFlowData, NewStoreCapitalInvestment, ConsolidatedCashFlowData } from '@/lib/services/cash-flow'

type CashFlowClientWrapperProps = {
  cashFlowData: CashFlowData | ConsolidatedCashFlowData
  monthlyData: Array<{
    month: string
    operating: number
    investing: number
    financing: number
    netIncrease: number
  }>
  initialStartDate: string
  initialEndDate: string
  initialBalanceDate?: string
  storeId?: string
  storeIds?: string[]
  /** 新店资本投入说明（仅全局模式） */
  newStoreCapitalInvestments?: NewStoreCapitalInvestment[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
  /** 已存在店铺数量（仅全局模式） */
  existingStoreCount?: number
  /** 新店数量（仅全局模式） */
  newStoreCount?: number
}

export function CashFlowClientWrapper({
  cashFlowData,
  monthlyData,
  initialStartDate,
  initialEndDate,
  initialBalanceDate,
  storeId,
  storeIds,
  newStoreCapitalInvestments,
  isGlobalMode,
  existingStoreCount,
  newStoreCount
}: CashFlowClientWrapperProps) {
  const handleDateChange = useDateRangeNavigation({ basePath: '/cash-flow' })

  return (
    <CashFlowStatement
      cashFlowData={cashFlowData}
      monthlyData={monthlyData}
      startDate={initialStartDate}
      endDate={initialEndDate}
      onDateChange={handleDateChange}
      initialBalanceDate={initialBalanceDate}
      storeId={storeId}
      storeIds={storeIds}
      newStoreCapitalInvestments={newStoreCapitalInvestments}
      isGlobalMode={isGlobalMode}
      existingStoreCount={existingStoreCount}
      newStoreCount={newStoreCount}
    />
  )
}
