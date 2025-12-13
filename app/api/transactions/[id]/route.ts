import { NextRequest, NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'
import { deleteTransaction, updateTransaction } from '@/lib/backend/transactions'

// 根据后端类型验证用户
async function validateUser(): Promise<{ userId: string | null; error: string | null }> {
  const backend = detectBackend()

  if (backend === 'leancloud') {
    // LeanCloud 模式：使用 cookie session
    const { getLCSession } = await import('@/lib/leancloud/cookies')
    const session = await getLCSession()
    if (!session) {
      return { userId: null, error: 'Unauthorized' }
    }
    return { userId: session.userId, error: null }
  } else {
    // Supabase 模式
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { userId: null, error: 'Unauthorized' }
    }
    return { userId: user.id, error: null }
  }
}

// 删除交易记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 验证用户
  const { userId, error: authError } = await validateUser()
  if (authError || !userId) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  try {
    // 调用统一后端适配器（包含所有业务逻辑和权限检查）
    const result = await deleteTransaction(id)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('删除交易记录异常:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新交易记录
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 验证用户
  const { userId, error: authError } = await validateUser()
  if (authError || !userId) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('📥 接收到的完整请求数据:', JSON.stringify(body, null, 2))

    // 调用统一后端适配器（包含所有业务逻辑：验证、查询分类、自动设置 transaction_nature 等）
    const result = await updateTransaction(id, body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error('更新交易记录异常:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
