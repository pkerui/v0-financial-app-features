import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CashFlowClientWrapper } from '@/components/cash-flow-client-wrapper'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut, Mic, Settings } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import {
  calculateCashFlow,
  calculateMonthlyCashFlow,
  calculateBeginningBalance
} from '@/lib/services/cash-flow'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getFinancialSettings } from '@/lib/api/financial-settings'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function CashFlowPage({ searchParams }: PageProps) {
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

  // 获取店铺列表
  const { data: stores } = await getActiveStores()

  // 检测店铺模式（支持单店、多店、全部店铺）
  const { mode, storeId, storeIds } = getStoreModeServer(params)

  // 查找当前店铺名称
  const currentStore = storeId ? stores?.find(s => s.id === storeId) : null

  // 构建查询 - 获取期间内交易记录
  let periodQuery = supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  // 根据店铺模式过滤
  if (storeIds.length > 0) {
    periodQuery = periodQuery.in('store_id', storeIds)
  }

  // 获取所有交易记录（使用验证后的日期进行服务端过滤）
  const { data: periodTransactions } = await periodQuery.order('date', { ascending: false })

  // 将 JOIN 的数据转换为扁平结构
  const flatPeriodTransactions = periodTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity
  })) || []

  // 获取财务设置以计算期初余额
  const { data: financialSettings } = await getFinancialSettings()

  // 计算期初余额
  let beginningBalance = 0
  if (financialSettings) {
    // 构建查询 - 获取所有交易用于计算期初余额
    let balanceQuery = supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories!category_id (
          cash_flow_activity
        )
      `)
      .eq('company_id', profile.company_id)

    // 根据店铺模式过滤
    if (storeIds.length > 0) {
      balanceQuery = balanceQuery.in('store_id', storeIds)
    }

    const { data: allTxForBalance } = await balanceQuery.order('date', { ascending: false })

    const allTxFlat = allTxForBalance?.map(t => ({
      ...t,
      cash_flow_activity: t.transaction_categories?.cash_flow_activity
    })) || []

    beginningBalance = calculateBeginningBalance(
      financialSettings.initial_cash_balance,
      financialSettings.initial_balance_date,
      dateValidation.startDate,
      allTxFlat
    )
  }

  const cashFlowData = calculateCashFlow(flatPeriodTransactions, beginningBalance)

  // 构建查询 - 获取所有交易用于计算月度数据
  let monthlyQuery = supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity
      )
    `)
    .eq('company_id', profile.company_id)

  // 根据店铺模式过滤
  if (storeIds.length > 0) {
    monthlyQuery = monthlyQuery.in('store_id', storeIds)
  }

  const { data: allTxForMonthly } = await monthlyQuery.order('date', { ascending: false })

  const allTxMonthlyFlat = allTxForMonthly?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity
  })) || []

  // 计算月度数据（用于图表）
  const monthlyData = calculateMonthlyCashFlow(
    allTxMonthlyFlat,
    new Date(new Date().getFullYear(), 0, 1), // 年初
    new Date(dateValidation.endDate),
    financialSettings?.initial_cash_balance || 0,
    financialSettings?.initial_balance_date
  )

  // 构建返回链接
  const dashboardUrl = storeId
    ? `/dashboard?store=${storeId}`
    : storeIds.length > 0
    ? `/dashboard?stores=${storeIds.join(',')}`
    : '/dashboard'

  // 构建新增记录链接
  const voiceEntryUrl = storeId ? `/voice-entry?store=${storeId}` : '/voice-entry'

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href={dashboardUrl}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回总览
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                现金流量表{currentStore ? ` - ${currentStore.name}` : ''}
              </h1>
              <p className="text-muted-foreground">
                {currentStore
                  ? `${currentStore.name}的现金流量 · ${dateValidation.startDate} 至 ${dateValidation.endDate}`
                  : `${dateValidation.startDate} 至 ${dateValidation.endDate}`
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={voiceEntryUrl}>
              <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Mic className="h-4 w-4" />
                新增记录
              </Button>
            </Link>
            <Link href={storeId ? `/settings?store=${storeId}` : '/settings'}>
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

        {/* 现金流量表 */}
        <CashFlowClientWrapper
          cashFlowData={cashFlowData}
          monthlyData={monthlyData}
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          initialBalanceDate={dateValidation.initialBalanceDate}
          storeId={storeId}
          storeIds={storeIds}
        />
      </div>
    </main>
  )
}
