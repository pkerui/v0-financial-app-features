'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { getFirstDayOfMonth, getToday } from '@/lib/utils/date'
import { getFinancialSettings } from '@/lib/api/financial-settings'
import { useEffect, useState as useReactState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowUpDown, Filter, Pencil, Trash2, Download, X, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ActivityBadge } from '@/components/activity-badge'

type Transaction = {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  input_method: 'voice' | 'text' | 'manual' | null
  payment_method?: string | null
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
  transaction_nature?: 'operating' | 'non_operating' | null
  include_in_profit_loss?: boolean | null
}

type TransactionsTableAllProps = {
  transactions: Transaction[]
  initialStartDate?: string
  initialEndDate?: string
}

const categoryNames: Record<string, string> = {
  'room_revenue': '房费收入',
  'deposit': '押金收入',
  'extra_service': '额外服务',
  'other_income': '其他收入',
  'utilities': '水电费',
  'maintenance': '维修费',
  'cleaning': '清洁费',
  'supplies': '采购费',
  'labor': '人工费',
  'other_expense': '其他支出',
  // 反向映射：支持中文作为 key
  '房费收入': '房费收入',
  '押金收入': '押金收入',
  '额外服务': '额外服务',
  '其他收入': '其他收入',
  '水电费': '水电费',
  '维修费': '维修费',
  '清洁费': '清洁费',
  '采购费': '采购费',
  '人工费': '人工费',
  '其他支出': '其他支出',
}

export function TransactionsTableAll({ transactions, initialStartDate, initialEndDate }: TransactionsTableAllProps) {
  const router = useRouter()

  // 使用服务端传入的日期
  const startDate = initialStartDate || getFirstDayOfMonth()
  const endDate = initialEndDate || getToday()

  // 获取期初余额日期
  const [initialBalanceDate, setInitialBalanceDate] = useReactState<string | undefined>(undefined)

  useEffect(() => {
    getFinancialSettings().then(({ data }) => {
      if (data?.initial_balance_date) {
        setInitialBalanceDate(data.initial_balance_date)
      }
    })
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [sortField, setSortField] = useState<'date' | 'amount' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 使用统一的日期导航Hook
  const handleDateChange = useDateRangeNavigation()

  // 编辑对话框状态
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState({
    category: '',
    amount: '',
    description: '',
    date: '',
    payment_method: '',
    cash_flow_activity: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 删除确认对话框状态
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 过滤和排序
  const filteredTransactions = transactions
    .filter(t => {
      // 类型筛选 - 多选
      if (selectedTypes.length > 0 && !selectedTypes.includes(t.type)) return false
      // 分类筛选 - 多选
      if (selectedCategories.length > 0 && !selectedCategories.includes(t.category)) return false
      // 搜索筛选
      if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false
      // 日期范围筛选
      if (startDate && t.date < startDate) return false
      if (endDate && t.date > endDate) return false
      // 现金流活动筛选 - 多选
      if (selectedActivities.length > 0 && !selectedActivities.includes(t.cash_flow_activity || '')) return false
      return true
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1
      if (sortField === 'date') {
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime())
      } else if (sortField === 'amount') {
        return multiplier * (a.amount - b.amount)
      } else {
        // type sorting: income comes before expense
        return multiplier * (a.type === 'income' ? -1 : 1)
      }
    })

  // 计算统计
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netAmount = totalIncome - totalExpense

  // 获取唯一分类
  const categories = Array.from(new Set(transactions.map(t => t.category)))

  const handleSort = (field: 'date' | 'amount' | 'type') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // 录入方式中文映射
  const inputMethodNames: Record<string, string> = {
    'voice': '语音录入',
    'text': '文本录入',
    'manual': '手动录入',
  }

  const exportToCSV = () => {
    const headers = ['日期', '类型', '分类', '金额', '描述', '现金流活动', '录入方式']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('zh-CN'),
      t.type === 'income' ? '收入' : '支出',
      categoryNames[t.category] || t.category,
      t.amount.toFixed(2),
      t.description || '',
      t.cash_flow_activity === 'operating' ? '经营活动' : t.cash_flow_activity === 'investing' ? '投资活动' : t.cash_flow_activity === 'financing' ? '筹资活动' : '',
      inputMethodNames[t.input_method || ''] || t.input_method || '',
    ])

    // 添加统计行
    const statsRows = [
      ['', '', '', '', '', '', ''],
      ['总收入', '', '', totalIncome.toFixed(2), '', '', ''],
      ['总支出', '', '', totalExpense.toFixed(2), '', '', ''],
      ['净额', '', '', netAmount.toFixed(2), '', '', '']
    ]

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ...statsRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `交易汇总_${getToday()}.csv`
    link.click()
  }

  // 打开编辑对话框
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      date: transaction.date,
      payment_method: transaction.payment_method || '',
      cash_flow_activity: transaction.cash_flow_activity || '',
    })
  }

  // 提交编辑
  const handleSubmitEdit = async () => {
    if (!editingTransaction) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editForm.category,
          amount: parseFloat(editForm.amount),
          description: editForm.description || '',
          date: editForm.date,
          payment_method: editForm.payment_method || null,
          cash_flow_activity: editForm.cash_flow_activity || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '更新失败')
      }

      toast.success('记录更改成功')
      router.refresh()
      setEditingTransaction(null)
    } catch (error: any) {
      toast.error('更新失败: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deletingId) return

    try {
      const response = await fetch(`/api/transactions/${deletingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除失败')
      }

      toast.success('记录删除成功')
      router.refresh()
      setDeletingId(null)
    } catch (error: any) {
      toast.error('删除失败: ' + error.message)
    }
  }

  // 清除所有筛选
  const clearFilters = () => {
    setSelectedTypes([])
    setSelectedCategories([])
    handleDateChange(getFirstDayOfMonth(), getToday())
    setSelectedActivities([])
    setSearchTerm('')
  }

  const hasActiveFilters = selectedTypes.length > 0 || selectedCategories.length > 0 || selectedActivities.length > 0 || searchTerm !== ''

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">交易记录</CardTitle>
              <CardDescription>
                共 {filteredTransactions.length} 笔 • 收入 ¥{totalIncome.toFixed(2)} • 支出 ¥{totalExpense.toFixed(2)} • 净额 ¥{netAmount.toFixed(2)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm" className="gap-2">
                  <X className="h-4 w-4" />
                  清除筛选
                </Button>
              )}
              <Button onClick={exportToCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                导出CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索栏 */}
          <div className="mb-4">
            <Input
              placeholder="搜索描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* 表格 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* 日期列 - 包含年月筛选 */}
                  <TableHead className="w-40">
                    <div className="flex items-center gap-2">
                      <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onDateChange={handleDateChange}
                        minDate={initialBalanceDate}
                        buttonSize="sm"
                        buttonVariant="ghost"
                        buttonClassName="h-8 px-2"
                        align="start"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSort('date')}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>

                  {/* 类型列 - 包含类型筛选和排序 */}
                  <TableHead className="w-20">
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 gap-1">
                            类型
                            {selectedTypes.length > 0 && (
                              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                                {selectedTypes.length}
                              </Badge>
                            )}
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48" align="start">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">筛选类型</Label>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedTypes(['income', 'expense'])}
                                >
                                  全选
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setSelectedTypes([])}
                                >
                                  反选
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {[
                                { value: 'income', label: '收入' },
                                { value: 'expense', label: '支出' },
                              ].map(type => (
                                <div key={type.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`type-${type.value}`}
                                    checked={selectedTypes.includes(type.value)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedTypes([...selectedTypes, type.value])
                                      } else {
                                        setSelectedTypes(selectedTypes.filter(t => t !== type.value))
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`type-${type.value}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {type.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSort('type')}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableHead>

                  {/* 分类列 - 包含分类筛选 */}
                  <TableHead>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2 gap-1">
                          分类
                          {selectedCategories.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                              {selectedCategories.length}
                            </Badge>
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">筛选分类</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setSelectedCategories(categories)}
                              >
                                全选
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setSelectedCategories([])}
                              >
                                反选
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {categories.map(cat => (
                              <div key={cat} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${cat}`}
                                  checked={selectedCategories.includes(cat)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategories([...selectedCategories, cat])
                                    } else {
                                      setSelectedCategories(selectedCategories.filter(c => c !== cat))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`category-${cat}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {categoryNames[cat] || cat}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableHead>

                  {/* 金额列 */}
                  <TableHead className="w-32">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('amount')}
                      className="h-8 gap-1 px-2"
                    >
                      金额
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>

                  <TableHead>描述</TableHead>

                  {/* 现金流活动列 - 包含活动筛选 */}
                  <TableHead className="w-28">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2 gap-1">
                          现金流活动
                          {selectedActivities.length > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                              {selectedActivities.length}
                            </Badge>
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52" align="start">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">筛选活动</Label>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setSelectedActivities(['operating', 'investing', 'financing'])}
                              >
                                全选
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setSelectedActivities([])}
                              >
                                反选
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {[
                              { value: 'operating', label: '经营活动' },
                              { value: 'investing', label: '投资活动' },
                              { value: 'financing', label: '筹资活动' },
                            ].map(activity => (
                              <div key={activity.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`activity-${activity.value}`}
                                  checked={selectedActivities.includes(activity.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedActivities([...selectedActivities, activity.value])
                                    } else {
                                      setSelectedActivities(selectedActivities.filter(a => a !== activity.value))
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`activity-${activity.value}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {activity.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableHead>

                  {/* 交易性质列 */}
                  <TableHead className="w-24">交易性质</TableHead>

                  <TableHead className="w-24">录入方式</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      暂无交易记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {new Date(transaction.date).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.type === 'income' ? 'default' : 'destructive'}
                          className={transaction.type === 'income' ? 'text-xs' : 'text-xs bg-red-600 text-white hover:bg-red-700'}
                        >
                          {transaction.type === 'income' ? '收入' : '支出'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                          {categoryNames[transaction.category] || transaction.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell>
                        <ActivityBadge activity={transaction.cash_flow_activity} />
                      </TableCell>
                      <TableCell>
                        {transaction.include_in_profit_loss === false ? (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            不适用
                          </Badge>
                        ) : transaction.transaction_nature === 'non_operating' ? (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                            营业外
                          </Badge>
                        ) : transaction.transaction_nature === 'operating' ? (
                          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-800">
                            营业内
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {transaction.input_method === 'voice' && '语音'}
                          {transaction.input_method === 'manual' && '手动'}
                          {transaction.input_method === 'text' && '文本'}
                          {!transaction.input_method && '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    合计
                  </TableCell>
                  <TableCell className="font-bold">
                    <div className="flex flex-col gap-1">
                      <span className="text-green-600 text-sm">+¥{totalIncome.toFixed(2)}</span>
                      <span className="text-red-600 text-sm">-¥{totalExpense.toFixed(2)}</span>
                      <span className={`text-base ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {netAmount >= 0 ? '+' : ''}¥{netAmount.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
        <DialogContent key={editingTransaction?.id}>
          <DialogHeader>
            <DialogTitle>编辑交易记录</DialogTitle>
            <DialogDescription>
              修改交易记录的详细信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-category">分类</Label>
              <Select
                value={editForm.category}
                onValueChange={(v) => setEditForm({...editForm, category: v})}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {(editingTransaction?.type === 'income'
                    ? ['房费收入', '押金收入', '额外服务', '其他收入']
                    : ['水电费', '维修费', '清洁费', '采购费', '人工费', '其他支出']
                  ).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-amount">金额</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-date">日期</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({...editForm, date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                placeholder="可选"
              />
            </div>
            <div>
              <Label htmlFor="edit-cash-flow-activity">现金流活动</Label>
              <Select
                value={editForm.cash_flow_activity || 'operating'}
                onValueChange={(v) => setEditForm({...editForm, cash_flow_activity: v})}
              >
                <SelectTrigger id="edit-cash-flow-activity">
                  <SelectValue placeholder="选择活动类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operating">经营活动</SelectItem>
                  <SelectItem value="investing">投资活动</SelectItem>
                  <SelectItem value="financing">筹资活动</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                默认根据分类自动分配，可手动调整
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTransaction(null)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmitEdit} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
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
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
