'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Transaction = {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  store_id?: string | null
}

type Store = {
  id: string
  name: string
  code?: string | null
}

type StoreComparisonChartProps = {
  transactions: Transaction[]
  stores: Store[]
  /** 图表类型：'income' 只显示收入，'expense' 只显示支出，'all' 显示净额 */
  chartType?: 'income' | 'expense' | 'all'
  /** 日期范围描述 */
  dateRangeLabel?: string
}

// 店铺颜色配置
const STORE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
]

export function StoreComparisonChart({
  transactions,
  stores,
  chartType = 'all',
  dateRangeLabel,
}: StoreComparisonChartProps) {
  // 计算各店铺数据
  const storeData = useMemo(() => {
    const storeMap = new Map<string, { income: number; expense: number; name: string }>()

    // 初始化所有店铺
    stores.forEach(store => {
      storeMap.set(store.id, { income: 0, expense: 0, name: store.name })
    })

    // 累计交易金额
    transactions.forEach(t => {
      if (!t.store_id) return
      const store = storeMap.get(t.store_id)
      if (store) {
        if (t.type === 'income') {
          store.income += t.amount
        } else {
          store.expense += t.amount
        }
      }
    })

    // 转换为数组并计算百分比
    const data = Array.from(storeMap.entries())
      .map(([storeId, values], index) => {
        let value = 0
        if (chartType === 'income') {
          value = values.income
        } else if (chartType === 'expense') {
          value = values.expense
        } else {
          value = values.income - values.expense
        }

        return {
          storeId,
          name: values.name,
          value: Math.abs(value), // 饼图使用绝对值
          rawValue: value, // 保留原始值用于显示
          income: values.income,
          expense: values.expense,
          color: STORE_COLORS[index % STORE_COLORS.length],
        }
      })
      .filter(d => d.value > 0) // 过滤掉没有数据的店铺
      .sort((a, b) => b.value - a.value)

    // 计算总额和百分比
    const total = data.reduce((sum, d) => sum + d.value, 0)
    return data.map(d => ({
      ...d,
      percentage: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
    }))
  }, [transactions, stores, chartType])

  // 计算总计
  const totals = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    return { income, expense, net: income - expense }
  }, [transactions])

  // 图表标题
  const chartTitle = chartType === 'income'
    ? '收入占比'
    : chartType === 'expense'
    ? '支出占比'
    : '净额占比'

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-2">{data.name}</p>
          {chartType === 'all' ? (
            <>
              <p className="text-green-600">收入: ¥{data.income.toFixed(2)}</p>
              <p className="text-red-600">支出: ¥{data.expense.toFixed(2)}</p>
              <p className={data.rawValue >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                净额: {data.rawValue >= 0 ? '+' : ''}¥{data.rawValue.toFixed(2)}
              </p>
            </>
          ) : chartType === 'income' ? (
            <p className="text-green-600">收入: ¥{data.income.toFixed(2)}</p>
          ) : (
            <p className="text-red-600">支出: ¥{data.expense.toFixed(2)}</p>
          )}
          <p className="text-muted-foreground mt-1">占比: {data.percentage}%</p>
        </div>
      )
    }
    return null
  }

  // 自定义 Legend
  const renderLegend = () => {
    return (
      <div className="flex flex-col gap-3 text-sm">
        {storeData.map((entry, index) => (
          <div key={entry.storeId} className="flex items-center gap-3">
            {/* 颜色标识 */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            {/* 店铺名称 */}
            <span className="flex-1 truncate">{entry.name}</span>
            {/* 金额 - 固定宽度右对齐 */}
            <span className="font-medium tabular-nums w-24 text-right">
              ¥{chartType === 'income'
                ? entry.income.toFixed(2)
                : chartType === 'expense'
                ? entry.expense.toFixed(2)
                : entry.rawValue.toFixed(2)
              }
            </span>
            {/* 百分比 - 固定宽度右对齐 */}
            <span className="text-muted-foreground tabular-nums w-12 text-right">
              {entry.percentage}%
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (storeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{chartTitle}</CardTitle>
          {dateRangeLabel && (
            <CardDescription>{dateRangeLabel}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height: '280px', minHeight: '280px' }}>
          <p className="text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
        {dateRangeLabel && (
          <CardDescription>{dateRangeLabel}</CardDescription>
        )}
        <div className="flex gap-4 text-sm pt-2">
          {chartType === 'income' ? (
            <span className="text-green-600 font-medium">
              总收入: ¥{totals.income.toFixed(2)}
            </span>
          ) : chartType === 'expense' ? (
            <span className="text-red-600 font-medium">
              总支出: ¥{totals.expense.toFixed(2)}
            </span>
          ) : (
            <>
              <span className="text-green-600">
                总收入: ¥{totals.income.toFixed(2)}
              </span>
              <span className="text-red-600">
                总支出: ¥{totals.expense.toFixed(2)}
              </span>
              <span className={totals.net >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                净额: {totals.net >= 0 ? '+' : ''}¥{totals.net.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* 饼图 */}
          <div className="w-full lg:w-1/2" style={{ height: '280px', minHeight: '280px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={storeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {storeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 图例列表 */}
          <div className="w-full lg:w-1/2">
            {renderLegend()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
