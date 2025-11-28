import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityDetailClientWrapper } from '@/components/activity-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { type NewStoreCapitalInvestment } from '@/lib/services/cash-flow'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'

type PageProps = {
  params: Promise<{
    type: 'operating' | 'investing' | 'financing'
  }>
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    store?: string
    stores?: string
  }>
}

export default async function ActivityDetailPage({ params, searchParams }: PageProps) {
  const { type } = await params
  const supabase = await createClient()

  // 验证activity类型
  if (!['operating', 'investing', 'financing'].includes(type)) {
    redirect('/dashboard')
  }

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

  // 检测 store 模式
  const searchParamsResolved = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(searchParamsResolved)

  // 获取店铺列表
  const { data: stores } = await getActiveStores()

  // 判断是否为全局模式
  const isGlobalMode = (mode === 'multi' || mode === 'all') && stores && stores.length > 1

  // 获取店铺信息（如果是单店模式）
  let storeName: string | undefined
  if (storeId) {
    const store = stores?.find(s => s.id === storeId)
    storeName = store?.name
  }

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取该活动的交易记录（使用验证后的日期）
  // 使用 JOIN 获取 transaction_categories.cash_flow_activity，与 cash-flow 页面保持一致
  // 同时获取店铺信息用于多店模式显示
  let query = supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        transaction_nature
      ),
      stores!store_id (
        id,
        name
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  // 如果是单店或多店模式，过滤 store_id
  if (storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data: rawTransactions } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  // 按活动类型过滤，并扁平化 cash_flow_activity, transaction_nature 和 store_name
  const transactions = rawTransactions
    ?.filter(t => t.transaction_categories?.cash_flow_activity === type)
    .map(t => ({
      ...t,
      cash_flow_activity: t.transaction_categories?.cash_flow_activity,
      transaction_nature: t.transaction_categories?.transaction_nature,
      store_name: t.stores?.name || undefined
    })) || []

  // 准备可用店铺列表（用于筛选下拉框）
  const availableStores = isGlobalMode && stores
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores
      ).map(s => ({ id: s.id, name: s.name }))
    : []

  // 筹资活动页面需要包含新店资本投入
  let newStoreCapitalInvestments: NewStoreCapitalInvestment[] = []
  if (type === 'financing' && isGlobalMode && stores) {
    const targetStores = mode === 'multi' && storeIds.length > 0
      ? stores.filter(s => storeIds.includes(s.id))
      : stores

    targetStores.forEach(store => {
      const storeInitialDate = store.initial_balance_date
      if (storeInitialDate && storeInitialDate > dateValidation.startDate && storeInitialDate <= dateValidation.endDate) {
        // 新店：期初余额日期在查询期间内
        if (store.initial_balance && store.initial_balance > 0) {
          newStoreCapitalInvestments.push({
            storeId: store.id,
            storeName: store.name,
            amount: store.initial_balance,
            date: storeInitialDate
          })
        }
      }
    })
  }

  return (
    <ActivityDetailClientWrapper
      activity={type}
      allTransactions={transactions || []}
      dateValidation={dateValidation}
      storeId={storeId}
      storeName={storeName}
      storeIds={storeIds}
      isGlobalMode={isGlobalMode}
      availableStores={availableStores}
      newStoreCapitalInvestments={newStoreCapitalInvestments}
    />
  )
}
