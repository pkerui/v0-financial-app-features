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

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
}

type ActivityDetailClientWrapperProps = {
  activity: 'operating' | 'investing' | 'financing'
  allTransactions: Transaction[]
  dateValidation: DateRangeValidationResult
}

export function ActivityDetailClientWrapper({
  activity,
  allTransactions,
  dateValidation
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
    />
  )
}
