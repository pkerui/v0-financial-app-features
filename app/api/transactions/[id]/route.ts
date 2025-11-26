import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateTransaction, deleteTransaction } from '@/lib/api/transactions'

// 删除交易记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 调用 server action（包含所有业务逻辑和权限检查）
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
  const supabase = await createClient()
  const { id } = await params

  // 获取当前用户
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('📥 接收到的完整请求数据:', JSON.stringify(body, null, 2))

    // 调用 server action（包含所有业务逻辑：验证、查询分类、自动设置 transaction_nature 等）
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
