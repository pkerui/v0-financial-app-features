'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
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
import { ArrowUpDown, Calendar, Filter, Pencil, Trash2, Download } from 'lucide-react'
import { getToday } from '@/lib/utils/date'

type Transaction = {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string | null
  input_method: 'voice' | 'text' | 'manual' | null
}

type TransactionsTableProps = {
  transactions: Transaction[]
  type: 'income' | 'expense'
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
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
}

export function TransactionsTable({ transactions, type, onDelete, onEdit }: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 过滤和排序
  const filteredTransactions = transactions
    .filter(t => {
      // 分类筛选
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false
      // 搜索筛选
      if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1
      if (sortField === 'date') {
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime())
      } else {
        return multiplier * (a.amount - b.amount)
      }
    })

  // 计算总计
  const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  // 获取唯一分类
  const categories = Array.from(new Set(transactions.map(t => t.category)))

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const exportToCSV = () => {
    const headers = ['日期', '分类', '金额', '描述', '录入方式']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('zh-CN'),
      categoryNames[t.category] || t.category,
      t.amount.toFixed(2),
      t.description || '',
      t.input_method || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${type === 'income' ? '收入' : '支出'}记录_${getToday()}.csv`
    link.click()
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">
              {type === 'income' ? '收入记录' : '支出记录'}
            </CardTitle>
            <CardDescription>
              共 {filteredTransactions.length} 笔，合计 ¥{total.toFixed(2)}
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选栏 */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">搜索</Label>
            <Input
              id="search"
              placeholder="搜索描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-input"
            />
          </div>
          <div className="w-48">
            <Label htmlFor="category" className="sr-only">分类</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category" className="bg-input">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="所有分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分类</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {categoryNames[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('date')}
                    className="h-8 gap-1 px-2"
                  >
                    日期
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>分类</TableHead>
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
                <TableHead className="w-24">录入方式</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无{type === 'income' ? '收入' : '支出'}记录
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        {categoryNames[transaction.category] || transaction.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      <span className={type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description || '-'}
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
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(transaction.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
