import { redirect } from 'next/navigation'
import { StoreSettingsContent } from '@/components/store-settings-content'
import { getStores } from '@/lib/backend/stores'
import type { UserRole } from '@/lib/auth/permissions'
import { getServerUser, getServerProfile } from '@/lib/auth/server'

export default async function StoreSettingsPage() {
  // 使用统一认证 API 获取当前用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一认证 API 获取用户配置
  const profile = await getServerProfile()

  if (!profile?.company_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">配置错误</h1>
          <p className="text-muted-foreground">
            您的账户还没有关联公司。请联系管理员。
          </p>
        </div>
      </div>
    )
  }

  // 获取所有店铺（使用统一后端 API）
  const { data: stores, error } = await getStores()

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">加载失败</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <StoreSettingsContent
          stores={stores || []}
          currentUserId={user.id}
          currentUserRole={(profile.role || 'user') as UserRole}
        />
      </div>
    </div>
  )
}
