'use client'

/**
 * 店铺管理中心 - 汇总卡片组件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Store as StoreIcon, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { StoreHubMetrics } from '@/lib/features/store-hub'

interface SummaryCardsProps {
  metrics: StoreHubMetrics
  startDate: string
  endDate: string
}

/**
 * 格式化金额显示
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function SummaryCards({ metrics, startDate, endDate }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 总店铺数 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <StoreIcon className="h-4 w-4" />
            总店铺数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{metrics.storeCount}</div>
          <p className="text-sm text-muted-foreground mt-1">
            {metrics.activeStoreCount} 家营业中
          </p>
        </CardContent>
      </Card>

      {/* 总计收入 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            总计收入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-green-600">
            ¥{formatCurrency(metrics.totalIncome)}
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.incomeCount} 笔 · 平均每店 ¥{formatCurrency(metrics.avgIncomePerStore)}
          </p>
          <Link href={`/income?startDate=${startDate}&endDate=${endDate}&stores=all`}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <BarChart3 className="h-4 w-4" />
              查看详细数据
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* 总计支出 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            总计支出
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold text-red-600">
            ¥{formatCurrency(metrics.totalExpense)}
          </div>
          <p className="text-sm text-muted-foreground">
            {metrics.expenseCount} 笔 · 平均每店 ¥{formatCurrency(metrics.avgExpensePerStore)}
          </p>
          <Link href={`/expense?startDate=${startDate}&endDate=${endDate}&stores=all`}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <BarChart3 className="h-4 w-4" />
              查看详细数据
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
