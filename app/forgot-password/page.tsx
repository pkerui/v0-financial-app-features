'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, User, AlertCircle, ArrowLeft } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      disabled={pending}
    >
      {pending ? '发送中...' : '发送重置链接'}
    </Button>
  )
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(requestPasswordReset, {})

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl">忘记密码</CardTitle>
          <CardDescription className="text-center">
            输入用户名，重置链接将发送到绑定的邮箱
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {state.success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{state.success}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                用户名
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                className="bg-input"
                required
              />
            </div>

            <SubmitButton />
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
