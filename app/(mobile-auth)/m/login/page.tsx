'use client'

import { useEffect, useState } from 'react'
import { MobileLoginForm } from '@/components/mobile/pages/login-page'
import { MobileRegisterOwnerForm } from '@/components/mobile/pages/register-owner-page'

export default function MobileLogin() {
  const [hasUsers, setHasUsers] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 在客户端检查是否有用户
    fetch('/api/debug/system-status')
      .then(res => res.json())
      .then(data => {
        setHasUsers(data.hasUsers ?? true)
      })
      .catch(err => {
        console.error('检查用户状态失败:', err)
        setError(err.message)
        setHasUsers(true) // 默认显示登录表单
      })
  }, [])

  // 加载中
  if (hasUsers === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      {error && (
        <div className="fixed top-4 left-4 right-4 p-3 bg-red-100 border border-red-300 rounded text-red-800 text-xs z-50">
          <strong>Debug:</strong> {error}
        </div>
      )}
      {hasUsers ? <MobileLoginForm /> : <MobileRegisterOwnerForm />}
    </main>
  )
}
