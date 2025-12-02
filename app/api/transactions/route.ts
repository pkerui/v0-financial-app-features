import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: '用户未关联公司' }, { status: 400 })
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const store_id = searchParams.get('store_id')
    const store_ids = searchParams.get('store_ids') // 支持多店铺筛选，逗号分隔
    const type = searchParams.get('type')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // 构建查询
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    // 日期过滤
    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }

    // 店铺过滤
    if (store_ids) {
      // 多店铺筛选
      const storeIdArray = store_ids.split(',').filter(id => id.trim())
      if (storeIdArray.length > 0) {
        query = query.in('store_id', storeIdArray)
      }
    } else if (store_id) {
      query = query.eq('store_id', store_id)
    }

    // 类型过滤
    if (type && (type === 'income' || type === 'expense')) {
      query = query.eq('type', type)
    }

    // 分页
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (limit ? parseInt(limit) - 1 : 99))
    }

    const { data, error, count } = await query

    if (error) {
      console.error('获取交易记录失败:', error)
      return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count,
    })
  } catch (error) {
    console.error('API 错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
