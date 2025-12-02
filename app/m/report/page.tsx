import { createClient } from '@/lib/supabase/server'
import { MobileReportPage } from '@/components/mobile/pages/report-page'
import { getStores, Store } from '@/lib/api/stores'

export default async function MobileReport() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // 获取店铺列表
  const storesResult = await getStores()
  const stores = (storesResult as { data?: Store[] }).data || []

  return (
    <MobileReportPage stores={stores} />
  )
}
