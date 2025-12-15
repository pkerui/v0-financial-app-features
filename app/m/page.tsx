'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileHomePage } from '@/components/mobile/pages/home-page'

interface PageData {
  userName: string
  storeName: string
  todayIncome: number
  todayExpense: number
  todayNet: number
}

export default function MobileHome() {
  const router = useRouter()
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // 获取用户 profile
        const profileRes = await fetch('/api/debug/user')
        const profileData = await profileRes.json()

        if (!profileData.profile) {
          // 未登录，跳转到登录页
          router.push('/m/login')
          return
        }

        // 获取店铺和交易数据
        const [storesRes, transactionsRes] = await Promise.all([
          fetch('/api/stores'),
          fetch('/api/transactions?today=true'),
        ])

        const storesData = await storesRes.json().catch(() => ({ data: [] }))
        const transactionsData = await transactionsRes.json().catch(() => ({ data: [] }))

        const stores = storesData.data || []
        const todayTransactions = transactionsData.data || []

        // 计算今日汇总
        const todayIncome = todayTransactions
          .filter((t: { type: string }) => t.type === 'income')
          .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

        const todayExpense = todayTransactions
          .filter((t: { type: string }) => t.type === 'expense')
          .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)

        // 确定显示的店铺名称
        const storeName = stores.length === 1 ? stores[0].name : '全部店铺'

        setData({
          userName: profileData.profile.full_name || '用户',
          storeName,
          todayIncome,
          todayExpense,
          todayNet: todayIncome - todayExpense,
        })
      } catch (err: any) {
        console.error('加载数据失败:', err)
        setError(err.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">加载失败: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            重试
          </button>
        </div>
      </main>
    )
  }

  if (!data) {
    return null
  }

  return (
    <MobileHomePage
      userName={data.userName}
      storeName={data.storeName}
      todayIncome={data.todayIncome}
      todayExpense={data.todayExpense}
      todayNet={data.todayNet}
    />
  )
}
