'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Download, TrendingUp, TrendingDown, DollarSign, ArrowRight, Info } from 'lucide-react'
import { useState } from 'react'
import type { CashFlowData, NewStoreCapitalInvestment, ConsolidatedCashFlowData } from '@/lib/services/cash-flow'
import { activityNames } from '@/lib/cash-flow-config'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Scatter, Area, AreaChart, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { getToday } from '@/lib/utils/date'

type CashFlowStatementProps = {
  cashFlowData: CashFlowData | ConsolidatedCashFlowData
  monthlyData?: Array<{
    month: string
    operating: number
    investing: number
    financing: number
    netIncrease: number
    beginningBalance: number
    endingBalance: number
  }>
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
  initialBalanceDate?: string
  storeId?: string
  storeIds?: string[]
  /** 新店资本投入说明（仅全局模式） */
  newStoreCapitalInvestments?: NewStoreCapitalInvestment[]
  /** 是否为全局模式 */
  isGlobalMode?: boolean
  /** 已存在店铺数量（仅全局模式） */
  existingStoreCount?: number
  /** 新店数量（仅全局模式） */
  newStoreCount?: number
}

export function CashFlowStatement({
  cashFlowData,
  monthlyData = [],
  startDate,
  endDate,
  onDateChange,
  initialBalanceDate,
  storeId,
  storeIds,
  newStoreCapitalInvestments,
  isGlobalMode,
  existingStoreCount,
  newStoreCount
}: CashFlowStatementProps) {
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
    }
    return `${basePath}?${params.toString()}`
  }

  // 导出CSV
  const exportToCSV = () => {
    const lines: string[] = []

    lines.push('现金流量表')
    lines.push(`期间: ${startDate} 至 ${endDate}`)
    lines.push('')

    lines.push('一、经营活动产生的现金流量')
    lines.push('现金流入小计,' + cashFlowData.operating.subtotalInflow.toFixed(2))
    cashFlowData.operating.inflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('现金流出小计,' + cashFlowData.operating.subtotalOutflow.toFixed(2))
    cashFlowData.operating.outflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('经营活动产生的现金流量净额,' + cashFlowData.operating.netCashFlow.toFixed(2))
    lines.push('')

    lines.push('二、投资活动产生的现金流量')
    lines.push('现金流入小计,' + cashFlowData.investing.subtotalInflow.toFixed(2))
    cashFlowData.investing.inflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('现金流出小计,' + cashFlowData.investing.subtotalOutflow.toFixed(2))
    cashFlowData.investing.outflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('投资活动产生的现金流量净额,' + cashFlowData.investing.netCashFlow.toFixed(2))
    lines.push('')

    lines.push('三、筹资活动产生的现金流量')
    lines.push('现金流入小计,' + cashFlowData.financing.subtotalInflow.toFixed(2))
    cashFlowData.financing.inflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('现金流出小计,' + cashFlowData.financing.subtotalOutflow.toFixed(2))
    cashFlowData.financing.outflows.forEach(item => {
      lines.push(`  ${item.label},${item.amount.toFixed(2)}`)
    })
    lines.push('筹资活动产生的现金流量净额,' + cashFlowData.financing.netCashFlow.toFixed(2))
    lines.push('')

    lines.push('四、现金及现金等价物净增加额')
    lines.push(`期初现金余额 (${startDate}),` + cashFlowData.summary.beginningBalance.toFixed(2))
    lines.push('现金净增加额,' + cashFlowData.summary.netIncrease.toFixed(2))
    lines.push(`期末现金余额 (${endDate}),` + cashFlowData.summary.endingBalance.toFixed(2))

    const csvContent = '\ufeff' + lines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `现金流量表_${getToday()}.csv`
    link.click()
  }

  // 活动组件
  const ActivitySection = ({
    title,
    activity,
    data,
    icon: Icon
  }: {
    title: string
    activity: 'operating' | 'investing' | 'financing'
    data: CashFlowData[typeof activity]
    icon: any
  }) => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <div
              className={`text-xl font-bold ${
                data.netCashFlow >= 0 ? 'text-primary' : 'text-destructive'
              }`}
            >
              {data.netCashFlow >= 0 ? '+' : ''}¥{data.netCashFlow.toFixed(2)}
            </div>
          </div>
          <div>
            <Link href={buildDetailUrl(`/activity/${activity}`)}>
              <Button variant="ghost" size="sm" className="gap-2 text-xs h-7">
                查看明细
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 流入 */}
        {data.inflows.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">现金流入</div>
            <div className="space-y-2">
              {data.inflows.map(item => (
                <div key={item.category} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-blue-600">+¥{item.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t">
                <span>流入小计</span>
                <span className="text-blue-600">+¥{data.subtotalInflow.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 流出 */}
        {data.outflows.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">现金流出</div>
            <div className="space-y-2">
              {data.outflows.map(item => (
                <div key={item.category} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-red-600">-¥{item.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t">
                <span>流出小计</span>
                <span className="text-red-600">-¥{data.subtotalOutflow.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 如果没有数据 */}
        {data.inflows.length === 0 && data.outflows.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-4">
            本期无{activityNames[activity]}现金流
          </div>
        )}

        {/* 净现金流合计 */}
        {(data.inflows.length > 0 || data.outflows.length > 0) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold">净现金流合计</span>
              <span className={`text-xl font-bold ${data.netCashFlow >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {data.netCashFlow >= 0 ? '+' : ''}¥{data.netCashFlow.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>现金流量表</CardTitle>
              <CardDescription>展示经营、投资、筹资三大活动的现金流动情况</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={onDateChange}
                minDate={initialBalanceDate}
                align="start"
              />
              <Button onClick={() => setShowChart(!showChart)} variant="outline" size="sm">
                {showChart ? '隐藏图表' : '显示图表'}
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 汇总卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground mb-2">期初现金</div>
            <div className="text-2xl font-bold">¥{cashFlowData.summary.beginningBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {startDate}
            </p>
            {/* 全局模式说明 */}
            {isGlobalMode && existingStoreCount !== undefined && (
              <div className="mt-3 pt-3 border-t border-dashed">
                <div className="flex items-start gap-1.5 text-xs text-amber-600">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <span>仅含 {startDate} 前已开业的 {existingStoreCount} 家店铺</span>
                    {newStoreCount != null && newStoreCount > 0 && (
                      <span className="block text-muted-foreground">
                        {startDate} 至 {endDate} 新开 {newStoreCount} 家店铺的期初现金余额见「筹资活动」
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">总流入</div>
              <Link href={buildDetailUrl('/cash-flow/total-inflow')}>
                <Button variant="ghost" size="sm" className="gap-1 h-6 text-xs -mt-1 -mr-2">
                  查看明细
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              +¥{cashFlowData.summary.totalInflow.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">总流出</div>
              <Link href={buildDetailUrl('/cash-flow/total-outflow')}>
                <Button variant="ghost" size="sm" className="gap-1 h-6 text-xs -mt-1 -mr-2">
                  查看明细
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="text-2xl font-bold text-red-600">
              -¥{cashFlowData.summary.totalOutflow.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">期末现金</div>
              <Link href={buildDetailUrl('/cash-flow/ending-balance')}>
                <Button variant="ghost" size="sm" className="gap-1 h-6 text-xs -mt-1 -mr-2">
                  查看明细
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div
              className={`text-2xl font-bold ${
                cashFlowData.summary.netIncrease >= 0 ? 'text-primary' : 'text-destructive'
              }`}
            >
              ¥{cashFlowData.summary.endingBalance.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {cashFlowData.summary.netIncrease >= 0 ? '增加' : '减少'} ¥
              {Math.abs(cashFlowData.summary.netIncrease).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      {showChart && monthlyData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 左图：现金余额构成 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>现金余额构成</CardTitle>
              <CardDescription>期初余额 + 净增加额 = 期末余额</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  beginningBalance: { label: '期初余额', color: '#3B82F6' },
                  netIncrease: { label: '净增加额', color: '#10B981' },
                  endingBalance: { label: '期末余额', color: '#F59E0B' }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                    <YAxis stroke="var(--color-muted-foreground)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {/* 堆叠面积图：期初余额作为基础 */}
                    <Area
                      type="monotone"
                      dataKey="beginningBalance"
                      stackId="balance"
                      fill="#3B82F6"
                      stroke="#3B82F6"
                      name="期初余额"
                      fillOpacity={0.7}
                    />
                    {/* 堆叠面积图：净增加额堆叠在期初余额上 */}
                    <Area
                      type="monotone"
                      dataKey="netIncrease"
                      stackId="balance"
                      fill="#10B981"
                      stroke="#10B981"
                      name="净增加额"
                      fillOpacity={0.7}
                    />
                    {/* 折线图：期末余额作为验证线 */}
                    <Line
                      type="monotone"
                      dataKey="endingBalance"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      name="期末余额"
                      dot={{ fill: '#F59E0B', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 右图：活动现金流瀑布图 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>现金流量瀑布图</CardTitle>
              <CardDescription>从期初余额到期末余额的现金流变化路径</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  positive: { label: '正向流入', color: '#10B981' },
                  negative: { label: '负向流出', color: '#EF4444' },
                  total: { label: '余额', color: '#6B7280' }
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    if (!monthlyData || monthlyData.length === 0) return null

                    // 计算整个期间的累计数据
                    const firstMonth = monthlyData[0]
                    const lastMonth = monthlyData[monthlyData.length - 1]

                    const beginning = firstMonth.beginningBalance
                    const ending = lastMonth.endingBalance

                    // 累计三大活动的现金流
                    const operating = monthlyData.reduce((sum, month) => sum + month.operating, 0)
                    const investing = monthlyData.reduce((sum, month) => sum + month.investing, 0)
                    const financing = monthlyData.reduce((sum, month) => sum + month.financing, 0)

                    // 构建瀑布图数据 - 使用堆叠方式
                    let currentBalance = beginning
                    const waterfallData = []

                    // 期初余额（总额柱）
                    waterfallData.push({
                      name: '期初余额',
                      base: 0,  // 从0开始
                      value: beginning,  // 实际显示的柱子高度
                      displayValue: beginning,
                      fill: '#6B7280',
                      isTotal: true
                    })

                    // 经营活动
                    const operatingEnd = currentBalance + operating
                    waterfallData.push({
                      name: '经营活动',
                      base: Math.min(currentBalance, operatingEnd),  // 基准位置（较低的值）
                      value: Math.abs(operating),  // 柱子高度（绝对值）
                      displayValue: operating,
                      fill: operating >= 0 ? '#10B981' : '#EF4444',
                      isPositive: operating >= 0,
                      isNegative: operating < 0
                    })
                    currentBalance = operatingEnd

                    // 投资活动
                    const investingEnd = currentBalance + investing
                    waterfallData.push({
                      name: '投资活动',
                      base: Math.min(currentBalance, investingEnd),
                      value: Math.abs(investing),
                      displayValue: investing,
                      fill: investing >= 0 ? '#10B981' : '#EF4444',
                      isPositive: investing >= 0,
                      isNegative: investing < 0
                    })
                    currentBalance = investingEnd

                    // 筹资活动
                    const financingEnd = currentBalance + financing
                    waterfallData.push({
                      name: '筹资活动',
                      base: Math.min(currentBalance, financingEnd),
                      value: Math.abs(financing),
                      displayValue: financing,
                      fill: financing >= 0 ? '#10B981' : '#EF4444',
                      isPositive: financing >= 0,
                      isNegative: financing < 0
                    })
                    currentBalance = financingEnd

                    // 期末余额（总额柱）
                    waterfallData.push({
                      name: '期末余额',
                      base: 0,
                      value: ending,
                      displayValue: ending,
                      fill: '#3B82F6',
                      isTotal: true
                    })

                    return (
                      <BarChart data={waterfallData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
                        <YAxis stroke="var(--color-muted-foreground)" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload
                              return (
                                <div className="rounded-lg border bg-background p-3 shadow-sm">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm font-semibold">{data.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      金额: ¥{data.displayValue?.toFixed(2) || '0.00'}
                                    </span>
                                    {!data.isTotal && (
                                      <span className="text-xs text-muted-foreground">
                                        {data.isPositive ? '流入' : '流出'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        {/* 透明的基准柱（用于定位） */}
                        <Bar dataKey="base" stackId="waterfall" fill="#000" fillOpacity={0} />
                        {/* 实际显示的柱子 */}
                        <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 4, 4]}>
                          {waterfallData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    )
                  })()}
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 三大活动详情 */}
      <div className="grid gap-4 md:grid-cols-3">
        <ActivitySection
          title="一、经营活动"
          activity="operating"
          data={cashFlowData.operating}
          icon={DollarSign}
        />
        <ActivitySection
          title="二、投资活动"
          activity="investing"
          data={cashFlowData.investing}
          icon={TrendingUp}
        />
        <ActivitySection
          title="三、筹资活动"
          activity="financing"
          data={cashFlowData.financing}
          icon={TrendingDown}
        />
      </div>

      {/* 净增加额汇总 */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/10 to-accent/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                四、现金及现金等价物净增加额
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  期初现金余额 ({startDate}): ¥{cashFlowData.summary.beginningBalance.toFixed(2)}
                </div>
                <div
                  className={
                    cashFlowData.summary.netIncrease >= 0 ? 'text-primary font-medium' : 'text-destructive font-medium'
                  }
                >
                  现金净增加: {cashFlowData.summary.netIncrease >= 0 ? '+' : ''}¥
                  {cashFlowData.summary.netIncrease.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground mb-2">期末现金余额 ({endDate})</div>
              <div
                className={`text-3xl font-bold ${
                  cashFlowData.summary.endingBalance >= 0 ? 'text-primary' : 'text-destructive'
                }`}
              >
                ¥{cashFlowData.summary.endingBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 新店资本投入说明（仅全局模式且有新店时显示） */}
      {isGlobalMode && newStoreCapitalInvestments && newStoreCapitalInvestments.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                合并报表说明
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground space-y-3">
              <p>
                本报表为多店铺合并现金流量表。以下新开店铺的期初余额已计入
                <span className="font-medium text-amber-700 dark:text-amber-400">「筹资活动 - 新店资本投入」</span>：
              </p>
              <div className="bg-background/60 rounded-lg p-3 space-y-2">
                {newStoreCapitalInvestments.map((investment) => (
                  <div key={investment.storeId} className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="font-medium">{investment.storeName}</span>
                      <span className="text-xs text-muted-foreground">
                        (开业日期: {investment.date})
                      </span>
                    </span>
                    <span className="font-medium text-blue-600">
                      +¥{investment.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between items-center font-medium">
                  <span>新店资本投入合计</span>
                  <span className="text-blue-600">
                    +¥{newStoreCapitalInvestments.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/80 italic">
                注：新店资本投入为虚拟计算项，非实际交易记录。该金额来源于各店铺设置的期初现金余额。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
