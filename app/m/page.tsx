import { MobileHomePage } from '@/components/mobile/pages/home-page'
import { getTransactions } from '@/lib/backend/transactions'
import { getStores, type Store } from '@/lib/backend/stores'
import { getCurrentProfile } from '@/lib/backend/auth'
import { getToday } from '@/lib/utils/date'

export default async function MobileHome() {
  // 获取用户信息
  const profile = await getCurrentProfile()

  if (!profile) {
    return null
  }

  // 获取店铺列表
  const storesResult = await getStores()
  const stores = (storesResult as { data?: Store[] }).data || []

  // 获取今日交易统计
  const today = getToday()
  const result = await getTransactions({
    startDate: today,
    endDate: today,
  })
  const todayTransactions = (result as { data?: Array<{ type: string; amount: number }> }).data || []

  // 计算今日汇总
  const todayIncome = todayTransactions
    .filter((t: { type: string }) => t.type === 'income')
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

  const todayExpense = todayTransactions
    .filter((t: { type: string }) => t.type === 'expense')
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

  // 确定显示的店铺名称
  const storeName = stores.length === 1 ? stores[0].name : '全部店铺'

  return (
    <MobileHomePage
      userName={profile.full_name || '用户'}
      storeName={storeName}
      todayIncome={todayIncome}
      todayExpense={todayExpense}
      todayNet={todayIncome - todayExpense}
    />
  )
}
