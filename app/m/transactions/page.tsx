import { MobileTransactionsPage } from '@/components/mobile/pages/transactions-page'
import { getStores, type Store } from '@/lib/backend/stores'
import { getTransactionCategories } from '@/lib/backend/categories'
import { getCurrentProfile } from '@/lib/backend/auth'
import { redirect } from 'next/navigation'

export default async function MobileTransactions() {
  // 获取用户信息和角色
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  // 检查权限：只有 owner, accountant, manager 可以访问
  const allowedRoles = ['owner', 'accountant', 'manager']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/m')
  }

  // 获取店铺列表
  const storesResult = await getStores()
  const stores = storesResult.data || []

  // 获取分类列表
  const categoriesResult = await getTransactionCategories()
  const categories = categoriesResult.data || []

  return (
    <MobileTransactionsPage
      stores={stores}
      categories={categories}
      userRole={profile.role}
      managedStoreIds={profile.managed_store_ids || []}
    />
  )
}
