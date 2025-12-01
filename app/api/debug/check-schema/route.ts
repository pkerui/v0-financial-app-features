import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: '缺少 Supabase 配置' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // 查询 companies 表结构
  const { data: companiesColumns, error: companiesError } = await adminClient
    .rpc('get_table_columns', { table_name: 'companies' })
    .select('*')

  // 查询 profiles 表结构
  const { data: profilesColumns, error: profilesError } = await adminClient
    .rpc('get_table_columns', { table_name: 'profiles' })
    .select('*')

  // 直接查询一下表
  const { data: companiesSample, error: cErr } = await adminClient
    .from('companies')
    .select('*')
    .limit(1)

  const { data: profilesSample, error: pErr } = await adminClient
    .from('profiles')
    .select('*')
    .limit(1)

  return NextResponse.json({
    companies: {
      sample: companiesSample,
      sampleError: cErr?.message,
      columns: companiesColumns,
      columnsError: companiesError?.message,
    },
    profiles: {
      sample: profilesSample,
      sampleError: pErr?.message,
      columns: profilesColumns,
      columnsError: profilesError?.message,
    },
  })
}
