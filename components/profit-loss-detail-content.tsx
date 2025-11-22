'use client'

import { useMemo } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  transaction_nature?: 'operating' | 'non_operating' | null
  include_in_profit_loss?: boolean | null
}

type ProfitLossDetailContentProps = {
  detailType: 'operating' | 'non_operating' | 'all'
  allTransactions: Transaction[]
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
}

const detailNames = {
  operating: '营业内损益',
  non_operating: '营业外损益',
  all: '全部利润表交易'
}

// 卡片标签名称
const cardLabels = {
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
  initialBalanceDate
}: ProfitLossDetailContentProps) {
  // 格式化日期范围显示
  const formatDateRange = (start: string, end: string) => {
    return `${start} 至 ${end}`
  }

  // 根据类型过滤交易（日期范围已在服务器端过滤）
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const inProfitLoss = t.include_in_profit_loss !== false

      if (detailType === 'operating') {
        return inProfitLoss && (t.transaction_nature === 'operating' || !t.transaction_nature)
      } else if (detailType === 'non_operating') {
        return inProfitLoss && t.transaction_nature === 'non_operating'
      } else {
        return inProfitLoss
      }
    })
  }, [allTransactions, detailType])

  const filteredIncomeTransactions = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'income').sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [filteredTransactions]
  )

  const filteredExpenseTransactions = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'expense').sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [filteredTransactions]
  )

  const totalIncome = useMemo(() =>
    filteredIncomeTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredIncomeTransactions]
  )

  const totalExpense = useMemo(() =>
    filteredExpenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredExpenseTransactions]
  )

  const netProfit = totalIncome - totalExpense

  const exportToCSV = () => {
    const lines: string[] = []

    lines.push(`${detailNames[detailType]}明细`)
    lines.push(`期间:,${startDate} 至 ${endDate}`)
    lines.push('')

    if (filteredIncomeTransactions.length > 0) {
      lines.push(`${cardLabels[detailType].income}明细`)
      lines.push('日期,分类,交易性质,金额,描述')
      filteredIncomeTransactions.forEach(t => {
        const nature = t.transaction_nature === 'non_operating' ? '营业外' : '营业内'
        lines.push(`${t.date},${t.category},${nature},${t.amount.toFixed(2)},${t.description || ''}`)
      })
      lines.push(`,,小计,${totalIncome.toFixed(2)},`)
      lines.push('')
    }

    if (filteredExpenseTransactions.length > 0) {
      lines.push(`${cardLabels[detailType].expense}明细`)
      lines.push('日期,分类,交易性质,金额,描述')
      filteredExpenseTransactions.forEach(t => {
        const nature = t.transaction_nature === 'non_operating' ? '营业外' : '营业内'
        lines.push(`${t.date},${t.category},${nature},${t.amount.toFixed(2)},${t.description || ''}`)
      })
      lines.push(`,,小计,${totalExpense.toFixed(2)},`)
      lines.push('')
    }

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
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/profit-loss">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{detailNames[detailType]}</h1>
              <p className="text-muted-foreground">
                查看交易记录明细（{formatDateRange(startDate, endDate)}）
              </p>
            </div>
          </div>

          {/* 日期范围选择器 */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={onDateChange}
            minDate={initialBalanceDate}
            buttonSize="sm"
            align="end"
          />
        </div>

        {/* 交易明细表 */}
        {filteredTransactions.length > 0 ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">交易明细</CardTitle>
                  <CardDescription>
                    共 {filteredTransactions.length} 笔交易（流入 {filteredIncomeTransactions.length} + 流出 {filteredExpenseTransactions.length}）
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  导出CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 收入明细 */}
                {filteredIncomeTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">{cardLabels[detailType].income}明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>交易性质</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>金额</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '40%' }}>描述</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredIncomeTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                {new Date(transaction.date).toLocaleDateString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>{transaction.category}</td>
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  transaction.transaction_nature === 'non_operating'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {transaction.transaction_nature === 'non_operating' ? '营业外' : '营业内'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600" style={{ width: '15%' }}>
                                +¥{transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground" style={{ width: '40%' }}>
                                {transaction.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ width: '15%' }}>
                              小计
                            </td>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600" style={{ width: '15%' }}>
                              +¥{totalIncome.toFixed(2)}
                            </td>
                            <td style={{ width: '40%' }}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 支出明细 */}
                {filteredExpenseTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">{cardLabels[detailType].expense}明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>交易性质</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>金额</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '40%' }}>描述</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredExpenseTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                {new Date(transaction.date).toLocaleDateString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>{transaction.category}</td>
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  transaction.transaction_nature === 'non_operating'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {transaction.transaction_nature === 'non_operating' ? '营业外' : '营业内'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-red-600" style={{ width: '15%' }}>
                                -¥{transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground" style={{ width: '40%' }}>
                                {transaction.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ width: '15%' }}>
                              小计
                            </td>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600" style={{ width: '15%' }}>
                              -¥{totalExpense.toFixed(2)}
                            </td>
                            <td style={{ width: '40%' }}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">该期间没有交易记录</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
