'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic, MicOff, Trash2, Save, ArrowLeft, CheckCircle, AlertCircle, Edit2, X, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { startVoiceRecognition, type ParsedTransaction } from '@/lib/utils/voice-parser'
import { startTencentASR } from '@/lib/utils/tencent-asr'
import { createTransaction } from '@/lib/api/transactions'
import { useRouter } from 'next/navigation'
import { getToday } from '@/lib/utils/date'
import { getCategoryMapping, activityNames } from '@/lib/cash-flow-config'
import type { TransactionCategory } from '@/lib/api/transaction-categories'
import type { Store } from '@/lib/api/stores'
import { StoreSelector } from '@/components/store-selector'

type ValidationError = {
  field: string
  message: string
}

type TransactionWithId = ParsedTransaction & {
  id: string
  isEditing?: boolean
  input_method: 'voice' | 'manual'
  validationErrors?: ValidationError[]
  store_id?: string
}

type VoiceEntryInterfaceProps = {
  incomeCategories: TransactionCategory[]
  expenseCategories: TransactionCategory[]
  initialBalanceDate?: string
  stores: Store[]
  defaultStoreId?: string
}

export function VoiceEntryInterface({ incomeCategories, expenseCategories, initialBalanceDate, stores, defaultStoreId }: VoiceEntryInterfaceProps) {
  const router = useRouter()
  const [inputMode, setInputMode] = useState<'voice' | 'manual'>('voice')
  const [isRecording, setIsRecording] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [parsedTransactions, setParsedTransactions] = useState<TransactionWithId[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const stopRecognitionRef = useRef<(() => void) | null>(null)
  const [useTencentASR, setUseTencentASR] = useState(true) // 默认使用腾讯云

  // 店铺选择状态
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    // 优先使用传入的默认店铺ID
    if (defaultStoreId) {
      return defaultStoreId
    }
    // 如果只有一个店铺，默认选中
    if (stores.length === 1) {
      return stores[0].id
    }
    return ''
  })

  // 手动输入表单状态
  const [manualInputMode, setManualInputMode] = useState<'form' | 'text'>('text')
  const [manualTextInput, setManualTextInput] = useState('')
  const [manualType, setManualType] = useState<'income' | 'expense'>('expense')
  const [manualCategory, setManualCategory] = useState(() => {
    // 默认使用第一个支出分类
    return expenseCategories[0]?.name || '水电费'
  })
  const [manualAmount, setManualAmount] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualDate, setManualDate] = useState(() => {
    // 默认使用今天的日期
    return getToday()
  })

  // 清理函数
  useEffect(() => {
    return () => {
      if (stopRecognitionRef.current) {
        stopRecognitionRef.current()
      }
    }
  }, [])

  // 当交易类型改变时，更新默认分类
  useEffect(() => {
    if (manualType === 'income') {
      setManualCategory(incomeCategories[0]?.name || '房费收入')
    } else {
      setManualCategory(expenseCategories[0]?.name || '水电费')
    }
  }, [manualType, incomeCategories, expenseCategories])

  // 验证交易记录
  const validateTransaction = (transaction: ParsedTransaction): ValidationError[] => {
    const errors: ValidationError[] = []

    // 1. 验证日期不能早于期初余额日期
    if (initialBalanceDate && transaction.date < initialBalanceDate) {
      errors.push({
        field: 'date',
        message: `交易日期（${transaction.date}）早于期初余额日期（${initialBalanceDate}）`
      })
    }

    // 2. 验证分类与类型匹配
    const categories = transaction.type === 'income' ? incomeCategories : expenseCategories
    const categoryInfo = categories.find(cat => cat.name === transaction.category)

    if (!categoryInfo) {
      errors.push({
        field: 'category',
        message: `找不到分类"${transaction.category}"`
      })
    } else {
      // 检查分类是否属于正确的类型
      const oppositeCategories = transaction.type === 'income' ? expenseCategories : incomeCategories
      const isInOppositeType = oppositeCategories.find(cat => cat.name === transaction.category)

      if (isInOppositeType) {
        const correctType = transaction.type === 'income' ? '支出' : '收入'
        const wrongType = transaction.type === 'income' ? '收入' : '支出'
        errors.push({
          field: 'type',
          message: `"${transaction.category}"是${correctType}分类，但标记为${wrongType}，请修改类型`
        })
      }
    }

    // 3. 验证金额必须大于0
    if (!transaction.amount || transaction.amount <= 0) {
      errors.push({
        field: 'amount',
        message: '金额必须大于0'
      })
    }

    return errors
  }

  const handleStartRecording = () => {
    setErrorMessage('')
    setVoiceText('')

    // 根据选择使用不同的语音识别引擎
    const recognitionFunction = useTencentASR ? startTencentASR : startVoiceRecognition

    const stop = recognitionFunction(
      (text, isFinal) => {
        console.log(`${useTencentASR ? '腾讯云' : '浏览器'}语音识别结果:`, text, '是否最终:', isFinal)
        setVoiceText(text)
      },
      (error) => {
        console.error('语音识别错误:', error)
        setErrorMessage(error)
        setIsRecording(false)
      }
    )

    stopRecognitionRef.current = stop
    setIsRecording(true)
  }

  const handleStopRecording = async () => {
    if (stopRecognitionRef.current) {
      stopRecognitionRef.current()
      stopRecognitionRef.current = null
    }
    setIsRecording(false)

    // 对于腾讯云 ASR，识别是异步的，在 onstop 事件中完成
    // 所以这里不需要立即处理，等待 onResult 回调
    if (useTencentASR) {
      console.log('腾讯云识别中，等待结果...')
      return
    }

    // 对于浏览器语音识别，使用AI解析语音文本
    if (voiceText && voiceText.trim()) {
      console.log('开始AI解析语音文本:', voiceText)

      setIsAIParsing(true)
      try {
        const response = await fetch('/api/parse-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: voiceText,
            incomeCategories: incomeCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
            expenseCategories: expenseCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setErrorMessage(data.error || 'AI 解析失败，请重试')
          setVoiceText('')
          return
        }

        if (data.transactions && data.transactions.length > 0) {
          // 验证并添加验证错误信息
          const withIds = data.transactions.map((t: ParsedTransaction) => ({
            ...t,
            id: `${Date.now()}_${Math.random()}`,
            input_method: 'voice' as const,
            confidence: 'high' as const,
            validationErrors: validateTransaction(t),
          }))
          setParsedTransactions(prev => [...withIds, ...prev])
          setVoiceText('') // 清空已解析的文本
          setErrorMessage('')
          console.log(`AI 成功解析语音，识别出 ${data.parsed} 笔交易`)
        } else {
          setErrorMessage('AI 未能识别出有效的交易记录，请重试')
          setVoiceText('')
        }
      } catch (error) {
        console.error('AI 解析错误:', error)
        setErrorMessage('AI 解析失败，请检查网络连接或稍后重试')
        setVoiceText('')
      } finally {
        setIsAIParsing(false)
      }
    } else {
      setErrorMessage('未检测到有效语音，请重试')
    }
  }

  const handleDeleteTransaction = (id: string) => {
    setParsedTransactions(prev => prev.filter(t => t.id !== id))
  }

  const handleEditTransaction = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, isEditing: true } : t))
    )
  }

  const handleSaveEdit = (id: string, updates: Partial<ParsedTransaction>) => {
    setParsedTransactions(prev =>
      prev.map(t => {
        if (t.id !== id) return t

        // 如果更新了分类，需要更新对应的活动类型
        let updatedTransaction = { ...t, ...updates, isEditing: false }
        if (updates.category || updates.type) {
          const categories = updatedTransaction.type === 'income' ? incomeCategories : expenseCategories
          const categoryInfo = categories.find(cat => cat.name === updatedTransaction.category)
          if (categoryInfo) {
            updatedTransaction.cash_flow_activity = categoryInfo.cash_flow_activity
          }
        }

        // 重新验证更新后的交易
        updatedTransaction.validationErrors = validateTransaction({
          type: updatedTransaction.type,
          category: updatedTransaction.category,
          amount: updatedTransaction.amount,
          description: updatedTransaction.description,
          date: updatedTransaction.date,
          confidence: updatedTransaction.confidence,
          cash_flow_activity: updatedTransaction.cash_flow_activity,
        })

        return updatedTransaction
      })
    )
  }

  const handleCancelEdit = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, isEditing: false } : t))
    )
  }

  const [isAIParsing, setIsAIParsing] = useState(false)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false) // 标记是否正在处理语音

  // 当腾讯云识别完成后，自动使用AI解析语音文本
  useEffect(() => {
    // 只在使用腾讯云且不在录音时处理
    if (useTencentASR && !isRecording && voiceText && voiceText.trim() && !isProcessingVoice) {
      setIsProcessingVoice(true)
      console.log('腾讯云识别完成，开始AI解析:', voiceText)

      // 异步处理语音文本
      ;(async () => {
        try {
          setIsAIParsing(true)
          try {
            const response = await fetch('/api/parse-transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: voiceText,
                incomeCategories: incomeCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
                expenseCategories: expenseCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
              }),
            })

            const data = await response.json()

            if (!response.ok) {
              setErrorMessage(data.error || 'AI 解析失败，请重试')
              setIsAIParsing(false)
              setVoiceText('')
              return
            }

            if (data.transactions && data.transactions.length > 0) {
              // 验证并添加验证错误信息
              const withIds = data.transactions.map((t: ParsedTransaction) => ({
                ...t,
                id: `${Date.now()}_${Math.random()}`,
                input_method: 'voice' as const,
                confidence: 'high' as const,
                validationErrors: validateTransaction(t),
              }))
              setParsedTransactions(prev => [...withIds, ...prev])
              setVoiceText('') // 清空已解析的文本
              setErrorMessage('')
              console.log(`AI 成功解析语音，识别出 ${data.parsed} 笔交易`)
            } else {
              setErrorMessage('AI 未能识别出有效的交易记录，请重试')
              setVoiceText('')
            }
          } catch (error) {
            console.error('AI 解析错误:', error)
            setErrorMessage('AI 解析失败，请检查网络连接或稍后重试')
            setVoiceText('')
          } finally {
            setIsAIParsing(false)
          }
        } finally {
          setIsProcessingVoice(false)
        }
      })()
    }
  }, [voiceText, isRecording, useTencentASR, isProcessingVoice, incomeCategories, expenseCategories])

  const handleManualTextParse = async () => {
    if (!manualTextInput.trim()) {
      setErrorMessage('请输入要解析的文本')
      return
    }

    setErrorMessage('')
    setIsAIParsing(true)

    try {
      console.log('使用 AI 解析手动输入文本:', manualTextInput)
      const response = await fetch('/api/parse-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: manualTextInput,
          incomeCategories: incomeCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
          expenseCategories: expenseCategories.map(c => ({ name: c.name, activity: c.cash_flow_activity })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'AI 解析失败，请重试')
        return
      }

      if (data.transactions && data.transactions.length > 0) {
        const withIds = data.transactions.map((t: ParsedTransaction) => ({
          ...t,
          id: `${Date.now()}_${Math.random()}`,
          input_method: 'manual' as const,
          confidence: 'high' as const,
          validationErrors: validateTransaction(t),
        }))
        setParsedTransactions(prev => [...withIds, ...prev])
        setManualTextInput('') // 清空输入框
        console.log(`AI 成功解析 ${data.parsed} 笔交易`)
      } else {
        setErrorMessage('AI 未能识别出有效的交易记录，请检查输入')
      }
    } catch (error) {
      console.error('AI 解析错误:', error)
      setErrorMessage('AI 解析失败，请检查网络连接或稍后重试')
    } finally {
      setIsAIParsing(false)
    }
  }

  const handleManualAdd = () => {
    if (!manualDescription.trim()) {
      setErrorMessage('请输入交易描述')
      return
    }

    // 根据分类获取对应的活动类型
    const categories = manualType === 'income' ? incomeCategories : expenseCategories
    const categoryInfo = categories.find(cat => cat.name === manualCategory)
    const cashFlowActivity = categoryInfo?.cash_flow_activity || 'operating'

    const newTransaction: TransactionWithId = {
      id: `${Date.now()}_${Math.random()}`,
      type: manualType,
      category: manualCategory,
      amount: parseFloat(manualAmount || '0'),
      description: manualDescription,
      date: manualDate,
      confidence: 'high', // 手动输入的置信度始终为高
      input_method: 'manual',
      cash_flow_activity: cashFlowActivity, // 使用财务设置中的活动类型映射
      validationErrors: validateTransaction({
        type: manualType,
        category: manualCategory,
        amount: parseFloat(manualAmount || '0'),
        description: manualDescription,
        date: manualDate,
        confidence: 'high',
        cash_flow_activity: cashFlowActivity,
      }),
    }

    setParsedTransactions(prev => [newTransaction, ...prev])

    // 清空表单（保留日期）
    setManualAmount('')
    setManualDescription('')
    setErrorMessage('')
  }

  const handleSaveAll = async () => {
    if (parsedTransactions.length === 0) {
      setErrorMessage('没有要保存的记录')
      return
    }

    // 店铺选择是必填项 - 确保所有交易都关联到具体店铺
    if (!selectedStoreId) {
      if (stores.length === 0) {
        setErrorMessage('系统中还没有店铺，请先在店铺管理中创建店铺')
      } else {
        setErrorMessage('请选择店铺 - 所有交易必须关联到具体店铺')
      }
      return
    }

    // 检查是否有验证错误
    const transactionsWithErrors = parsedTransactions.filter(
      t => t.validationErrors && t.validationErrors.length > 0
    )

    if (transactionsWithErrors.length > 0) {
      setErrorMessage(
        `无法保存：有 ${transactionsWithErrors.length} 笔交易存在验证错误，请修正后再保存`
      )
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      // 逐个保存交易记录
      for (const transaction of parsedTransactions) {
        const result = await createTransaction({
          type: transaction.type,
          category: transaction.category,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          input_method: transaction.input_method,
          store_id: selectedStoreId, // 必填项，不使用 undefined
        })

        if (result.error) {
          throw new Error(result.error)
        }
      }

      // 保存成功，跳转回 dashboard（如果有默认店铺，返回该店铺的总览）
      router.push(defaultStoreId ? `/dashboard?store=${defaultStoreId}` : '/dashboard')
    } catch (error: any) {
      setErrorMessage(error.message || '保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return '未知'
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={defaultStoreId ? `/dashboard?store=${defaultStoreId}` : '/dashboard'}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回总览
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">新增财务记录</h1>
          <p className="text-muted-foreground">支持语音输入或手动录入，一次添加多笔交易</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 输入界面 */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            {/* 店铺信息显示区域 */}
            {defaultStoreId ? (
              // 单店模式：显示当前店铺信息（只读）
              <div className="mb-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    当前店铺：{stores.find(s => s.id === defaultStoreId)?.name || '未知店铺'}
                  </p>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-4">
                  新增的记录将自动归属此店铺
                </p>
              </div>
            ) : (
              // 全局模式：需要选择店铺
              <div className="mb-6">
                <StoreSelector
                  stores={stores}
                  value={selectedStoreId}
                  onChange={setSelectedStoreId}
                  label="所属店铺"
                  placeholder="请选择店铺"
                  required={true}
                />
                {stores.length === 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      系统中还没有店铺，请先前往{' '}
                      <Link href="/stores" className="font-medium underline hover:text-amber-900">
                        店铺管理
                      </Link>
                      {' '}创建店铺
                    </p>
                  </div>
                )}
              </div>
            )}

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'voice' | 'manual')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="voice">语音输入</TabsTrigger>
                <TabsTrigger value="manual">手动输入</TabsTrigger>
              </TabsList>

              {/* 语音输入选项卡 */}
              <TabsContent value="voice" className="space-y-6 mt-0">
            {/* 语音识别引擎选择 */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">识别引擎:</span>
              <button
                onClick={() => setUseTencentASR(!useTencentASR)}
                disabled={isRecording}
                className={`px-4 py-2 text-sm rounded-full transition-all font-medium ${
                  useTencentASR
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {useTencentASR ? '🔊 腾讯云' : '🌐 浏览器'}
              </button>
            </div>

            {/* 录音按钮 */}
            <div className="flex justify-center">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isAIParsing}
                className={`relative h-32 w-32 rounded-full flex items-center justify-center transition-all ${
                  isAIParsing
                    ? 'bg-gray-200 cursor-not-allowed opacity-50'
                    : isRecording
                    ? 'bg-destructive/20 ring-4 ring-destructive/50 animate-pulse'
                    : 'bg-accent/10 hover:bg-accent/20 ring-2 ring-accent'
                }`}
              >
                {isAIParsing ? (
                  <div className="h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-12 w-12 text-destructive" />
                ) : (
                  <Mic className="h-12 w-12 text-accent" />
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isAIParsing
                  ? 'AI 解析中...'
                  : isRecording
                  ? '点击停止录音'
                  : '点击开始录音'}
              </p>
            </div>

            {/* 实时语音文本 */}
            {voiceText && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">识别的文本:</p>
                <p className="text-sm text-foreground">{voiceText}</p>
              </div>
            )}

            {/* 错误提示 */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 使用说明 */}
            <div className="rounded-lg border border-border p-4 space-y-2 bg-purple-50/50 dark:bg-purple-950/20">
              <p className="text-sm font-medium text-foreground">AI 智能解析：</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>使用 DeepSeek AI 智能理解语音内容</li>
                <li>支持更自然的口语表达</li>
                <li>自动识别日期、金额、类型和分类</li>
                <li>示例："今天收了房租三千，昨天买了办公用品五百块"</li>
                <li>可以一次说多笔交易，AI 会自动识别</li>
              </ul>
            </div>
              </TabsContent>

              {/* 手动输入选项卡 */}
              <TabsContent value="manual" className="space-y-4 mt-0">
                {/* 手动输入子模式切换 */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setManualInputMode('text')}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      manualInputMode === 'text'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    智能解析
                  </button>
                  <button
                    onClick={() => setManualInputMode('form')}
                    className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                      manualInputMode === 'form'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    表单录入
                  </button>
                </div>

                {/* 智能解析模式 */}
                {manualInputMode === 'text' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-text-input">输入交易文本</Label>
                      <textarea
                        id="manual-text-input"
                        placeholder="使用 AI 智能解析，支持自然语言，例如：今天收了房租3000，昨天买了办公用品500块"
                        value={manualTextInput}
                        onChange={(e) => setManualTextInput(e.target.value)}
                        className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-input text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <Button
                      onClick={handleManualTextParse}
                      disabled={isAIParsing}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                      {isAIParsing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          AI 解析中...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          AI 智能解析并添加
                        </>
                      )}
                    </Button>

                    <div className="rounded-lg border border-border p-3 space-y-1 bg-purple-50/50 dark:bg-purple-950/20">
                      <p className="text-xs font-medium text-foreground">AI 智能解析：</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>使用 DeepSeek AI 智能理解自然语言</li>
                        <li>支持更灵活的表达方式和多笔交易</li>
                        <li>自动识别日期、金额、类型和分类</li>
                        <li>示例："今天收了房租3000，昨天买了办公用品500块"</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* 表单录入模式 */}
                {manualInputMode === 'form' && (
                <div className="space-y-4">
                  {/* 交易类型 */}
                  <div className="space-y-2">
                    <Label>交易类型</Label>
                    <Select value={manualType} onValueChange={(v) => setManualType(v as 'income' | 'expense')}>
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">收入</SelectItem>
                        <SelectItem value="expense">支出</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 分类 */}
                  <div className="space-y-2">
                    <Label>分类</Label>
                    <Select value={manualCategory} onValueChange={setManualCategory}>
                      <SelectTrigger className="bg-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {manualType === 'income'
                          ? incomeCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))
                          : expenseCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 金额 */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-amount">金额 (¥)</Label>
                    <Input
                      id="manual-amount"
                      type="number"
                      placeholder="0.00"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="bg-input"
                      step="0.01"
                    />
                  </div>

                  {/* 描述 */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-description">交易描述</Label>
                    <Input
                      id="manual-description"
                      placeholder="例如：301房间水电费"
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      className="bg-input"
                    />
                  </div>

                  {/* 日期 */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-date">日期</Label>
                    <Input
                      id="manual-date"
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      min={initialBalanceDate}
                      className="bg-input"
                    />
                    {initialBalanceDate && (
                      <p className="text-xs text-muted-foreground">
                        不能早于期初余额日期（{initialBalanceDate}）
                      </p>
                    )}
                  </div>

                  {/* 添加按钮 */}
                  <Button
                    onClick={handleManualAdd}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    添加到列表
                  </Button>
                </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 解析结果列表 */}
        <Card className="border-0 shadow-sm md:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>解析结果 ({parsedTransactions.length})</CardTitle>
                <CardDescription>
                  {parsedTransactions.length > 0 ? (
                    <>
                      有效: {parsedTransactions.filter(t => !t.validationErrors || t.validationErrors.length === 0).length} |
                      错误: {parsedTransactions.filter(t => t.validationErrors && t.validationErrors.length > 0).length}
                    </>
                  ) : (
                    '可以编辑或删除识别的交易记录'
                  )}
                </CardDescription>
              </div>
              {parsedTransactions.length > 0 && (
                <Button
                  onClick={handleSaveAll}
                  disabled={
                    isSaving ||
                    parsedTransactions.some(t => t.validationErrors && t.validationErrors.length > 0)
                  }
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? '保存中...' : '批量保存'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsedTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    开始录音后，识别的交易记录会显示在这里
                  </p>
                </div>
              ) : (
                parsedTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onDelete={handleDeleteTransaction}
                    onEdit={handleEditTransaction}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                    getConfidenceColor={getConfidenceColor}
                    getConfidenceText={getConfidenceText}
                    incomeCategories={incomeCategories}
                    expenseCategories={expenseCategories}
                    initialBalanceDate={initialBalanceDate}
                  />
                ))
              )}
            </div>

            {/* 财务设置按钮 */}
            <div className="flex justify-center mt-[30px]">
              <Link href="/settings">
                <button
                  className="px-3 py-2 text-xs rounded-md transition-all font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-1.5"
                  title="管理财务分类"
                >
                  <Settings className="h-3.5 w-3.5" />
                  财务设置
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 交易卡片组件
function TransactionCard({
  transaction,
  onDelete,
  onEdit,
  onSave,
  onCancel,
  getConfidenceColor,
  getConfidenceText,
  incomeCategories,
  expenseCategories,
  initialBalanceDate,
}: {
  transaction: TransactionWithId
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onSave: (id: string, updates: Partial<ParsedTransaction>) => void
  onCancel: (id: string) => void
  getConfidenceColor: (confidence: string) => string
  getConfidenceText: (confidence: string) => string
  incomeCategories: TransactionCategory[]
  expenseCategories: TransactionCategory[]
  initialBalanceDate?: string
}) {
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [description, setDescription] = useState(transaction.description)
  const [category, setCategory] = useState(transaction.category)
  const [date, setDate] = useState(transaction.date)
  const [type, setType] = useState<'income' | 'expense'>(transaction.type)

  // 当类型改变时，重置分类为该类型的第一个分类
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType)
    const categories = newType === 'income' ? incomeCategories : expenseCategories
    if (categories.length > 0) {
      setCategory(categories[0].name)
    }
  }

  if (transaction.isEditing) {
    return (
      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">类型</Label>
            <Select value={type} onValueChange={(value: 'income' | 'expense') => handleTypeChange(value)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">收入</SelectItem>
                <SelectItem value="expense">支出</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {type === 'income'
                  ? incomeCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))
                  : expenseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">金额</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">日期</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-sm"
            />
            {initialBalanceDate && (
              <p className="text-xs text-muted-foreground mt-1">
                不能早于期初余额日期（{initialBalanceDate}）
              </p>
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs">描述</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSave(transaction.id, {
              type,
              amount: parseFloat(amount),
              category,
              description,
              date,
            })}
            className="flex-1"
          >
            保存
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(transaction.id)}
            className="flex-1"
          >
            取消
          </Button>
        </div>
      </div>
    )
  }

  // 获取活动类型 - 优先使用交易记录中的字段，如果没有则使用分类映射
  const activity = transaction.cash_flow_activity || getCategoryMapping(transaction.type, transaction.category)?.activity || 'operating'

  // 检查是否有验证错误
  const hasErrors = transaction.validationErrors && transaction.validationErrors.length > 0

  return (
    <div className={`rounded-lg border p-3 hover:bg-muted/50 transition-colors ${
      hasErrors ? 'border-red-300 bg-red-50/50' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* 验证状态图标 */}
            {hasErrors ? (
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                transaction.type === 'income'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {transaction.type === 'income' ? '收入' : '支出'}
            </span>
            <span className="text-xs text-muted-foreground">{transaction.category}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(transaction.date).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(
                transaction.confidence
              )}`}
            >
              置信度: {getConfidenceText(transaction.confidence)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              {activityNames[activity]}
            </span>
          </div>
          <p className="text-sm text-foreground mb-1">{transaction.description}</p>
          <p className="text-lg font-semibold text-foreground">¥{transaction.amount.toFixed(2)}</p>

          {/* 显示验证错误信息 */}
          {hasErrors && (
            <div className="mt-2 space-y-1">
              {transaction.validationErrors!.map((error, index) => (
                <div key={index} className="flex items-start gap-1.5 text-xs text-red-600">
                  <span className="font-medium">•</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(transaction.id)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(transaction.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
