'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, AlertCircle } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      disabled={pending}
    >
      {pending ? '正在登录...' : '登录'}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, {})

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-2">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-center text-2xl">欢迎回来</CardTitle>
        <CardDescription className="text-center">
          登录您的民宿管理账户
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{state.error}</span>
            </div>
          )}

          {state.success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{state.success}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              邮箱地址
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@example.com"
              className="bg-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              密码
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="bg-input"
              required
            />
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 space-y-3 pt-4 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">演示账户</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>邮箱: <span className="text-foreground font-mono">demo@homestay.com</span></p>
            <p>密码: <span className="text-foreground font-mono">demo123</span></p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
