export const metadata = {
  title: '财务管理系统',
  description: '移动端财务管理',
}

// 认证检查已在 middleware.ts 中处理，这里只做布局
export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mobile-app">
      {children}
    </div>
  )
}
