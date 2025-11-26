'use client'

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { CashFlowStatement } from '@/components/cash-flow-statement'
import type { CashFlowData } from '@/lib/services/cash-flow'

type CashFlowClientWrapperProps = {
  cashFlowData: CashFlowData
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
}

export function CashFlowClientWrapper({
  cashFlowData,
  monthlyData,
  initialStartDate,
  initialEndDate,
  initialBalanceDate,
  storeId,
  storeIds
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
    />
  )
}
