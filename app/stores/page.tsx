import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerUser, getServerProfile } from '@/lib/auth/server'
import { getActiveStores } from '@/lib/backend/stores'
import { StoreHub } from '@/components/store-hub'
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { getStoreHubMetrics } from '@/lib/features/store-hub'
import type { UserRole } from '@/lib/auth/permissions'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function StoresPage({ searchParams }: PageProps) {
  // 使用统一的认证辅助函数获取用户（支持 Supabase 和 LeanCloud）
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一的认证辅助函数获取 profile
  const profile = await getServerProfile()

  const userRole: UserRole = (profile?.role as UserRole) || 'user'

  const { data: stores, error } = await getActiveStores()

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

  // 获取汇总指标
  const metricsResult = await getStoreHubMetrics({
    startDate: dateValidation.startDate,
    endDate: dateValidation.endDate,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <Suspense fallback={<div>加载中...</div>}>
          <StoreHub
            stores={stores || []}
            initialStartDate={dateValidation.startDate}
            initialEndDate={dateValidation.endDate}
            metrics={metricsResult.data?.summary}
            storeMetrics={metricsResult.data?.byStore}
            minDate={dateValidation.initialBalanceDate}
            userRole={userRole}
          />
        </Suspense>
      </div>
    </div>
  )
}
