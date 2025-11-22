import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityDetailClientWrapper } from '@/components/activity-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'

type PageProps = {
  params: Promise<{
    type: 'operating' | 'investing' | 'financing'
  }>
  searchParams: Promise<{
    startDate?: string
    endDate?: string
  }>
}

export default async function ActivityDetailPage({ params, searchParams }: PageProps) {
  const { type } = await params
  const supabase = await createClient()

  // 验证activity类型
  if (!['operating', 'investing', 'financing'].includes(type)) {
    redirect('/dashboard')
  }

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

  // 获取该活动的交易记录（使用验证后的日期）
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('cash_flow_activity', type)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <ActivityDetailClientWrapper
      activity={type}
      allTransactions={transactions || []}
      dateValidation={dateValidation}
    />
  )
}
