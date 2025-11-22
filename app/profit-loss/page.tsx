import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfitLossClientWrapper } from '@/components/profit-loss-client-wrapper'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut, Mic, Settings } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import {
  calculateProfitLoss,
  calculateMonthlyProfitLoss
} from '@/lib/services/profit-loss'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getFinancialSettings } from '@/lib/api/financial-settings'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">配置错误</h1>
          <p className="text-muted-foreground">
            您的账户还没有关联公司。请联系管理员。
          </p>
        </div>
      </div>
    )
  }

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取所有交易记录（使用验证后的日期进行服务端过滤）
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        include_in_profit_loss,
        transaction_nature
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)
    .order('date', { ascending: false })

  // 将 JOIN 的数据转换为扁平结构
  const flatTransactions = allTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity,
    include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
    transaction_nature: t.transaction_categories?.transaction_nature
  })) || []

  // 计算利润表
  const profitLossData = calculateProfitLoss(flatTransactions)

  // 获取所有交易用于计算月度数据
  const { data: allTxForMonthly } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        include_in_profit_loss,
        transaction_nature
      )
    `)
    .eq('company_id', profile.company_id)
    .order('date', { ascending: false })

  const allTxFlat = allTxForMonthly?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity,
    include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
    transaction_nature: t.transaction_categories?.transaction_nature
  })) || []

  // 计算月度数据（用于图表）
  const monthlyData = calculateMonthlyProfitLoss(
    allTxFlat,
    new Date(new Date().getFullYear(), 0, 1), // 年初
    new Date(dateValidation.endDate)
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">利润表</h1>
              <p className="text-muted-foreground">
                {dateValidation.startDate} 至 {dateValidation.endDate}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/voice-entry">
              <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Mic className="h-4 w-4" />
                新增记录
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" size="icon" title="财务设置">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <form action={logout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* 利润表 */}
        <ProfitLossClientWrapper
          profitLossData={profitLossData}
          monthlyData={monthlyData}
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          initialBalanceDate={dateValidation.initialBalanceDate}
        />
      </div>
    </main>
  )
}
