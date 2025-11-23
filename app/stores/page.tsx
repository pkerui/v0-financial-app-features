import { Suspense } from 'react'
import { getStores } from '@/lib/api/stores'
import { StoreManagement } from '@/components/store-management'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function StoresPage() {
  const { data: stores, error } = await getStores()

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              回到总览
            </Button>
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">加载失败</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            回到总览
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>加载中...</div>}>
        <StoreManagement initialStores={stores || []} />
      </Suspense>
    </div>
  )
}
