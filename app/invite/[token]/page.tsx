import { verifyInvitation } from '@/lib/api/invitations'
import { AcceptInvitationForm } from '@/components/accept-invitation-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, Building2 } from 'lucide-react'
import Link from 'next/link'
import { getRoleName } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/auth/permissions'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params

  // 验证邀请
  const { data: invitation, error } = await verifyInvitation(token)

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>邀请无效</CardTitle>
            <CardDescription>
              {error || '该邀请链接已过期或已被使用'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login">
              <Button variant="outline">返回登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>加入团队</CardTitle>
          <CardDescription>
            您被邀请加入 <span className="font-medium text-foreground">{invitation.company_name || '公司'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">邮箱</span>
              <span className="font-medium">{invitation.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">角色</span>
              <span className="font-medium">{getRoleName(invitation.role as UserRole)}</span>
            </div>
          </div>

          <AcceptInvitationForm token={token} email={invitation.email} />

          <div className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:underline">
              直接登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
