import { MobileRecordPage } from '@/components/mobile/pages/record-page'
import { getTransactionCategories, type TransactionCategory } from '@/lib/backend/categories'
import { getStores, type Store } from '@/lib/backend/stores'
import { getUser } from '@/lib/backend/auth'

export default async function MobileRecord() {
  const user = await getUser()

  if (!user) {
    return null
  }

  // 获取分类
  const categoriesResult = await getTransactionCategories()
  const allCategories = categoriesResult.data || []
  const incomeCategories = allCategories.filter(c => c.type === 'income')
  const expenseCategories = allCategories.filter(c => c.type === 'expense')

  // 获取店铺
  const storesResult = await getStores()
  const stores = storesResult.data || []

  return (
    <MobileRecordPage
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
      stores={stores}
    />
  )
}
