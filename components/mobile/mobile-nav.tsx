'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mic, BarChart3, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { href: '/m', label: '首页', icon: Home },
  { href: '/m/record', label: '记账', icon: Mic },
  { href: '/m/report', label: '报表', icon: BarChart3 },
  { href: '/m/transactions', label: '财务记录', icon: FileText },
]

/**
 * 移动端底部导航组件 - 极简版
 */
export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/m' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'text-primary')} />
              <span className={cn('text-xs mt-1', isActive && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
