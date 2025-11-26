'use client'

import { useMemo } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { activityNames } from '@/lib/cash-flow-config'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  date: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
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
  storeName
}: CashFlowSummaryDetailContentProps) {
  // 构建返回链接
  const dashboardUrl = storeId ? `/dashboard?store=${storeId}` : '/dashboard'
  const cashFlowUrl = storeId ? `/cash-flow?store=${storeId}` : '/cash-flow'

  // 不再需要客户端过滤日期，因为服务器端已经过滤了
  const filteredTransactions = allTransactions

  // 根据明细类型过滤
  const displayTransactions = useMemo(() => {
    if (detailType === 'total-inflow') {
      return filteredTransactions.filter(t => t.type === 'income')
    } else if (detailType === 'total-outflow') {
      return filteredTransactions.filter(t => t.type === 'expense')
    } else {
      // ending-balance 显示所有交易
      return filteredTransactions
    }
  }, [filteredTransactions, detailType])

  const filteredIncomeTransactions = useMemo(() =>
    displayTransactions.filter(t => t.type === 'income').sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [displayTransactions]
  )

  const filteredExpenseTransactions = useMemo(() =>
    displayTransactions.filter(t => t.type === 'expense').sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [displayTransactions]
  )

  const totalInflow = useMemo(() =>
    filteredIncomeTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredIncomeTransactions]
  )

  const totalOutflow = useMemo(() =>
    filteredExpenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    [filteredExpenseTransactions]
  )

  const netIncrease = totalInflow - totalOutflow
  const endingBalance = beginningBalance + netIncrease

  // 获取活动类型的中文名称
  const getActivityName = (activity?: 'operating' | 'investing' | 'financing' | null) => {
    if (!activity) return '未分类'
    return activityNames[activity] || '未分类'
  }

  // 获取活动类型的颜色
  const getActivityColor = (activity?: 'operating' | 'investing' | 'financing' | null) => {
    if (!activity) return 'bg-gray-100 text-gray-800'
    switch (activity) {
      case 'operating':
        return 'bg-blue-100 text-blue-800'
      case 'investing':
        return 'bg-green-100 text-green-800'
      case 'financing':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const exportToCSV = () => {
    const lines: string[] = []

    lines.push(`${detailNames[detailType]}明细`)
    lines.push(`期间:,${startDate} 至 ${endDate}`)
    lines.push('')

    if (detailType === 'ending-balance') {
      lines.push(`期初现金余额,${beginningBalance.toFixed(2)}`)
      lines.push('')
    }

    if (filteredIncomeTransactions.length > 0) {
      lines.push('流入明细')
      lines.push('日期,分类,活动类型,金额,描述')
      filteredIncomeTransactions.forEach(t => {
        const activity = getActivityName(t.cash_flow_activity)
        lines.push(`${t.date},${t.category},${activity},${t.amount.toFixed(2)},${t.description || ''}`)
      })
      lines.push(`,,,小计,${totalInflow.toFixed(2)}`)
      lines.push('')
    }

    if (filteredExpenseTransactions.length > 0) {
      lines.push('流出明细')
      lines.push('日期,分类,活动类型,金额,描述')
      filteredExpenseTransactions.forEach(t => {
        const activity = getActivityName(t.cash_flow_activity)
        lines.push(`${t.date},${t.category},${activity},${t.amount.toFixed(2)},${t.description || ''}`)
      })
      lines.push(`,,,小计,${totalOutflow.toFixed(2)}`)
      lines.push('')
    }

    if (detailType === 'ending-balance') {
      lines.push(`现金净增加额,${netIncrease.toFixed(2)}`)
      lines.push(`期末现金余额,${endingBalance.toFixed(2)}`)
    } else if (detailType === 'total-inflow') {
      lines.push(`总流入,${totalInflow.toFixed(2)}`)
    } else if (detailType === 'total-outflow') {
      lines.push(`总流出,${totalOutflow.toFixed(2)}`)
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
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Link href={cashFlowUrl}>
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={dashboardUrl}>
                <Button variant="outline" size="sm">
                  返回总览
                </Button>
              </Link>
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {detailNames[detailType]}明细{storeName ? ` - ${storeName}` : ''}
              </h1>
              <p className="text-muted-foreground">
                查看交易记录明细（{startDate} 至 {endDate}）
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

        {/* 汇总卡片 */}
        {detailType === 'ending-balance' && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>期初现金</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ¥{beginningBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {startDate}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总流入</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  +¥{totalInflow.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredIncomeTransactions.length} 笔交易
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>总流出</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -¥{totalOutflow.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredExpenseTransactions.length} 笔交易
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription>期末现金</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${endingBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  ¥{endingBalance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netIncrease >= 0 ? '增加' : '减少'} ¥{Math.abs(netIncrease).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 交易明细表 */}
        {displayTransactions.length > 0 ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">交易明细</CardTitle>
                  <CardDescription>
                    共 {displayTransactions.length} 笔交易（流入 {filteredIncomeTransactions.length} + 流出 {filteredExpenseTransactions.length}）
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
                {/* 流入明细 */}
                {filteredIncomeTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">流入明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>活动类型</th>
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(transaction.cash_flow_activity)}`}>
                                  {getActivityName(transaction.cash_flow_activity)}
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
                              +¥{totalInflow.toFixed(2)}
                            </td>
                            <td style={{ width: '40%' }}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 流出明细 */}
                {filteredExpenseTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">流出明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>活动类型</th>
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActivityColor(transaction.cash_flow_activity)}`}>
                                  {getActivityName(transaction.cash_flow_activity)}
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
                              -¥{totalOutflow.toFixed(2)}
                            </td>
                            <td style={{ width: '40%' }}></td>
                          </tr>
                          {detailType === 'ending-balance' && (
                            <>
                              <tr className="border-t">
                                <td className="px-4 py-3" style={{ width: '15%' }}></td>
                                <td className="px-4 py-3 text-sm font-semibold" style={{ width: '15%' }}>
                                  现金净增加额
                                </td>
                                <td className="px-4 py-3" style={{ width: '15%' }}></td>
                                <td className={`px-4 py-3 text-sm font-bold ${netIncrease >= 0 ? 'text-primary' : 'text-destructive'}`} style={{ width: '15%' }}>
                                  {netIncrease >= 0 ? '+' : ''}¥{netIncrease.toFixed(2)}
                                </td>
                                <td style={{ width: '40%' }}></td>
                              </tr>
                              <tr>
                                <td className="px-4 py-3" style={{ width: '15%' }}></td>
                                <td className="px-4 py-3 text-sm font-semibold" style={{ width: '15%' }}>
                                  期初现金余额
                                </td>
                                <td className="px-4 py-3" style={{ width: '15%' }}></td>
                                <td className="px-4 py-3 text-sm font-bold" style={{ width: '15%' }}>
                                  ¥{beginningBalance.toFixed(2)}
                                </td>
                                <td style={{ width: '40%' }}></td>
                              </tr>
                              <tr className="border-t-2 border-primary bg-primary/10">
                                <td className="px-4 py-4" style={{ width: '15%' }}></td>
                                <td className="px-4 py-4 text-base font-bold" style={{ width: '15%' }}>
                                  期末现金余额
                                </td>
                                <td className="px-4 py-4" style={{ width: '15%' }}></td>
                                <td className={`px-4 py-4 text-base font-bold ${endingBalance >= 0 ? 'text-primary' : 'text-destructive'}`} style={{ width: '15%' }}>
                                  ¥{endingBalance.toFixed(2)}
                                </td>
                                <td style={{ width: '40%' }}></td>
                              </tr>
                            </>
                          )}
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
