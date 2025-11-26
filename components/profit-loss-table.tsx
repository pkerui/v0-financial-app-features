'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUpDown, Download, Edit, Trash2, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { getToday } from '@/lib/utils/date'

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  description?: string
  input_method?: string
}

type ProfitLossTableProps = {
  transactions: Transaction[]
}

// 分类名称映射
const incomeCategoryNames: Record<string, string> = {
  'room_rent': '房费收入',
  'deposit': '押金收入',
  'extra_service': '额外服务',
  'other_income': '其他收入',
}

const expenseCategoryNames: Record<string, string> = {
  'utilities': '水电费',
  'maintenance': '维修费',
  'cleaning': '清洁费',
  'purchase': '采购费',
  'labor': '人工费',
  'other_expense': '其他支出',
}


export function ProfitLossTable({ transactions }: ProfitLossTableProps) {
  const router = useRouter()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null)

  // 筛选状态
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState({ year: 'all', month: 'all', day: 'all' })

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: '',
  })

  // 获取所有年份、月份、日期用于筛选
  const filterOptions = useMemo(() => {
    const years = new Set<number>()
    const months = new Set<number>()
    const days = new Set<number>()

    transactions.forEach(t => {
      const date = new Date(t.date)
      years.add(date.getFullYear())
      months.add(date.getMonth() + 1)
      days.add(date.getDate())
    })

    return {
      years: Array.from(years).sort((a, b) => b - a),
      months: Array.from(months).sort((a, b) => a - b),
      days: Array.from(days).sort((a, b) => a - b),
    }
  }, [transactions])

  // 筛选和排序逻辑
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions]

    // 类型筛选
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    // 分类筛选
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    // 日期筛选
    if (dateFilter.year !== 'all' || dateFilter.month !== 'all' || dateFilter.day !== 'all') {
      filtered = filtered.filter(t => {
        const date = new Date(t.date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        return (
          (dateFilter.year === 'all' || year === parseInt(dateFilter.year)) &&
          (dateFilter.month === 'all' || month === parseInt(dateFilter.month)) &&
          (dateFilter.day === 'all' || day === parseInt(dateFilter.day))
        )
      })
    }

    // 排序
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === undefined || bValue === undefined) return 0

        if (sortConfig.key === 'date') {
          const dateA = new Date(aValue as string).getTime()
          const dateB = new Date(bValue as string).getTime()
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
        }

        if (sortConfig.key === 'amount') {
          return sortConfig.direction === 'asc'
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number)
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [transactions, typeFilter, categoryFilter, dateFilter, sortConfig])

  // 计算净利润
  const totalIncome = filteredAndSortedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredAndSortedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpense

  // 排序处理
  const handleSort = (key: keyof Transaction) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' }
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return null
    })
  }

  // 清除所有筛选
  const clearFilters = () => {
    setTypeFilter('all')
    setCategoryFilter('all')
    setDateFilter({ year: 'all', month: 'all', day: 'all' })
  }

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' ||
    dateFilter.year !== 'all' || dateFilter.month !== 'all' || dateFilter.day !== 'all'

  // 导出CSV
  const exportToCSV = () => {
    const headers = ['日期', '类型', '分类', '金额', '描述']
    const rows = filteredAndSortedTransactions.map(t => [
      new Date(t.date).toLocaleDateString('zh-CN'),
      t.type === 'income' ? '收入' : '支出',
      getCategoryName(t.type, t.category),
      t.amount.toFixed(2),
      t.description || '',
    ])

    // 添加合计行
    const summaryRows = [
      ['', '', '收入合计', totalIncome.toFixed(2), ''],
      ['', '', '支出合计', totalExpense.toFixed(2), ''],
      ['', '', '净利润', netProfit.toFixed(2), ''],
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      ...summaryRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `利润明细_${getToday()}.csv`
    link.click()
  }

  // 获取分类名称
  const getCategoryName = (type: 'income' | 'expense', category: string) => {
    if (type === 'income') {
      return incomeCategoryNames[category] || category
    }
    return expenseCategoryNames[category] || category
  }

  // 编辑处理
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      date: transaction.date.split('T')[0],
    })
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editForm.category,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          date: editForm.date,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新失败')
      }

      toast.success('记录更改成功')
      setEditingTransaction(null)
      router.refresh()
    } catch (error: any) {
      toast.error('更新失败: ' + error.message)
    }
  }

  // 删除处理
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除失败')
      }

      toast.success('记录删除成功')
      setDeletingId(null)
      router.refresh()
    } catch (error: any) {
      toast.error('删除失败: ' + error.message)
    }
  }

  // 获取分类选项
  const getCategoryOptions = (type: 'income' | 'expense') => {
    if (type === 'income') {
      return ['房费收入', '押金收入', '额外服务', '其他收入']
    }
    return ['水电费', '维修费', '清洁费', '采购费', '人工费', '其他支出']
  }

  // 获取所有分类用于筛选
  const allCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions.forEach(t => categories.add(t.category))
    return Array.from(categories)
  }, [transactions])

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>利润明细表</CardTitle>
              <CardDescription>查看和管理所有收入支出记录</CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  清除筛选
                </Button>
              )}
              <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <span>日期</span>
                      <div className="flex flex-col gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div>
                                <Label>年份</Label>
                                <Select value={dateFilter.year} onValueChange={(v) => setDateFilter(prev => ({ ...prev, year: v }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">全部</SelectItem>
                                    {filterOptions.years.map(year => (
                                      <SelectItem key={year} value={year.toString()}>{year}年</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>月份</Label>
                                <Select value={dateFilter.month} onValueChange={(v) => setDateFilter(prev => ({ ...prev, month: v }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">全部</SelectItem>
                                    {filterOptions.months.map(month => (
                                      <SelectItem key={month} value={month.toString()}>{month}月</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>日期</Label>
                                <Select value={dateFilter.day} onValueChange={(v) => setDateFilter(prev => ({ ...prev, day: v }))}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">全部</SelectItem>
                                    {filterOptions.days.map(day => (
                                      <SelectItem key={day} value={day.toString()}>{day}日</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('date')}>
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <span>类型</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Filter className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="space-y-2">
                            <Label>类型筛选</Label>
                            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">全部</SelectItem>
                                <SelectItem value="income">收入</SelectItem>
                                <SelectItem value="expense">支出</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <span>分类</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Filter className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48">
                          <div className="space-y-2">
                            <Label>分类筛选</Label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">全部</SelectItem>
                                {allCategories.map(cat => (
                                  <SelectItem key={cat} value={cat}>
                                    {getCategoryName(
                                      transactions.find(t => t.category === cat)?.type || 'income',
                                      cat
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <span>金额</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('amount')}>
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString('zh-CN')}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? '收入' : '支出'}
                        </span>
                      </TableCell>
                      <TableCell>{getCategoryName(transaction.type, transaction.category)}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description || '-'}</TableCell>
                      <TableCell className={`font-semibold ${
                        transaction.type === 'income' ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    收入合计
                  </TableCell>
                  <TableCell className="font-bold text-blue-600">
                    +¥{totalIncome.toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    支出合计
                  </TableCell>
                  <TableCell className="font-bold text-red-600">
                    -¥{totalExpense.toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="text-right font-bold text-lg">
                    净利润
                  </TableCell>
                  <TableCell className={`font-bold text-lg ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : '-'}¥{Math.abs(netProfit).toFixed(2)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑记录</DialogTitle>
            <DialogDescription>修改交易记录信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <div className="text-sm text-muted-foreground">
                {editingTransaction?.type === 'income' ? '收入' : '支出'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editingTransaction && getCategoryOptions(editingTransaction.type).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransaction(null)}>
              取消
            </Button>
            <Button onClick={handleSaveEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。确定要删除这条记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
