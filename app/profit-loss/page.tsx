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
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'
import { getBackUrl } from '@/lib/utils/navigation'
import type { UserRole } from '@/lib/auth/permissions'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
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

  // 获取用户配置（包含角色）
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
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

  // 判断是否为全局模式（多店或全部店铺）
  // 当 mode === 'all' 时，无论店铺数量多少，都视为全局模式（从店铺管理中心点击查看详细数据）
  const isGlobalMode = mode === 'all' || (mode === 'multi' && stores && stores.length > 1)

  // 确定要查询的店铺列表
  const targetStores = isGlobalMode
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores)
    : (storeId ? stores?.filter(s => s.id === storeId) : stores) || []

  // 构建查询 - 获取期间内交易记录
  let periodQuery = supabase
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

  // 根据店铺模式过滤
  if (storeIds.length > 0) {
    periodQuery = periodQuery.in('store_id', storeIds)
  }

  // 获取所有交易记录（使用验证后的日期进行服务端过滤）
  const { data: allTransactions } = await periodQuery.order('date', { ascending: false })

  // 将 JOIN 的数据转换为扁平结构
  const flatTransactions = allTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity,
    include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
    transaction_nature: t.transaction_categories?.transaction_nature
  })) || []

  // 计算利润表
  const profitLossData = calculateProfitLoss(flatTransactions)

  // 构建查询 - 获取所有交易用于计算月度数据
  let monthlyQuery = supabase
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

  // 根据店铺模式过滤
  if (storeIds.length > 0) {
    monthlyQuery = monthlyQuery.in('store_id', storeIds)
  }

  const { data: allTxForMonthly } = await monthlyQuery.order('date', { ascending: false })

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

  // 获取用户角色并构建返回链接
  const userRole: UserRole = (profile?.role as UserRole) || 'user'
  const backUrl = getBackUrl(userRole, storeId, storeIds)

  // 构建新增记录链接
  const voiceEntryUrl = storeId ? `/voice-entry?store=${storeId}` : '/voice-entry'

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Link href={backUrl}>
                <Button variant="outline" size="sm" className="gap-1 w-full">
                  <ArrowLeft className="h-4 w-4" />
                  返回
                </Button>
              </Link>
              <Link href="/stores">
                <Button variant="outline" size="sm" className="w-full">
                  店铺管理
                </Button>
              </Link>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isGlobalMode
                  ? `合并利润表 - ${mode === 'multi' ? `${targetStores.length}家店铺` : '全部店铺'}`
                  : `利润表${currentStore ? ` - ${currentStore.name}` : ''}`
                }
              </h1>
              <p className="text-muted-foreground">
                {isGlobalMode
                  ? `${mode === 'multi' ? targetStores.map(s => s.name).join('、') : '所有店铺'}的合并损益 · ${dateValidation.startDate} 至 ${dateValidation.endDate}`
                  : currentStore
                    ? `${currentStore.name}的损益情况 · ${dateValidation.startDate} 至 ${dateValidation.endDate}`
                    : `${dateValidation.startDate} 至 ${dateValidation.endDate}`
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isGlobalMode && (
              <Link href={voiceEntryUrl}>
                <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Mic className="h-4 w-4" />
                  新增记录
                </Button>
              </Link>
            )}
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

        {/* 利润表 */}
        <ProfitLossClientWrapper
          profitLossData={profitLossData}
          monthlyData={monthlyData}
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          initialBalanceDate={dateValidation.initialBalanceDate}
          storeId={storeId}
          storeIds={storeIds}
          isGlobalMode={isGlobalMode}
        />
      </div>
    </main>
  )
}
