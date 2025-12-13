// @ts-nocheck
import { redirect } from 'next/navigation'
import { TransactionsTable } from '@/components/transactions-table-enhanced'
import { StoreComparisonTable } from '@/components/store-comparison-table'
import { StoreComparisonChart } from '@/components/store-comparison-chart'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/backend/stores'
import { getBackUrl } from '@/lib/utils/navigation'
import type { UserRole } from '@/lib/auth/permissions'
import { detectBackend } from '@/lib/backend/detector'
import { getServerUser, getServerProfile } from '@/lib/auth/server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function ExpensePage({ searchParams }: PageProps) {
  const backend = detectBackend()

  // 使用统一认证 API 获取当前用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一认证 API 获取用户配置
  const profile = await getServerProfile()

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

  // 获取店铺列表（使用统一后端 API）
  const { data: stores } = await getActiveStores()

  // 检测店铺模式（支持单店、多店、全部店铺）
  const params = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(params)

  // 获取用户角色并构建返回链接
  const userRole: UserRole = (profile?.role as UserRole) || 'user'
  const backUrl = getBackUrl(userRole, storeId, storeIds)

  // 判断是否为全局模式（多店或全部店铺）
  const isGlobalMode = mode === 'all' || (mode === 'multi' && stores && stores.length > 1)

  // 确定要查询的店铺列表
  const targetStores = isGlobalMode
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores)
    : (storeId ? stores?.filter(s => s.id === storeId) : stores) || []

  // 根据后端类型获取分类和交易数据
  let expenseCategories: any[] = []
  let transactions: any[] = []

  if (backend === 'leancloud') {
    // LeanCloud 模式：使用统一后端 API
    const { getCategories } = await import('@/lib/backend/categories')
    const { getTransactions } = await import('@/lib/backend/transactions')

    const categoriesResult = await getCategories()
    expenseCategories = categoriesResult.data?.filter(c => c.type === 'expense') || []

    // 根据店铺模式决定查询参数
    const targetStoreIds = isGlobalMode
      ? targetStores.map(s => s.id)
      : (storeId ? [storeId] : storeIds)

    if (targetStoreIds.length > 0) {
      const allResults = await Promise.all(
        targetStoreIds.map(sid =>
          getTransactions({
            storeId: sid,
            startDate: dateValidation.startDate,
            endDate: dateValidation.endDate,
            type: 'expense',
          })
        )
      )
      transactions = allResults.flatMap(r => r.data || [])
    } else {
      const result = await getTransactions({
        startDate: dateValidation.startDate,
        endDate: dateValidation.endDate,
        type: 'expense',
      })
      transactions = result.data || []
    }

    // 按日期和创建时间排序
    transactions.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    // 创建分类映射（兼容 camelCase 和 snake_case 字段名）
    const categoryMap = new Map<string, { cash_flow_activity: string, transaction_nature: string, include_in_profit_loss: boolean }>()
    expenseCategories.forEach((c: any) => {
      const info = {
        cash_flow_activity: c.cashFlowActivity || c.cash_flow_activity || 'operating',
        transaction_nature: c.transactionNature || c.transaction_nature || 'operating',
        include_in_profit_loss: c.includeInProfitLoss ?? c.include_in_profit_loss ?? true
      }
      categoryMap.set(c.id, info)
      categoryMap.set(c.name, info)
    })

    // 转换字段名称，添加分类属性
    transactions = transactions.map((t: any) => {
      const categoryInfo = categoryMap.get(t.categoryId) || categoryMap.get(t.category)
      const txCashFlowActivity = t.cashFlowActivity || t.cash_flow_activity
      const txNature = t.nature || t.transaction_nature
      const txIncludeInPL = t.includeInProfitLoss ?? t.include_in_profit_loss
      return {
        ...t,
        store_id: t.storeId || t.store_id,
        category_id: t.categoryId || t.category_id,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        cash_flow_activity: txCashFlowActivity || categoryInfo?.cash_flow_activity || 'operating',
        transaction_nature: txNature || categoryInfo?.transaction_nature || 'operating',
        include_in_profit_loss: txIncludeInPL ?? categoryInfo?.include_in_profit_loss ?? true,
      }
    })
  } else {
    // Supabase 模式：直接查询数据库
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // 获取分类
    const { data: supabaseCategories } = await supabase
      .from('transaction_categories')
      .select('id, name, cash_flow_activity, transaction_nature')
      .eq('company_id', profile.company_id)
      .eq('type', 'expense')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    expenseCategories = supabaseCategories || []

    // 获取交易数据
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('type', 'expense')
      .gte('date', dateValidation.startDate)
      .lte('date', dateValidation.endDate)

    // 根据模式过滤店铺
    if (isGlobalMode) {
      const targetStoreIds = targetStores.map(s => s.id)
      if (targetStoreIds.length > 0) {
        query = query.in('store_id', targetStoreIds)
      }
    } else if (storeId) {
      query = query.eq('store_id', storeId)
    }

    const { data: supabaseTransactions, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取支出记录失败:', error)
    }
    transactions = supabaseTransactions || []
  }

  // 查找当前店铺名称
  const currentStore = stores?.find(s => s.id === storeId)

  // 构建页面标题
  const pageTitle = isGlobalMode
    ? `支出明细 - ${mode === 'multi' ? `${targetStores.length}家店铺` : '全部店铺'}`
    : `支出明细${currentStore ? ` - ${currentStore.name}` : ''}`

  const pageDescription = isGlobalMode
    ? (mode === 'multi'
        ? `查看${targetStores.map(s => s.name).join('、')}的支出记录`
        : '查看所有店铺的支出记录')
    : '查看和管理所有支出记录'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
                {pageTitle}
              </h1>
              <p className="text-muted-foreground">{pageDescription}</p>
            </div>
          </div>
          {/* 新增记录按钮 - 仅单店模式显示 */}
          {!isGlobalMode && (
            <Link href={storeId ? `/voice-entry?store=${storeId}` : '/voice-entry'}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                新增记录
              </Button>
            </Link>
          )}
        </div>

        {/* 支出表格 */}
        <TransactionsTable
          transactions={transactions || []}
          type="expense"
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          stores={stores || []}
          currentStoreId={storeId}
          categories={expenseCategories || []}
          initialBalanceDate={dateValidation.initialBalanceDate}
          showStoreColumn={isGlobalMode}
          userProfile={{
            id: user.id,
            role: (profile.role || 'user') as UserRole,
            managed_store_ids: profile.managed_store_ids || [],
          }}
        />

        {/* 多店对比区域 - 仅全局模式显示 */}
        {isGlobalMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* 左侧：店铺合计对比表 */}
            <StoreComparisonTable
              transactions={transactions || []}
              stores={targetStores || []}
              tableType="expense"
            />
            {/* 右侧：饼状图 */}
            <StoreComparisonChart
              transactions={transactions || []}
              stores={targetStores || []}
              chartType="expense"
              dateRangeLabel={`${dateValidation.startDate} 至 ${dateValidation.endDate}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
