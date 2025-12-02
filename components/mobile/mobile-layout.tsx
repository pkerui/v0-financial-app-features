'use client'

import { ReactNode } from 'react'
import { MobileNav } from './mobile-nav'
import { cn } from '@/lib/utils'

interface MobileLayoutProps {
  children: ReactNode
  /** 页面标题 */
  title?: string
  /** 是否显示底部导航 */
  showNav?: boolean
  /** 隐藏导航（极简模式） */
  hideNav?: boolean
  /** 额外的类名 */
  className?: string
  /** 头部右侧内容 */
  headerRight?: ReactNode
}

/**
 * 移动端布局组件
 * 包含顶部标题栏和底部导航
 */
export function MobileLayout({
  children,
  title,
  showNav = true,
  hideNav = false,
  className,
  headerRight,
}: MobileLayoutProps) {
  const displayNav = showNav && !hideNav

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部标题栏 */}
      {title && (
        <header className="sticky top-0 z-40 bg-background border-b border-border safe-area-top">
          <div className="flex items-center justify-between h-14 px-4">
            <h1 className="text-lg font-semibold">{title}</h1>
            {headerRight && <div>{headerRight}</div>}
          </div>
        </header>
      )}

      {/* 主内容区域 */}
      <main
        className={cn(
          'flex-1 overflow-auto',
          displayNav && 'pb-20', // 为底部导航留出空间
          className
        )}
      >
        {children}
      </main>

      {/* 底部导航 */}
      {displayNav && <MobileNav />}
    </div>
  )
}

/**
 * 移动端页面容器
 */
export function MobileContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-4 py-4', className)}>
      {children}
    </div>
  )
}

/**
 * 移动端卡片组件
 */
export function MobileCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl p-4 shadow-sm border border-border',
        onClick && 'active:bg-muted cursor-pointer transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
