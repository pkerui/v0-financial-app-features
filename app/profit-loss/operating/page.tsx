import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfitLossDetailClientWrapper } from '@/components/profit-loss-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function ProfitLossOperatingPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    redirect('/')
  }

  // 验证日期范围（包含期初余额日期检查）
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 获取所有交易（使用验证后的日期）
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_categories!category_id (
        cash_flow_activity,
        include_in_profit_loss,
        transaction_nature
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)
    .order('date', { ascending: false })

  const flatTransactions = allTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity,
    include_in_profit_loss: t.transaction_categories?.include_in_profit_loss,
    transaction_nature: t.transaction_categories?.transaction_nature
  })) || []

  return (
    <ProfitLossDetailClientWrapper
      detailType="operating"
      allTransactions={flatTransactions}
      dateValidation={dateValidation}
    />
  )
}
