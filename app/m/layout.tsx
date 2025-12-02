import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: '财务管理系统',
  description: '移动端财务管理',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '财务管理系统',
  },
}

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 未登录跳转到移动端登录页
  if (!user) {
    redirect('/m/login')
  }

  return (
    <div className="mobile-app">
      {children}
    </div>
  )
}
