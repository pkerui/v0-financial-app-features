'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart3, LogOut, Mic, TrendingUp, Wallet, ArrowUpRight, Activity, FileText, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logout } from '@/lib/auth/actions'
import { MultiStoreSelector } from '@/components/multi-store-selector'
import { createClient } from '@/lib/supabase/client'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  description?: string
}

type Store = {
  id: string
  name: string
  code?: string
  city?: string
}

type DashboardContentProps = {
  totalIncome: number
  totalExpense: number
  netProfit: number
  thisMonthIncome: number
  thisMonthExpense: number
  transactions: Transaction[]
  currentStore?: Store | null
  allStores: Store[]
  selectedStores: Store[]
}

const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6']

export function DashboardContent({
  totalIncome,
  totalExpense,
  netProfit,
  thisMonthIncome,
  thisMonthExpense,
  transactions,
  currentStore,
  allStores,
  selectedStores
}: DashboardContentProps) {
  const router = useRouter()

  // Supabase Realtime 订阅 - 监听交易数据变化
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件 (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions',
        },
        () => {
          // 当数据变化时刷新页面
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // 处理店铺选择变化
  const handleStoreSelectionChange = (storeIds: string[]) => {
    if (storeIds.length === 0) {
      // 清空选择，显示全局视图
      router.push('/dashboard')
    } else if (storeIds.length === 1) {
      // 单店模式（向后兼容）
      router.push(`/dashboard?store=${storeIds[0]}`)
    } else {
      // 多店模式
      router.push(`/dashboard?stores=${storeIds.join(',')}`)
    }
  }

  // 生成带店铺参数的URL - 保持店铺上下文
  const buildUrl = (basePath: string) => {
    if (currentStore) {
      // 单店模式（从店铺详情进入）：保持 store 参数
      return `${basePath}?store=${currentStore.id}`
    }
    // 全局模式：始终使用 stores=all，确保目标页面保持全局视图
    // 注意：即使只有一家店铺，也使用 stores=all 而非 stores=<id>
    // 单店模式只能从店铺管理中心的单店"查看详情"按钮进入
    return `${basePath}?stores=all`
  }

  // 计算本月交易数量
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  // 计算最近6个月的收入和支出数据
  const monthlyData = (() => {
    const result: Array<{ month: string; 收入: number; 支出: number }> = []

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1)
      const targetMonth = targetDate.getMonth()
      const targetYear = targetDate.getFullYear()

      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.date)
        return date.getMonth() === targetMonth && date.getFullYear() === targetYear
      })

      const revenue = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      result.push({
        month: `${targetMonth + 1}月`,
        收入: revenue,
        支出: expenses
      })
    }

    return result
  })()

  // 计算本月收入分布
  const incomeDistribution = (() => {
    const incomeTransactions = thisMonthTransactions.filter(t => t.type === 'income')
    const categoryMap = new Map<string, number>()

    incomeTransactions.forEach(t => {
      const current = categoryMap.get(t.category) || 0
      categoryMap.set(t.category, current + t.amount)
    })

    const totalIncome = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0)

    return Array.from(categoryMap.entries())
      .map(([name, amount]) => ({
        name,
        value: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
  })()

  // 计算本月支出分布
  const expenseDistribution = (() => {
    const expenseTransactions = thisMonthTransactions.filter(t => t.type === 'expense')
    const categoryMap = new Map<string, number>()

    expenseTransactions.forEach(t => {
      const current = categoryMap.get(t.category) || 0
      categoryMap.set(t.category, current + t.amount)
    })

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0)

    return Array.from(categoryMap.entries())
      .map(([name, amount]) => ({
        name,
        value: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
  })()

  // 计算最近6个月的收支净额数据
  const netCashFlowData = monthlyData.map(item => ({
    month: item.month,
    收支净额: item.收入 - item.支出
  }))

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {currentStore
                ? `${currentStore.name} - 总览`
                : selectedStores.length > 1
                ? `全局总览-多店汇总统计 (${selectedStores.length}家)`
                : '全局总览'
              }
            </h1>
            <p className="text-muted-foreground">
              {currentStore
                ? `${currentStore.name}的财务概览${currentStore.city ? ` · ${currentStore.city}` : ''}`
                : selectedStores.length > 1
                ? `查看${selectedStores.map(s => s.name).join('、')}的汇总数据`
                : '欢迎回来！以下是您的财务概览。'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/stores">
              <Button variant="outline" className="gap-2">
                <ArrowUpRight className="h-4 w-4 rotate-180" />
                返回店铺管理
              </Button>
            </Link>
{/* 新增记录按钮 - 仅单店模式显示 */}
            {currentStore && (
              <Link href={`/voice-entry?store=${currentStore.id}`}>
                <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Mic className="h-4 w-4" />
                  新增记录
                </Button>
              </Link>
            )}
            <Link href={buildUrl('/settings')}>
              <Button variant="outline" size="icon" title="财务设置">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Multi-Store Selector - 仅在非单店模式下显示 */}
        {!currentStore && allStores.length > 1 && (
          <div className="max-w-md">
            <MultiStoreSelector
              stores={allStores}
              value={selectedStores.map(s => s.id)}
              onChange={handleStoreSelectionChange}
              label="选择店铺"
              placeholder="选择要查看的店铺"
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(buildUrl('/income'))}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              总收入
              <ArrowUpRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥{totalIncome.toFixed(2)}</div>
                <p className="text-xs text-primary mt-1">本月 ¥{thisMonthIncome.toFixed(2)}</p>
              </div>
              <Wallet className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(buildUrl('/expense'))}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              总支出
              <ArrowUpRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥{totalExpense.toFixed(2)}</div>
                <p className="text-xs text-destructive mt-1">本月 ¥{thisMonthExpense.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(buildUrl('/transactions'))}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              交易汇总
              <ArrowUpRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {transactions.length} 笔
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  本月 {thisMonthTransactions.length} 笔
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reports */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">财务报表</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(buildUrl('/cash-flow'))}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                现金流量表
                <ArrowUpRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-foreground">经营现金流</div>
                  <p className="text-xs text-muted-foreground mt-1">查看三大活动现金流动</p>
                </div>
                <Activity className="h-10 w-10 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(buildUrl('/profit-loss'))}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                利润表
                <ArrowUpRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-foreground">收入与成本分析</div>
                  <p className="text-xs text-muted-foreground mt-1">查看详细利润构成</p>
                </div>
                <FileText className="h-10 w-10 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">资产负债表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium text-muted-foreground">敬请期待</div>
                  <p className="text-xs text-muted-foreground mt-1">即将上线</p>
                </div>
                <BarChart3 className="h-10 w-10 text-muted-foreground/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* First Row: Revenue vs Expenses + Net Profit Trend */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Expenses Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>收入 vs 支出</CardTitle>
            <CardDescription>最近6个月的月度对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                收入: {
                  label: '收入',
                  color: '#3B82F6',
                },
                支出: {
                  label: '支出',
                  color: '#EF4444',
                },
              }}
              className="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="收入" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="支出" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Net Cash Flow Trend Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>收支净额走势</CardTitle>
            <CardDescription>收入减去支出的净现金流量变化</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                收支净额: {
                  label: '收支净额',
                  color: '#10B981',
                },
              }}
              className="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netCashFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="收支净额"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Income Distribution + Expense Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>收入分布</CardTitle>
            <CardDescription>本月按类别统计</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeDistribution.length > 0 ? (
              <>
                <ChartContainer
                  config={Object.fromEntries(
                    incomeDistribution.map((item, index) => [
                      item.name,
                      { label: item.name, color: colors[index % colors.length] }
                    ])
                  )}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incomeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {incomeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold">{data.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    金额: ¥{data.amount.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    占比: {data.value.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 space-y-2 text-sm">
                  {incomeDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                本月暂无收入记录
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>支出分布</CardTitle>
            <CardDescription>本月按类别统计</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseDistribution.length > 0 ? (
              <>
                <ChartContainer
                  config={Object.fromEntries(
                    expenseDistribution.map((item, index) => [
                      item.name,
                      { label: item.name, color: colors[index % colors.length] }
                    ])
                  )}
                  className="h-[250px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm font-semibold">{data.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    金额: ¥{data.amount.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    占比: {data.value.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4 space-y-2 text-sm">
                  {expenseDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                本月暂无支出记录
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
