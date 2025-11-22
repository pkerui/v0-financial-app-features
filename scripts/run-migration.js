/**
 * 运行数据库迁移脚本
 * 使用方式: node scripts/run-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误: 需要设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量')
  console.error('提示: SUPABASE_SERVICE_ROLE_KEY 可以在 Supabase Dashboard > Settings > API 中找到')
  process.exit(1)
}

// 创建 Supabase 客户端（使用 service role key 以绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('📝 读取迁移文件...')
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '003_fix_user_registration.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 执行迁移...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ 迁移执行失败:', error)
      process.exit(1)
    }

    console.log('✅ 迁移执行成功!')
    console.log('现在用户注册时会自动创建公司并关联')

  } catch (error) {
    console.error('❌ 发生错误:', error.message)
    process.exit(1)
  }
}

runMigration()
