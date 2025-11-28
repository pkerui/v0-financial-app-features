'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Download, ArrowUpDown, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

const activityNames: Record<string, string> = {
  operating: '经营活动',
  investing: '投资活动',
  financing: '筹资活动'
}
type SortDirection = 'asc' | 'desc'

type ProfitLossDetailContentProps = {
  detailType: 'operating' | 'non_operating' | 'income_tax' | 'all'
  allTransactions: Transaction[]
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
  storeId?: string
  storeName?: string
  /** 多店模式下的店铺ID数组 */
  storeIds?: string[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
  /** 可用店铺列表（用于筛选下拉框，仅全局模式） */
  availableStores?: StoreOption[]
}

const detailNames: Record<string, string> = {
  operating: '营业内损益',
  non_operating: '营业外损益',
  income_tax: '所得税费用',
  all: '全部利润表交易'
}

// 卡片标签名称
const cardLabels: Record<string, { income: string; expense: string; profit: string }> = {
  operating: {
    income: '营业内收入',
    expense: '营业内成本',
    profit: '营业利润'
  },
  non_operating: {
    income: '营业外收入',
    expense: '营业外支出',
    profit: '营业外净额'
  },
  income_tax: {
    income: '所得税收入',
    expense: '所得税费用',
    profit: '所得税净额'
  },
  all: {
    income: '总收入',
    expense: '总成本',
    profit: '净利润'
  }
}

export function ProfitLossDetailContent({
  detailType,
  allTransactions,
  startDate,
  endDate,
  onDateChange,
  initialBalanceDate,
  storeId,
  storeName,
  storeIds,
  isGlobalMode,
  availableStores = []
}: ProfitLossDetailContentProps) {
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
  const profitLossUrl = buildBackUrl('/profit-loss', true)

  // 根据类型过滤交易（日期范围已在服务器端过滤）
  const baseTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const inProfitLoss = t.include_in_profit_loss !== false

      if (detailType === 'operating') {
        return inProfitLoss && (t.transaction_nature === 'operating' || !t.transaction_nature)
      } else if (detailType === 'non_operating') {
        return inProfitLoss && t.transaction_nature === 'non_operating'
      } else if (detailType === 'income_tax') {
        return inProfitLoss && t.transaction_nature === 'income_tax'
      } else {
        return inProfitLoss
      }
    })
  }, [allTransactions, detailType])

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
      // 类型筛选
      if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false
      // 分类筛选
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      // 现金流活动筛选
      if (selectedActivities.length > 0 && !selectedActivities.includes(t.cash_flow_activity || '')) return false
      // 交易性质筛选
      if (selectedNatures.length > 0 && !selectedNatures.includes(t.transaction_nature || 'operating')) return false
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
          const aOrder = natureOrder[a.transaction_nature as keyof typeof natureOrder] || 1
          const bOrder = natureOrder[b.transaction_nature as keyof typeof natureOrder] || 1
          return multiplier * (aOrder - bOrder)
        default:
          return 0
      }
    })
  }, [baseTransactions, selectedTypes, selectedCategories, selectedActivities, selectedNatures, selectedStores, sortField, sortDirection])

  // 计算统计数据
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpense

  // 清除筛选
  const clearFilters = () => {
    setSelectedTypes([])
    setSelectedCategories([])
    setSelectedActivities([])
    setSelectedNatures([])
    setSelectedStores([])
  }

  const hasActiveFilters = selectedTypes.length > 0 || selectedCategories.length > 0 || selectedActivities.length > 0 || selectedNatures.length > 0 || selectedStores.length > 0

  // CSV 导出功能
  const exportToCSV = () => {
    const lines: string[] = []

    lines.push(`${detailNames[detailType]}明细`)
    lines.push(`期间:,${startDate} 至 ${endDate}`)
    lines.push('')

    // CSV表头
    const headers = isGlobalMode
      ? ['日期', '店铺', '类型', '分类', '金额', '现金流活动', '交易性质', '描述']
      : ['日期', '类型', '分类', '金额', '现金流活动', '交易性质', '描述']
    lines.push(headers.join(','))

    // 交易数据
    filteredTransactions.forEach(t => {
      const type = t.type === 'income' ? '收入' : '支出'
      const activity = activityNames[t.cash_flow_activity || ''] || '-'
      const nature = t.transaction_nature === 'non_operating' ? '营业外'
        : t.transaction_nature === 'income_tax' ? '所得税'
        : '营业内'
      if (isGlobalMode) {
        lines.push(`${t.date},${t.store_name || '-'},${type},${t.category},${t.type === 'income' ? '' : '-'}${t.amount.toFixed(2)},${activity},${nature},${t.description || ''}`)
      } else {
        lines.push(`${t.date},${type},${t.category},${t.type === 'income' ? '' : '-'}${t.amount.toFixed(2)},${activity},${nature},${t.description || ''}`)
      }
    })

    // 统计
    lines.push('')
    lines.push(`${cardLabels[detailType].income},${totalIncome.toFixed(2)}`)
    lines.push(`${cardLabels[detailType].expense},${totalExpense.toFixed(2)}`)
    lines.push(`${cardLabels[detailType].profit},${netProfit.toFixed(2)}`)

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
              <Link href={profitLossUrl}>
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
              <h1 className="text-2xl font-bold">
                {isGlobalMode ? '合并' : ''}{detailNames[detailType]}{storeName ? ` - ${storeName}` : ''}
              </h1>
              <p className="text-muted-foreground">
                {storeName ? `${storeName} • ` : isGlobalMode ? '全部店铺 • ' : ''}
                {startDate} 至 {endDate}
              </p>
            </div>
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{cardLabels[detailType].income}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +¥{totalIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredTransactions.filter(t => t.type === 'income').length} 笔交易
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{cardLabels[detailType].expense}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -¥{totalExpense.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredTransactions.filter(t => t.type === 'expense').length} 笔交易
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{cardLabels[detailType].profit}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {netProfit >= 0 ? '+' : ''}¥{netProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                收入 - 支出
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 交易明细表 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">交易记录</CardTitle>
                <CardDescription>
                  共 {filteredTransactions.length} 笔 •
                  收入 ¥{totalIncome.toFixed(2)} •
                  支出 ¥{totalExpense.toFixed(2)} •
                  净额 ¥{netProfit.toFixed(2)}
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

                    {/* 类型列 */}
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
                                    onClick={() => setSelectedNatures(['operating', 'non_operating', 'income_tax'])}
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
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isGlobalMode ? 8 : 7} className="text-center text-muted-foreground py-8">
                        暂无{detailNames[detailType]}交易记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
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
                        <TableCell>
                          <Badge
                            variant={transaction.type === 'income' ? 'default' : 'destructive'}
                            className={transaction.type === 'income' ? 'text-xs' : 'text-xs bg-red-600 text-white hover:bg-red-700'}
                          >
                            {transaction.type === 'income' ? '收入' : '支出'}
                          </Badge>
                        </TableCell>
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
                          {transaction.cash_flow_activity === 'operating' ? (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">经营活动</Badge>
                          ) : transaction.cash_flow_activity === 'investing' ? (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">投资活动</Badge>
                          ) : transaction.cash_flow_activity === 'financing' ? (
                            <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800">筹资活动</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.transaction_nature === 'non_operating' ? (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">营业外</Badge>
                          ) : transaction.transaction_nature === 'income_tax' ? (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">所得税</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-800">营业内</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {transaction.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={isGlobalMode ? 4 : 3} className="text-right font-semibold">
                      合计
                    </TableCell>
                    <TableCell className="font-bold">
                      <div className="flex flex-col gap-1">
                        <span className="text-green-600 text-sm">+¥{totalIncome.toFixed(2)}</span>
                        <span className="text-red-600 text-sm">-¥{totalExpense.toFixed(2)}</span>
                        <span className={`text-base ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netProfit >= 0 ? '+' : ''}¥{netProfit.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
