'use client'

import { useState, useRef, useEffect } from 'react'
import { MobileLayout, MobileContainer, MobileCard } from '../mobile-layout'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Keyboard, Send, Loader2, Check, X, Plus, Store as StoreIcon, ChevronDown, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { startTencentASR } from '@/lib/utils/tencent-asr'
import { createTransaction } from '@/lib/backend/transactions'
import { useRouter } from 'next/navigation'
import { getToday } from '@/lib/utils/date'
import type { TransactionCategory } from '@/lib/backend/categories'
import type { Store } from '@/lib/backend/stores'

interface ParsedTransaction {
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string
  cash_flow_activity?: string
}

interface MobileRecordPageProps {
  incomeCategories: TransactionCategory[]
  expenseCategories: TransactionCategory[]
  stores: Store[]
}

// 辅助函数：获取分类的现金流活动类型（兼容 snake_case 和 camelCase）
function getCategoryActivity(category: TransactionCategory | any): string {
  return category.cash_flow_activity || category.cashFlowActivity || 'operating'
}

/**
 * 移动端记账页面组件
 */
export function MobileRecordPage({
  incomeCategories,
  expenseCategories,
  stores,
}: MobileRecordPageProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'voice' | 'text'>('voice')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState('')
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const stopRecognitionRef = useRef<(() => void) | null>(null)

  // 智能店铺选择：单店铺自动选择，多店铺需要用户选择
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [showStoreSelector, setShowStoreSelector] = useState(false)

  // 初始化店铺选择
  useEffect(() => {
    if (stores.length === 1) {
      // 单店铺自动选择
      setSelectedStoreId(stores[0].id)
    } else if (stores.length > 1) {
      // 多店铺：默认选择第一个，但显示选择器
      setSelectedStoreId(stores[0].id)
    }
  }, [stores])

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  // 开始录音
  const handleStartRecording = () => {
    setError('')
    setVoiceText('')
    setParsedTransactions([])

    const stop = startTencentASR(
      (text, isFinal) => {
        setVoiceText(text)
        if (isFinal && text.trim()) {
          handleParseText(text)
        }
      },
      (err) => {
        setError(err)
        setIsRecording(false)
      }
    )

    stopRecognitionRef.current = stop
    setIsRecording(true)
  }

  // 停止录音
  const handleStopRecording = () => {
    if (stopRecognitionRef.current) {
      stopRecognitionRef.current()
      stopRecognitionRef.current = null
    }
    setIsRecording(false)
  }

  // 解析文本
  const handleParseText = async (text: string) => {
    if (!text.trim()) {
      setError('请输入或说出交易内容')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/parse-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          incomeCategories: incomeCategories.map(c => ({ name: c.name, activity: getCategoryActivity(c) })),
          expenseCategories: expenseCategories.map(c => ({ name: c.name, activity: getCategoryActivity(c) })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'AI 解析失败')
        return
      }

      if (data.transactions && data.transactions.length > 0) {
        setParsedTransactions(data.transactions)
      } else {
        setError('未能识别出交易记录，请重新输入')
      }
    } catch {
      setError('解析失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  // 保存交易
  const handleSave = async () => {
    if (parsedTransactions.length === 0) return

    // 验证店铺选择
    if (!selectedStoreId) {
      setError('请先选择店铺')
      return
    }

    setIsSaving(true)
    setError('')
    let successCount = 0

    try {
      for (const t of parsedTransactions) {
        await createTransaction({
          type: t.type,
          category: t.category,
          amount: t.amount,
          description: t.description,
          date: t.date || getToday(),
          store_id: selectedStoreId,
          input_method: mode,
        })
        successCount++
      }

      setSavedCount(successCount)
      setParsedTransactions([])
      setVoiceText('')
      setTextInput('')

      // 2秒后跳转到首页
      setTimeout(() => {
        router.push('/m')
        router.refresh()
      }, 1500)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 清除结果
  const handleClear = () => {
    setParsedTransactions([])
    setVoiceText('')
    setTextInput('')
    setError('')
    setSavedCount(0)
  }

  // 移除单条解析结果
  const handleRemoveTransaction = (index: number) => {
    setParsedTransactions(prev => prev.filter((_, i) => i !== index))
  }

  // 更新单条解析结果
  const handleUpdateTransaction = (index: number, field: keyof ParsedTransaction, value: string | number) => {
    setParsedTransactions(prev => prev.map((t, i) => {
      if (i !== index) return t

      // 如果更改类型，同时更新分类
      if (field === 'type') {
        const newType = value as 'income' | 'expense'
        const categories = newType === 'income' ? incomeCategories : expenseCategories
        const defaultCategory = categories[0]?.name || ''
        return {
          ...t,
          type: newType,
          category: defaultCategory,
          cash_flow_activity: categories[0] ? getCategoryActivity(categories[0]) : 'operating'
        }
      }

      // 如果更改分类，同时更新 cash_flow_activity
      if (field === 'category') {
        const categories = t.type === 'income' ? incomeCategories : expenseCategories
        const selectedCat = categories.find(c => c.name === value)
        return {
          ...t,
          category: value as string,
          cash_flow_activity: selectedCat ? getCategoryActivity(selectedCat) : 'operating'
        }
      }

      return { ...t, [field]: value }
    }))
  }

  // 获取当前类型的分类列表
  const getCategoriesForType = (type: 'income' | 'expense') => {
    return type === 'income' ? incomeCategories : expenseCategories
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  return (
    <MobileLayout title="记账">
      <MobileContainer className="space-y-4">
        {/* 多店铺选择器 - 只在多店铺时显示 */}
        {stores.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowStoreSelector(!showStoreSelector)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {selectedStore?.name || '选择店铺'}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showStoreSelector ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉选择器 */}
            {showStoreSelector && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-10 overflow-hidden">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      setSelectedStoreId(store.id)
                      setShowStoreSelector(false)
                    }}
                    className={`w-full flex items-center gap-2 p-3 text-left hover:bg-muted transition-colors ${
                      selectedStoreId === store.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <StoreIcon className="h-4 w-4" />
                    <span className="text-sm">{store.name}</span>
                    {selectedStoreId === store.id && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 单店铺显示当前店铺名称 */}
        {stores.length === 1 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {stores[0].name}
            </span>
          </div>
        )}

        {/* 模式切换 */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setMode('voice')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'voice'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            <Mic className="h-4 w-4 inline mr-2" />
            语音记账
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'text'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            <Keyboard className="h-4 w-4 inline mr-2" />
            文字记账
          </button>
        </div>

        {/* 成功提示 */}
        {savedCount > 0 && (
          <MobileCard className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3 text-green-700">
              <Check className="h-6 w-6" />
              <div>
                <p className="font-medium">保存成功！</p>
                <p className="text-sm">已记录 {savedCount} 笔交易</p>
              </div>
            </div>
          </MobileCard>
        )}

        {/* 错误提示 */}
        {error && (
          <MobileCard className="bg-red-50 border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </MobileCard>
        )}

        {/* 语音模式 */}
        {mode === 'voice' && (
          <div className="flex flex-col items-center py-8">
            {/* 录音按钮 */}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              className={`h-32 w-32 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 animate-pulse scale-110'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              {isRecording ? (
                <MicOff className="h-12 w-12 text-white" />
              ) : (
                <Mic className="h-12 w-12 text-white" />
              )}
            </button>
            <p className="mt-4 text-muted-foreground text-sm">
              {isRecording ? '正在录音，点击停止' : '点击开始语音记账'}
            </p>

            {/* 识别结果 */}
            {voiceText && (
              <MobileCard className="w-full mt-6">
                <p className="text-sm text-muted-foreground mb-1">识别结果：</p>
                <p className="text-foreground">{voiceText}</p>
              </MobileCard>
            )}

            {/* 处理中 */}
            {isProcessing && (
              <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI 解析中...</span>
              </div>
            )}
          </div>
        )}

        {/* 文字模式 */}
        {mode === 'text' && (
          <div className="space-y-4">
            <MobileCard className="p-0">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="输入交易内容，如：今天收了房租3000，昨天买菜花了200"
                className="w-full min-h-[120px] p-4 bg-transparent resize-none focus:outline-none"
              />
              <div className="border-t p-3 flex justify-end">
                <Button
                  onClick={() => handleParseText(textInput)}
                  disabled={!textInput.trim() || isProcessing}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      解析中
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      AI 解析
                    </>
                  )}
                </Button>
              </div>
            </MobileCard>

            <div className="text-xs text-muted-foreground">
              <p>支持自然语言输入，例如：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>今天收了房租3000</li>
                <li>昨天买菜花了200，吃饭50</li>
                <li>水电费300</li>
              </ul>
            </div>
          </div>
        )}

        {/* 解析结果 */}
        {parsedTransactions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">解析结果 ({parsedTransactions.length}笔)</h3>
              <button
                onClick={handleClear}
                className="text-sm text-muted-foreground"
              >
                清除
              </button>
            </div>

            {parsedTransactions.map((t, index) => (
              <MobileCard key={index} className="relative">
                {editingIndex === index ? (
                  // 编辑模式
                  <div className="space-y-3">
                    {/* 类型选择 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTransaction(index, 'type', 'income')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                          t.type === 'income'
                            ? 'bg-green-100 text-green-700 border-2 border-green-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        收入
                      </button>
                      <button
                        onClick={() => handleUpdateTransaction(index, 'type', 'expense')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                          t.type === 'expense'
                            ? 'bg-red-100 text-red-700 border-2 border-red-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        支出
                      </button>
                    </div>

                    {/* 分类选择 */}
                    <div>
                      <label className="text-xs text-muted-foreground">分类</label>
                      <select
                        value={t.category}
                        onChange={(e) => handleUpdateTransaction(index, 'category', e.target.value)}
                        className="w-full mt-1 p-2 rounded-md border bg-background text-sm"
                      >
                        {getCategoriesForType(t.type).map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 金额 */}
                    <div>
                      <label className="text-xs text-muted-foreground">金额</label>
                      <Input
                        type="number"
                        value={t.amount}
                        onChange={(e) => handleUpdateTransaction(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    {/* 描述 */}
                    <div>
                      <label className="text-xs text-muted-foreground">描述</label>
                      <Input
                        type="text"
                        value={t.description}
                        onChange={(e) => handleUpdateTransaction(index, 'description', e.target.value)}
                        className="mt-1"
                        placeholder="交易描述"
                      />
                    </div>

                    {/* 日期 */}
                    <div>
                      <label className="text-xs text-muted-foreground">日期</label>
                      <Input
                        type="date"
                        value={t.date}
                        onChange={(e) => handleUpdateTransaction(index, 'date', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* 完成编辑按钮 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => setEditingIndex(null)}
                        className="flex-1"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        完成
                      </Button>
                      <Button
                        onClick={() => handleRemoveTransaction(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="p-1 rounded-full hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleRemoveTransaction(index)}
                        className="p-1 rounded-full hover:bg-muted"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between pr-16">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            t.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {t.type === 'income' ? '收入' : '支出'}
                          </span>
                          <span className="font-medium">{t.category}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{t.date}</p>
                      </div>
                      <p className={`text-lg font-semibold ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                      </p>
                    </div>
                  </>
                )}
              </MobileCard>
            ))}

            {/* 保存按钮 */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 mr-2" />
                  保存 {parsedTransactions.length} 笔交易
                </>
              )}
            </Button>
          </div>
        )}
      </MobileContainer>
    </MobileLayout>
  )
}
