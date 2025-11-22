/**
 * 应用层数据迁移脚本 - 为现有交易记录填充 cash_flow_activity
 * 运行方式：npx tsx scripts/migrate-activity-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { getCategoryMapping } from '../lib/cash-flow-config'

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少 Supabase 配置')
  console.error('请确保 .env.local 文件包含：')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateData() {
  console.log('🚀 开始迁移交易记录的现金流活动数据...\n')

  try {
    // 1. 获取所有交易记录
    console.log('📥 获取所有交易记录...')
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, type, category, cash_flow_activity')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`获取数据失败: ${fetchError.message}`)
    }

    if (!transactions || transactions.length === 0) {
      console.log('ℹ️  没有找到交易记录，迁移完成')
      return
    }

    console.log(`✅ 找到 ${transactions.length} 条交易记录\n`)

    // 2. 统计需要更新的记录
    const needUpdate = transactions.filter(t => !t.cash_flow_activity)
    console.log(`📊 统计：`)
    console.log(`  - 总记录数: ${transactions.length}`)
    console.log(`  - 已有 activity: ${transactions.length - needUpdate.length}`)
    console.log(`  - 需要更新: ${needUpdate.length}\n`)

    if (needUpdate.length === 0) {
      console.log('✨ 所有记录都已设置 activity，无需迁移')
      return
    }

    // 3. 批量更新记录
    console.log('🔄 开始更新记录...')
    let successCount = 0
    let failCount = 0
    const activityStats = {
      operating: 0,
      investing: 0,
      financing: 0
    }

    for (const transaction of needUpdate) {
      // 获取映射关系
      const mapping = getCategoryMapping(
        transaction.type as 'income' | 'expense',
        transaction.category
      )
      const activity = mapping?.activity || 'operating'

      // 更新记录
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ cash_flow_activity: activity })
        .eq('id', transaction.id)

      if (updateError) {
        console.error(`❌ 更新失败 [${transaction.id}]:`, updateError.message)
        failCount++
      } else {
        successCount++
        activityStats[activity]++

        // 每10条记录显示一次进度
        if (successCount % 10 === 0) {
          console.log(`  已更新 ${successCount}/${needUpdate.length} 条记录...`)
        }
      }
    }

    // 4. 显示结果
    console.log('\n✅ 迁移完成！')
    console.log('\n📊 更新结果：')
    console.log(`  - 成功: ${successCount}`)
    console.log(`  - 失败: ${failCount}`)
    console.log('\n📈 活动类型分布：')
    console.log(`  - 经营活动: ${activityStats.operating}`)
    console.log(`  - 投资活动: ${activityStats.investing}`)
    console.log(`  - 筹资活动: ${activityStats.financing}`)

    // 5. 验证结果
    console.log('\n🔍 验证迁移结果...')
    const { data: verifyData } = await supabase
      .from('transactions')
      .select('cash_flow_activity')
      .is('cash_flow_activity', null)

    const nullCount = verifyData?.length || 0
    if (nullCount === 0) {
      console.log('✨ 验证通过：所有记录都已设置 activity')
    } else {
      console.warn(`⚠️  仍有 ${nullCount} 条记录未设置 activity`)
    }

  } catch (error: any) {
    console.error('\n❌ 迁移失败:', error.message)
    process.exit(1)
  }
}

// 执行迁移
migrateData()
  .then(() => {
    console.log('\n✨ 迁移脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error)
    process.exit(1)
  })
