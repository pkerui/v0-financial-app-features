/**
 * 添加 transaction_nature 字段到 transactions 表
 * 运行方式：node scripts/run-019-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 手动读取 .env.local 文件
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

// 从环境变量获取 Supabase 配置
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置')
  console.error('请确保 .env.local 文件包含以下变量：')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log(`✅ 已加载配置: ${supabaseUrl}`)

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
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '019_add_transaction_nature_to_transactions.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log(`📝 读取迁移文件: 019_add_transaction_nature_to_transactions.sql`)
    console.log(`文件大小: ${sql.length} 字符\n`)

    // 尝试直接执行完整 SQL
    console.log('执行 SQL 迁移...')

    // 由于 Supabase 客户端无法直接执行 DDL，我们打印 SQL 让用户手动执行
    console.log('\n⚠️  注意：需要手动在 Supabase Dashboard 执行以下 SQL：')
    console.log('=' .repeat(80))
    console.log(sql)
    console.log('=' .repeat(80))
    console.log(`\n请访问: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`)
    console.log('复制上述 SQL 并执行\n')

    return false

  } catch (error) {
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
      console.log('\n如果错误提示找不到 transaction_nature 字段，说明迁移还未执行')
      console.log('请按照上面的说明手动在 Supabase Dashboard 执行迁移 SQL')
      return false
    }

    console.log('✅ 字段验证成功！transaction_nature 字段已成功添加')
    console.log('\n示例数据：')
    transactions?.forEach(t => {
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

      stats.forEach(t => {
        const nature = t.transaction_nature || 'null'
        if (nature in natureCounts) {
          natureCounts[nature]++
        }
      })

      console.log('\n📊 交易性质统计：')
      console.log(`  - 总记录数: ${stats.length}`)
      console.log(`  - 营业内: ${natureCounts.operating}`)
      console.log(`  - 营业外: ${natureCounts.non_operating}`)
      console.log(`  - 未分类: ${natureCounts.null}`)
    }

    return true

  } catch (error) {
    console.error('❌ 验证过程出错:', error.message)
    return false
  }
}

// 主函数
async function main() {
  console.log('=' .repeat(80))
  console.log('数据库迁移: 添加 transaction_nature 字段到 transactions 表')
  console.log('=' .repeat(80))

  await runMigration()

  // 等待用户手动执行 SQL 后验证
  console.log('\n执行完迁移 SQL 后，运行以下命令验证：')
  console.log('node scripts/verify-transaction-nature.js\n')
}

// 执行
main().catch(error => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
