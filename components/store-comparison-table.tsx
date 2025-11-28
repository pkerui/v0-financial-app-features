'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

type StoreComparisonTableProps = {
  transactions: Transaction[]
  stores: Store[]
  /** 表格类型：'income' 只显示收入，'expense' 只显示支出，'all' 显示全部 */
  tableType?: 'income' | 'expense' | 'all'
}

export function StoreComparisonTable({
  transactions,
  stores,
  tableType = 'all',
}: StoreComparisonTableProps) {
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

    // 转换为数组
    const data = Array.from(storeMap.entries())
      .map(([storeId, values]) => ({
        storeId,
        name: values.name,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense,
      }))
      .filter(d => d.income > 0 || d.expense > 0) // 过滤掉没有数据的店铺
      .sort((a, b) => b.net - a.net) // 按净额降序排列

    return data
  }, [transactions, stores])

  // 计算总计
  const totals = useMemo(() => {
    const income = storeData.reduce((sum, d) => sum + d.income, 0)
    const expense = storeData.reduce((sum, d) => sum + d.expense, 0)
    return { income, expense, net: income - expense }
  }, [storeData])

  // 计算百分比
  const getPercentage = (value: number, total: number) => {
    if (total === 0) return '0.0'
    return ((value / total) * 100).toFixed(1)
  }

  // 表格标题
  const tableTitle = tableType === 'income'
    ? '各店铺收入汇总'
    : tableType === 'expense'
    ? '各店铺支出汇总'
    : '各店铺收支汇总'

  if (storeData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tableTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">暂无数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{tableTitle}</CardTitle>
        <CardDescription>
          共 {storeData.length} 家店铺
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead>店铺</TableHead>
                {(tableType === 'all' || tableType === 'income') && (
                  <TableHead className="text-right">收入</TableHead>
                )}
                {(tableType === 'all' || tableType === 'income') && (
                  <TableHead className="text-right">占比</TableHead>
                )}
                {(tableType === 'all' || tableType === 'expense') && (
                  <TableHead className="text-right">支出</TableHead>
                )}
                {(tableType === 'all' || tableType === 'expense') && (
                  <TableHead className="text-right">占比</TableHead>
                )}
                {tableType === 'all' && (
                  <TableHead className="text-right">净额</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeData.map((store) => (
                <TableRow key={store.storeId}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  {(tableType === 'all' || tableType === 'income') && (
                    <TableCell className="text-right text-green-600">
                      ¥{store.income.toFixed(2)}
                    </TableCell>
                  )}
                  {(tableType === 'all' || tableType === 'income') && (
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {getPercentage(store.income, totals.income)}%
                    </TableCell>
                  )}
                  {(tableType === 'all' || tableType === 'expense') && (
                    <TableCell className="text-right text-red-600">
                      ¥{store.expense.toFixed(2)}
                    </TableCell>
                  )}
                  {(tableType === 'all' || tableType === 'expense') && (
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {getPercentage(store.expense, totals.expense)}%
                    </TableCell>
                  )}
                  {tableType === 'all' && (
                    <TableCell className={`text-right font-semibold ${store.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {store.net >= 0 ? '+' : ''}¥{store.net.toFixed(2)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">合计</TableCell>
                {(tableType === 'all' || tableType === 'income') && (
                  <TableCell className="text-right text-green-600 font-semibold">
                    ¥{totals.income.toFixed(2)}
                  </TableCell>
                )}
                {(tableType === 'all' || tableType === 'income') && (
                  <TableCell className="text-right text-muted-foreground">
                    100%
                  </TableCell>
                )}
                {(tableType === 'all' || tableType === 'expense') && (
                  <TableCell className="text-right text-red-600 font-semibold">
                    ¥{totals.expense.toFixed(2)}
                  </TableCell>
                )}
                {(tableType === 'all' || tableType === 'expense') && (
                  <TableCell className="text-right text-muted-foreground">
                    100%
                  </TableCell>
                )}
                {tableType === 'all' && (
                  <TableCell className={`text-right font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.net >= 0 ? '+' : ''}¥{totals.net.toFixed(2)}
                  </TableCell>
                )}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
