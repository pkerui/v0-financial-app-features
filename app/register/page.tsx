import { RegisterOwnerForm } from '@/components/register-owner-form'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <RegisterOwnerForm />
        <p className="text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <Link href="/" className="text-primary hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    </main>
  )
}
