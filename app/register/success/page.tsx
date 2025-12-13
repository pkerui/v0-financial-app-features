'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Copy, Check, Building2 } from 'lucide-react'

function RegisterSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const companyCode = searchParams.get('code')
  const companyName = searchParams.get('company')
  const [copied, setCopied] = useState(false)

  // 如果没有公司码，重定向到首页
  useEffect(() => {
    if (!companyCode) {
      router.replace('/')
    }
  }, [companyCode, router])

  const handleCopy = async () => {
    if (companyCode) {
      await navigator.clipboard.writeText(companyCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleContinue = () => {
    router.push('/stores')
  }

  if (!companyCode) {
    return null
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mx-auto mb-2">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">注册成功！</CardTitle>
          <CardDescription>
            {companyName ? `${companyName} 已创建成功` : '您的公司账户已创建成功'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 公司码显示区域 */}
          <div className="bg-primary/5 rounded-lg p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>您的公司码</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-wider text-primary">
                {companyCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* 重要提示 */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
            <p className="font-medium text-amber-600 mb-2">请务必保存此公司码！</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>登录时需要输入公司码</li>
              <li>团队成员加入公司时也需要此码</li>
              <li>公司码无法找回，请妥善保管</li>
            </ul>
          </div>

          {/* 继续按钮 */}
          <Button
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90"
          >
            我已记录，继续使用
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-muted-foreground">加载中...</div>
      </main>
    }>
      <RegisterSuccessContent />
    </Suspense>
  )
}
