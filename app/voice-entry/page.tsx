import { VoiceEntryInterface } from '@/components/voice-entry-interface'
import { getTransactionCategories } from '@/lib/api/transaction-categories'
import { getFinancialSettings } from '@/lib/api/financial-settings'
import { getActiveStores } from '@/lib/api/stores'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  searchParams: Promise<{ store?: string }>
}

export default async function VoiceEntryPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取分类数据
  const { data: incomeCategories } = await getTransactionCategories('income')
  const { data: expenseCategories } = await getTransactionCategories('expense')

  // 获取财务设置
  const { data: financialSettings } = await getFinancialSettings()

  // 获取活跃店铺列表
  const { data: stores } = await getActiveStores()

  return (
    <main className="min-h-screen bg-background">
      <VoiceEntryInterface
        incomeCategories={incomeCategories || []}
        expenseCategories={expenseCategories || []}
        initialBalanceDate={financialSettings?.initial_balance_date}
        stores={stores || []}
        defaultStoreId={params.store}
      />
    </main>
  )
}
