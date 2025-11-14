'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart3, LogOut, Mic, TrendingUp, Wallet } from 'lucide-react'
import Link from 'next/link'

const monthlyData = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 5200, expenses: 2800 },
  { month: 'Mar', revenue: 6100, expenses: 3200 },
  { month: 'Apr', revenue: 5800, expenses: 2900 },
  { month: 'May', revenue: 7200, expenses: 3500 },
  { month: 'Jun', revenue: 8100, expenses: 3800 },
]

const categoryData = [
  { name: 'Utilities', value: 30 },
  { name: 'Maintenance', value: 25 },
  { name: 'Cleaning', value: 20 },
  { name: 'Other', value: 25 },
]

const colors = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']

export function DashboardContent() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/voice-entry">
            <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Mic className="h-4 w-4" />
              New Entry
            </Button>
          </Link>
          <Button variant="outline">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">$36,400</div>
                <p className="text-xs text-primary mt-1">+12.5% this month</p>
              </div>
              <Wallet className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">$18,700</div>
                <p className="text-xs text-destructive mt-1">+8.2% this month</p>
              </div>
              <BarChart3 className="h-8 w-8 text-destructive/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">$17,700</div>
                <p className="text-xs text-accent mt-1">+18.3% this month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">87%</div>
                <p className="text-xs text-primary mt-1">+5% from last month</p>
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
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly comparison for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: 'Revenue',
                  color: 'hsl(var(--color-chart-1))',
                },
                expenses: {
                  label: 'Expenses',
                  color: 'hsl(var(--color-chart-2))',
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
                  <Bar dataKey="revenue" fill="hsl(var(--color-chart-1))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--color-chart-2))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>By category this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                utilities: { label: 'Utilities', color: 'hsl(var(--color-chart-1))' },
                maintenance: { label: 'Maintenance', color: 'hsl(var(--color-chart-2))' },
                cleaning: { label: 'Cleaning', color: 'hsl(var(--color-chart-3))' },
                other: { label: 'Other', color: 'hsl(var(--color-chart-4))' },
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
          <CardTitle>Income Trend</CardTitle>
          <CardDescription>Year-to-date net income progression</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              income: {
                label: 'Net Income',
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
