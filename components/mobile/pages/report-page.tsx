'use client'

import { useState, useEffect, useCallback } from 'react'
import { MobileLayout, MobileContainer, MobileCard } from '../mobile-layout'
import { TrendingUp, TrendingDown, Calendar, Store as StoreIcon, ChevronDown, Check, Loader2, Monitor } from 'lucide-react'
import type { Store } from '@/lib/api/stores'

type Period = 'today' | 'week' | 'month'

interface ReportData {
  income: number
  expense: number
  net: number
}

interface MobileReportPageProps {
  stores: Store[]
}

// 获取日期范围
function getDateRange(period: Period) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (period === 'today') {
    return { startDate: today, endDate: today }
  }

  if (period === 'week') {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    return {
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: today,
    }
  }

  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: today,
  }
}

/**
 * 移动端报表页 - 支持店铺筛选
 */
export function MobileReportPage({ stores }: MobileReportPageProps) {
  const [period, setPeriod] = useState<Period>('today')
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [showStoreSelector, setShowStoreSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<Record<Period, ReportData>>({
    today: { income: 0, expense: 0, net: 0 },
    week: { income: 0, expense: 0, net: 0 },
    month: { income: 0, expense: 0, net: 0 },
  })

  // 初始化：默认全选店铺
  useEffect(() => {
    if (stores.length > 0) {
      setSelectedStoreIds(stores.map(s => s.id))
    }
  }, [stores])

  // 获取报表数据
  const fetchReportData = useCallback(async () => {
    setIsLoading(true)
    try {
      const periods: Period[] = ['today', 'week', 'month']
      const results: Record<Period, ReportData> = {
        today: { income: 0, expense: 0, net: 0 },
        week: { income: 0, expense: 0, net: 0 },
        month: { income: 0, expense: 0, net: 0 },
      }

      for (const p of periods) {
        const range = getDateRange(p)

        // 构建查询参数
        const params = new URLSearchParams({
          start_date: range.startDate,
          end_date: range.endDate,
        })

        // 如果不是全选，添加店铺筛选
        if (selectedStoreIds.length > 0 && selectedStoreIds.length < stores.length) {
          params.append('store_ids', selectedStoreIds.join(','))
        } else if (selectedStoreIds.length === 1) {
          params.append('store_id', selectedStoreIds[0])
        }

        const response = await fetch(`/api/transactions?${params.toString()}`)
        const data = await response.json()

        if (data.data) {
          const transactions = data.data as Array<{ type: string; amount: number; store_id?: string }>

          // 客户端过滤（如果API不支持多店铺筛选）
          const filteredTx = selectedStoreIds.length === stores.length
            ? transactions
            : transactions.filter(t => t.store_id && selectedStoreIds.includes(t.store_id))

          const income = filteredTx
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0)
          const expense = filteredTx
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0)

          results[p] = {
            income,
            expense,
            net: income - expense,
          }
        }
      }

      setReportData(results)
    } catch (error) {
      console.error('获取报表数据失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedStoreIds, stores.length])

  // 店铺选择变化时重新获取数据
  useEffect(() => {
    if (selectedStoreIds.length > 0) {
      fetchReportData()
    } else {
      // 清空选择时重置数据
      setReportData({
        today: { income: 0, expense: 0, net: 0 },
        week: { income: 0, expense: 0, net: 0 },
        month: { income: 0, expense: 0, net: 0 },
      })
      setIsLoading(false)
    }
  }, [selectedStoreIds, fetchReportData])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const periodLabels: Record<Period, string> = {
    today: '今日',
    week: '本周',
    month: '本月',
  }

  const data = reportData[period]

  // 切换店铺选择
  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      if (prev.includes(storeId)) {
        return prev.filter(id => id !== storeId)
      } else {
        return [...prev, storeId]
      }
    })
  }

  // 全选
  const selectAll = () => {
    setSelectedStoreIds(stores.map(s => s.id))
  }

  // 全不选
  const deselectAll = () => {
    setSelectedStoreIds([])
  }

  // 反选
  const invertSelection = () => {
    const inverted = stores.filter(s => !selectedStoreIds.includes(s.id)).map(s => s.id)
    // 如果反选后为空，则全选
    if (inverted.length === 0) {
      setSelectedStoreIds(stores.map(s => s.id))
    } else {
      setSelectedStoreIds(inverted)
    }
  }

  // 获取选中店铺的显示文本
  const getSelectedStoresText = () => {
    if (selectedStoreIds.length === 0) {
      return '未选择店铺'
    }
    if (selectedStoreIds.length === stores.length) {
      return '全部店铺'
    }
    if (selectedStoreIds.length === 1) {
      const store = stores.find(s => s.id === selectedStoreIds[0])
      return store?.name || '选择店铺'
    }
    return `已选 ${selectedStoreIds.length} 个店铺`
  }

  return (
    <MobileLayout title="收支报表">
      <MobileContainer className="space-y-4">
        {/* 店铺选择器 - 多店铺时显示 */}
        {stores.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowStoreSelector(!showStoreSelector)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{getSelectedStoresText()}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showStoreSelector ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉选择器 */}
            {showStoreSelector && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 overflow-hidden max-h-80 overflow-y-auto">
                {/* 快捷操作按钮 */}
                <div className="flex gap-2 p-2 border-b bg-muted/30">
                  <button
                    onClick={selectAll}
                    className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                      selectedStoreIds.length === stores.length
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted border'
                    }`}
                  >
                    全选
                  </button>
                  <button
                    onClick={invertSelection}
                    className="flex-1 py-1.5 px-2 text-xs rounded-md bg-background hover:bg-muted border transition-colors"
                  >
                    反选
                  </button>
                  <button
                    onClick={deselectAll}
                    className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                      selectedStoreIds.length === 0
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-background hover:bg-muted border'
                    }`}
                  >
                    清空
                  </button>
                </div>

                {/* 店铺列表 */}
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => toggleStore(store.id)}
                    className={`w-full flex items-center gap-2 p-3 text-left hover:bg-muted transition-colors ${
                      selectedStoreIds.includes(store.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`h-4 w-4 border rounded flex items-center justify-center ${
                      selectedStoreIds.includes(store.id) ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {selectedStoreIds.includes(store.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm">{store.name}</span>
                  </button>
                ))}

                {/* 确认按钮 */}
                <div className="p-2 border-t">
                  <button
                    onClick={() => setShowStoreSelector(false)}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 单店铺显示 */}
        {stores.length === 1 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{stores[0].name}</span>
          </div>
        )}

        {/* 时间段切换 */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* 标题 */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{periodLabels[period]}收支汇总</span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>

        {/* 收入卡片 */}
        <MobileCard className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">收入</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatAmount(data.income)}
                </p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* 支出卡片 */}
        <MobileCard className="bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-red-500">支出</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatAmount(data.expense)}
                </p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* 净额卡片 */}
        <MobileCard className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">净额</p>
            <p className={`text-3xl font-bold ${data.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {data.net >= 0 ? '+' : ''}{formatAmount(data.net)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              收入 - 支出 = 净额
            </p>
          </div>
        </MobileCard>

        {/* 电脑版提示 */}
        <MobileCard className="bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Monitor className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-700 font-medium">更多报表及设置</p>
              <p className="text-xs text-blue-600 mt-0.5">
                请在电脑端查看完整的报表功能、现金流量表、利润表等
              </p>
            </div>
          </div>
        </MobileCard>
      </MobileContainer>
    </MobileLayout>
  )
}
