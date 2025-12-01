import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CashFlowSummaryDetailClientWrapper } from '@/components/cash-flow-summary-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { calculateBeginningBalance, type NewStoreCapitalInvestment } from '@/lib/services/cash-flow'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function EndingBalancePage({ searchParams }: PageProps) {
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
    transaction_nature: t.transaction_categories?.transaction_nature,
    store_name: t.stores?.name || undefined
  })) || []

  // 计算期初余额和新店资本投入
  let beginningBalance = 0
  let newStoreCapitalInvestments: NewStoreCapitalInvestment[] = []
  let existingStoreCount = 0
  let newStoreCount = 0
  let existingStoreNames: string[] = []

  if (isGlobalMode && stores) {
    // 全局模式：计算所有老店的期初余额之和
    const targetStores = mode === 'multi' && storeIds.length > 0
      ? stores.filter(s => storeIds.includes(s.id))
      : stores

    // 获取所有交易用于计算各店铺期初余额
    const targetStoreIds = targetStores.map(s => s.id)
    const { data: allTxForBalance } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories!category_id (
          cash_flow_activity
        )
      `)
      .eq('company_id', profile.company_id)
      .in('store_id', targetStoreIds)
      .order('date', { ascending: false })

    const allTxFlat = allTxForBalance?.map(t => ({
      ...t,
      cash_flow_activity: t.transaction_categories?.cash_flow_activity
    })) || []

    targetStores.forEach(store => {
      const storeInitialDate = store.initial_balance_date
      if (storeInitialDate && storeInitialDate > dateValidation.startDate && storeInitialDate <= dateValidation.endDate) {
        // 新店：期初余额日期在查询期间内（不含期初当天）
        newStoreCount++
        if (store.initial_balance && store.initial_balance > 0) {
          newStoreCapitalInvestments.push({
            storeId: store.id,
            storeName: store.name,
            amount: store.initial_balance,
            date: storeInitialDate
          })
        }
      } else if (!storeInitialDate || storeInitialDate <= dateValidation.startDate) {
        // 老店：期初余额日期在查询开始日期或之前
        existingStoreCount++
        existingStoreNames.push(store.name)

        // 计算该店铺在查询开始日的期初余额
        const storeTransactions = allTxFlat.filter(t => t.store_id === store.id)
        const storeBeginningBalance = storeInitialDate
          ? calculateBeginningBalance(
              store.initial_balance || 0,
              storeInitialDate,
              dateValidation.startDate,
              storeTransactions
            )
          : (store.initial_balance || 0)

        beginningBalance += storeBeginningBalance
      }
    })
  } else if (stores) {
    // 单店模式：使用该店铺的期初数据
    // 如果没有明确指定店铺，但只有一家店铺，使用那家店铺的数据
    const store = storeId
      ? stores.find(s => s.id === storeId)
      : (stores.length === 1 ? stores[0] : null)
    if (store && store.initial_balance_date) {
      // 获取该店铺的所有交易用于计算期初余额
      const { data: allTxForBalance } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories!category_id (
            cash_flow_activity
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('store_id', store.id)
        .order('date', { ascending: false })

      const allTxFlat = allTxForBalance?.map(t => ({
        ...t,
        cash_flow_activity: t.transaction_categories?.cash_flow_activity
      })) || []

      beginningBalance = calculateBeginningBalance(
        store.initial_balance || 0,
        store.initial_balance_date,
        dateValidation.startDate,
        allTxFlat
      )
    }
  }

  // 准备可用店铺列表（用于筛选下拉框）
  const availableStores = isGlobalMode && stores
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores
      ).map(s => ({ id: s.id, name: s.name }))
    : []

  return (
    <CashFlowSummaryDetailClientWrapper
      detailType="ending-balance"
      allTransactions={flatTransactions}
      dateValidation={dateValidation}
      beginningBalance={beginningBalance}
      storeId={storeId}
      storeName={storeName}
      storeIds={storeIds}
      isGlobalMode={isGlobalMode}
      newStoreCapitalInvestments={newStoreCapitalInvestments}
      existingStoreCount={existingStoreCount}
      newStoreCount={newStoreCount}
      existingStoreNames={existingStoreNames}
      availableStores={availableStores}
    />
  )
}
