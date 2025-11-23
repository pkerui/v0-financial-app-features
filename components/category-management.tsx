'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Tag, Merge } from 'lucide-react'
import { toast } from 'sonner'
import {
  addTransactionCategory,
  updateTransactionCategory,
  deleteTransactionCategory,
  mergeTransactionCategories,
  getCategoryUsageCount,
  type TransactionCategory,
} from '@/lib/api/transaction-categories'
import { useRouter } from 'next/navigation'
import { sortByPinyin } from '@/lib/utils/pinyin-sort'

type CategoryManagementProps = {
  incomeCategories: TransactionCategory[]
  expenseCategories: TransactionCategory[]
}

const activityLabels = {
  operating: '经营活动',
  investing: '投资活动',
  financing: '筹资活动',
}

const activityColors = {
  operating: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  investing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  financing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}

const natureLabels = {
  operating: '营业内',
  non_operating: '营业外',
}

const natureColors = {
  operating: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  non_operating: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
}

export function CategoryManagement({ incomeCategories, expenseCategories }: CategoryManagementProps) {
  const router = useRouter()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [currentCategory, setCurrentCategory] = useState<TransactionCategory | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<TransactionCategory | null>(null)

  // 合并对话框状态
  const [mergeType, setMergeType] = useState<'income' | 'expense'>('income')
  const [sourceCategory, setSourceCategory] = useState<string>('')
  const [targetCategory, setTargetCategory] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as 'income' | 'expense',
    cash_flow_activity: 'operating' as 'operating' | 'investing' | 'financing',
    transaction_nature: 'operating' as 'operating' | 'non_operating',
    include_in_profit_loss: true,
  })

  const [usageCount, setUsageCount] = useState(0)

  // 打开添加对话框
  const handleAdd = (type: 'income' | 'expense') => {
    setCurrentCategory(null)
    setUsageCount(0)
    setFormData({
      name: '',
      type,
      cash_flow_activity: 'operating',
      transaction_nature: 'operating',
      include_in_profit_loss: true,
    })
    setEditDialogOpen(true)
  }

  // 打开编辑对话框
  const handleEdit = async (category: TransactionCategory) => {
    setCurrentCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      cash_flow_activity: category.cash_flow_activity,
      transaction_nature: category.transaction_nature || 'operating',
      include_in_profit_loss: category.include_in_profit_loss,
    })

    // 查询该分类的使用次数
    try {
      const result = await getCategoryUsageCount(category.name)
      setUsageCount(result.count || 0)
    } catch (error) {
      console.error('获取使用次数失败:', error)
      setUsageCount(0)
    }

    setEditDialogOpen(true)
  }

  // 保存（添加或编辑）
  const handleSave = async () => {
    if (!formData.name.trim() && !currentCategory?.is_system) {
      toast.error('请输入类型名称')
      return
    }

    setLoading(true)

    try {
      let result
      if (currentCategory) {
        // 编辑 - 所有分类都允许修改名称、现金流活动和是否计入利润表
        result = await updateTransactionCategory(currentCategory.id, formData)
      } else {
        // 添加
        result = await addTransactionCategory(formData)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(currentCategory ? '类型更新成功' : '类型添加成功')
        setEditDialogOpen(false)
        router.refresh()
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 打开删除确认对话框
  const handleDeleteClick = (category: TransactionCategory) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    setLoading(true)

    try {
      const result = await deleteTransactionCategory(categoryToDelete.id)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('类型删除成功')
        setDeleteDialogOpen(false)
        router.refresh()
      }
    } catch (error) {
      console.error('删除失败:', error)
      toast.error('删除失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 打开合并对话框
  const handleMergeClick = (type: 'income' | 'expense') => {
    setMergeType(type)
    setSourceCategory('')
    setTargetCategory('')
    setMergeDialogOpen(true)
  }

  // 确认合并
  const handleMergeConfirm = async () => {
    if (!sourceCategory || !targetCategory) {
      toast.error('请选择要合并的分类和目标分类')
      return
    }

    if (sourceCategory === targetCategory) {
      toast.error('源分类和目标分类不能相同')
      return
    }

    setLoading(true)

    try {
      const result = await mergeTransactionCategories(sourceCategory, targetCategory)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('分类合并成功')
        setMergeDialogOpen(false)
        router.refresh()
      }
    } catch (error) {
      console.error('合并失败:', error)
      toast.error('合并失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 渲染类型列表
  const renderCategoryList = (categories: TransactionCategory[], type: 'income' | 'expense') => {
    // 先按是否计入利润表分组，再按拼音排序
    const sortedCategories = [...categories].sort((a, b) => {
      // 第一优先级：是否计入利润表（true 在前，false 在后）
      const aInclude = a.include_in_profit_loss !== false ? 1 : 0
      const bInclude = b.include_in_profit_loss !== false ? 1 : 0
      if (bInclude !== aInclude) {
        return bInclude - aInclude
      }

      // 第二优先级：按拼音排序
      const collator = new Intl.Collator('zh-CN', {
        usage: 'sort',
        sensitivity: 'base',
        numeric: true,
      })
      return collator.compare(a.name, b.name)
    })

    return (
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-sm">分类名称</th>
              <th className="text-left py-3 px-4 font-medium text-sm">活动类型</th>
              <th className="text-left py-3 px-4 font-medium text-sm">交易性质</th>
              <th className="text-center py-3 px-4 font-medium text-sm">计入利润表</th>
              <th className="text-right py-3 px-4 font-medium text-sm">操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((category) => (
            <tr
              key={category.id}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{category.name}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge className={activityColors[category.cash_flow_activity]} variant="secondary">
                  {activityLabels[category.cash_flow_activity]}
                </Badge>
              </td>
              <td className="py-3 px-4">
                {category.include_in_profit_loss !== false ? (
                  <Badge className={natureColors[category.transaction_nature || 'operating']} variant="secondary">
                    {natureLabels[category.transaction_nature || 'operating']}
                  </Badge>
                ) : (
                  <span className="text-gray-400 dark:text-gray-600 text-sm">不适用</span>
                )}
              </td>
              <td className="py-3 px-4 text-center">
                {category.include_in_profit_loss !== false ? (
                  <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-600">-</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(category)}
                    title="编辑"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(category)}
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 收入类型 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>收入类型</CardTitle>
              <CardDescription>管理收入的分类及其现金流活动关联</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleMergeClick('income')}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={incomeCategories.length < 2}
              >
                <Merge className="h-4 w-4" />
                合并类型
              </Button>
              <Button onClick={() => handleAdd('income')} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                添加收入类型
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {incomeCategories.length > 0 ? (
            renderCategoryList(incomeCategories, 'income')
          ) : (
            <div className="text-center text-muted-foreground py-8">暂无收入类型</div>
          )}
        </CardContent>
      </Card>

      {/* 支出类型 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>支出类型</CardTitle>
              <CardDescription>管理支出的分类及其现金流活动关联</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleMergeClick('expense')}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={expenseCategories.length < 2}
              >
                <Merge className="h-4 w-4" />
                合并类型
              </Button>
              <Button onClick={() => handleAdd('expense')} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                添加支出类型
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expenseCategories.length > 0 ? (
            renderCategoryList(expenseCategories, 'expense')
          ) : (
            <div className="text-center text-muted-foreground py-8">暂无支出类型</div>
          )}
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCategory ? '编辑类型' : '添加类型'}
            </DialogTitle>
            <DialogDescription>
              {currentCategory
                ? '修改分类名称时，所有相关交易记录将自动更新'
                : '请填写类型信息'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 类型名称 - 所有分类都可以修改 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                类型名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：房租收入、水电费等"
              />
              {currentCategory?.is_system && (
                <p className="text-xs text-muted-foreground">
                  💡 提示：系统预设分类也可以修改名称
                </p>
              )}
            </div>

            {/* 现金流活动 */}
            <div className="space-y-2">
              <Label htmlFor="cash_flow_activity">
                现金流活动 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.cash_flow_activity}
                onValueChange={(value: 'operating' | 'investing' | 'financing') =>
                  setFormData({ ...formData, cash_flow_activity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operating">经营活动</SelectItem>
                  <SelectItem value="investing">投资活动</SelectItem>
                  <SelectItem value="financing">筹资活动</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                选择此类型在现金流量表中归属的活动分类
              </p>
            </div>

            {/* 计入利润表 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include_in_profit_loss"
                checked={formData.include_in_profit_loss ?? true}
                onChange={(e) => {
                  const newFormData = { ...formData, include_in_profit_loss: e.target.checked }
                  // 如果不计入利润表，设置默认的 transaction_nature
                  if (!e.target.checked) {
                    newFormData.transaction_nature = 'operating'
                  }
                  setFormData(newFormData)
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="include_in_profit_loss"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  计入利润表
                </label>
                <p className="text-xs text-muted-foreground">
                  不勾选时，该分类的交易不会影响利润表计算（例如：押金收入/退还、股东分红）
                </p>
              </div>
            </div>

            {/* 交易性质 - 仅在计入利润表时显示 */}
            {formData.include_in_profit_loss && (
              <div className="space-y-2">
                <Label htmlFor="transaction_nature">
                  交易性质 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.transaction_nature}
                  onValueChange={(value: 'operating' | 'non_operating') =>
                    setFormData({ ...formData, transaction_nature: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operating">营业内</SelectItem>
                    <SelectItem value="non_operating">营业外</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  营业内：日常经营相关的收支（如房租收入、水电费）<br/>
                  营业外：非日常经营的收支（如政府补助、所得税费用）
                </p>
              </div>
            )}

            {/* 名称修改提示 */}
            {currentCategory && usageCount > 0 && formData.name !== currentCategory.name && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ 该分类已被 <strong>{usageCount}</strong> 笔交易记录使用。
                  修改名称后，所有相关交易记录将自动更新为新名称。
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除类型「{categoryToDelete?.name}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={loading}>
              {loading ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 合并对话框 */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>合并{mergeType === 'income' ? '收入' : '支出'}类型</DialogTitle>
            <DialogDescription>
              选择要合并的分类和目标分类。源分类的所有交易记录将迁移到目标分类，源分类将被删除。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 源分类（要删除的） */}
            <div className="space-y-2">
              <Label htmlFor="source-category">
                源分类 <span className="text-destructive">*</span>
              </Label>
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择要合并的分类" />
                </SelectTrigger>
                <SelectContent>
                  {(mergeType === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                此分类将被删除，所有相关交易记录将迁移到目标分类
              </p>
            </div>

            {/* 目标分类（保留的） */}
            <div className="space-y-2">
              <Label htmlFor="target-category">
                目标分类 <span className="text-destructive">*</span>
              </Label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择保留的分类" />
                </SelectTrigger>
                <SelectContent>
                  {(mergeType === 'income' ? incomeCategories : expenseCategories)
                    .filter((cat) => cat.id !== sourceCategory)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                此分类将被保留，并接收源分类的所有交易记录
              </p>
            </div>

            {/* 警告提示 */}
            {sourceCategory && targetCategory && sourceCategory !== targetCategory && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ 警告：合并后，源分类「
                  {(mergeType === 'income' ? incomeCategories : expenseCategories).find((c) => c.id === sourceCategory)?.name}
                  」将被永久删除，此操作无法撤销！
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)} disabled={loading}>
              取消
            </Button>
            <Button onClick={handleMergeConfirm} disabled={loading || !sourceCategory || !targetCategory}>
              {loading ? '合并中...' : '确认合并'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
