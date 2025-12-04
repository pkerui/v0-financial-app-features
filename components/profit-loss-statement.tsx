'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Download, TrendingUp, TrendingDown, PieChart, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { ProfitLossData } from '@/lib/services/profit-loss'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getToday } from '@/lib/utils/date'

type MonthlyProfitData = {
  month: string
  revenue: number
  cost: number
  profit: number
  nonOperatingIncome: number
  nonOperatingExpense: number
  incomeTax: number
  totalIncome: number
  totalExpense: number
}

type ProfitLossStatementProps = {
  profitLossData: ProfitLossData
  monthlyData?: MonthlyProfitData[]
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
  storeId?: string
  storeIds?: string[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
}

export function ProfitLossStatement({
  profitLossData,
  monthlyData = [],
  startDate,
  endDate,
  onDateChange,
  initialBalanceDate,
  storeId,
  storeIds,
  isGlobalMode
}: ProfitLossStatementProps) {
  const [showChart, setShowChart] = useState(true)

  // 构建包含 store 参数的 URL
  const buildDetailUrl = (basePath: string) => {
    const params = new URLSearchParams()
    params.set('startDate', startDate)
    params.set('endDate', endDate)
    if (storeId) {
      params.set('store', storeId)
    } else if (storeIds && storeIds.length > 0) {
      params.set('stores', storeIds.join(','))
    } else if (isGlobalMode) {
      // 全局模式下添加 stores=all 参数，确保明细页保持全局视图
      params.set('stores', 'all')
    }
    return `${basePath}?${params.toString()}`
  }

  // 导出CSV
  const exportToCSV = () => {
    const lines: string[] = []

    // 表头
    lines.push('利润表,Profit and Loss Statement')
    lines.push(`期间:,${startDate} 至 ${endDate}`)
    lines.push('')
    lines.push('项目,行次,本期金额（元）')
    lines.push('')

    // 一、营业收入
    lines.push('一、营业收入,1,' + profitLossData.revenue.total.toFixed(2))
    profitLossData.revenue.items.forEach(item => {
      lines.push(`  ${item.category},,${item.amount.toFixed(2)}`)
    })
    lines.push('')

    // 二、营业成本
    lines.push('二、营业成本,2,' + profitLossData.cost.total.toFixed(2))
    profitLossData.cost.items.forEach(item => {
      lines.push(`  ${item.category},,${item.amount.toFixed(2)}`)
    })
    lines.push('')

    // 三、营业利润
    lines.push('三、营业利润（亏损以"-"号填列）,3,' + profitLossData.operatingProfit.toFixed(2))
    lines.push('')

    // 加：营业外收入
    lines.push('加：营业外收入,4,' + profitLossData.nonOperatingIncome.total.toFixed(2))
    if (profitLossData.nonOperatingIncome.items.length > 0) {
      profitLossData.nonOperatingIncome.items.forEach(item => {
        lines.push(`  ${item.category},,${item.amount.toFixed(2)}`)
      })
    } else {
      lines.push('  暂无数据,,-')
    }
    lines.push('')

    // 减：营业外支出
    lines.push('减：营业外支出,5,' + profitLossData.nonOperatingExpense.total.toFixed(2))
    if (profitLossData.nonOperatingExpense.items.length > 0) {
      profitLossData.nonOperatingExpense.items.forEach(item => {
        lines.push(`  ${item.category},,${item.amount.toFixed(2)}`)
      })
    } else {
      lines.push('  暂无数据,,-')
    }
    lines.push('')

    // 四、利润总额
    lines.push('四、利润总额（亏损总额以"-"号填列）,6,' + profitLossData.totalProfit.toFixed(2))
    lines.push('')

    // 减：所得税费用
    lines.push('减：所得税费用,7,' + profitLossData.incomeTax.total.toFixed(2))
    if (profitLossData.incomeTax.items.length > 0) {
      profitLossData.incomeTax.items.forEach(item => {
        lines.push(`  ${item.category},,${item.amount.toFixed(2)}`)
      })
    } else {
      lines.push('  暂无数据,,-')
    }
    lines.push('')

    // 五、净利润
    lines.push('五、净利润（净亏损以"-"号填列）,8,' + profitLossData.netProfit.toFixed(2))

    const csvContent = '\ufeff' + lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `利润表_${startDate}_${endDate}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isGlobalMode ? '合并利润表' : '利润表'}</CardTitle>
              <CardDescription>
                {isGlobalMode ? '多店铺合并损益分析' : '收入、成本及利润分析'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={onDateChange}
                minDate={initialBalanceDate}
                buttonSize="sm"
                align="start"
              />
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                导出CSV
              </Button>
              <Button
                variant={showChart ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowChart(!showChart)}
              >
                {showChart ? '隐藏图表' : '显示图表'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 汇总卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* 营业内损益卡片 */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-blue-900">营业内损益</CardTitle>
            <Link href={buildDetailUrl('/profit-loss/operating')}>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                查看明细
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 营业内收入 */}
              <div className="bg-blue-100 rounded-lg p-3 border border-blue-200">
                <div className="text-xs font-medium text-blue-700 mb-1">营业内收入</div>
                <div className="text-lg font-bold text-blue-600">
                  ¥{profitLossData.revenue.total.toFixed(2)}
                </div>
              </div>

              {/* 营业内成本 */}
              <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                <div className="text-xs font-medium text-red-700 mb-1">营业内成本</div>
                <div className="text-lg font-bold text-red-600">
                  ¥{profitLossData.cost.total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 营业利润 */}
            <div className="pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">营业利润</span>
                <span className={`text-xl font-bold ${profitLossData.operatingProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {profitLossData.operatingProfit >= 0 ? '+' : ''}¥{profitLossData.operatingProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 营业外损益卡片 */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-amber-900">营业外损益</CardTitle>
            <Link href={buildDetailUrl('/profit-loss/non-operating')}>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                查看明细
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* 营业外收入 */}
              <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                <div className="text-xs font-medium text-green-700 mb-1">营业外收入</div>
                <div className="text-lg font-bold text-green-600">
                  ¥{profitLossData.nonOperatingIncome.total.toFixed(2)}
                </div>
              </div>

              {/* 营业外支出 */}
              <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
                <div className="text-xs font-medium text-orange-700 mb-1">营业外支出</div>
                <div className="text-lg font-bold text-orange-600">
                  ¥{profitLossData.nonOperatingExpense.total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 营业外净额 */}
            <div className="pt-3 border-t border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-900">营业外净额</span>
                <span className={`text-xl font-bold ${(profitLossData.nonOperatingIncome.total - profitLossData.nonOperatingExpense.total) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {(profitLossData.nonOperatingIncome.total - profitLossData.nonOperatingExpense.total) >= 0 ? '+' : ''}¥{(profitLossData.nonOperatingIncome.total - profitLossData.nonOperatingExpense.total).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 所得税卡片 */}
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-purple-900">所得税</CardTitle>
            <Link href={buildDetailUrl('/profit-loss/income-tax')}>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                查看明细
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-purple-600">
              ¥{profitLossData.incomeTax.total.toFixed(2)}
            </div>
            {profitLossData.incomeTax.items.length > 0 ? (
              <div className="space-y-1">
                {profitLossData.incomeTax.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-purple-700">{item.category}</span>
                    <span className="text-purple-600">¥{item.amount.toFixed(2)}</span>
                  </div>
                ))}
                {profitLossData.incomeTax.items.length > 3 && (
                  <div className="text-xs text-purple-500">
                    还有 {profitLossData.incomeTax.items.length - 3} 项...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-purple-500">暂无所得税记录</div>
            )}
            <div className="pt-2 border-t border-purple-200">
              <div className="text-xs text-purple-700">
                从利润总额中扣除
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 净利润卡片 */}
        <Card className={profitLossData.netProfit >= 0 ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className={`text-base font-semibold ${profitLossData.netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              净利润
            </CardTitle>
            <Link href={buildDetailUrl('/profit-loss/all')}>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                查看明细
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`text-3xl font-bold ${profitLossData.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {profitLossData.netProfit >= 0 ? '+' : ''}¥{profitLossData.netProfit.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>利润总额：¥{profitLossData.totalProfit.toFixed(2)}</div>
              <div>减：所得税费用 ¥{profitLossData.incomeTax.total.toFixed(2)}</div>
              <div className="text-xs">= 营业利润 + 营业外净额 - 所得税</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 - 左右并排 */}
      {showChart && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 左图：月度趋势（简化版：收入 vs 支出 vs 净利润） */}
          <Card>
            <CardHeader>
              <CardTitle>月度利润构成</CardTitle>
              <CardDescription>最近6个月总收入、总支出及净利润对比</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  总收入: { label: '总收入', color: '#3B82F6' },
                  总支出: { label: '总支出', color: '#EF4444' },
                  净利润: { label: '净利润', color: '#10B981' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    // 确保始终显示6个月的数据，不足的用0填充
                    const targetLength = 6
                    let displayData = monthlyData.slice(-targetLength)

                    if (displayData.length < targetLength) {
                      const fillCount = targetLength - displayData.length
                      const fillData: MonthlyProfitData[] = []

                      for (let i = fillCount; i > 0; i--) {
                        let monthLabel = ''
                        if (displayData.length > 0) {
                          const firstMonth = displayData[0].month
                          const [year, month] = firstMonth.split('-').map(Number)
                          const date = new Date(year, month - 1 - i, 1)
                          monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        } else {
                          const now = new Date()
                          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                          monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        }

                        fillData.push({
                          month: monthLabel,
                          revenue: 0,
                          cost: 0,
                          profit: 0,
                          nonOperatingIncome: 0,
                          nonOperatingExpense: 0,
                          incomeTax: 0,
                          totalIncome: 0,
                          totalExpense: 0
                        })
                      }

                      displayData = [...fillData, ...displayData]
                    }

                    // 简化为3组柱状图：总收入、总支出、净利润
                    return displayData.map(item => ({
                      month: item.month,
                      总收入: item.totalIncome,
                      总支出: item.totalExpense,
                      净利润: item.profit
                    }))
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                    <YAxis stroke="var(--color-muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="总收入" fill="#3B82F6" name="总收入" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="总支出" fill="#EF4444" name="总支出" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="净利润" fill="#10B981" name="净利润" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 右图：累计走势（简化版） */}
          <Card>
            <CardHeader>
              <CardTitle>累计走势</CardTitle>
              <CardDescription>最近6个月的累计收入、支出及净利润趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  累计收入: { label: '累计收入', color: '#3B82F6' },
                  累计支出: { label: '累计支出', color: '#EF4444' },
                  累计净利润: { label: '累计净利润', color: '#10B981' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    const targetLength = 6
                    let displayData = monthlyData.slice(-targetLength)

                    if (displayData.length < targetLength) {
                      const fillCount = targetLength - displayData.length
                      const fillData: MonthlyProfitData[] = []

                      for (let i = fillCount; i > 0; i--) {
                        let monthLabel = ''
                        if (displayData.length > 0) {
                          const firstMonth = displayData[0].month
                          const [year, month] = firstMonth.split('-').map(Number)
                          const date = new Date(year, month - 1 - i, 1)
                          monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        } else {
                          const now = new Date()
                          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                          monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                        }

                        fillData.push({
                          month: monthLabel,
                          revenue: 0,
                          cost: 0,
                          profit: 0,
                          nonOperatingIncome: 0,
                          nonOperatingExpense: 0,
                          incomeTax: 0,
                          totalIncome: 0,
                          totalExpense: 0
                        })
                      }

                      displayData = [...fillData, ...displayData]
                    }

                    // 计算累计值
                    let cumulativeIncome = 0
                    let cumulativeExpense = 0
                    let cumulativeNetProfit = 0

                    return displayData.map(item => {
                      cumulativeIncome += item.totalIncome
                      cumulativeExpense += item.totalExpense
                      cumulativeNetProfit += item.profit

                      return {
                        month: item.month,
                        累计收入: cumulativeIncome,
                        累计支出: cumulativeExpense,
                        累计净利润: cumulativeNetProfit
                      }
                    })
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                    <YAxis stroke="var(--color-muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="累计收入"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="累计收入"
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="累计支出"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="累计支出"
                      dot={{ fill: '#EF4444', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="累计净利润"
                      stroke="#10B981"
                      strokeWidth={3}
                      name="累计净利润"
                      dot={{ fill: '#10B981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 详细利润表 */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{isGlobalMode ? '合并利润表' : '利润表'}</CardTitle>
              <CardDescription className="mt-1">
                {isGlobalMode ? 'Consolidated Profit and Loss Statement' : 'Profit and Loss Statement'}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>期间：{startDate} 至 {endDate}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-y-2 border-gray-300">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">项目</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700 w-20">行次</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700 w-48">本期金额（元）</th>
                </tr>
              </thead>
              <tbody>
                {/* 一、营业收入 */}
                <tr className="border-b border-gray-200 bg-blue-50/50">
                  <td className="py-3 px-6 font-semibold text-gray-900">一、营业收入</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600">1</td>
                  <td className="py-3 px-6 text-right font-semibold text-blue-700">
                    {profitLossData.revenue.total.toFixed(2)}
                  </td>
                </tr>
                {/* 营业收入明细 */}
                {profitLossData.revenue.items.map((item, index) => (
                  <tr key={item.category} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-6 pl-12 text-sm text-gray-600">{item.category}</td>
                    <td className="py-2.5 px-4 text-center"></td>
                    <td className="py-2.5 px-6 text-right text-sm text-gray-700">
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* 二、营业成本 */}
                <tr className="border-b border-gray-200 bg-red-50/50">
                  <td className="py-3 px-6 font-semibold text-gray-900">二、营业成本</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600">2</td>
                  <td className="py-3 px-6 text-right font-semibold text-red-700">
                    {profitLossData.cost.total.toFixed(2)}
                  </td>
                </tr>
                {/* 营业成本明细 */}
                {profitLossData.cost.items.map((item, index) => (
                  <tr key={item.category} className="border-b border-gray-100 hover:bg-red-50/30 transition-colors">
                    <td className="py-2.5 px-6 pl-12 text-sm text-gray-600">{item.category}</td>
                    <td className="py-2.5 px-4 text-center"></td>
                    <td className="py-2.5 px-6 text-right text-sm text-gray-700">
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {/* 三、营业利润 */}
                <tr className="border-y-2 border-gray-400 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <td className="py-4 px-6 font-bold text-gray-900 text-base">三、营业利润（亏损以"-"号填列）</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-gray-600">3</td>
                  <td className={`py-4 px-6 text-right font-bold text-base ${profitLossData.operatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profitLossData.operatingProfit.toFixed(2)}
                  </td>
                </tr>

                {/* 加：营业外收入 */}
                <tr className="border-b border-gray-200 bg-green-50/50">
                  <td className="py-3 px-6 font-semibold text-gray-900">加：营业外收入</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600">4</td>
                  <td className="py-3 px-6 text-right font-semibold text-emerald-700">
                    {profitLossData.nonOperatingIncome.total.toFixed(2)}
                  </td>
                </tr>
                {/* 营业外收入明细 */}
                {profitLossData.nonOperatingIncome.items.length > 0 ? (
                  profitLossData.nonOperatingIncome.items.map((item) => (
                    <tr key={item.category} className="border-b border-gray-100 hover:bg-green-50/30 transition-colors">
                      <td className="py-2.5 px-6 pl-12 text-sm text-gray-600">{item.category}</td>
                      <td className="py-2.5 px-4 text-center"></td>
                      <td className="py-2.5 px-6 text-right text-sm text-gray-700">
                        {item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-100 hover:bg-green-50/30 transition-colors">
                    <td className="py-2.5 px-6 pl-12 text-sm text-gray-400 italic">暂无数据</td>
                    <td className="py-2.5 px-4 text-center"></td>
                    <td className="py-2.5 px-6 text-right text-sm text-gray-400">-</td>
                  </tr>
                )}

                {/* 减：营业外支出 */}
                <tr className="border-b border-gray-200 bg-orange-50/50">
                  <td className="py-3 px-6 font-semibold text-gray-900">减：营业外支出</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600">5</td>
                  <td className="py-3 px-6 text-right font-semibold text-orange-700">
                    {profitLossData.nonOperatingExpense.total.toFixed(2)}
                  </td>
                </tr>
                {/* 营业外支出明细 */}
                {profitLossData.nonOperatingExpense.items.length > 0 ? (
                  profitLossData.nonOperatingExpense.items.map((item) => (
                    <tr key={item.category} className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
                      <td className="py-2.5 px-6 pl-12 text-sm text-gray-600">{item.category}</td>
                      <td className="py-2.5 px-4 text-center"></td>
                      <td className="py-2.5 px-6 text-right text-sm text-gray-700">
                        {item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-100 hover:bg-orange-50/30 transition-colors">
                    <td className="py-2.5 px-6 pl-12 text-sm text-gray-400 italic">暂无数据</td>
                    <td className="py-2.5 px-4 text-center"></td>
                    <td className="py-2.5 px-6 text-right text-sm text-gray-400">-</td>
                  </tr>
                )}

                {/* 四、利润总额 */}
                <tr className="border-y-2 border-gray-400 bg-gradient-to-r from-amber-50 to-yellow-50">
                  <td className="py-4 px-6 font-bold text-gray-900 text-base">四、利润总额（亏损总额以"-"号填列）</td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-gray-600">6</td>
                  <td className={`py-4 px-6 text-right font-bold text-base ${profitLossData.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profitLossData.totalProfit.toFixed(2)}
                  </td>
                </tr>

                {/* 减：所得税费用 */}
                <tr className="border-b border-gray-200 bg-purple-50/50">
                  <td className="py-3 px-6 font-semibold text-gray-900">减：所得税费用</td>
                  <td className="py-3 px-4 text-center text-sm text-gray-600">7</td>
                  <td className="py-3 px-6 text-right font-semibold text-purple-700">
                    {profitLossData.incomeTax.total.toFixed(2)}
                  </td>
                </tr>
                {/* 所得税费用明细 */}
                {profitLossData.incomeTax.items.length > 0 ? (
                  profitLossData.incomeTax.items.map((item) => (
                    <tr key={item.category} className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                      <td className="py-2.5 px-6 pl-12 text-sm text-gray-600">{item.category}</td>
                      <td className="py-2.5 px-4 text-center"></td>
                      <td className="py-2.5 px-6 text-right text-sm text-gray-700">
                        {item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors">
                    <td className="py-2.5 px-6 pl-12 text-sm text-gray-400 italic">暂无数据</td>
                    <td className="py-2.5 px-4 text-center"></td>
                    <td className="py-2.5 px-6 text-right text-sm text-gray-400">-</td>
                  </tr>
                )}

                {/* 五、净利润 */}
                <tr className="border-y-4 border-gray-600 bg-gradient-to-r from-emerald-100 to-green-100">
                  <td className="py-5 px-6 font-bold text-gray-900 text-lg">五、净利润（净亏损以"-"号填列）</td>
                  <td className="py-5 px-4 text-center text-sm font-bold text-gray-600">8</td>
                  <td className={`py-5 px-6 text-right font-bold text-xl ${profitLossData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {profitLossData.netProfit.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
