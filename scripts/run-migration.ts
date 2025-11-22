/**
 * 数据库迁移执行脚本
 * 运行方式：npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(migrationFile: string) {
  console.log(`\n📁 读取迁移文件: ${migrationFile}`)

  try {
    // 读取 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase', 'migrations', migrationFile)
    const sql = readFileSync(sqlPath, 'utf-8')

    console.log(`📝 执行 SQL 迁移...`)
    console.log(`文件大小: ${sql.length} 字符`)

    // 执行 SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql })

    if (error) {
      // 如果 exec_sql 函数不存在，尝试直接执行
      console.log('⚠️  exec_sql 函数不存在，尝试分步执行...')
      await executeSqlStepByStep(sql)
    } else {
      console.log('✅ 迁移执行成功！')
      if (data) {
        console.log('返回数据:', data)
      }
    }

    // 验证迁移结果
    await verifyMigration()

  } catch (error: any) {
    console.error('❌ 迁移执行失败:', error.message)
    process.exit(1)
  }
}

// 分步执行 SQL（用于不支持 rpc 的情况）
async function executeSqlStepByStep(sql: string) {
  console.log('⚠️  警告：由于权限限制，无法直接执行完整的迁移SQL')
  console.log('请手动执行以下步骤：')
  console.log('\n1. 登录 Supabase Dashboard')
  console.log('2. 打开 SQL Editor')
  console.log('3. 复制并执行迁移文件内容：')
  console.log(`   supabase/migrations/005_add_cash_flow_activity.sql`)
  console.log('\n或者，如果您有数据库直接访问权限，可以使用：')
  console.log('   psql YOUR_DATABASE_URL < supabase/migrations/005_add_cash_flow_activity.sql')

  console.log('\n\n📋 迁移 SQL 预览：')
  console.log('=' .repeat(60))
  console.log(sql.substring(0, 500) + '...')
  console.log('=' .repeat(60))
}

// 验证迁移结果
async function verifyMigration() {
  console.log('\n🔍 验证迁移结果...')

  try {
    // 检查字段是否存在
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, type, category, cash_flow_activity')
      .limit(5)

    if (error) {
      console.error('❌ 验证失败:', error.message)
      return
    }

    console.log('\n✅ 字段验证成功！')
    console.log('示例数据：')
    transactions?.forEach((t: any) => {
      console.log(`  - ${t.type} / ${t.category} → ${t.cash_flow_activity || '(未设置)'}`)
    })

    // 统计数据
    const { data: stats } = await supabase
      .from('transactions')
      .select('cash_flow_activity')

    if (stats) {
      const activityCounts = {
        operating: 0,
        investing: 0,
        financing: 0,
        null: 0
      }

      stats.forEach((t: any) => {
        const activity = t.cash_flow_activity || 'null'
        activityCounts[activity as keyof typeof activityCounts] =
          (activityCounts[activity as keyof typeof activityCounts] || 0) + 1
      })

      console.log('\n📊 活动类型统计：')
      console.log(`  - 总记录数: ${stats.length}`)
      console.log(`  - 经营活动: ${activityCounts.operating}`)
      console.log(`  - 投资活动: ${activityCounts.investing}`)
      console.log(`  - 筹资活动: ${activityCounts.financing}`)
      console.log(`  - 未分类: ${activityCounts.null}`)
    }

  } catch (error: any) {
    console.error('❌ 验证过程出错:', error.message)
  }
}

// 主函数
async function main() {
  console.log('🚀 开始执行数据库迁移...')
  console.log('迁移文件: 005_add_cash_flow_activity.sql')

  await runMigration('005_add_cash_flow_activity.sql')

  console.log('\n✨ 迁移流程完成！')
  console.log('\n下一步：')
  console.log('  1. 检查上述验证结果')
  console.log('  2. 如果验证通过，继续修改应用代码')
  console.log('  3. 如果验证失败，请手动执行迁移SQL')
}

// 执行
main().catch((error) => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
