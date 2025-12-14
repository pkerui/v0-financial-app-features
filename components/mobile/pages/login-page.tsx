'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/lib/auth/actions'
import { Lock, User, AlertCircle, Building2, Loader2 } from 'lucide-react'

/**
 * 移动端登录表单组件 - 与桌面端保持一致
 */
export function MobileLoginForm() {
  const [companyCode, setCompanyCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('companyCode', companyCode.trim().toUpperCase())
      formData.append('username', username.trim())
      formData.append('password', password)
      formData.append('redirectTo', '/m')

      const result = await login({}, formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.redirectTo) {
        // 使用 window.location.href 确保 cookies 被正确处理
        window.location.href = result.redirectTo
      }
    } catch (err) {
      setError('登录失败，请重试')
      setLoading(false)
    }
  }

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
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="companyCode" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              公司码
            </Label>
            <Input
              id="companyCode"
              type="text"
              placeholder="6位公司码（如 ABC123）"
              className="bg-input uppercase"
              maxLength={6}
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              首次注册时系统生成的公司码
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              用户名
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="请输入用户名"
              className="bg-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
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
              type="password"
              placeholder="••••••••"
              className="bg-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                登录中...
              </>
            ) : '登录'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// 保留旧的导出以兼容
export { MobileLoginForm as MobileLoginPage }
