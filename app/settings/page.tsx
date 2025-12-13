// @ts-nocheck
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut, Building2, Copy } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/lib/auth/actions'
import { FinancialSettingsForm } from '@/components/financial-settings-form'
import { CategoryManagement } from '@/components/category-management'
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getStore } from '@/lib/backend/stores'
import { getCompanyById } from '@/lib/backend/auth'
import { detectBackend } from '@/lib/backend/detector'
import { getServerUser, getServerProfile } from '@/lib/auth/server'
import { getFinancialSettings } from '@/lib/backend/financial-settings'
import { getTransactionCategories } from '@/lib/backend/categories'

type PageProps = {
  searchParams: Promise<{ store?: string; stores?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const backend = detectBackend()
  const params = await searchParams

  // 使用统一认证 API 获取当前用户
  const user = await getServerUser()

  if (!user) {
    redirect('/')
  }

  // 使用统一认证 API 获取用户配置
  const profile = await getServerProfile()

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

  // 获取公司信息
  const company = await getCompanyById(profile.company_id)

  // 检测店铺模式
  const { storeId, storeIds } = getStoreModeServer(params)

  // 根据是否有店铺ID决定获取店铺级别还是公司级别的财务设置
  let settings = null
  let currentStore = null

  if (storeId) {
    // 单店模式：获取店铺级别的期初设置
    const { data: store } = await getStore(storeId)
    currentStore = store
    if (store) {
      settings = {
        id: store.id,
        company_id: store.company_id,
        initial_cash_balance: store.initial_balance ?? 0,
        initial_balance_date: store.initial_balance_date ?? '',
        notes: null,
        created_at: store.created_at,
        updated_at: store.updated_at,
      }
    }
  } else {
    // 公司模式：获取公司级别的财务设置
    const { data: companySettings } = await getFinancialSettings()
    settings = companySettings
  }

  // 获取交易类型
  const { data: allCategories } = await getTransactionCategories()
  const incomeCategories = allCategories?.filter(c => c.type === 'income') || []
  const expenseCategories = allCategories?.filter(c => c.type === 'expense') || []

  // 构建返回链接
  const dashboardUrl = storeId
    ? `/dashboard?store=${storeId}`
    : storeIds.length > 0
    ? `/dashboard?stores=${storeIds.join(',')}`
    : '/dashboard'

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link href={dashboardUrl}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回总览
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {currentStore ? `${currentStore.name} - 财务设置` : '交易类型设置'}
              </h1>
              <p className="text-muted-foreground">
                {currentStore ? '配置该店铺的期初余额和交易类型' : '配置收入类型和支出类型（期初余额请在各分店设置中配置）'}
              </p>
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

        {/* 公司信息卡片 */}
        {company && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">{company.name}</h2>
                <p className="text-sm text-muted-foreground">公司信息</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">公司码（员工登录时使用）</p>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 rounded-md bg-muted text-lg font-mono font-bold tracking-widest">
                    {company.code}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 财务设置表单 - 仅单店模式显示 */}
        {currentStore && (
          <FinancialSettingsForm
            initialSettings={settings}
            storeId={storeId || undefined}
            storeName={currentStore?.name}
          />
        )}

        {/* 类型管理 */}
        <CategoryManagement
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
        />
      </div>
    </main>
  )
}
