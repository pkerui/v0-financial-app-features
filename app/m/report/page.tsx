import { MobileReportPage } from '@/components/mobile/pages/report-page'
import { getStores, type Store } from '@/lib/backend/stores'
import { getUser } from '@/lib/backend/auth'

export default async function MobileReport() {
  const user = await getUser()

  if (!user) {
    return null
  }

  // 获取店铺列表
  const storesResult = await getStores()
  const stores = storesResult.data || []

  return (
    <MobileReportPage stores={stores} />
  )
}
