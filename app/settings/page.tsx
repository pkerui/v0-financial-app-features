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
import { getStoreModeServer } from '@/lib/utils/store-mode'
import { getStore } from '@/lib/api/stores'

type PageProps = {
  searchParams: Promise<{ store?: string; stores?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

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
  const { data: incomeCategories } = await getTransactionCategories('income')
  const { data: expenseCategories } = await getTransactionCategories('expense')

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
          incomeCategories={incomeCategories || []}
          expenseCategories={expenseCategories || []}
        />
      </div>
    </main>
  )
}
