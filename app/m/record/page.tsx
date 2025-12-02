import { createClient } from '@/lib/supabase/server'
import { MobileRecordPage } from '@/components/mobile/pages/record-page'
import { getTransactionCategories, TransactionCategory } from '@/lib/api/transaction-categories'
import { getStores, Store } from '@/lib/api/stores'

export default async function MobileRecord() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 获取分类
  const categoriesResult = await getTransactionCategories()
  const allCategories = (categoriesResult as { data?: TransactionCategory[] }).data || []
  const incomeCategories = allCategories.filter(c => c.type === 'income')
  const expenseCategories = allCategories.filter(c => c.type === 'expense')

  // 获取店铺
  const storesResult = await getStores()
  const stores = (storesResult as { data?: Store[] }).data || []

  return (
    <MobileRecordPage
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
      stores={stores}
    />
  )
}
