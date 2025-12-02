'use client'

import { MobileLayout, MobileContainer, MobileCard } from '../mobile-layout'
import { Mic, TrendingUp, TrendingDown, BarChart3, LogOut, FileText } from 'lucide-react'
import Link from 'next/link'
import { logout } from '@/lib/auth/actions'

interface MobileHomePageProps {
  userName: string
  storeName: string
  todayIncome: number
  todayExpense: number
  todayNet: number
}

/**
 * 移动端首页 - 极简版
 * 只显示今日收支汇总和快速记账入口
 */
export function MobileHomePage({
  userName,
  storeName,
  todayIncome,
  todayExpense,
  todayNet,
}: MobileHomePageProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <MobileLayout title="财务管理系统" hideNav>
      <MobileContainer className="space-y-6 pt-4">
        {/* 欢迎语和退出按钮 */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <h2 className="text-xl font-bold mt-1">你好，{userName}</h2>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>退出</span>
            </button>
          </form>
        </div>

        {/* 今日收支汇总卡片 */}
        <MobileCard className="bg-gradient-to-br from-primary/10 to-primary/5">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">今日收支（{storeName}）</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-muted-foreground">收入</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatAmount(todayIncome)}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <span className="text-muted-foreground">支出</span>
              </div>
              <p className="text-xl font-bold text-red-500">
                {formatAmount(todayExpense)}
              </p>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">净额</span>
                <p className={`text-xl font-bold ${todayNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatAmount(todayNet)}
                </p>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* 快速入口 */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/m/record">
            <MobileCard className="flex flex-col items-center justify-center py-6 bg-primary text-primary-foreground">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <Mic className="h-6 w-6" />
              </div>
              <p className="font-bold text-sm">快速记账</p>
              <p className="text-xs opacity-80 mt-0.5">语音/文本</p>
            </MobileCard>
          </Link>
          <Link href="/m/transactions">
            <MobileCard className="flex flex-col items-center justify-center py-6">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <p className="font-bold text-sm">财务记录</p>
              <p className="text-xs text-muted-foreground mt-0.5">查看/管理</p>
            </MobileCard>
          </Link>
          <Link href="/m/report">
            <MobileCard className="flex flex-col items-center justify-center py-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-bold text-sm">收支报表</p>
              <p className="text-xs text-muted-foreground mt-0.5">查看统计</p>
            </MobileCard>
          </Link>
        </div>
      </MobileContainer>
    </MobileLayout>
  )
}
