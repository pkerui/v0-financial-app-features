'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'
import { getFirstDayOfMonth, getFirstDayOfYear, getToday } from '@/lib/utils/date'

export type DateRangePickerProps = {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  minDate?: string // 最小日期限制（例如期初余额日期）
  maxDate?: string // 最大日期限制（不设默认值，允许选择未来日期）
  className?: string
  buttonSize?: 'default' | 'sm' | 'lg'
  align?: 'start' | 'center' | 'end'
}

/**
 * 日期范围选择器组件
 *
 * 功能：
 * 1. 自定义起止日期
 * 2. 快捷选择：本月、本年、全部
 * 3. 日期验证：
 *    - 起始日期 >= minDate (期初余额日期)
 *    - 起始日期 <= 结束日期
 *    - 结束日期 <= maxDate (如果设置了的话，默认不限制)
 *
 * 注意：默认允许选择未来日期，以便查询预录入的交易
 *
 * 使用示例：
 * ```tsx
 * <DateRangePicker
 *   startDate={startDate}
 *   endDate={endDate}
 *   onDateChange={(start, end) => {
 *     setStartDate(start)
 *     setEndDate(end)
 *   }}
 *   minDate={initialBalanceDate}
 * />
 * ```
 */
export function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  minDate,
  maxDate, // 不设默认值，允许选择未来日期
  className = '',
  buttonSize = 'sm',
  align = 'end',
}: DateRangePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)

  // 确保组件只在客户端渲染
  useEffect(() => {
    setMounted(true)
  }, [])

  // 同步 props 的变化到本地 state（不做前端验证）
  useEffect(() => {
    setLocalStartDate(startDate)
    setLocalEndDate(endDate)
  }, [startDate, endDate])

  // 格式化日期范围显示
  const formatDateRange = (start: string, end: string) => {
    return `${start} 至 ${end}`
  }

  // 快捷日期设置：本月
  const setToThisMonth = () => {
    let start = getFirstDayOfMonth()
    const end = getToday()

    // 验证：如果本月第一天早于期初日期，使用期初日期
    if (minDate && start < minDate) {
      start = minDate
    }

    setLocalStartDate(start)
    setLocalEndDate(end)
    onDateChange(start, end)
  }

  // 快捷日期设置：本年
  const setToThisYear = () => {
    let start = getFirstDayOfYear()
    const end = getToday()

    // 验证：如果本年第一天早于期初日期，使用期初日期
    if (minDate && start < minDate) {
      start = minDate
    }

    setLocalStartDate(start)
    setLocalEndDate(end)
    onDateChange(start, end)
  }

  // 快捷日期设置：全部（包含未来日期）
  const setToAllTime = () => {
    // 使用期初日期或默认很早的日期
    const start = minDate || '2000-01-01'
    // 结束日期使用一年后，以便包含未来的预录入交易
    const today = new Date()
    const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    const end = oneYearLater.toISOString().split('T')[0]

    setLocalStartDate(start)
    setLocalEndDate(end)
    onDateChange(start, end)
  }

  // 处理起始日期变化（输入时不验证，允许自由输入）
  const handleStartDateChange = (newStart: string) => {
    setLocalStartDate(newStart)
  }

  // 处理结束日期变化（输入时不验证，允许自由输入）
  const handleEndDateChange = (newEnd: string) => {
    setLocalEndDate(newEnd)
  }

  // 起始日期失去焦点时验证并调整
  const handleStartDateBlur = () => {
    let adjustedStart = localStartDate

    // 验证：起始日期不能早于最小日期
    if (minDate && adjustedStart < minDate) {
      adjustedStart = minDate
      setLocalStartDate(adjustedStart)
    }

    // 验证：起始日期不能晚于结束日期
    if (adjustedStart > localEndDate) {
      adjustedStart = localEndDate
      setLocalStartDate(adjustedStart)
    }

    onDateChange(adjustedStart, localEndDate)
  }

  // 结束日期失去焦点时验证并调整
  const handleEndDateBlur = () => {
    let adjustedEnd = localEndDate

    // 验证：结束日期不能早于起始日期
    if (adjustedEnd < localStartDate) {
      adjustedEnd = localStartDate
      setLocalEndDate(adjustedEnd)
    }

    // 验证：结束日期不能晚于最大日期
    if (maxDate && adjustedEnd > maxDate) {
      adjustedEnd = maxDate
      setLocalEndDate(adjustedEnd)
    }

    onDateChange(localStartDate, adjustedEnd)
  }

  // 服务端渲染时显示加载状态
  if (!mounted) {
    return (
      <Button variant="outline" size={buttonSize} className={`gap-1 ${className}`} disabled>
        日期范围
        <ChevronDown className="h-3 w-3" />
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size={buttonSize} className={`gap-1 ${className}`}>
          日期范围
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align={align}>
        <div className="space-y-3">
          {/* 起始日期 */}
          <div>
            <Label className="text-xs">起始日期</Label>
            <Input
              type="date"
              className="h-8 mt-1"
              value={localStartDate}
              min={minDate}
              max={localEndDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              onBlur={handleStartDateBlur}
            />
          </div>

          {/* 结束日期 */}
          <div>
            <Label className="text-xs">结束日期</Label>
            <Input
              type="date"
              className="h-8 mt-1"
              value={localEndDate}
              min={localStartDate}
              max={maxDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              onBlur={handleEndDateBlur}
            />
            {minDate && (
              <p className="text-xs text-muted-foreground mt-1">
                起始日期不得早于期初余额日期（{minDate}）
              </p>
            )}
          </div>

          {/* 快捷按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={setToThisMonth}
            >
              本月
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={setToThisYear}
            >
              本年
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={setToAllTime}
            >
              全部
            </Button>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * 自定义 Hook：管理日期范围状态
 *
 * 使用示例：
 * ```tsx
 * const { startDate, endDate, setDateRange } = useDateRange({
 *   defaultStart: getFirstDayOfMonth(),
 *   defaultEnd: getToday(),
 *   minDate: initialBalanceDate,
 * })
 * ```
 */
export function useDateRange({
  defaultStart = getFirstDayOfMonth(),
  defaultEnd = getToday(),
  minDate,
}: {
  defaultStart?: string
  defaultEnd?: string
  minDate?: string
} = {}) {
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  const setDateRange = (newStart: string, newEnd: string) => {
    let adjustedStart = newStart

    // 验证起始日期不能早于最小日期
    if (minDate && adjustedStart < minDate) {
      adjustedStart = minDate
    }

    // 验证起始日期不能晚于结束日期
    if (adjustedStart > newEnd) {
      adjustedStart = newEnd
    }

    setStartDate(adjustedStart)
    setEndDate(newEnd)
  }

  return {
    startDate,
    endDate,
    setDateRange,
  }
}
