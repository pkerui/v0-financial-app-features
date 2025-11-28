import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsTableAll } from '@/components/transactions-table-all'
import { StoreComparisonTable } from '@/components/store-comparison-table'
import { StoreComparisonChart } from '@/components/store-comparison-chart'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function TransactionsPage({ searchParams }: PageProps) {
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

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取店铺列表
  const { data: stores } = await getActiveStores()

  // 获取所有分类列表（收入+支出，从数据库）
  const { data: allCategories } = await supabase
    .from('transaction_categories')
    .select('id, name, type, cash_flow_activity, transaction_nature')
    .eq('company_id', profile.company_id)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  // 检测店铺模式（支持单店、多店、全部店铺）
  const params = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(params)

  // 判断是否为全局模式（多店或全部店铺）
  const isGlobalMode = (mode === 'multi' || mode === 'all') && stores && stores.length > 1

  // 确定要查询的店铺列表
  const targetStores = isGlobalMode
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores)
    : (storeId ? stores?.filter(s => s.id === storeId) : stores) || []

  // 构建查询
  let query = supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        transaction_nature,
        include_in_profit_loss
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  // 根据店铺模式过滤
  if (isGlobalMode) {
    // 全局模式：查询所有选中店铺的交易
    const targetStoreIds = targetStores.map(s => s.id)
    if (targetStoreIds.length > 0) {
      query = query.in('store_id', targetStoreIds)
    }
  } else if (storeId) {
    // 单店模式：只查询单个店铺
    query = query.eq('store_id', storeId)
  } else if (storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  // 获取所有交易记录（使用验证后的日期进行服务端过滤）
  const { data: allTransactions } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  // 将 JOIN 的数据转换为扁平结构，如果没有从数据库获取到 cash_flow_activity，则回退到配置文件
  const transactions = allTransactions?.map(t => {
    let activity = t.transaction_categories?.cash_flow_activity
    let nature = t.transaction_categories?.transaction_nature
    let includeInProfitLoss = t.transaction_categories?.include_in_profit_loss

    // 如果数据库中没有活动类型（迁移未执行或category_id为空），回退到配置文件
    if (!activity) {
      const { getCategoryMapping } = require('@/lib/cash-flow-config')
      const mapping = getCategoryMapping(t.type, t.category)
      activity = mapping?.activity || null
    }

    return {
      ...t,
      cash_flow_activity: activity,
      transaction_nature: nature,
      include_in_profit_loss: includeInProfitLoss
    }
  }) || []

  // 查找当前店铺名称
  const currentStore = storeId ? stores?.find(s => s.id === storeId) : null

  // 构建返回链接
  const dashboardUrl = storeId
    ? `/dashboard?store=${storeId}`
    : storeIds.length > 0
    ? `/dashboard?stores=${storeIds.join(',')}`
    : '/dashboard'

  // 构建新增记录链接
  const voiceEntryUrl = storeId ? `/voice-entry?store=${storeId}` : '/voice-entry'

  // 构建页面标题
  const pageTitle = isGlobalMode
    ? `交易汇总 - ${mode === 'multi' ? `${targetStores.length}家店铺` : '全部店铺'}`
    : `交易汇总${currentStore ? ` - ${currentStore.name}` : ''}`

  const pageDescription = isGlobalMode
    ? (mode === 'multi'
        ? `查看${targetStores.map(s => s.name).join('、')}的交易记录`
        : '查看所有店铺的交易记录')
    : (currentStore
        ? `查看和管理${currentStore.name}的所有交易记录`
        : '查看和管理所有交易记录')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Link href={dashboardUrl}>
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
                {pageTitle}
              </h1>
              <p className="text-muted-foreground">
                {pageDescription}
              </p>
            </div>
          </div>
          {/* 新增记录按钮 - 仅单店模式显示 */}
          {!isGlobalMode && (
            <Link href={voiceEntryUrl}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增记录
              </Button>
            </Link>
          )}
        </div>

        {/* 交易表格 */}
        <TransactionsTableAll
          transactions={transactions || []}
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          categories={allCategories || []}
          initialBalanceDate={dateValidation.initialBalanceDate}
          stores={stores || []}
          showStoreColumn={isGlobalMode}
        />

        {/* 多店对比区域 - 仅全局模式显示 */}
        {isGlobalMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* 左侧：店铺合计对比表 */}
            <StoreComparisonTable
              transactions={transactions || []}
              stores={targetStores || []}
              tableType="all"
            />
            {/* 右侧：饼状图 */}
            <StoreComparisonChart
              transactions={transactions || []}
              stores={targetStores || []}
              chartType="all"
              dateRangeLabel={`${dateValidation.startDate} 至 ${dateValidation.endDate}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
