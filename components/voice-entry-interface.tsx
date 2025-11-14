'use client'

import { useState } from 'react'
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
import { Mic, MicOff, Play, Trash2, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const mockTranscriptions = [
  {
    id: 1,
    text: 'Utility bill paid for March, amount 245 dollars',
    category: 'utilities',
    amount: 245,
    date: '2025-03-14',
    status: 'completed'
  },
  {
    id: 2,
    text: 'Cleaning supplies purchased, 65 dollars',
    category: 'cleaning',
    amount: 65,
    date: '2025-03-13',
    status: 'completed'
  },
]

export function VoiceEntryInterface() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptions, setTranscriptions] = useState(mockTranscriptions)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('utilities')
  const [description, setDescription] = useState('')

  const handleStartRecording = () => {
    setIsRecording(true)
    // Simulate recording for 3 seconds then auto-transcribe
    setTimeout(() => {
      setIsRecording(false)
      setDescription('Maintenance work completed on room 3, cost 150 dollars')
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
        status: 'completed'
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
          <h1 className="text-3xl font-bold text-foreground">Voice Entry</h1>
          <p className="text-muted-foreground">Record transactions using voice commands</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recording Interface */}
        <Card className="border-0 shadow-sm md:row-span-2">
          <CardHeader>
            <CardTitle>Record Transaction</CardTitle>
            <CardDescription>Tap the microphone to start recording</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                {isRecording ? 'Recording...' : 'Click to start recording'}
              </p>
            </div>

            {/* Transcription Display */}
            {description && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Transcribed:</p>
                <p className="text-sm text-foreground italic">{description}</p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
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
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
              Add Entry
            </Button>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>Today's voice recorded transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transcriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No entries yet</p>
              ) : (
                transcriptions.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.text}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                          {entry.category}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-semibold text-foreground">${entry.amount.toFixed(2)}</p>
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
            <CardTitle className="text-base">Session Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Entries today</span>
              <span className="text-lg font-semibold text-foreground">{transcriptions.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total recorded</span>
              <span className="text-lg font-semibold text-accent">
                ${transcriptions.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Accuracy: <span className="text-foreground font-semibold">98%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
