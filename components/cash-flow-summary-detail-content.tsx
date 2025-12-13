// @ts-nocheck
'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Info, ArrowUpDown, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ActivityBadge } from '@/components/activity-badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { NewStoreCapitalInvestment } from '@/lib/services/cash-flow'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
  transaction_nature?: 'operating' | 'non_operating' | 'income_tax' | null
  include_in_profit_loss?: boolean | null
  store_id?: string
  store_name?: string
}

type StoreOption = {
  id: string
  name: string
}

type SortField = 'date' | 'store' | 'type' | 'category' | 'amount' | 'cash_flow_activity' | 'transaction_nature'
type SortDirection = 'asc' | 'desc'

const activityNames: Record<string, string> = {
  operating: '经营活动',
  investing: '投资活动',
  financing: '筹资活动'
}

type CashFlowSummaryDetailContentProps = {
  detailType: 'total-inflow' | 'total-outflow' | 'ending-balance'
  allTransactions: Transaction[]
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
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
  /** 已存在店铺名称列表（仅全局模式） */
  existingStoreNames?: string[]
  /** 可用店铺列表（用于筛选下拉框，仅全局模式） */
  availableStores?: StoreOption[]
}

const detailNames = {
  'total-inflow': '总流入',
  'total-outflow': '总流出',
  'ending-balance': '期末现金'
}

export function CashFlowSummaryDetailContent({
  detailType,
  allTransactions,
  startDate,
  endDate,
  onDateChange,
  initialBalanceDate,
  beginningBalance = 0,
  storeId,
  storeName,
  storeIds,
  isGlobalMode,
  newStoreCapitalInvestments = [],
  existingStoreCount,
  newStoreCount,
  existingStoreNames,
  availableStores = []
}: CashFlowSummaryDetailContentProps) {
  // 筛选和排序状态
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedNatures, setSelectedNatures] = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // 构建返回链接（保留日期和店铺参数）
  const buildBackUrl = (basePath: string, includeDate: boolean = false) => {
    const params = new URLSearchParams()
    if (includeDate) {
      params.set('startDate', startDate)
      params.set('endDate', endDate)
    }
    if (storeId) {
      params.set('store', storeId)
    } else if (storeIds && storeIds.length > 0) {
      params.set('stores', storeIds.join(','))
    }
    const queryString = params.toString()
    return queryString ? `${basePath}?${queryString}` : basePath
  }

  const dashboardUrl = buildBackUrl('/dashboard')
  const cashFlowUrl = buildBackUrl('/cash-flow', true)

  // 根据 detailType 预筛选交易类型
  const baseTransactions = useMemo(() => {
    if (detailType === 'total-inflow') {
      return allTransactions.filter(t => t.type === 'income')
    } else if (detailType === 'total-outflow') {
      return allTransactions.filter(t => t.type === 'expense')
    }
    return allTransactions
  }, [allTransactions, detailType])

  // 是否显示类型列（仅期末现金页面需要）
  const showTypeColumn = detailType === 'ending-balance'

  // 获取唯一分类列表（用于筛选）
  const uniqueCategories = useMemo(() =>
    Array.from(new Set(baseTransactions.map(t => t.category))),
    [baseTransactions]
  )

  // 排序函数
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // 过滤和排序交易
  const filteredTransactions = useMemo(() => {
    let filtered = baseTransactions.filter(t => {
      // 类型筛选（仅期末现金页面需要）
      if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false
      // 分类筛选
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      // 现金流活动筛选
      if (selectedActivities.length > 0 && !selectedActivities.includes(t.cash_flow_activity || '')) return false
      // 交易性质筛选 - 多选
      if (selectedNatures.length > 0) {
        // 处理"不适用"的情况 (include_in_profit_loss === false)
        if (t.include_in_profit_loss === false) {
          if (!selectedNatures.includes('not_applicable')) return false
        } else {
          if (!selectedNatures.includes(t.transaction_nature || '')) return false
        }
      }
      // 店铺筛选
      if (selectedStores.length > 0 && !selectedStores.includes(t.store_id || '')) return false
      return true
    })

    // 排序
    return filtered.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1
      switch (sortField) {
        case 'date':
          return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime())
        case 'store':
          return multiplier * (a.store_name || '').localeCompare(b.store_name || '')
        case 'type':
          return multiplier * (a.type === 'income' ? -1 : 1)
        case 'category':
          return multiplier * a.category.localeCompare(b.category)
        case 'amount':
          const aAmount = a.type === 'income' ? a.amount : -a.amount
          const bAmount = b.type === 'income' ? b.amount : -b.amount
          return multiplier * (aAmount - bAmount)
        case 'cash_flow_activity':
          const activityOrder = { operating: 1, investing: 2, financing: 3 }
          const aActivityOrder = activityOrder[a.cash_flow_activity as keyof typeof activityOrder] || 4
          const bActivityOrder = activityOrder[b.cash_flow_activity as keyof typeof activityOrder] || 4
          return multiplier * (aActivityOrder - bActivityOrder)
        case 'transaction_nature':
          const natureOrder = { operating: 1, non_operating: 2, income_tax: 3 }
          const aOrder = natureOrder[a.transaction_nature as keyof typeof natureOrder] || 4
          const bOrder = natureOrder[b.transaction_nature as keyof typeof natureOrder] || 4
          return multiplier * (aOrder - bOrder)
        default:
          return 0
      }
    })
  }, [baseTransactions, selectedTypes, selectedCategories, selectedActivities, selectedNatures, selectedStores, sortField, sortDirection])

  // 计算统计
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  // 新店资本投入总额（仅全局模式且非总流出页面）
  const totalNewStoreCapital = newStoreCapitalInvestments.reduce((sum, inv) => sum + inv.amount, 0)

  // 调整后的总流入（全局模式下包含新店资本投入，但总流出页面不包含）
  const adjustedTotalIncome = (isGlobalMode && detailType !== 'total-outflow')
    ? totalIncome + totalNewStoreCapital
    : totalIncome

  const netAmount = adjustedTotalIncome - totalExpense
  const endingBalance = beginningBalance + netAmount

  // 清除筛选
  const clearFilters = () => {
    setSelectedTypes([])
    setSelectedCategories([])
    setSelectedActivities([])
    setSelectedNatures([])
    setSelectedStores([])
  }

  const hasActiveFilters = selectedTypes.length > 0 || selectedCategories.length > 0 || selectedActivities.length > 0 || selectedNatures.length > 0 || selectedStores.length > 0

  const exportToCSV = () => {
    const lines: string[] = []

    lines.push(`${detailNames[detailType]}明细`)
    lines.push(`期间:,${startDate} 至 ${endDate}`)
    lines.push('')

    if (detailType === 'ending-balance') {
      let balanceLabel = '期初现金余额'
      if (storeName) {
        balanceLabel = `期初现金余额（${storeName}）`
      } else if (isGlobalMode && existingStoreCount !== undefined) {
        balanceLabel = `期初现金余额（仅含 ${startDate} 前已开业的 ${existingStoreCount} 家店铺${existingStoreNames && existingStoreNames.length > 0 ? `：${existingStoreNames.join('、')}` : ''}）`
      }
      lines.push(`${balanceLabel},${beginningBalance.toFixed(2)}`)
      lines.push('')
    }

    // CSV表头
    const headers = isGlobalMode
      ? ['日期', '店铺', '类型', '分类', '金额', '现金流活动', '交易性质', '描述']
      : ['日期', '类型', '分类', '金额', '现金流活动', '交易性质', '描述']
    lines.push(headers.join(','))

    // 新店资本投入
    if (isGlobalMode && newStoreCapitalInvestments.length > 0) {
      newStoreCapitalInvestments.forEach(inv => {
        lines.push(`${inv.date},${inv.storeName},收入,新店资本投入,${inv.amount.toFixed(2)},筹资活动,不适用,${inv.storeName}期初现金余额`)
      })
    }

    // 交易数据
    filteredTransactions.forEach(t => {
      const type = t.type === 'income' ? '收入' : '支出'
      const activity = activityNames[t.cash_flow_activity || ''] || '-'
      const nature = t.include_in_profit_loss === false ? '不适用'
        : t.transaction_nature === 'operating' ? '营业内'
        : t.transaction_nature === 'non_operating' ? '营业外'
        : t.transaction_nature === 'income_tax' ? '所得税'
        : '-'
      if (isGlobalMode) {
        lines.push(`${t.date},${t.store_name || '-'},${type},${t.category},${t.type === 'income' ? '' : '-'}${t.amount.toFixed(2)},${activity},${nature},${t.description || ''}`)
      } else {
        lines.push(`${t.date},${type},${t.category},${t.type === 'income' ? '' : '-'}${t.amount.toFixed(2)},${activity},${nature},${t.description || ''}`)
      }
    })

    // 统计
    lines.push('')
    lines.push(`总收入,${adjustedTotalIncome.toFixed(2)}`)
    lines.push(`总支出,${totalExpense.toFixed(2)}`)
    lines.push(`净额,${netAmount.toFixed(2)}`)
    if (detailType === 'ending-balance') {
      lines.push(`期末现金余额,${endingBalance.toFixed(2)}`)
    }

    const BOM = '\uFEFF'
    const csvContent = BOM + lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${detailNames[detailType]}_${startDate}_${endDate}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* 页头 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Link href={cashFlowUrl}>
                <Button variant="outline" size="sm" className="gap-1 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </Link>
              <Link href="/stores">
                <Button variant="outline" size="sm" className="w-full">
                  店铺管理
                </Button>
              </Link>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{detailNames[detailType]}明细</h1>
              <p className="text-muted-foreground">
                {storeName ? `${storeName} • ` : isGlobalMode ? '全部店铺 • ' : ''}
                {startDate} 至 {endDate}
              </p>
            </div>
          </div>
        </div>

        {/* 期初余额卡片 */}
        {detailType === 'ending-balance' && (
          <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  期初现金余额{storeName ? `（${storeName}）` : isGlobalMode && existingStoreCount !== undefined ? `（仅含 ${startDate} 前已开业的 ${existingStoreCount} 家店铺${existingStoreNames && existingStoreNames.length > 0 ? `：${existingStoreNames.join('、')}` : ''}）` : ''}
                </span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">¥{beginningBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 交易明细表 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">交易记录</CardTitle>
                <CardDescription>
                  共 {filteredTransactions.length + (isGlobalMode && detailType !== 'total-outflow' ? newStoreCapitalInvestments.length : 0)} 笔
                  {detailType === 'total-inflow' && ` • 总流入 ¥${adjustedTotalIncome.toFixed(2)}`}
                  {detailType === 'total-outflow' && ` • 总流出 ¥${totalExpense.toFixed(2)}`}
                  {detailType === 'ending-balance' && ` • 收入 ¥${adjustedTotalIncome.toFixed(2)} • 支出 ¥${totalExpense.toFixed(2)} • 净额 ¥${netAmount.toFixed(2)}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline" size="sm" className="gap-2">
                    <X className="h-4 w-4" />
                    清除筛选
                  </Button>
                )}
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  导出CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    {/* 日期列 */}
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <DateRangePicker
                          startDate={startDate}
                          endDate={endDate}
                          onDateChange={onDateChange}
                          minDate={initialBalanceDate}
                          buttonSize="sm"
                          buttonVariant="ghost"
                          buttonClassName="h-8 px-2"
                          align="start"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSort('date')}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>

                    {/* 店铺列 - 仅全局模式 */}
                    {isGlobalMode && (
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="h-8 px-2 gap-1">
                                店铺
                                {selectedStores.length > 0 && (
                                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                    {selectedStores.length}
                                  </Badge>
                                )}
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56" align="start">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">筛选店铺</Label>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setSelectedStores(availableStores.map(s => s.id))}
                                    >
                                      全选
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setSelectedStores([])}
                                    >
                                      清除
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {availableStores.map(store => (
                                    <div key={store.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`store-${store.id}`}
                                        checked={selectedStores.includes(store.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedStores([...selectedStores, store.id])
                                          } else {
                                            setSelectedStores(selectedStores.filter(id => id !== store.id))
                                          }
                                        }}
                                      />
                                      <label htmlFor={`store-${store.id}`} className="text-sm cursor-pointer flex-1">
                                        {store.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleSort('store')}
                          >
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableHead>
                    )}

                    {/* 类型列 - 仅期末现金页面显示 */}
                    {showTypeColumn && (
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" className="h-8 px-2 gap-1">
                                类型
                                {selectedTypes.length > 0 && (
                                  <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                    {selectedTypes.length}
                                  </Badge>
                                )}
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="start">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-semibold">筛选类型</Label>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setSelectedTypes(['income', 'expense'])}
                                    >
                                      全选
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setSelectedTypes([])}
                                    >
                                      清除
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {[
                                    { value: 'income', label: '收入' },
                                    { value: 'expense', label: '支出' },
                                  ].map(type => (
                                    <div key={type.value} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`type-${type.value}`}
                                        checked={selectedTypes.includes(type.value)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedTypes([...selectedTypes, type.value])
                                          } else {
                                            setSelectedTypes(selectedTypes.filter(t => t !== type.value))
                                          }
                                        }}
                                      />
                                      <label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer flex-1">
                                        {type.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleSort('type')}
                          >
                            <ArrowUpDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableHead>
                    )}

                    {/* 分类列 */}
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-8 px-2 gap-1">
                              分类
                              {selectedCategories.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                  {selectedCategories.length}
                                </Badge>
                              )}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">筛选分类</Label>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedCategories(uniqueCategories)}
                                  >
                                    全选
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedCategories([])}
                                  >
                                    清除
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {uniqueCategories.map(cat => (
                                  <div key={cat} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`category-${cat}`}
                                      checked={selectedCategories.includes(cat)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCategories([...selectedCategories, cat])
                                        } else {
                                          setSelectedCategories(selectedCategories.filter(c => c !== cat))
                                        }
                                      }}
                                    />
                                    <label htmlFor={`category-${cat}`} className="text-sm cursor-pointer flex-1">
                                      {cat}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSort('category')}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>

                    {/* 金额列 */}
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('amount')}
                        className="h-8 gap-1 px-2"
                      >
                        金额
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>

                    {/* 现金流活动列 */}
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-8 px-2 gap-1">
                              现金流活动
                              {selectedActivities.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                  {selectedActivities.length}
                                </Badge>
                              )}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">筛选活动</Label>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedActivities(['operating', 'investing', 'financing'])}
                                  >
                                    全选
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedActivities([])}
                                  >
                                    清除
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { value: 'operating', label: '经营活动' },
                                  { value: 'investing', label: '投资活动' },
                                  { value: 'financing', label: '筹资活动' },
                                ].map(activity => (
                                  <div key={activity.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`activity-${activity.value}`}
                                      checked={selectedActivities.includes(activity.value)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedActivities([...selectedActivities, activity.value])
                                        } else {
                                          setSelectedActivities(selectedActivities.filter(a => a !== activity.value))
                                        }
                                      }}
                                    />
                                    <label htmlFor={`activity-${activity.value}`} className="text-sm cursor-pointer flex-1">
                                      {activity.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSort('cash_flow_activity')}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>

                    {/* 交易性质列 */}
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-8 px-2 gap-1">
                              交易性质
                              {selectedNatures.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                  {selectedNatures.length}
                                </Badge>
                              )}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48" align="start">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">筛选性质</Label>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedNatures(['operating', 'non_operating', 'income_tax', 'not_applicable'])}
                                  >
                                    全选
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setSelectedNatures([])}
                                  >
                                    清除
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { value: 'operating', label: '营业内' },
                                  { value: 'non_operating', label: '营业外' },
                                  { value: 'income_tax', label: '所得税' },
                                  { value: 'not_applicable', label: '不适用' },
                                ].map(nature => (
                                  <div key={nature.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`nature-${nature.value}`}
                                      checked={selectedNatures.includes(nature.value)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedNatures([...selectedNatures, nature.value])
                                        } else {
                                          setSelectedNatures(selectedNatures.filter(n => n !== nature.value))
                                        }
                                      }}
                                    />
                                    <label htmlFor={`nature-${nature.value}`} className="text-sm cursor-pointer flex-1">
                                      {nature.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleSort('transaction_nature')}
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableHead>

                    {/* 描述列 */}
                    <TableHead>描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 && newStoreCapitalInvestments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6 + (isGlobalMode ? 1 : 0) + (showTypeColumn ? 1 : 0)} className="text-center text-muted-foreground py-8">
                        暂无交易记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {/* 新店资本投入（虚拟行）- 仅在总流入和期末现金页面显示 */}
                      {isGlobalMode && detailType !== 'total-outflow' && newStoreCapitalInvestments.map((investment) => (
                        <TableRow key={`new-store-${investment.storeId}`} className="bg-amber-50/50">
                          <TableCell className="font-medium">
                            {new Date(investment.date).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{investment.storeName}</span>
                          </TableCell>
                          {showTypeColumn && (
                            <TableCell>
                              <Badge variant="default" className="text-xs">收入</Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              新店资本投入
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            +¥{investment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <ActivityBadge activity="financing" />
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">不适用</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {investment.storeName}期初现金余额
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* 实际交易 */}
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {new Date(transaction.date).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })}
                          </TableCell>
                          {isGlobalMode && (
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {transaction.store_name || '-'}
                              </span>
                            </TableCell>
                          )}
                          {showTypeColumn && (
                            <TableCell>
                              <Badge
                                variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className={transaction.type === 'income' ? 'text-xs' : 'text-xs bg-red-600 text-white hover:bg-red-700'}
                              >
                                {transaction.type === 'income' ? '收入' : '支出'}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                              {transaction.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ActivityBadge activity={transaction.cash_flow_activity} />
                          </TableCell>
                          <TableCell>
                            {transaction.include_in_profit_loss === false ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">不适用</span>
                            ) : transaction.transaction_nature === 'non_operating' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">营业外</span>
                            ) : transaction.transaction_nature === 'income_tax' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">所得税</span>
                            ) : transaction.transaction_nature === 'operating' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">营业内</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {transaction.description || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2 + (isGlobalMode ? 1 : 0) + (showTypeColumn ? 1 : 0)} className="text-right font-semibold">
                      合计
                    </TableCell>
                    <TableCell className="font-bold">
                      {detailType === 'total-inflow' ? (
                        <span className="text-green-600 text-base">+¥{adjustedTotalIncome.toFixed(2)}</span>
                      ) : detailType === 'total-outflow' ? (
                        <span className="text-red-600 text-base">-¥{totalExpense.toFixed(2)}</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-green-600 text-sm">+¥{adjustedTotalIncome.toFixed(2)}</span>
                          <span className="text-red-600 text-sm">-¥{totalExpense.toFixed(2)}</span>
                          <span className={`text-base ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {netAmount >= 0 ? '+' : ''}¥{netAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                  {detailType === 'ending-balance' && (
                    <TableRow className="bg-primary/10">
                      <TableCell colSpan={2 + (isGlobalMode ? 1 : 0) + (showTypeColumn ? 1 : 0)} className="text-right text-base font-bold">
                        期末现金余额
                      </TableCell>
                      <TableCell className={`text-base font-bold ${endingBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        ¥{endingBalance.toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 新店资本投入说明（仅全局模式且有新店时显示，不在总流出页面显示） */}
        {isGlobalMode && detailType !== 'total-outflow' && newStoreCapitalInvestments.length > 0 && (
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                  合并报表说明
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                本期内有 {newStoreCapitalInvestments.length} 家新店开业，其期初现金余额共计 ¥{totalNewStoreCapital.toFixed(2)}
                已作为"新店资本投入"计入现金流入，以确保合并报表的期末余额准确。
              </p>
              <ul className="mt-2 text-sm text-amber-600 dark:text-amber-400 list-disc list-inside">
                {newStoreCapitalInvestments.map(inv => (
                  <li key={inv.storeId}>
                    {inv.storeName}：¥{inv.amount.toFixed(2)}（{inv.date} 开业）
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
