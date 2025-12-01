'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { resetPassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Lock, AlertCircle, CheckCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      disabled={pending}
    >
      {pending ? '重置中...' : '重置密码'}
    </Button>
  )
}

export default function ResetPasswordPage() {
  const [state, formAction] = useActionState(resetPassword, {})
  const router = useRouter()

  // 重置成功后跳转到登录页
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push('/login')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.success, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">重置密码</CardTitle>
          <CardDescription className="text-center">
            请输入新密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.success ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-lg font-medium mb-2">密码重置成功！</p>
              <p className="text-sm text-muted-foreground">
                正在跳转到登录页面...
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {state.error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  新密码
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="至少6位"
                  className="bg-input"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  确认密码
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  className="bg-input"
                  required
                />
              </div>

              <SubmitButton />
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
