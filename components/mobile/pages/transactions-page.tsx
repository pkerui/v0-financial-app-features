'use client'

import { useState, useEffect, useCallback } from 'react'
import { MobileLayout, MobileContainer, MobileCard } from '../mobile-layout'
import { Store as StoreIcon, ChevronDown, Check, Loader2, Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteTransaction, updateTransaction } from '@/lib/api/transactions'
import { useRouter } from 'next/navigation'
import type { Store } from '@/lib/api/stores'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  date: string
  store_id?: string
  created_by?: string
  cash_flow_activity?: string
  transaction_nature?: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  cash_flow_activity: string
  transaction_nature?: string
}

interface MobileTransactionsPageProps {
  stores: Store[]
  categories: Category[]
  userRole: string
  managedStoreIds: string[]
}

export function MobileTransactionsPage({
  stores,
  categories,
  userRole,
  managedStoreIds,
}: MobileTransactionsPageProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [showStoreSelector, setShowStoreSelector] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const pageSize = 20

  // 根据权限确定可访问的店铺
  const accessibleStores = userRole === 'owner' || userRole === 'accountant'
    ? stores
    : stores.filter(s => managedStoreIds.includes(s.id))

  // 初始化：默认全选可访问的店铺（仅首次加载时执行）
  useEffect(() => {
    if (!isInitialized && accessibleStores.length > 0) {
      setSelectedStoreIds(accessibleStores.map(s => s.id))
      setIsInitialized(true)
    }
  }, [accessibleStores, isInitialized])

  // 获取交易记录
  const fetchTransactions = useCallback(async () => {
    if (selectedStoreIds.length === 0) return

    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((currentPage - 1) * pageSize),
      })

      // 如果不是全选，添加店铺筛选
      if (selectedStoreIds.length < accessibleStores.length) {
        params.append('store_ids', selectedStoreIds.join(','))
      }

      const response = await fetch(`/api/transactions?${params.toString()}`)
      const data = await response.json()

      if (data.data) {
        // 客户端过滤（确保只显示有权限的店铺数据）
        const filtered = data.data.filter((t: Transaction) =>
          !t.store_id || selectedStoreIds.includes(t.store_id)
        )
        setTransactions(filtered)
        setTotalCount(data.count || 0)
      }
    } catch (err) {
      console.error('获取交易记录失败:', err)
      setError('获取数据失败')
    } finally {
      setIsLoading(false)
    }
  }, [selectedStoreIds, currentPage, accessibleStores.length])

  useEffect(() => {
    if (selectedStoreIds.length > 0) {
      fetchTransactions()
    } else {
      // 清空选择时重置数据
      setTransactions([])
      setTotalCount(0)
      setIsLoading(false)
    }
  }, [selectedStoreIds, fetchTransactions])

  // 删除交易
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return

    setIsDeleting(id)
    try {
      const result = await deleteTransaction(id)
      if (result.error) {
        setError(result.error)
      } else {
        setTransactions(prev => prev.filter(t => t.id !== id))
        router.refresh()
      }
    } catch {
      setError('删除失败')
    } finally {
      setIsDeleting(null)
    }
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTransaction) return

    setIsSaving(true)
    setError('')
    try {
      // 获取分类对应的 cash_flow_activity
      const selectedCategory = categories.find(c => c.name === editingTransaction.category)

      const result = await updateTransaction(editingTransaction.id, {
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        category: editingTransaction.category,
        date: editingTransaction.date,
        cash_flow_activity: selectedCategory?.cash_flow_activity || editingTransaction.cash_flow_activity,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setTransactions(prev =>
          prev.map(t => t.id === editingTransaction.id ? editingTransaction : t)
        )
        setEditingTransaction(null)
        router.refresh()
      }
    } catch {
      setError('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 格式化现金流活动
  const formatCashFlowActivity = (activity?: string) => {
    const map: Record<string, string> = {
      operating: '经营',
      investing: '投资',
      financing: '筹资',
    }
    return map[activity || ''] || '-'
  }

  // 格式化交易性质
  const formatTransactionNature = (nature?: string) => {
    const map: Record<string, string> = {
      operating: '营业内',
      non_operating: '营业外',
      income_tax: '所得税',
    }
    return map[nature || ''] || '-'
  }

  // 切换店铺选择
  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      if (prev.includes(storeId)) {
        return prev.filter(id => id !== storeId)
      } else {
        return [...prev, storeId]
      }
    })
    setCurrentPage(1)
  }

  // 全选
  const selectAll = () => {
    setSelectedStoreIds(accessibleStores.map(s => s.id))
    setCurrentPage(1)
  }

  // 全不选
  const deselectAll = () => {
    setSelectedStoreIds([])
    setCurrentPage(1)
  }

  // 反选
  const invertSelection = () => {
    const inverted = accessibleStores.filter(s => !selectedStoreIds.includes(s.id)).map(s => s.id)
    // 如果反选后为空，则全选
    if (inverted.length === 0) {
      setSelectedStoreIds(accessibleStores.map(s => s.id))
    } else {
      setSelectedStoreIds(inverted)
    }
    setCurrentPage(1)
  }

  const getSelectedStoresText = () => {
    if (selectedStoreIds.length === 0) {
      return '未选择店铺'
    }
    if (selectedStoreIds.length === accessibleStores.length) {
      return '全部店铺'
    }
    if (selectedStoreIds.length === 1) {
      const store = accessibleStores.find(s => s.id === selectedStoreIds[0])
      return store?.name || '选择店铺'
    }
    return `已选 ${selectedStoreIds.length} 个店铺`
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <MobileLayout title="财务记录管理">
      <MobileContainer className="space-y-4">
        {/* 店铺选择器 */}
        {accessibleStores.length > 1 && (
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

            {showStoreSelector && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 overflow-hidden max-h-80 overflow-y-auto">
                {/* 快捷操作按钮 */}
                <div className="flex gap-2 p-2 border-b bg-muted/30">
                  <button
                    onClick={selectAll}
                    className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-colors ${
                      selectedStoreIds.length === accessibleStores.length
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
                {accessibleStores.map((store) => (
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
        {accessibleStores.length === 1 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{accessibleStores[0].name}</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <MobileCard className="bg-red-50 border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </MobileCard>
        )}

        {/* 加载中 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <MobileCard>
            <p className="text-center text-muted-foreground py-8">暂无交易记录</p>
          </MobileCard>
        ) : (
          <>
            {/* 交易列表 */}
            <div className="space-y-2">
              {transactions.map((t) => {
                const storeName = stores.find(s => s.id === t.store_id)?.name

                return (
                  <MobileCard key={t.id} className="relative">
                    {editingTransaction?.id === t.id ? (
                      // 编辑模式
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.type === 'income' ? '收入' : '支出'}
                          </span>
                          <button
                            onClick={() => setEditingTransaction(null)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">分类</label>
                          <select
                            value={editingTransaction.category}
                            onChange={(e) => {
                              const newCategory = e.target.value
                              const selectedCat = categories.find(c => c.name === newCategory)
                              setEditingTransaction({
                                ...editingTransaction,
                                category: newCategory,
                                cash_flow_activity: selectedCat?.cash_flow_activity || editingTransaction.cash_flow_activity,
                                transaction_nature: selectedCat?.transaction_nature || editingTransaction.transaction_nature,
                              })
                            }}
                            className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                          >
                            {categories
                              .filter(c => c.type === editingTransaction.type)
                              .map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))
                            }
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">金额</label>
                          <input
                            type="number"
                            value={editingTransaction.amount}
                            onChange={(e) => setEditingTransaction({
                              ...editingTransaction,
                              amount: parseFloat(e.target.value) || 0
                            })}
                            className="w-full mt-1 px-3 py-2 border rounded-md text-lg font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">日期</label>
                          <input
                            type="date"
                            value={editingTransaction.date}
                            onChange={(e) => setEditingTransaction({
                              ...editingTransaction,
                              date: e.target.value
                            })}
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">备注</label>
                          <input
                            type="text"
                            value={editingTransaction.description || ''}
                            onChange={(e) => setEditingTransaction({
                              ...editingTransaction,
                              description: e.target.value
                            })}
                            className="w-full mt-1 px-3 py-2 border rounded-md"
                            placeholder="备注说明"
                          />
                        </div>

                        {/* 现金流活动和交易性质 - 只读显示 */}
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground">现金流活动</label>
                            <div className="mt-1 px-3 py-2 border rounded-md bg-muted/50">
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                editingTransaction.cash_flow_activity === 'operating' ? 'bg-blue-100 text-blue-700' :
                                editingTransaction.cash_flow_activity === 'investing' ? 'bg-orange-100 text-orange-700' :
                                editingTransaction.cash_flow_activity === 'financing' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {formatCashFlowActivity(editingTransaction.cash_flow_activity)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground">交易性质</label>
                            <div className="mt-1 px-3 py-2 border rounded-md bg-muted/50">
                              <span className={`text-sm px-2 py-0.5 rounded ${
                                editingTransaction.transaction_nature === 'operating' ? 'bg-sky-100 text-sky-700' :
                                editingTransaction.transaction_nature === 'non_operating' ? 'bg-amber-100 text-amber-700' :
                                editingTransaction.transaction_nature === 'income_tax' ? 'bg-violet-100 text-violet-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {formatTransactionNature(editingTransaction.transaction_nature)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">
                          由分类自动决定，修改分类后自动更新
                        </p>

                        <Button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="w-full"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              保存中...
                            </>
                          ) : '保存修改'}
                        </Button>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {t.type === 'income' ? '收入' : '支出'}
                            </span>
                            <span className="font-medium text-sm">{t.category}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.description || '-'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>{formatDate(t.date)}</span>
                            {storeName && <span>· {storeName}</span>}
                            {/* 现金流活动 */}
                            <span className={`px-1.5 py-0.5 rounded ${
                              t.cash_flow_activity === 'operating' ? 'bg-blue-50 text-blue-600' :
                              t.cash_flow_activity === 'investing' ? 'bg-orange-50 text-orange-600' :
                              t.cash_flow_activity === 'financing' ? 'bg-purple-50 text-purple-600' :
                              'bg-gray-50 text-gray-500'
                            }`}>
                              {formatCashFlowActivity(t.cash_flow_activity)}
                            </span>
                            {/* 交易性质 */}
                            <span className={`px-1.5 py-0.5 rounded ${
                              t.transaction_nature === 'operating' ? 'bg-sky-50 text-sky-600' :
                              t.transaction_nature === 'non_operating' ? 'bg-amber-50 text-amber-600' :
                              t.transaction_nature === 'income_tax' ? 'bg-violet-50 text-violet-600' :
                              'bg-gray-50 text-gray-500'
                            }`}>
                              {formatTransactionNature(t.transaction_nature)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <p className={`text-lg font-bold ${
                            t.type === 'income' ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                          </p>

                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingTransaction(t)}
                              className="p-2 rounded hover:bg-muted transition-colors"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={isDeleting === t.id}
                              className="p-2 rounded hover:bg-red-50 transition-colors"
                            >
                              {isDeleting === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-500" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </MobileCard>
                )
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </MobileContainer>
    </MobileLayout>
  )
}
