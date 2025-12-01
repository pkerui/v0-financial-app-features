'use client'

import { useState } from 'react'
import { Store } from '@/lib/api/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  Store as StoreIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Settings,
  MapPin,
  Phone,
  User,
  LayoutDashboard,
  List,
} from 'lucide-react'
import Link from 'next/link'
import { getFirstDayOfMonth, getToday } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { SummaryCards } from '@/components/store-hub/summary-cards'
import type { StoreHubMetrics, SingleStoreMetrics } from '@/lib/features/store-hub'
import type { UserRole } from '@/lib/auth/permissions'

interface StoreHubProps {
  stores: Store[]
  initialStartDate?: string
  initialEndDate?: string
  metrics?: StoreHubMetrics
  storeMetrics?: SingleStoreMetrics[]
  /** 最早店铺期初日期，用于限制日期选择器 */
  minDate?: string
  /** 用户角色 */
  userRole?: UserRole
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  closed: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<string, string> = {
  active: '营业中',
  inactive: '停业',
  preparing: '筹备中',
  closed: '已关闭',
}

// 格式化金额，负值显示为 -¥xxx
const formatAmount = (value: number, decimals: number = 2): string => {
  const absValue = Math.abs(value)
  const formatted = absValue.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return value < 0 ? `-¥${formatted}` : `¥${formatted}`
}

export function StoreHub({ stores, initialStartDate, initialEndDate, metrics, storeMetrics, minDate, userRole }: StoreHubProps) {
  // 检查用户是否可以查看全局数据（owner 和 accountant 可以）
  const canViewGlobalData = userRole === 'owner' || userRole === 'accountant'
  const [viewMode, setViewMode] = useState<'overview' | 'management'>('overview')

  // 日期状态
  const [startDate, setStartDate] = useState(initialStartDate || getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(initialEndDate || getToday())

  // 统计数据
  const activeStores = stores.filter(s => s.status === 'active')

  const router = useRouter()

  // 处理日期变化
  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)

    // 更新 URL 参数
    const params = new URLSearchParams()
    params.set('startDate', newStartDate)
    params.set('endDate', newEndDate)
    router.push(`/stores?${params.toString()}`)
  }

  // 按城市分组
  const storesByCity = stores.reduce((acc, store) => {
    const city = store.city || '未分类'
    if (!acc[city]) {
      acc[city] = []
    }
    acc[city].push(store)
    return acc
  }, {} as Record<string, Store[]>)

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <StoreIcon className="h-8 w-8" />
              店铺管理中心
            </h1>
            <p className="text-muted-foreground mt-1">
              管理和查看所有店铺的运营数据
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 日期范围选择 */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
              buttonSize="default"
              align="end"
              minDate={minDate}
            />
            <div className="border-l h-8 mx-1" />
            <Link href="/stores/settings">
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                管理设置
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 总览统计卡片 */}
      {metrics ? (
        <SummaryCards metrics={metrics} startDate={startDate} endDate={endDate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <StoreIcon className="h-4 w-4" />
                总店铺数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stores.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeStores.length} 家营业中
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                总计收入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">¥0.00</div>
              <p className="text-sm text-muted-foreground mt-1">
                加载中...
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                总计支出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">¥0.00</div>
              <p className="text-sm text-muted-foreground mt-1">
                加载中...
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 视图切换 */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'overview' | 'management')}>
        <div className="flex items-center justify-between">
          {canViewGlobalData ? (
            <TabsList className="grid grid-cols-2 w-[400px]">
              <TabsTrigger value="overview">店铺总览</TabsTrigger>
              <TabsTrigger value="management">数据汇总</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="w-[200px]">
              <TabsTrigger value="overview" className="w-full">店铺总览</TabsTrigger>
            </TabsList>
          )}
          {canViewGlobalData && (
            <Link href="/dashboard">
              <Button className="gap-2 bg-primary hover:bg-primary/90 px-8">
                <LayoutDashboard className="h-4 w-4" />
                全局总览
              </Button>
            </Link>
          )}
        </div>

        {/* 店铺总览视图 */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* 按城市分组显示 */}
          {Object.entries(storesByCity).map(([city, cityStores]) => (
            <Card key={city}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {city}
                  <Badge variant="outline" className="ml-2">
                    {cityStores.length} 家店铺
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {cityStores.map((store) => (
                    <Card key={store.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <StoreIcon className="h-5 w-5 text-primary" />
                            <div>
                              <CardTitle className="text-base">{store.name}</CardTitle>
                              {store.code && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {store.code}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={statusColors[store.status]} variant="outline">
                            {statusLabels[store.status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* 店铺信息 */}
                        <div className="space-y-2 text-sm">
                          {store.city && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="text-xs">{store.city}</span>
                            </div>
                          )}

                          {store.manager_name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span className="text-xs">{store.manager_name}</span>
                            </div>
                          )}

                          {store.manager_phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <span className="text-xs">{store.manager_phone}</span>
                            </div>
                          )}
                        </div>

                        {/* 店铺财务数据 */}
                        {(() => {
                          const storeData = storeMetrics?.find(m => m.storeId === store.id)
                          const income = storeData?.totalIncome || 0
                          const expense = storeData?.totalExpense || 0
                          const profit = storeData?.netProfit || 0
                          return (
                            <div className="border-t pt-3 space-y-2">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">期间收入</span>
                                <span className="font-semibold text-green-600">
                                  ¥{income.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">期间支出</span>
                                <span className="font-semibold text-red-600">
                                  ¥{expense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">净利润</span>
                                <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ¥{profit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          )
                        })()}

                        {/* 操作按钮 */}
                        <div className="pt-2">
                          <Link href={`/dashboard?store=${store.id}&startDate=${startDate}&endDate=${endDate}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1"
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                              查看详情
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 空状态 */}
          {stores.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <StoreIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">暂无店铺</h3>
                <p className="text-muted-foreground text-center mb-4">
                  请点击右上角"管理设置"添加店铺
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 数据汇总视图 - 仅 owner 和 accountant 可见 */}
        {canViewGlobalData && (
        <TabsContent value="management" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* 收支表汇总卡片 */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5 text-orange-600" />
                  收支表汇总
                </CardTitle>
                <CardDescription>查看所有店铺的交易明细</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">净收支</p>
                    {(() => {
                      const netAmount = (metrics?.totalIncome || 0) - (metrics?.totalExpense || 0)
                      return (
                        <p className={`text-3xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatAmount(netAmount)}
                        </p>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">总收入</p>
                      <p className="text-base font-semibold text-green-600">
                        {formatAmount(metrics?.totalIncome || 0, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">总支出</p>
                      <p className="text-base font-semibold text-red-600">
                        {formatAmount(metrics?.totalExpense || 0, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-foreground border-t pt-2">
                    共 {metrics?.totalCount || 0} 笔交易 · {activeStores.length} 家店铺
                  </div>
                  <Link href={`/transactions?stores=${activeStores.map(s => s.id).join(',')}&startDate=${startDate}&endDate=${endDate}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <BarChart3 className="h-4 w-4" />
                      查看详细数据
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 现金流汇总卡片 */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  现金流汇总
                </CardTitle>
                <CardDescription>查看所有店铺的现金流状况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">期末余额</p>
                    <p className={`text-3xl font-bold ${(metrics?.endingBalance || 0) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                      {formatAmount(metrics?.endingBalance || 0)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">经营活动</p>
                      <p className={`text-base font-semibold ${(metrics?.operatingCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(metrics?.operatingCashFlow || 0, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">投资活动</p>
                      <p className={`text-base font-semibold ${(metrics?.investingCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(metrics?.investingCashFlow || 0, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">筹资活动</p>
                      <p className={`text-base font-semibold ${(metrics?.financingCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(metrics?.financingCashFlow || 0, 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-foreground border-t pt-2">
                    期初余额: {formatAmount(metrics?.beginningBalance || 0)}
                  </div>
                  <Link href={`/cash-flow?startDate=${startDate}&endDate=${endDate}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <BarChart3 className="h-4 w-4" />
                      查看详细数据
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 利润表汇总卡片 */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  利润表汇总
                </CardTitle>
                <CardDescription>查看所有店铺的利润状况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">净利润</p>
                    <p className={`text-3xl font-bold ${(metrics?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(metrics?.netProfit || 0)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">营业内损益</p>
                      <p className={`text-base font-semibold ${(metrics?.operatingProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(metrics?.operatingProfit || 0, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">营业外损益</p>
                      {(() => {
                        const nonOperatingNet = (metrics?.nonOperatingIncome || 0) - (metrics?.nonOperatingExpense || 0)
                        return (
                          <p className={`text-base font-semibold ${nonOperatingNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatAmount(nonOperatingNet, 0)}
                          </p>
                        )
                      })()}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">所得税</p>
                      <p className="text-base font-semibold text-red-600">
                        {formatAmount(-(metrics?.incomeTax || 0), 0)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-foreground border-t pt-2">
                    营业收入: {formatAmount(metrics?.revenue || 0, 0)} · 营业成本: {formatAmount(-(metrics?.cost || 0), 0)}
                  </div>
                  <Link href={`/profit-loss?startDate=${startDate}&endDate=${endDate}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <BarChart3 className="h-4 w-4" />
                      查看详细数据
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 提示信息 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800">
                提示：点击"查看详细数据"按钮可跳转至对应的全局汇总页面，日期范围将自动同步。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
