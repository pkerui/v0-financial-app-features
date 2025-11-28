import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfitLossDetailClientWrapper } from '@/components/profit-loss-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function ProfitLossAllPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    redirect('/')
  }

  // 检测 store 模式
  const params = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(params)

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

  // 准备可用店铺列表（用于筛选下拉框）
  const availableStores = isGlobalMode && stores
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores
      ).map(s => ({ id: s.id, name: s.name }))
    : []

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取所有交易（使用验证后的日期）
  // 包含店铺信息用于多店模式显示
  let periodQuery = supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        include_in_profit_loss,
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
    periodQuery = periodQuery.in('store_id', storeIds)
  }

  const { data: allTransactions } = await periodQuery.order('date', { ascending: false })

  const flatTransactions = allTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity,
    include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
    transaction_nature: t.transaction_categories?.transaction_nature,
    store_name: t.stores?.name || undefined
  })) || []

  return (
    <ProfitLossDetailClientWrapper
      detailType="all"
      allTransactions={flatTransactions}
      dateValidation={dateValidation}
      storeId={storeId}
      storeName={storeName}
      storeIds={storeIds}
      isGlobalMode={isGlobalMode}
      availableStores={availableStores}
    />
  )
}
