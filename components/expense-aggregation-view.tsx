'use client'

import { Store } from '@/lib/api/stores'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, Store as StoreIcon } from 'lucide-react'

interface StoreSummary {
  store: Store
  total: number
  count: number
  byCategory: Record<string, { count: number; amount: number }>
  transactions: any[]
}

interface ExpenseAggregationViewProps {
  storeSummaries: StoreSummary[]
  stores: Store[]
  startDate: string
  endDate: string
}

export function ExpenseAggregationView({
  storeSummaries,
  stores,
  startDate,
  endDate,
}: ExpenseAggregationViewProps) {
  // 计算总支出
  const grandTotal = storeSummaries.reduce((sum, s) => sum + s.total, 0)
  const totalCount = storeSummaries.reduce((sum, s) => sum + s.count, 0)

  // 按分类汇总全部店铺
  const allCategories: Record<string, { count: number; amount: number }> = {}
  storeSummaries.forEach((summary) => {
    Object.entries(summary.byCategory).forEach(([category, data]) => {
      if (!allCategories[category]) {
        allCategories[category] = { count: 0, amount: 0 }
      }
      allCategories[category].count += data.count
      allCategories[category].amount += data.amount
    })
  })

  // 排序店铺（按支出从高到低）
  const sortedSummaries = [...storeSummaries].sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6">
      {/* 总览卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总支出
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              ¥{grandTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {startDate} 至 {endDate}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              交易笔数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalCount}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stores.length} 家店铺
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均每店
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              ¥{stores.length > 0 ? (grandTotal / stores.length).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stores.length > 0 ? (totalCount / stores.length).toFixed(1) : '0'} 笔/店
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 分类汇总 */}
      <Card>
        <CardHeader>
          <CardTitle>分类汇总</CardTitle>
          <CardDescription>全部店铺按分类统计</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>分类</TableHead>
                <TableHead className="text-right">笔数</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead className="text-right">占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(allCategories)
                .sort(([, a], [, b]) => b.amount - a.amount)
                .map(([category, data]) => (
                  <TableRow key={category}>
                    <TableCell className="font-medium">{category}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right text-destructive">
                      ¥{data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">
                        {grandTotal > 0 ? ((data.amount / grandTotal) * 100).toFixed(1) : '0.0'}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              {Object.keys(allCategories).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 店铺排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            店铺支出排行
          </CardTitle>
          <CardDescription>按支出从高到低排序</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>排名</TableHead>
                <TableHead>店铺</TableHead>
                <TableHead className="text-right">交易笔数</TableHead>
                <TableHead className="text-right">总支出</TableHead>
                <TableHead className="text-right">占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSummaries.map((summary, index) => (
                <TableRow key={summary.store.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {index === 0 && <span className="text-xl">🥇</span>}
                      {index === 1 && <span className="text-xl">🥈</span>}
                      {index === 2 && <span className="text-xl">🥉</span>}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StoreIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{summary.store.name}</div>
                        {summary.store.city && (
                          <div className="text-xs text-muted-foreground">
                            {summary.store.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{summary.count}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    ¥{summary.total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">
                      {grandTotal > 0 ? ((summary.total / grandTotal) * 100).toFixed(1) : '0.0'}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {sortedSummaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 店铺详细分类 */}
      <Card>
        <CardHeader>
          <CardTitle>各店铺分类明细</CardTitle>
          <CardDescription>每个店铺的分类支出详情</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedSummaries.map((summary) => (
              <div key={summary.store.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{summary.store.name}</h3>
                    {summary.store.city && (
                      <Badge variant="outline" className="text-xs">
                        {summary.store.city}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-destructive">
                      ¥{summary.total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">{summary.count} 笔</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>分类</TableHead>
                      <TableHead className="text-right">笔数</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(summary.byCategory)
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .map(([category, data]) => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right text-destructive">
                            ¥{data.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    {Object.keys(summary.byCategory).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
