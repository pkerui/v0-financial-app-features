import { MobileLoginForm } from '@/components/mobile/pages/login-page'
import { MobileRegisterOwnerForm } from '@/components/mobile/pages/register-owner-page'
import { checkSystemHasUsers } from '@/lib/backend/auth'

// 强制动态渲染（每次请求都检查用户状态）
export const dynamic = 'force-dynamic'

export const metadata = {
  title: '登录 - 财务管理系统',
}

export default async function MobileLogin() {
  const hasUsers = await checkSystemHasUsers()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {hasUsers ? <MobileLoginForm /> : <MobileRegisterOwnerForm />}
    </main>
  )
}
