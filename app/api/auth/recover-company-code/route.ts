import { NextRequest, NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱地址' },
        { status: 400 }
      )
    }

    const backend = detectBackend()

    if (backend === 'leancloud') {
      // LeanCloud 模式：查询用户并发送邮件
      const { recoverCompanyCode } = await import('@/lib/leancloud/auth')
      const result = await recoverCompanyCode(email)

      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    } else {
      // Supabase 模式暂不支持
      return NextResponse.json(
        { success: false, error: '当前模式不支持此功能' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('找回公司码失败:', error)
    return NextResponse.json(
      { success: false, error: '系统错误，请稍后重试' },
      { status: 500 }
    )
  }
}
