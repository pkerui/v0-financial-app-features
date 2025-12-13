// @ts-nocheck
import { redirect } from 'next/navigation'
import { CashFlowSummaryDetailClientWrapper } from '@/components/cash-flow-summary-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { calculateBeginningBalance, type NewStoreCapitalInvestment } from '@/lib/services/cash-flow'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/backend/stores'
import { detectBackend } from '@/lib/backend/detector'
import { getServerUser, getServerProfile } from '@/lib/auth/server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function EndingBalancePage({ searchParams }: PageProps) {
  const backend = detectBackend()

  // 使用统一认证 API 获取当前用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一认证 API 获取用户配置
  const profile = await getServerProfile()

  if (!profile?.company_id) {
    redirect('/')
  }

  // 检测 store 模式
  const params = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(params)

  // 获取店铺列表
  const { data: stores } = await getActiveStores()

  // 判断是否为全局模式
  // 当 mode === 'all' 时，无论店铺数量多少，都视为全局模式（从店铺管理中心点击查看详细数据）
  const isGlobalMode = mode === 'all' || (mode === 'multi' && stores && stores.length > 1)

  // 获取店铺信息（如果是单店模式）
  let storeName: string | undefined
  if (storeId) {
    const store = stores?.find(s => s.id === storeId)
    storeName = store?.name
  }

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 根据后端类型获取交易数据
  let flatTransactions: any[] = []
  let beginningBalance = 0
  let newStoreCapitalInvestments: NewStoreCapitalInvestment[] = []
  let existingStoreCount = 0
  let newStoreCount = 0
  let existingStoreNames: string[] = []

  if (backend === 'leancloud') {
    // LeanCloud 模式：使用统一后端 API
    const { getTransactions } = await import('@/lib/backend/transactions')
    const { getCategories } = await import('@/lib/backend/categories')

    // 获取分类数据用于映射
    const { data: categories } = await getCategories()
    // 创建按分类名称和 ID 的双重映射（兼容 camelCase 和 snake_case 字段名）
    const categoryMap = new Map<string, { cash_flow_activity: string, transaction_nature?: string, include_in_profit_loss: boolean }>()
    categories?.forEach((c: any) => {
      const info = {
        cash_flow_activity: c.cashFlowActivity || c.cash_flow_activity || 'operating',
        transaction_nature: c.transactionNature || c.transaction_nature || 'operating',
        include_in_profit_loss: c.includeInProfitLoss ?? c.include_in_profit_loss ?? true
      }
      categoryMap.set(c.id, info)
      categoryMap.set(c.name, info)
    })

    // 根据店铺模式决定查询参数
    const targetStoreIds = storeIds.length > 0 ? storeIds : (stores?.map(s => s.id) || [])

    // 获取期间内交易
    if (targetStoreIds.length > 0) {
      const allResults = await Promise.all(
        targetStoreIds.map(sid =>
          getTransactions({
            storeId: sid,
            startDate: dateValidation.startDate,
            endDate: dateValidation.endDate,
          })
        )
      )
      flatTransactions = allResults.flatMap(r => r.data || []).map((t: any) => {
        const categoryInfo = categoryMap.get(t.categoryId) || categoryMap.get(t.category)
        const store = stores?.find(s => s.id === (t.storeId || t.store_id))
        const txCashFlowActivity = t.cashFlowActivity || t.cash_flow_activity
        const txNature = t.nature || t.transaction_nature
        const txIncludeInPL = t.includeInProfitLoss ?? t.include_in_profit_loss
        return {
          ...t,
          store_id: t.storeId || t.store_id,
          category_id: t.categoryId || t.category_id,
          cash_flow_activity: txCashFlowActivity || categoryInfo?.cash_flow_activity || 'operating',
          transaction_nature: txNature || categoryInfo?.transaction_nature || 'operating',
          include_in_profit_loss: txIncludeInPL ?? categoryInfo?.include_in_profit_loss ?? true,
          store_name: store?.name || undefined
        }
      })
    }

    // 按日期排序
    flatTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 计算期初余额和新店资本投入
    if (isGlobalMode && stores) {
      const targetStores = mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores

      // 获取所有交易用于计算各店铺期初余额
      const allTxResults = await Promise.all(
        targetStores.map(s => getTransactions({ storeId: s.id }))
      )
      const allTxFlat = allTxResults.flatMap(r => r.data || []).map(t => ({
        ...t,
        store_id: t.storeId,
        category_id: t.categoryId,
        cash_flow_activity: categoryMap.get(t.categoryId)?.cash_flow_activity || 'operating'
      }))

      targetStores.forEach(store => {
        const storeInitialDate = store.initial_balance_date
        if (storeInitialDate && storeInitialDate > dateValidation.startDate && storeInitialDate <= dateValidation.endDate) {
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
          existingStoreCount++
          existingStoreNames.push(store.name)

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
      const store = storeId
        ? stores.find(s => s.id === storeId)
        : (stores.length === 1 ? stores[0] : null)
      if (store && store.initial_balance_date) {
        const { data: allTxForBalance } = await getTransactions({ storeId: store.id })
        const allTxFlat = (allTxForBalance || []).map(t => ({
          ...t,
          store_id: t.storeId,
          category_id: t.categoryId,
          cash_flow_activity: categoryMap.get(t.categoryId)?.cash_flow_activity || 'operating'
        }))

        beginningBalance = calculateBeginningBalance(
          store.initial_balance || 0,
          store.initial_balance_date,
          dateValidation.startDate,
          allTxFlat
        )
      }
    }
  } else {
    // Supabase 模式：直接查询数据库
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    let periodQuery = supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories!category_id (
          cash_flow_activity,
          transaction_nature,
          include_in_profit_loss
        ),
        stores!store_id (
          id,
          name
        )
      `)
      .eq('company_id', profile.company_id)
      .gte('date', dateValidation.startDate)
      .lte('date', dateValidation.endDate)

    if (storeIds.length > 0) {
      periodQuery = periodQuery.in('store_id', storeIds)
    }

    const { data: allTransactions } = await periodQuery.order('date', { ascending: false })

    flatTransactions = allTransactions?.map(t => ({
      ...t,
      cash_flow_activity: t.transaction_categories?.cash_flow_activity,
      transaction_nature: t.transaction_categories?.transaction_nature,
      include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
      store_name: t.stores?.name || undefined
    })) || []

    if (isGlobalMode && stores) {
      const targetStores = mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores

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
          existingStoreCount++
          existingStoreNames.push(store.name)

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
      const store = storeId
        ? stores.find(s => s.id === storeId)
        : (stores.length === 1 ? stores[0] : null)
      if (store && store.initial_balance_date) {
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
