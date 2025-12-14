import { MobileLoginForm } from '@/components/mobile/pages/login-page'
import { MobileRegisterOwnerForm } from '@/components/mobile/pages/register-owner-page'
import { checkSystemHasUsers } from '@/lib/backend/auth'

// 强制动态渲染（每次请求都检查用户状态）
export const dynamic = 'force-dynamic'

export const metadata = {
  title: '登录 - 财务管理系统',
}

export default async function MobileLogin() {
  let hasUsers = true // 默认假设有用户（显示登录表单）
  let errorMessage: string | null = null

  try {
    hasUsers = await checkSystemHasUsers()
  } catch (error: any) {
    console.error('[MobileLogin] checkSystemHasUsers error:', error)
    errorMessage = error?.message || String(error)
    // 发生错误时默认显示登录表单
    hasUsers = true
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {errorMessage && (
        <div className="fixed top-4 left-4 right-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-xs z-50">
          <strong>Debug:</strong> {errorMessage}
        </div>
      )}
      {hasUsers ? <MobileLoginForm /> : <MobileRegisterOwnerForm />}
    </main>
  )
}
