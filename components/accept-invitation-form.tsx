'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { acceptInvitation } from '@/lib/api/invitations'

interface AcceptInvitationFormProps {
  token: string
  email: string
}

export function AcceptInvitationForm({ token, email }: AcceptInvitationFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('请输入您的姓名')
      return
    }

    if (password.length < 6) {
      toast.error('密码至少6位')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    setLoading(true)
    try {
      const result = await acceptInvitation({
        token,
        password,
        fullName: fullName.trim(),
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('注册成功！正在跳转...')
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">姓名</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="请输入您的姓名"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">设置密码</Label>
        <Input
          id="password"
          type="password"
          placeholder="至少6位"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">确认密码</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="再次输入密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '注册中...' : '完成注册'}
      </Button>
    </form>
  )
}
