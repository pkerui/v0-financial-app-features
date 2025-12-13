import { redirect } from 'next/navigation'
import { detectBackend } from '@/lib/backend/detector'
import { getServerUser, getServerProfile } from '@/lib/auth/server'
import { DashboardContent } from '@/components/dashboard-content'
import { getActiveStores } from '@/lib/backend/stores'
import { getTransactions } from '@/lib/backend/transactions'
import type { UserRole } from '@/lib/auth/permissions'

type PageProps = {
  searchParams: Promise<{ store?: string; stores?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const backend = detectBackend()
  const params = await searchParams

  // 支持三种模式：
  // 1. ?store=id - 单店模式（向后兼容）
  // 2. ?stores=id1,id2,id3 - 多店模式
  // 3. 无参数 - 全局模式（默认全选所有活跃店铺）
  const singleStoreId = params.store
  const multiStoreIds = params.stores?.split(',').filter(Boolean)

  // 获取所有店铺信息（提前获取，用于默认全选）
  const { data: allStores } = await getActiveStores()

  // 确定选中的店铺ID列表
  // 如果没有指定店铺参数，默认选中所有活跃店铺
  const selectedStoreIds = multiStoreIds
    || (singleStoreId ? [singleStoreId] : (allStores?.map(s => s.id) || []))

  // 使用统一的认证辅助函数获取用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一的认证辅助函数获取 profile
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

  // 权限检查：单店权限用户（manager/user）不能访问全局总览
  const userRole: UserRole = (profile?.role as UserRole) || 'user'
  const canViewGlobalData = userRole === 'owner' || userRole === 'accountant'
  const isGlobalMode = !singleStoreId && !multiStoreIds

  // 如果是单店权限用户且尝试访问全局模式，重定向到店铺管理页面
  if (!canViewGlobalData && isGlobalMode) {
    redirect('/stores')
  }

  // 获取当前选中的店铺（allStores 已在上面获取）
  const selectedStores = selectedStoreIds.length > 0
    ? allStores?.filter(s => selectedStoreIds.includes(s.id)) || []
    : []

  // 向后兼容：单店模式
  const currentStore = singleStoreId && !multiStoreIds
    ? selectedStores[0] || null
    : null

  // 获取交易记录（使用统一后端 API）
  // 注意：统一 API 会自动处理不同后端的认证和数据获取
  const transactionResult = await getTransactions()
  let transactions = transactionResult.data || []

  // 如果指定了店铺，在客户端过滤
  if (selectedStoreIds.length > 0) {
    transactions = transactions.filter(t =>
      t.storeId && selectedStoreIds.includes(t.storeId)
    )
  }

  // 按日期排序
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // 计算总收入和总支出
  const totalIncome = transactions
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const totalExpense = transactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0

  const netProfit = totalIncome - totalExpense

  // 计算本月数据
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthTransactions = transactions?.filter(t => {
    const date = new Date(t.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }) || []

  const thisMonthIncome = thisMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const thisMonthExpense = thisMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <main className="min-h-screen bg-background">
      <DashboardContent
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netProfit={netProfit}
        thisMonthIncome={thisMonthIncome}
        thisMonthExpense={thisMonthExpense}
        transactions={transactions || []}
        currentStore={currentStore}
        allStores={allStores || []}
        selectedStores={selectedStores}
      />
    </main>
  )
}
