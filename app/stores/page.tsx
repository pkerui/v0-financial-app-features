import { Suspense } from 'react'
import { getStores } from '@/lib/api/stores'
import { StoreHub } from '@/components/store-hub'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function StoresPage({ searchParams }: PageProps) {
  const { data: stores, error } = await getStores()

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">加载失败</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  // 验证日期范围
  const dateValidation = await validateDateRangeFromParams(searchParams)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Suspense fallback={<div>加载中...</div>}>
          <StoreHub
            stores={stores || []}
            initialStartDate={dateValidation.startDate}
            initialEndDate={dateValidation.endDate}
          />
        </Suspense>
      </div>
    </div>
  )
}
