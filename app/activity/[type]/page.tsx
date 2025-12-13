// @ts-nocheck
import { redirect } from 'next/navigation'
import { ActivityDetailClientWrapper } from '@/components/activity-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { type NewStoreCapitalInvestment } from '@/lib/services/cash-flow'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/backend/stores'
import { detectBackend } from '@/lib/backend/detector'

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
  const backend = detectBackend()

  // 验证activity类型
  if (!['operating', 'investing', 'financing'].includes(type)) {
    redirect('/dashboard')
  }

  // 检测 store 模式
  const searchParamsResolved = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(searchParamsResolved)

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams, {
    storeId: storeId || undefined
  })

  let companyId: string | null = null
  let transactions: any[] = []
  let stores: any[] = []
  let storeName: string | undefined
  let isGlobalMode = false
  let availableStores: { id: string; name: string }[] = []
  let newStoreCapitalInvestments: NewStoreCapitalInvestment[] = []

  if (backend === 'leancloud') {
    // LeanCloud 模式
    const { TransactionModel, TransactionCategoryModel, ProfileModel, StoreModel } = await import('@/lib/leancloud/models')
    const { getLCSession } = await import('@/lib/leancloud/cookies')

    const session = await getLCSession()
    if (!session) {
      redirect('/login')
    }

    // 获取用户 profile
    const { data: profile } = await ProfileModel.getByUserId(session.userId)
    if (!profile?.companyId) {
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

    companyId = profile.companyId

    // 获取店铺列表
    const { data: storesData } = await StoreModel.getByCompanyId(companyId)
    stores = storesData?.filter(s => s.status === 'active') || []

    // 判断是否为全局模式
    isGlobalMode = mode === 'all' || (mode === 'multi' && stores.length > 1)

    // 获取店铺信息（如果是单店模式）
    if (storeId) {
      const store = stores.find(s => s.id === storeId)
      storeName = store?.name
    }

    // 获取分类列表用于匹配 cash_flow_activity
    const { data: categories } = await TransactionCategoryModel.getByCompanyId(companyId)
    const categoryMap = new Map<string, any>(categories?.map(c => [c.name, c]) || [])

    // 获取交易记录
    let rawTransactions: any[] = []
    if (storeIds.length > 0) {
      // 多店或单店模式 - 分别查询每个店铺
      const allTransactionsPromises = storeIds.map(sid =>
        TransactionModel.getByStoreId(sid, {
          startDate: dateValidation.startDate,
          endDate: dateValidation.endDate
        })
      )
      const results = await Promise.all(allTransactionsPromises)
      rawTransactions = results.flatMap(r => r.data || [])
    } else {
      // 公司模式
      const { data: txData } = await TransactionModel.getByCompanyId(companyId, {
        startDate: dateValidation.startDate,
        endDate: dateValidation.endDate
      })
      rawTransactions = txData || []
    }

    // 获取店铺名称映射
    const storeMap = new Map(stores.map(s => [s.id, s.name]))

    // 按活动类型过滤并扁平化数据
    transactions = rawTransactions
      .filter(t => {
        const category = categoryMap.get(t.category)
        return category?.cashFlowActivity === type
      })
      .map(t => {
        const category = categoryMap.get(t.category)
        return {
          id: t.id,
          type: t.type,
          category: t.category,
          amount: t.amount,
          description: t.description,
          date: t.date,
          store_id: t.storeId,
          store_name: storeMap.get(t.storeId) || undefined,
          cash_flow_activity: category?.cashFlowActivity,
          transaction_nature: category?.transactionNature || 'operating',
          include_in_profit_loss: category?.includeInProfitLoss ?? true,
          created_at: t.createdAt
        }
      })
      .sort((a, b) => {
        // 先按日期倒序
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        // 日期相同按创建时间倒序
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    // 准备可用店铺列表
    availableStores = isGlobalMode
      ? (mode === 'multi' && storeIds.length > 0
          ? stores.filter(s => storeIds.includes(s.id))
          : stores
        ).map(s => ({ id: s.id, name: s.name }))
      : []

    // 筹资活动页面需要包含新店资本投入
    if (type === 'financing' && isGlobalMode) {
      const targetStores = mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores

      targetStores.forEach(store => {
        const storeInitialDate = store.initialBalanceDate
        if (storeInitialDate && storeInitialDate > dateValidation.startDate && storeInitialDate <= dateValidation.endDate) {
          // 新店：期初余额日期在查询期间内
          if (store.initialBalance && store.initialBalance > 0) {
            newStoreCapitalInvestments.push({
              storeId: store.id,
              storeName: store.name,
              amount: store.initialBalance,
              date: storeInitialDate
            })
          }
        }
      })
    }

  } else {
    // Supabase 模式 - 原有逻辑
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

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

    companyId = profile.company_id

    // 获取店铺列表
    const { data: storesData } = await getActiveStores()
    stores = storesData || []

    // 判断是否为全局模式
    isGlobalMode = mode === 'all' || (mode === 'multi' && stores.length > 1)

    // 获取店铺信息（如果是单店模式）
    if (storeId) {
      const store = stores.find(s => s.id === storeId)
      storeName = store?.name
    }

    // 获取该活动的交易记录（使用验证后的日期）
    let query = supabase
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
      .eq('company_id', companyId)
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
    transactions = rawTransactions
      ?.filter(t => t.transaction_categories?.cash_flow_activity === type)
      .map(t => ({
        ...t,
        cash_flow_activity: t.transaction_categories?.cash_flow_activity,
        transaction_nature: t.transaction_categories?.transaction_nature,
        include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
        store_name: t.stores?.name || undefined
      })) || []

    // 准备可用店铺列表
    availableStores = isGlobalMode
      ? (mode === 'multi' && storeIds.length > 0
          ? stores.filter(s => storeIds.includes(s.id))
          : stores
        ).map(s => ({ id: s.id, name: s.name }))
      : []

    // 筹资活动页面需要包含新店资本投入
    if (type === 'financing' && isGlobalMode) {
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
  }

  return (
    <ActivityDetailClientWrapper
      activity={type}
      allTransactions={transactions}
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
