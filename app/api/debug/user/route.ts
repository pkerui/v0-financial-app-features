import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // 获取当前用户
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({
      error: 'Not authenticated',
      userError,
    }, { status: 401 })
  }

  // 获取用户配置
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 如果有 company_id，获取公司信息
  let company = null
  if (profile?.company_id) {
    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
    company = companyData
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    company,
    profileError,
  })
}
