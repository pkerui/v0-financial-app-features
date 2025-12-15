import { NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'

export async function GET() {
  try {
    const backend = detectBackend()

    if (backend === 'leancloud') {
      const { getStores } = await import('@/lib/backend/stores')
      const result = await getStores()

      return NextResponse.json({
        backend,
        data: (result as any).data || [],
        error: (result as any).error || null,
      })
    } else {
      // Supabase 模式
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ backend, data: [], error: '未登录' })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) {
        return NextResponse.json({ backend, data: [], error: '无公司信息' })
      }

      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: true })

      return NextResponse.json({
        backend,
        data: stores || [],
        error: error?.message || null,
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || String(error),
      data: [],
    }, { status: 500 })
  }
}
