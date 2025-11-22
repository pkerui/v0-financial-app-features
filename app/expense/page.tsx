import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsTable } from '@/components/transactions-table-enhanced'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function ExpensePage({ searchParams }: PageProps) {
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
  console.log('ExpensePage - User ID:', user.id)
  console.log('ExpensePage - Profile:', profile)
  console.log('ExpensePage - Profile Error:', profileError)
  console.log('ExpensePage - Company ID:', profile?.company_id)

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

  // 获取支出记录（使用验证后的日期进行服务端过滤）
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('type', 'expense')
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取支出记录失败:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">支出明细</h1>
              <p className="text-muted-foreground">查看和管理所有支出记录</p>
            </div>
          </div>
          <Link href="/voice-entry">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新增记录
            </Button>
          </Link>
        </div>

        {/* Table */}
        <TransactionsTable
          transactions={transactions || []}
          type="expense"
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
        />
      </div>
    </div>
  )
}
