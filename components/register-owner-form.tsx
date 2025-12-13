'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerOwner } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, User, Lock, Mail, AlertCircle, UserPlus, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// 生成6位公司码（客户端）
function generateCompanyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除容易混淆的 I, O, 0, 1
  let code = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    code += chars.charAt(randomIndex)
  }
  return code
}

// 邮箱格式验证
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function RegisterOwnerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 生成公司码（只在客户端生成一次）
  const companyCode = useMemo(() => generateCompanyCode(), [])

  // 表单数据状态 - 保留用户输入
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')

  // 字段级错误
  const [fieldErrors, setFieldErrors] = useState<{
    companyName?: string
    fullName?: string
    username?: string
    password?: string
    confirmPassword?: string
    email?: string
  }>({})

  // 成功弹窗状态
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [registeredUsername, setRegisteredUsername] = useState('')
  const [registeredCompanyCode, setRegisteredCompanyCode] = useState('')
  const [copied, setCopied] = useState(false)

  // 验证表单
  const validateForm = () => {
    const errors: typeof fieldErrors = {}

    if (!companyName.trim()) {
      errors.companyName = '请输入公司/店铺名称'
    }

    if (!fullName.trim()) {
      errors.fullName = '请输入您的姓名'
    }

    if (!username.trim()) {
      errors.username = '请输入用户名'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = '用户名只能包含字母、数字和下划线'
    }

    if (!password) {
      errors.password = '请输入密码'
    } else if (password.length < 6) {
      errors.password = '密码至少需要6位'
    }

    if (!confirmPassword) {
      errors.confirmPassword = '请确认密码'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    if (!email.trim()) {
      errors.email = '请输入邮箱地址'
    } else if (!isValidEmail(email.trim())) {
      errors.email = '请输入有效的邮箱格式'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('companyCode', companyCode)
      formData.append('companyName', companyName.trim())
      formData.append('fullName', fullName.trim())
      formData.append('username', username.trim())
      formData.append('password', password)
      formData.append('confirmPassword', confirmPassword)
      formData.append('email', email.trim())

      const result = await registerOwner({}, formData)

      if (result.error) {
        setError(result.error)
      } else if (result.success && result.companyCode && result.username) {
        // 注册成功，显示弹窗
        setRegisteredCompanyCode(result.companyCode)
        setRegisteredUsername(result.username)
        setShowSuccessDialog(true)
      } else if (result.redirectTo && !result.companyCode) {
        // Supabase 模式，直接跳转
        router.push(result.redirectTo)
      }
    } catch (err) {
      setError('注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 复制信息到剪贴板
  const copyToClipboard = () => {
    const text = `公司码：${registeredCompanyCode}\n用户名：${registeredUsername}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 关闭弹窗并跳转
  // 使用 window.location.href 强制刷新页面，确保新 cookie 正确读取
  const handleCloseDialog = () => {
    setShowSuccessDialog(false)
    window.location.href = '/login'
  }

  // 清除特定字段的错误
  const clearFieldError = (field: keyof typeof fieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 公司码显示（第一行，自动生成，灰化） */}
            <div className="space-y-2">
              <Label htmlFor="companyCode" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                公司码
                <span className="text-xs text-muted-foreground">(自动生成)</span>
              </Label>
              <Input
                id="companyCode"
                name="companyCode"
                type="text"
                value={companyCode}
                readOnly
                className="bg-muted text-muted-foreground font-mono text-lg tracking-wider cursor-not-allowed"
              />
              <p className="text-xs text-amber-600">
                请牢记此公司码，登录时需要使用
              </p>
            </div>

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
                className={`bg-input ${fieldErrors.companyName ? 'border-destructive' : ''}`}
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  clearFieldError('companyName')
                }}
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-destructive">{fieldErrors.companyName}</p>
              )}
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
                className={`bg-input ${fieldErrors.fullName ? 'border-destructive' : ''}`}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  clearFieldError('fullName')
                }}
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
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
                placeholder="字母、数字、下划线"
                className={`bg-input ${fieldErrors.username ? 'border-destructive' : ''}`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  clearFieldError('username')
                }}
              />
              {fieldErrors.username ? (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              ) : (
                <p className="text-xs text-muted-foreground">用于登录系统</p>
              )}
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
                className={`bg-input ${fieldErrors.password ? 'border-destructive' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearFieldError('password')
                  // 同时检查确认密码
                  if (confirmPassword && e.target.value !== confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
                  } else if (confirmPassword) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }))
                  }
                }}
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
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
                className={`bg-input ${fieldErrors.confirmPassword ? 'border-destructive' : ''}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (password && e.target.value && password !== e.target.value) {
                    setFieldErrors(prev => ({ ...prev, confirmPassword: '两次输入的密码不一致' }))
                  } else {
                    clearFieldError('confirmPassword')
                  }
                }}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                找回邮箱
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="用于找回公司码和密码"
                className={`bg-input ${fieldErrors.email ? 'border-destructive' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearFieldError('email')
                }}
                onBlur={() => {
                  // 失去焦点时验证邮箱格式
                  if (email.trim() && !isValidEmail(email.trim())) {
                    setFieldErrors(prev => ({ ...prev, email: '请输入有效的邮箱格式' }))
                  }
                }}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
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
                  创建中...
                </>
              ) : (
                '创建账户并开始使用'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-2">
              已有账号？{' '}
              <Link href="/login" className="text-primary hover:underline">
                返回登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 注册成功弹窗 */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 mx-auto mb-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <DialogTitle className="text-center text-xl">注册成功</DialogTitle>
            <DialogDescription className="text-center">
              请妥善保管以下信息，登录时需要使用
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">公司码</p>
                <p className="text-2xl font-mono font-bold tracking-wider">{registeredCompanyCode}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">用户名</p>
                <p className="text-xl font-medium">{registeredUsername}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600">
                请妥善保管以上信息！如遗忘可通过注册邮箱找回。
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  复制信息
                </>
              )}
            </Button>
            <Button
              className="w-full"
              onClick={handleCloseDialog}
            >
              我已记录，去登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
