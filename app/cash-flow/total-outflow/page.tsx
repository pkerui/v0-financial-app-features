import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CashFlowSummaryDetailClientWrapper } from '@/components/cash-flow-summary-detail-client-wrapper'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { calculateBeginningBalance } from '@/lib/services/cash-flow'
import { getFinancialSettings } from '@/lib/api/financial-settings'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function TotalOutflowPage({ searchParams }: PageProps) {
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
        cash_flow_activity
      )
    `)
    .eq('company_id', profile.company_id)
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)
    .order('date', { ascending: false })

  const flatTransactions = allTransactions?.map(t => ({
    ...t,
    cash_flow_activity: t.transaction_categories?.cash_flow_activity
  })) || []

  // 获取期初余额
  const { data: financialSettings } = await getFinancialSettings()
  let beginningBalance = 0
  if (financialSettings) {
    // 获取所有交易用于计算期初余额
    const { data: allTxForBalance } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_categories!category_id (
          cash_flow_activity
        )
      `)
      .eq('company_id', profile.company_id)
      .order('date', { ascending: false })

    const allTxFlat = allTxForBalance?.map(t => ({
      ...t,
      cash_flow_activity: t.transaction_categories?.cash_flow_activity
    })) || []

    beginningBalance = calculateBeginningBalance(
      financialSettings.initial_cash_balance,
      financialSettings.initial_balance_date,
      dateValidation.startDate,
      allTxFlat
    )
  }

  return (
    <CashFlowSummaryDetailClientWrapper
      detailType="total-outflow"
      allTransactions={flatTransactions}
      dateValidation={dateValidation}
      beginningBalance={beginningBalance}
    />
  )
}
