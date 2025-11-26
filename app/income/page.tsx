import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsTable } from '@/components/transactions-table-enhanced'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getActiveStores } from '@/lib/api/stores'
import { IncomeAggregationView } from '@/components/income-aggregation-view'

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

  // 获取用户配置
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id')
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

  // 构建返回链接
  const dashboardUrl = storeId
    ? `/dashboard?store=${storeId}`
    : storeIds.length > 0
    ? `/dashboard?stores=${storeIds.join(',')}`
    : '/dashboard'

  // 根据模式获取数据
  // 多店汇总模式：显示选中店铺的汇总数据
  if ((mode === 'multi' || mode === 'all') && stores && stores.length > 1) {
    // 确定要汇总的店铺列表
    const targetStores = mode === 'multi' && storeIds.length > 0
      ? stores.filter(s => storeIds.includes(s.id))
      : stores
    // 多店汇总模式：获取每个店铺的收入汇总数据
    const storeSummaries = await Promise.all(
      targetStores.map(async (store) => {
        const { data: storeTransactions } = await supabase
          .from('transactions')
          .select('category, amount, description, date, transaction_nature')
          .eq('company_id', profile.company_id)
          .eq('store_id', store.id)
          .eq('type', 'income')
          .gte('date', dateValidation.startDate)
          .lte('date', dateValidation.endDate)
          .order('date', { ascending: false })

        // 按分类汇总
        const byCategory: Record<string, { count: number; amount: number }> = {}
        let total = 0

        storeTransactions?.forEach((tx) => {
          if (!byCategory[tx.category]) {
            byCategory[tx.category] = { count: 0, amount: 0 }
          }
          byCategory[tx.category].count++
          byCategory[tx.category].amount += tx.amount
          total += tx.amount
        })

        return {
          store,
          total,
          count: storeTransactions?.length || 0,
          byCategory,
          transactions: storeTransactions || [],
        }
      })
    )

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={dashboardUrl}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回总览
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                收入汇总 - {mode === 'multi' ? `${targetStores.length}家店铺` : '全部店铺'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'multi'
                  ? `查看${targetStores.map(s => s.name).join('、')}的收入汇总`
                  : '查看所有店铺的收入汇总'
                }
              </p>
            </div>
          </div>

          <IncomeAggregationView
            storeSummaries={storeSummaries}
            stores={targetStores}
            startDate={dateValidation.startDate}
            endDate={dateValidation.endDate}
          />
        </div>
      </div>
    )
  }

  // 单店模式：显示传统的交易列表
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('type', 'income')
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  if (storeId) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href={dashboardUrl}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回总览
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                收入明细{currentStore ? ` - ${currentStore.name}` : ''}
              </h1>
              <p className="text-muted-foreground">查看和管理所有收入记录</p>
            </div>
          </div>
          <Link href={storeId ? `/voice-entry?store=${storeId}` : '/voice-entry'}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增记录
            </Button>
          </Link>
        </div>

        {/* Table */}
        <TransactionsTable
          transactions={transactions || []}
          type="income"
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
          stores={stores || []}
          currentStoreId={storeId}
          categories={incomeCategories || []}
        />
      </div>
    </div>
  )
}
