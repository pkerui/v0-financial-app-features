'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, TrendingUp, TrendingDown } from 'lucide-react'
import { getToday, getFirstDayOfMonth } from '@/lib/utils/date'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  description?: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing'
}

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
}

type TransactionListProps = {
  transactions: Transaction[]
  categories: Category[]
  initialFilters?: {
    type?: 'income' | 'expense'
    category?: string
    startDate?: string
    endDate?: string
  }
}

const activityLabels: Record<string, string> = {
  operating: '经营',
  investing: '投资',
  financing: '筹资'
}

const activityColors: Record<string, string> = {
  operating: 'bg-blue-100 text-blue-700',
  investing: 'bg-purple-100 text-purple-700',
  financing: 'bg-orange-100 text-orange-700'
}

export function TransactionList({
  transactions,
  categories,
  initialFilters = {}
}: TransactionListProps) {
  const [typeFilter, setTypeFilter] = useState<string>(initialFilters.type || 'all')
  const [categoryFilter, setCategoryFilter] = useState<string>(initialFilters.category || 'all')
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>(initialFilters.startDate || getFirstDayOfMonth())
  const [endDate, setEndDate] = useState<string>(initialFilters.endDate || getToday())

  // 筛选后的交易
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date)
      const start = new Date(startDate)
      const end = new Date(endDate)

      // 日期范围
      if (date < start || date > end) return false

      // 类型
      if (typeFilter !== 'all' && t.type !== typeFilter) return false

      // 分类
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false

      // 现金流活动
      if (activityFilter !== 'all' && t.cash_flow_activity !== activityFilter) return false

      return true
    })
  }, [transactions, typeFilter, categoryFilter, activityFilter, startDate, endDate])

  // 统计
  const stats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      count: filteredTransactions.length
    }
  }, [filteredTransactions])

  // 导出CSV
  const exportToCSV = () => {
    const lines: string[] = []

    lines.push('交易汇总')
    lines.push(`期间: ${startDate} 至 ${endDate}`)
    lines.push('')
    lines.push('日期,类型,分类,金额,现金流活动,备注')

    filteredTransactions.forEach(t => {
      const activity = t.cash_flow_activity ? activityLabels[t.cash_flow_activity] : '未分类'
      lines.push(`${t.date},${t.type === 'income' ? '收入' : '支出'},${t.category},${t.amount.toFixed(2)},${activity},${t.description || ''}`)
    })

    lines.push('')
    lines.push(`总收入,${stats.totalIncome.toFixed(2)}`)
    lines.push(`总支出,${stats.totalExpense.toFixed(2)}`)
    lines.push(`净额,${stats.netAmount.toFixed(2)}`)

    const csvContent = '\ufeff' + lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `交易汇总_${startDate}_${endDate}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 日期范围 */}
            <div className="space-y-2">
              <Label className="text-xs">起始日期</Label>
              <Input
                type="date"
                className="h-9"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">结束日期</Label>
              <Input
                type="date"
                className="h-9"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            {/* 类型 */}
            <div className="space-y-2">
              <Label className="text-xs">类型</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <Label className="text-xs">分类</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name} ({cat.type === 'income' ? '收' : '支'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 现金流活动 */}
            <div className="space-y-2">
              <Label className="text-xs">现金流活动</Label>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部活动</SelectItem>
                  <SelectItem value="operating">经营活动</SelectItem>
                  <SelectItem value="investing">投资活动</SelectItem>
                  <SelectItem value="financing">筹资活动</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总收入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ¥{stats.totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ¥{stats.totalExpense.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">净额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netAmount >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {stats.netAmount >= 0 ? '+' : ''}¥{stats.netAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">交易数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats.count} 笔
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 交易列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>交易明细</CardTitle>
              <CardDescription>共 {filteredTransactions.length} 笔交易</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              导出CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无交易记录
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* 类型图标 */}
                    <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-blue-100' : 'bg-red-100'}`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{transaction.category}</span>
                        {transaction.cash_flow_activity && (
                          <Badge variant="outline" className={`text-xs ${activityColors[transaction.cash_flow_activity]}`}>
                            {activityLabels[transaction.cash_flow_activity]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{transaction.date}</span>
                        {transaction.description && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground truncate">{transaction.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 金额 */}
                    <div className={`text-lg font-bold ${transaction.type === 'income' ? 'text-blue-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
