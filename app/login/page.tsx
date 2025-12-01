import { LoginForm } from '@/components/login-form'
import { RegisterOwnerForm } from '@/components/register-owner-form'
import { checkSystemHasUsers } from '@/lib/auth/actions'

// 强制动态渲染（每次请求都检查用户状态）
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const hasUsers = await checkSystemHasUsers()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {hasUsers ? <LoginForm /> : <RegisterOwnerForm />}
    </main>
  )
}
