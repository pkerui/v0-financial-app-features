import { MobileRecordPage } from '@/components/mobile/pages/record-page'
import { getTransactionCategories, type TransactionCategory } from '@/lib/backend/categories'
import { getStores, type Store } from '@/lib/backend/stores'
import { getFinancialSettings } from '@/lib/backend/financial-settings'
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

  // 获取财务设置（期初日期）
  const { data: financialSettings } = await getFinancialSettings()

  return (
    <MobileRecordPage
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
      stores={stores}
      initialBalanceDate={financialSettings?.initial_balance_date}
    />
  )
}
