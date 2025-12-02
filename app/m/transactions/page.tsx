import { createClient } from '@/lib/supabase/server'
import { MobileTransactionsPage } from '@/components/mobile/pages/transactions-page'
import { getStores, Store } from '@/lib/api/stores'
import { getTransactionCategories } from '@/lib/api/transaction-categories'
import { redirect } from 'next/navigation'

export default async function MobileTransactions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 获取用户角色
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, managed_store_ids')
    .eq('id', user.id)
    .single()

  // 检查权限：只有 owner, accountant, manager 可以访问
  const allowedRoles = ['owner', 'accountant', 'manager']
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/m')
  }

  // 获取店铺列表
  const storesResult = await getStores()
  const stores = (storesResult as { data?: Store[] }).data || []

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
