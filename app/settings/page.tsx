import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import { FinancialSettingsForm } from '@/components/financial-settings-form'
import { CategoryManagement } from '@/components/category-management'
import { getFinancialSettings } from '@/lib/api/financial-settings'
import { getTransactionCategories } from '@/lib/api/transaction-categories'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // 获取用户配置
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-destructive/10 rounded-lg max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">配置错误</h1>
          <p className="text-muted-foreground">
            您的账户还没有关联公司。请联系管理员。
          </p>
        </div>
      </div>
    )
  }

  // 获取财务设置
  const { data: settings, error } = await getFinancialSettings()

  // 获取交易类型
  const { data: incomeCategories } = await getTransactionCategories('income')
  const { data: expenseCategories } = await getTransactionCategories('expense')

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                回到总览
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">财务设置</h1>
              <p className="text-muted-foreground">配置期初余额等财务信息</p>
            </div>
          </div>
          <div className="flex gap-2">
            <form action={logout}>
              <Button type="submit" variant="outline">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* 财务设置表单 */}
        <FinancialSettingsForm initialSettings={settings} />

        {/* 类型管理 */}
        <CategoryManagement
          incomeCategories={incomeCategories || []}
          expenseCategories={expenseCategories || []}
        />
      </div>
    </main>
  )
}
