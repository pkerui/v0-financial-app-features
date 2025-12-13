import { VoiceEntryInterface } from '@/components/voice-entry-interface'
import { redirect } from 'next/navigation'
import { detectBackend } from '@/lib/backend/detector'
import { getServerUser } from '@/lib/auth/server'
import { getTransactionCategories } from '@/lib/backend/categories'
import { getActiveStores } from '@/lib/backend/stores'
import { getFinancialSettings } from '@/lib/backend/financial-settings'

type PageProps = {
  searchParams: Promise<{ store?: string }>
}

export default async function VoiceEntryPage({ searchParams }: PageProps) {
  const backend = detectBackend()
  const params = await searchParams

  // 使用统一认证 API 获取当前用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 获取分类数据（使用统一后端 API）
  const { data: allCategories } = await getTransactionCategories()
  const incomeCategories = allCategories?.filter(c => c.type === 'income') || []
  const expenseCategories = allCategories?.filter(c => c.type === 'expense') || []

  // 获取财务设置（使用统一后端 API）
  const { data: financialSettings } = await getFinancialSettings()

  // 获取活跃店铺列表（使用统一后端 API）
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
