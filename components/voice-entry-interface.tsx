'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mic, MicOff, Trash2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const mockTranscriptions = [
  {
    id: 1,
    text: '三月份水电费已支付，金额245元',
    category: 'utilities',
    amount: 245,
    date: '2025-03-14',
    status: 'completed',
    type: 'voice'
  },
  {
    id: 2,
    text: '购买清洁用品，金额65元',
    category: 'cleaning',
    amount: 65,
    date: '2025-03-13',
    status: 'completed',
    type: 'text'
  },
]

export function VoiceEntryInterface() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptions, setTranscriptions] = useState(mockTranscriptions)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('utilities')
  const [description, setDescription] = useState('')
  const [inputType, setInputType] = useState('voice')

  const handleStartRecording = () => {
    setIsRecording(true)
    // Simulate recording for 3 seconds then auto-transcribe
    setTimeout(() => {
      setIsRecording(false)
      setDescription('房间3的维修工作已完成，费用150元')
    }, 3000)
  }

  const handleAddEntry = () => {
    if (description && amount) {
      const newEntry = {
        id: transcriptions.length + 1,
        text: description,
        category,
        amount: parseFloat(amount),
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        type: inputType
      }
      setTranscriptions([newEntry, ...transcriptions])
      setDescription('')
      setAmount('')
      setCategory('utilities')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">新增记录</h1>
          <p className="text-muted-foreground">支持文字和语音两种方式记录交易</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recording Interface */}
        <Card className="border-0 shadow-sm md:row-span-2">
          <CardHeader>
            <CardTitle>记录交易</CardTitle>
            <CardDescription>选择输入方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={inputType} onValueChange={setInputType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="voice">语音输入</TabsTrigger>
                <TabsTrigger value="text">文字输入</TabsTrigger>
              </TabsList>

              <TabsContent value="voice" className="space-y-6 mt-6">
                {/* Large Recording Button */}
                <div className="flex justify-center">
                  <button
                    onClick={isRecording ? () => setIsRecording(false) : handleStartRecording}
                    className={`relative h-32 w-32 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-destructive/20 ring-4 ring-destructive/50 animate-pulse'
                        : 'bg-accent/10 hover:bg-accent/20 ring-2 ring-accent'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="h-12 w-12 text-destructive" />
                    ) : (
                      <Mic className="h-12 w-12 text-accent" />
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? '录音中...' : '点击开始录音'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="description">交易描述</Label>
                  <Textarea
                    id="description"
                    placeholder="输入交易详情，例如：支付房间3维修费用"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-input min-h-20"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Transcription Display */}
            {description && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {inputType === 'voice' ? '已转录' : '已输入'}:
                </p>
                <p className="text-sm text-foreground italic">{description}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">金额 (¥)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-input"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">类别</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utilities">水电费</SelectItem>
                    <SelectItem value="maintenance">维修费</SelectItem>
                    <SelectItem value="cleaning">清洁费</SelectItem>
                    <SelectItem value="supplies">用品</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAddEntry}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              disabled={!description || !amount}
            >
              <Plus className="h-4 w-4" />
              添加记录
            </Button>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>最近的记录</CardTitle>
            <CardDescription>最近的交易记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transcriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">暂无记录</p>
              ) : (
                transcriptions.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground truncate">{entry.text}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent whitespace-nowrap">
                            {entry.type === 'voice' ? '语音' : '文字'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                          {entry.category === 'utilities' && '水电费'}
                          {entry.category === 'maintenance' && '维修费'}
                          {entry.category === 'cleaning' && '清洁费'}
                          {entry.category === 'supplies' && '用品'}
                          {entry.category === 'other' && '其他'}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-semibold text-foreground">¥{entry.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">记录统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">总记录数</span>
              <span className="text-lg font-semibold text-foreground">{transcriptions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">总计金额</span>
              <span className="text-lg font-semibold text-accent">
                ¥{transcriptions.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">语音记录</span>
                <span className="text-foreground font-semibold">
                  {transcriptions.filter(e => e.type === 'voice').length}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-muted-foreground">文字记录</span>
                <span className="text-foreground font-semibold">
                  {transcriptions.filter(e => e.type === 'text').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
