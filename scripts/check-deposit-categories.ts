/**
 * 检查数据库中押金分类的当前状态
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// 手动加载 .env.local
const envContent = readFileSync('.env.local', 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDepositCategories() {
  console.log('🔍 查询数据库中的押金分类...\n')

  // 先查询所有分类看看有没有数据
  const { data: allCategories, error: allError } = await supabase
    .from('transaction_categories')
    .select('name, type, cash_flow_activity')
    .limit(10)

  if (allError) {
    console.error('❌ 查询所有分类失败:', allError)
  } else {
    console.log(`📋 数据库中共有 ${allCategories?.length || 0} 条分类记录（前10条）`)
    if (allCategories && allCategories.length > 0) {
      console.log('示例分类:', allCategories.slice(0, 3))
    }
    console.log('')
  }

  // 查询所有押金相关分类
  const { data: categories, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .or('name.eq.押金收入,name.eq.押金退还')
    .order('company_id')
    .order('name')

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️  未找到押金相关分类')
    return
  }

  console.log(`✅ 找到 ${categories.length} 个押金分类记录:\n`)

  categories.forEach((cat, index) => {
    console.log(`--- 记录 ${index + 1} ---`)
    console.log(`公司ID: ${cat.company_id}`)
    console.log(`分类名称: ${cat.name}`)
    console.log(`类型: ${cat.type === 'income' ? '收入' : '支出'}`)
    console.log(`现金流活动: ${cat.cash_flow_activity}`)
    console.log(`  - operating: 经营活动`)
    console.log(`  - investing: 投资活动`)
    console.log(`  - financing: 筹资活动`)
    console.log(`当前值: ${cat.cash_flow_activity} ${
      cat.cash_flow_activity === 'financing'
        ? '✅ (筹资活动 - 正确)'
        : cat.cash_flow_activity === 'operating'
        ? '⚠️  (经营活动 - 需要修改)'
        : '❓'
    }`)
    console.log(`交易性质: ${cat.transaction_nature || '未设置'}`)
    console.log(`计入利润表: ${cat.include_in_profit_loss ? '是' : '否'}`)
    console.log(`系统预设: ${cat.is_system ? '是' : '否'}`)
    console.log(`最后更新: ${cat.updated_at}`)
    console.log('')
  })

  // 统计
  const financingCount = categories.filter(c => c.cash_flow_activity === 'financing').length
  const operatingCount = categories.filter(c => c.cash_flow_activity === 'operating').length
  const otherCount = categories.filter(c =>
    c.cash_flow_activity !== 'financing' && c.cash_flow_activity !== 'operating'
  ).length

  console.log('📊 统计:')
  console.log(`  筹资活动 (financing): ${financingCount} 个 ${financingCount > 0 ? '✅' : ''}`)
  console.log(`  经营活动 (operating): ${operatingCount} 个 ${operatingCount > 0 ? '⚠️' : ''}`)
  console.log(`  其他: ${otherCount} 个`)
  console.log('')

  // 查询使用这些分类的交易数量
  console.log('🔍 查询相关交易记录...\n')

  for (const cat of categories) {
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat.name)
      .eq('company_id', cat.company_id)

    if (!countError) {
      console.log(`${cat.name} (${cat.type}): ${count || 0} 笔交易`)
    }
  }
}

checkDepositCategories()
  .then(() => {
    console.log('\n✅ 检查完成')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ 发生错误:', err)
    process.exit(1)
  })
