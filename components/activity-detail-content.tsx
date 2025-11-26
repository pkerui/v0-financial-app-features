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
  payment_method: string | null
  company_id: string
  created_by: string
  created_at: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
}

type ActivityDetailContentProps = {
  activity: 'operating' | 'investing' | 'financing'
  allTransactions: Transaction[]
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
  storeId?: string
  storeName?: string
}

export function ActivityDetailContent({
  activity,
  allTransactions,
  startDate,
  endDate,
  onDateChange,
  initialBalanceDate,
  storeId,
  storeName
}: ActivityDetailContentProps) {
  // 构建返回链接
  const dashboardUrl = storeId ? `/dashboard?store=${storeId}` : '/dashboard'
  const cashFlowUrl = storeId ? `/cash-flow?store=${storeId}` : '/cash-flow'

  // 分离收入和支出
  const incomeTransactions = useMemo(() => allTransactions.filter(t => t.type === 'income'), [allTransactions])
  const expenseTransactions = useMemo(() => allTransactions.filter(t => t.type === 'expense'), [allTransactions])

  // 计算统计数据
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const netCashFlow = totalIncome - totalExpense

  // CSV 导出功能
  const exportToCSV = () => {
    const headers = ['类型', '日期', '分类', '金额', '描述']

    // 流入数据
    const incomeRows = incomeTransactions.map(t => [
      '流入',
      new Date(t.date).toLocaleDateString('zh-CN'),
      t.category,
      `+${t.amount.toFixed(2)}`,
      t.description || '',
    ])

    // 流出数据
    const expenseRows = expenseTransactions.map(t => [
      '流出',
      new Date(t.date).toLocaleDateString('zh-CN'),
      t.category,
      `-${t.amount.toFixed(2)}`,
      t.description || '',
    ])

    // 汇总行
    const summaryRows = [
      ['', '', '', '', ''],
      ['汇总', '', '流入合计', `+${totalIncome.toFixed(2)}`, ''],
      ['', '', '流出合计', `-${totalExpense.toFixed(2)}`, ''],
      ['', '', '净现金流', `${netCashFlow >= 0 ? '+' : ''}${netCashFlow.toFixed(2)}`, ''],
    ]

    const csvContent = [
      headers.join(','),
      ...incomeRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...expenseRows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${activityNames[activity]}_${startDate}_${endDate}.csv`
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
                {activityNames[activity]}{storeName ? ` - ${storeName}` : ''}
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
          />
        </div>

        {/* 汇总卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总流入</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +¥{totalIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {incomeTransactions.length} 笔交易
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>总流出</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -¥{totalExpense.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {expenseTransactions.length} 笔交易
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>净现金流</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {netCashFlow >= 0 ? '+' : ''}¥{netCashFlow.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                流入 - 流出
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 交易明细表 */}
        {allTransactions.length > 0 ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">交易明细</CardTitle>
                  <CardDescription>
                    共 {allTransactions.length} 笔交易（流入 {incomeTransactions.length} + 流出 {expenseTransactions.length}）
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
                {incomeTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">流入明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '18%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '17%' }}>金额</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '50%' }}>描述</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {incomeTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                {new Date(transaction.date).toLocaleDateString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm" style={{ width: '18%' }}>{transaction.category}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600" style={{ width: '17%' }}>
                                +¥{transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground" style={{ width: '50%' }}>
                                {transaction.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ width: '18%' }}>
                              小计
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-green-600" style={{ width: '17%' }}>
                              +¥{totalIncome.toFixed(2)}
                            </td>
                            <td style={{ width: '50%' }}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 流出明细 */}
                {expenseTransactions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">流出明细</h3>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '15%' }}>日期</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '18%' }}>分类</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '17%' }}>金额</th>
                            <th className="px-4 py-3 text-left text-sm font-medium" style={{ width: '50%' }}>描述</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {expenseTransactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm" style={{ width: '15%' }}>
                                {new Date(transaction.date).toLocaleDateString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}
                              </td>
                              <td className="px-4 py-3 text-sm" style={{ width: '18%' }}>{transaction.category}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-red-600" style={{ width: '17%' }}>
                                -¥{transaction.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-muted-foreground" style={{ width: '50%' }}>
                                {transaction.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30">
                          <tr>
                            <td className="px-4 py-3" style={{ width: '15%' }}></td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ width: '18%' }}>
                              小计
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-red-600" style={{ width: '17%' }}>
                              -¥{totalExpense.toFixed(2)}
                            </td>
                            <td style={{ width: '50%' }}></td>
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
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">暂无{activityNames[activity]}交易记录</p>
                <p className="text-sm">
                  请在收入/支出页面添加新的交易记录。
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
