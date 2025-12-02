'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/auth/actions'
import { Lock, User, AlertCircle } from 'lucide-react'

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

/**
 * 移动端登录表单组件 - 与桌面端保持一致
 */
export function MobileLoginForm() {
  const [state, formAction] = useActionState(login, {})

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-2">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-center text-2xl">欢迎回来</CardTitle>
        <CardDescription className="text-center">
          登录您的财务管理账户
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* 移动端登录后跳转到移动端首页 */}
          <input type="hidden" name="redirectTo" value="/m" />

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                密码
              </Label>
              <Link
                href="/m/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                忘记密码？
              </Link>
            </div>
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
      </CardContent>
    </Card>
  )
}

// 保留旧的导出以兼容
export { MobileLoginForm as MobileLoginPage }
