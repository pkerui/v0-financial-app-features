'use client'

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { ProfitLossStatement } from '@/components/profit-loss-statement'
import type { ProfitLossData } from '@/lib/services/profit-loss'

type ProfitLossClientWrapperProps = {
  profitLossData: ProfitLossData
  monthlyData: Array<{
    month: string
    revenue: number
    cost: number
    profit: number
  }>
  initialStartDate: string
  initialEndDate: string
  initialBalanceDate?: string
}

export function ProfitLossClientWrapper({
  profitLossData,
  monthlyData,
  initialStartDate,
  initialEndDate,
  initialBalanceDate
}: ProfitLossClientWrapperProps) {
  const handleDateChange = useDateRangeNavigation({ basePath: '/profit-loss' })

  return (
    <ProfitLossStatement
      profitLossData={profitLossData}
      monthlyData={monthlyData}
      startDate={initialStartDate}
      endDate={initialEndDate}
      onDateChange={handleDateChange}
      initialBalanceDate={initialBalanceDate}
    />
  )
}
