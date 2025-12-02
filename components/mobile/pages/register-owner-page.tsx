'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { registerOwner } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, User, Lock, Mail, AlertCircle, UserPlus } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      disabled={pending}
    >
      {pending ? '创建中...' : '创建账户并开始使用'}
    </Button>
  )
}

/**
 * 移动端老板注册表单组件 - 与桌面端保持一致
 */
export function MobileRegisterOwnerForm() {
  const [state, formAction] = useActionState(registerOwner, {})

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mx-auto mb-2">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-center text-2xl">欢迎使用</CardTitle>
        <CardDescription className="text-center">
          创建管理员账户开始管理您的财务
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {/* 移动端注册后跳转到移动端首页 */}
          <input type="hidden" name="redirectTo" value="/m" />

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
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              公司/店铺名称
            </Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="例如：阳光公司"
              className="bg-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              您的姓名
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="请输入姓名"
              className="bg-input"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              用户名
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="字母、数字、下划线"
              className="bg-input"
              required
            />
            <p className="text-xs text-muted-foreground">用于登录系统</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              登录密码
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
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              找回密码邮箱
              <span className="text-xs text-muted-foreground">(可选)</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="用于找回密码"
              className="bg-input"
            />
            <p className="text-xs text-muted-foreground">
              忘记密码时可通过此邮箱重置
            </p>
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
