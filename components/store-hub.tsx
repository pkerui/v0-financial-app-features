'use client'

import { useState } from 'react'
import { Store } from '@/lib/api/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Store as StoreIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  MapPin,
  Phone,
  User,
} from 'lucide-react'
import Link from 'next/link'

interface StoreHubProps {
  stores: Store[]
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

export function StoreHub({ stores }: StoreHubProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'management'>('overview')

  // 统计数据
  const activeStores = stores.filter(s => s.status === 'active')

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
        <div className="flex gap-3">
          <Link href="/stores/settings">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              管理设置
            </Button>
          </Link>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新增店铺
          </Button>
        </div>
      </div>

      {/* 总览统计卡片 */}
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
              本月收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">¥0.00</div>
            <p className="text-sm text-muted-foreground mt-1">
              较上月 +0.0%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              本月支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">¥0.00</div>
            <p className="text-sm text-muted-foreground mt-1">
              较上月 +0.0%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 视图切换 */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'overview' | 'management')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">店铺总览</TabsTrigger>
          <TabsTrigger value="management">数据汇总</TabsTrigger>
        </TabsList>

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

                        {/* 模拟数据卡片 - 实际数据需要后续集成 */}
                        <div className="border-t pt-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">本月收入</span>
                            <span className="font-semibold text-green-600">¥0.00</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">本月支出</span>
                            <span className="font-semibold text-red-600">¥0.00</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">净利润</span>
                            <span className="font-semibold">¥0.00</span>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1"
                            disabled
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            查看报表
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
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
                  开始添加您的第一家店铺
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  新增店铺
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 数据汇总视图 */}
        <TabsContent value="management" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 收入汇总卡片 */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  收入汇总
                </CardTitle>
                <CardDescription>查看所有店铺的收入数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">总收入</p>
                    <p className="text-3xl font-bold text-green-600">¥0.00</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">交易笔数</p>
                      <p className="font-semibold">0</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">平均每店</p>
                      <p className="font-semibold">¥0.00</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <BarChart3 className="h-4 w-4" />
                    查看详细数据
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 支出汇总卡片 */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  支出汇总
                </CardTitle>
                <CardDescription>查看所有店铺的支出数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">总支出</p>
                    <p className="text-3xl font-bold text-red-600">¥0.00</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">交易笔数</p>
                      <p className="font-semibold">0</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">平均每店</p>
                      <p className="font-semibold">¥0.00</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <BarChart3 className="h-4 w-4" />
                    查看详细数据
                  </Button>
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
                    <p className="text-sm text-muted-foreground">净现金流</p>
                    <p className="text-3xl font-bold">¥0.00</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">经营</p>
                      <p className="font-semibold">¥0</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">投资</p>
                      <p className="font-semibold">¥0</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">筹资</p>
                      <p className="font-semibold">¥0</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <BarChart3 className="h-4 w-4" />
                    查看详细数据
                  </Button>
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
                    <p className="text-3xl font-bold">¥0.00</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">营业利润</p>
                      <p className="font-semibold">¥0.00</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">利润率</p>
                      <p className="font-semibold">0.0%</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <BarChart3 className="h-4 w-4" />
                    查看详细数据
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 提示信息 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800">
                💡 <strong>提示：</strong>数据汇总功能正在开发中，目前显示的是模拟数据。
                完成后您可以在此查看所有店铺的财务报表汇总。
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
