'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, AlertCircle, Building2, Loader2 } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 表单数据状态 - 保留用户输入
  const [companyCode, setCompanyCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // 字段级错误
  const [fieldErrors, setFieldErrors] = useState<{
    companyCode?: string
    username?: string
    password?: string
  }>({})

  const validateForm = () => {
    const errors: typeof fieldErrors = {}

    if (!companyCode.trim()) {
      errors.companyCode = '请输入公司码'
    } else if (companyCode.trim().length !== 6) {
      errors.companyCode = '公司码必须是6位'
    }

    if (!username.trim()) {
      errors.username = '请输入用户名'
    }

    if (!password) {
      errors.password = '请输入密码'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('companyCode', companyCode.trim().toUpperCase())
      formData.append('username', username.trim())
      formData.append('password', password)

      const result = await login({}, formData)

      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setSuccess(result.success)
      }

      if (result.redirectTo) {
        // Use full page reload to ensure cookies are processed
        // router.push() may navigate before browser processes Set-Cookie headers
        window.location.href = result.redirectTo
      }
    } catch (err) {
      setError('登录失败，请稍后重试')
    } finally {
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
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="companyCode" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                公司码
              </Label>
              <Link
                href="/forgot-company-code"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                忘记公司码？
              </Link>
            </div>
            <Input
              id="companyCode"
              name="companyCode"
              type="text"
              placeholder="6位公司码（如 ABC123）"
              className={`bg-input uppercase ${fieldErrors.companyCode ? 'border-destructive' : ''}`}
              maxLength={6}
              value={companyCode}
              onChange={(e) => {
                setCompanyCode(e.target.value.toUpperCase())
                if (fieldErrors.companyCode) {
                  setFieldErrors(prev => ({ ...prev, companyCode: undefined }))
                }
              }}
            />
            {fieldErrors.companyCode ? (
              <p className="text-xs text-destructive">{fieldErrors.companyCode}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                首次注册时系统会生成公司码，请妥善保存
              </p>
            )}
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
              placeholder="请输入用户名"
              className={`bg-input ${fieldErrors.username ? 'border-destructive' : ''}`}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (fieldErrors.username) {
                  setFieldErrors(prev => ({ ...prev, username: undefined }))
                }
              }}
            />
            {fieldErrors.username && (
              <p className="text-xs text-destructive">{fieldErrors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                密码
              </Label>
              <Link
                href="/forgot-password"
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
              className={`bg-input ${fieldErrors.password ? 'border-destructive' : ''}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: undefined }))
                }
              }}
            />
            {fieldErrors.password && (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在登录...
              </>
            ) : (
              '登录'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-2">
            没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline">
              注册新公司
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
