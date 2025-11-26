/**
 * 添加 transaction_nature 字段到 transactions 表
 * 运行方式：npx tsx scripts/add-transaction-nature-column.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// 加载环境变量
config({ path: '.env.local' })

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置')
  console.error('请确保 .env.local 文件包含以下变量：')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 创建 Supabase 客户端（使用 service role key 以获得完整权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('\n🚀 开始添加 transaction_nature 字段到 transactions 表...')

  try {
    // 读取迁移 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', '019_add_transaction_nature_to_transactions.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log(`📝 读取迁移文件: 019_add_transaction_nature_to_transactions.sql`)
    console.log(`文件大小: ${sql.length} 字符\n`)

    // 分步执行 SQL 语句
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📊 共有 ${statements.length} 条 SQL 语句需要执行\n`)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.trim().length === 0) continue

      console.log(`[${i + 1}/${statements.length}] 执行: ${stmt.substring(0, 80)}...`)

      try {
        // 使用原始 SQL 执行
        const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

        if (error) {
          // 如果 exec_sql 不可用，跳过并提示手动执行
          console.log(`⚠️  无法通过 RPC 执行，需要手动执行该迁移`)
          console.log(`\n请在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL：\n`)
          console.log('=' .repeat(80))
          console.log(sql)
          console.log('=' .repeat(80))
          console.log(`\n或访问: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`)
          return false
        }

        console.log(`✅ 成功`)
      } catch (err: any) {
        console.error(`❌ 失败: ${err.message}`)
      }
    }

    console.log('\n✅ 所有 SQL 语句执行完成！')
    return true

  } catch (error: any) {
    console.error('\n❌ 迁移执行失败:', error.message)
    return false
  }
}

async function verifyMigration() {
  console.log('\n🔍 验证迁移结果...')

  try {
    // 检查 transaction_nature 字段是否存在
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, type, category, transaction_nature')
      .limit(5)

    if (error) {
      console.error('❌ 验证失败:', error.message)
      console.log('\n如果错误提示找不到 transaction_nature 字段，请手动在 Supabase Dashboard 执行迁移 SQL')
      return false
    }

    console.log('✅ 字段验证成功！transaction_nature 字段已成功添加')
    console.log('\n示例数据：')
    transactions?.forEach((t: any) => {
      console.log(`  - ${t.type} / ${t.category} → transaction_nature: ${t.transaction_nature || '(未设置)'}`)
    })

    // 统计数据
    const { data: stats } = await supabase
      .from('transactions')
      .select('transaction_nature')

    if (stats) {
      const natureCounts = {
        operating: 0,
        non_operating: 0,
        null: 0
      }

      stats.forEach((t: any) => {
        const nature = t.transaction_nature || 'null'
        if (nature in natureCounts) {
          natureCounts[nature as keyof typeof natureCounts]++
        }
      })

      console.log('\n📊 交易性质统计：')
      console.log(`  - 总记录数: ${stats.length}`)
      console.log(`  - 营业内: ${natureCounts.operating}`)
      console.log(`  - 营业外: ${natureCounts.non_operating}`)
      console.log(`  - 未分类: ${natureCounts.null}`)
    }

    return true

  } catch (error: any) {
    console.error('❌ 验证过程出错:', error.message)
    return false
  }
}

// 主函数
async function main() {
  console.log('=' .repeat(80))
  console.log('数据库迁移: 添加 transaction_nature 字段到 transactions 表')
  console.log('=' .repeat(80))

  const success = await runMigration()

  if (success) {
    await verifyMigration()
    console.log('\n✨ 迁移流程完成！')
    console.log('\n下一步：')
    console.log('  1. 重启开发服务器（npm run dev）')
    console.log('  2. 测试更新交易记录功能')
    console.log('  3. 验证 transaction_nature 字段是否正确显示')
  } else {
    console.log('\n⚠️  迁移未能自动执行')
    console.log('\n请手动执行：')
    console.log('  1. 登录 Supabase Dashboard')
    console.log(`  2. 访问: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`)
    console.log('  3. 复制并执行文件: supabase/migrations/019_add_transaction_nature_to_transactions.sql')
    console.log('  4. 执行完成后，重启开发服务器')
  }
}

// 执行
main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
