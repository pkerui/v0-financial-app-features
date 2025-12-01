import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsTable } from '@/components/transactions-table-enhanced'
import { StoreComparisonTable } from '@/components/store-comparison-table'
import { StoreComparisonChart } from '@/components/store-comparison-chart'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'
import { getBackUrl } from '@/lib/utils/navigation'
import type { UserRole } from '@/lib/auth/permissions'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string; store?: string; stores?: string }>
}

export default async function IncomePage({ searchParams }: PageProps) {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取用户配置（包含角色和管理的店铺）
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role, managed_store_ids')
    .eq('id', user.id)
    .single()

  // 调试信息
  console.log('IncomePage - User ID:', user.id)
  console.log('IncomePage - Profile:', profile)
  console.log('IncomePage - Profile Error:', profileError)
  console.log('IncomePage - Company ID:', profile?.company_id)

  if (!profile?.company_id) {
    console.error('❌ No company_id found for user:', user.id)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">配置错误</h1>
          <p className="text-muted-foreground mb-4">
            您的账户还没有关联公司。请联系管理员或重新登录。
          </p>
          <p className="text-xs text-muted-foreground">
            User ID: {user.id}<br/>
            Profile Error: {profileError?.message || 'None'}<br/>
            Company ID: {profile?.company_id || 'NULL'}
          </p>
        </div>
      </div>
    )
  }

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取店铺列表
  const { data: stores } = await getActiveStores()

  // 获取收入分类列表（从数据库）
  const { data: incomeCategories } = await supabase
    .from('transaction_categories')
    .select('id, name, cash_flow_activity, transaction_nature')
    .eq('company_id', profile.company_id)
    .eq('type', 'income')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  // 检测店铺模式（支持单店、多店、全部店铺）
  const params = await searchParams
  const { mode, storeId, storeIds } = getStoreModeServer(params)

  // 获取用户角色
  const userRole: UserRole = (profile?.role as UserRole) || 'user'

  // 构建返回链接 - 使用统一的导航函数
  const backUrl = getBackUrl(userRole, storeId, storeIds)

  // 判断是否为全局模式（多店或全部店铺）
  const isGlobalMode = (mode === 'multi' || mode === 'all') && stores && stores.length > 1

  // 确定要查询的店铺列表
  const targetStores = isGlobalMode
    ? (mode === 'multi' && storeIds.length > 0
        ? stores.filter(s => storeIds.includes(s.id))
        : stores)
    : (storeId ? stores?.filter(s => s.id === storeId) : stores) || []

  // 获取交易数据
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('type', 'income')
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  // 根据模式过滤店铺
  if (isGlobalMode) {
    // 全局模式：查询所有选中店铺的交易
    const targetStoreIds = targetStores.map(s => s.id)
    if (targetStoreIds.length > 0) {
      query = query.in('store_id', targetStoreIds)
    }
  } else if (storeId) {
    // 单店模式：只查询单个店铺
    query = query.eq('store_id', storeId)
  }

  const { data: transactions, error } = await query
    .order('date', { ascending: false })
    .order('created_at', { ascending: false})

  if (error) {
    console.error('获取收入记录失败:', error)
  }

  // 查找当前店铺名称
  const currentStore = stores?.find(s => s.id === storeId)

  // 构建页面标题
  const pageTitle = isGlobalMode
    ? `收入明细 - ${mode === 'multi' ? `${targetStores.length}家店铺` : '全部店铺'}`
    : `收入明细${currentStore ? ` - ${currentStore.name}` : ''}`

  const pageDescription = isGlobalMode
    ? (mode === 'multi'
        ? `查看${targetStores.map(s => s.name).join('、')}的收入记录`
        : '查看所有店铺的收入记录')
    : '查看和管理所有收入记录'

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

        {/* 收入表格 */}
        <TransactionsTable
          transactions={transactions || []}
          type="income"
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          stores={stores || []}
          currentStoreId={storeId}
          categories={incomeCategories || []}
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
              tableType="income"
            />
            {/* 右侧：饼状图 */}
            <StoreComparisonChart
              transactions={transactions || []}
              stores={targetStores || []}
              chartType="income"
              dateRangeLabel={`${dateValidation.startDate} 至 ${dateValidation.endDate}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}
