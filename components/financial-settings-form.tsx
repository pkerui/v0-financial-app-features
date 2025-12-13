'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Save, Store } from 'lucide-react'
import { toast } from 'sonner'
import { saveFinancialSettings, type FinancialSettings } from '@/lib/backend/financial-settings'
import { updateStore } from '@/lib/backend/stores'
import { getToday } from '@/lib/utils/date'

type FinancialSettingsFormProps = {
  initialSettings: FinancialSettings | null
  /** 店铺ID - 如果提供则保存到店铺级别，否则保存到公司级别 */
  storeId?: string
  /** 店铺名称 - 用于显示 */
  storeName?: string
}

export function FinancialSettingsForm({ initialSettings, storeId, storeName }: FinancialSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    initial_cash_balance: initialSettings?.initial_cash_balance ?? 0,
    initial_balance_date: initialSettings?.initial_balance_date ?? getToday(),
    notes: initialSettings?.notes ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (storeId) {
        // 店铺模式：保存到 stores 表
        const result = await updateStore(storeId, {
          initial_balance_date: formData.initial_balance_date,
          initial_balance: Number(formData.initial_cash_balance),
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`${storeName || '店铺'}期初设置保存成功`)
          router.refresh()
        }
      } else {
        // 公司模式：保存到 financial_settings 表
        const result = await saveFinancialSettings({
          initial_cash_balance: Number(formData.initial_cash_balance),
          initial_balance_date: formData.initial_balance_date,
          notes: formData.notes,
        })

        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('公司财务设置保存成功')
          router.refresh()
        }
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {storeId && <Store className="h-5 w-5" />}
            {storeId ? `${storeName || '店铺'}期初余额设置` : '期初余额设置'}
          </CardTitle>
          <CardDescription>
            {storeId
              ? `设置该店铺开始使用本系统时的现金余额，系统将根据此基准计算该店铺的财务报表`
              : '设置公司整体开始使用本系统时的现金余额，系统将根据此基准计算所有财务报表'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 警告提示 */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                重要说明
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                <li>期初余额代表您所有历史账目的累积结果</li>
                <li><strong>系统将禁止录入期初日期之前的任何交易记录</strong></li>
                <li>如需记录期初日期之前的历史交易，请调整期初日期，或将历史账目归入期初余额</li>
                <li>修改期初余额会影响所有财务报表的计算结果</li>
              </ul>
            </div>
          </div>

          {/* 期初余额 */}
          <div className="space-y-2">
            <Label htmlFor="initial_cash_balance">
              期初现金余额 <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 items-center">
              <span className="text-muted-foreground">¥</span>
              <Input
                id="initial_cash_balance"
                type="number"
                step="0.01"
                min="0"
                value={formData.initial_cash_balance}
                onChange={(e) =>
                  setFormData({ ...formData, initial_cash_balance: Number(e.target.value) })
                }
                className="flex-1"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              请输入您开始使用本系统时账户中的实际现金余额
            </p>
          </div>

          {/* 期初日期 */}
          <div className="space-y-2">
            <Label htmlFor="initial_balance_date">
              期初日期 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="initial_balance_date"
              type="date"
              value={formData.initial_balance_date}
              onChange={(e) =>
                setFormData({ ...formData, initial_balance_date: e.target.value })
              }
              max={getToday()}
              required
            />
            <p className="text-xs text-muted-foreground">
              请选择上述余额对应的日期（通常是您开始记账的日期）。<strong className="text-amber-700 dark:text-amber-400">注意：系统将禁止录入此日期之前的交易记录</strong>
            </p>
          </div>

          {/* 备注 - 仅公司模式显示 */}
          {!storeId && (
            <div className="space-y-2">
              <Label htmlFor="notes">备注说明</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="可以记录期初余额的来源或其他说明..."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(storeId ? `/dashboard?store=${storeId}` : '/dashboard')}
          disabled={loading}
        >
          取消
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </form>
  )
}
