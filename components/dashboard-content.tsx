'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart3, LogOut, Mic, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const monthlyData = [
  { month: '1月', revenue: 4000, expenses: 2400, cashFlow: 1600 },
  { month: '2月', revenue: 5200, expenses: 2800, cashFlow: 2400 },
  { month: '3月', revenue: 6100, expenses: 3200, cashFlow: 2900 },
  { month: '4月', revenue: 5800, expenses: 2900, cashFlow: 2900 },
  { month: '5月', revenue: 7200, expenses: 3500, cashFlow: 3700 },
  { month: '6月', revenue: 8100, expenses: 3800, cashFlow: 4300 },
]

const categoryData = [
  { name: '水电费', value: 30 },
  { name: '维修费', value: 25 },
  { name: '清洁费', value: 20 },
  { name: '其他', value: 25 },
]

const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']

export function DashboardContent() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">总览</h1>
          <p className="text-muted-foreground">欢迎回来！以下是您的财务概览。</p>
        </div>
        <div className="flex gap-2">
          <Link href="/voice-entry">
            <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Mic className="h-4 w-4" />
              新增记录
            </Button>
          </Link>
          <Button variant="outline">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总收入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥36,400</div>
                <p className="text-xs text-primary mt-1">本月增长 +12.5%</p>
              </div>
              <Wallet className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">总支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥18,700</div>
                <p className="text-xs text-destructive mt-1">本月增长 +8.2%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">净收入</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥17,700</div>
                <p className="text-xs text-accent mt-1">本月增长 +18.3%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">现金流</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">¥4,300</div>
                <p className="text-xs text-green-600 mt-1">环比上月 +16.2%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">入住率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">87%</div>
                <p className="text-xs text-primary mt-1">环比上月增长 +5%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">87</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Revenue vs Expenses Chart */}
        <Card className="md:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>收入 vs 支出</CardTitle>
            <CardDescription>最近6个月的月度对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: '收入',
                  color: '#3B82F6', // 收入改为蓝色
                },
                expenses: {
                  label: '支出',
                  color: '#EF4444', // 支出改为红色
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[8, 8, 0, 0]} /> {/* 蓝色 */}
                  <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} /> {/* 红色 */}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>支出分布</CardTitle>
            <CardDescription>本月按类别统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                utilities: { label: '水电费', color: 'hsl(var(--color-chart-1))' },
                maintenance: { label: '维修费', color: 'hsl(var(--color-chart-2))' },
                cleaning: { label: '清洁费', color: 'hsl(var(--color-chart-3))' },
                other: { label: '其他', color: 'hsl(var(--color-chart-4))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 space-y-2 text-sm">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>收入趋势</CardTitle>
          <CardDescription>年初至今的净收入进度</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              income: {
                label: '净收入',
                color: 'hsl(var(--color-chart-2))',
              },
            }}
            className="h-[250px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--color-chart-2))"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
