import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsTableAll } from '@/components/transactions-table-all'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
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

  // 获取所有交易记录（使用验证后的日期进行服务端过滤）
  const { data: allTransactions } = await supabase
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
              <h1 className="text-3xl font-bold text-foreground">交易汇总</h1>
              <p className="text-muted-foreground">查看和管理所有交易记录</p>
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
        <TransactionsTableAll
          transactions={transactions || []}
          initialStartDate={dateValidation.startDate}
          initialEndDate={dateValidation.endDate}
        />
      </div>
    </div>
  )
}
