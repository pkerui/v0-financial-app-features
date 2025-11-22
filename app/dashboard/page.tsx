import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard-content'

export default async function DashboardPage() {
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

  // 获取所有交易记录
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('date', { ascending: false })

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
      />
    </main>
  )
}
