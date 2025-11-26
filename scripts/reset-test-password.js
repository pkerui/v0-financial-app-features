/**
 * 重置测试账户密码
 * 运行方式：node scripts/reset-test-password.js
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
  process.exit(1)
}

// 创建 Supabase 客户端（使用 service role key 以获得管理员权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword() {
  const email = 'test@homestay.com'
  const newPassword = 'test123456'

  console.log('🔄 正在重置测试账户密码...')
  console.log(`账户: ${email}`)
  console.log(`新密码: ${newPassword}`)

  try {
    // 使用 service role key 更新用户密码
    const { data, error } = await supabase.auth.admin.updateUserById(
      // 首先获取用户 ID
      (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || '',
      { password: newPassword }
    )

    if (error) {
      // 如果上面的方法失败，尝试另一种方法
      console.log('尝试另一种方法...')

      // 先查找用户
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users.users.find(u => u.email === email)

      if (!user) {
        console.error(`❌ 未找到邮箱为 ${email} 的用户`)
        return
      }

      console.log(`找到用户: ${user.id}`)

      // 更新密码
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('❌ 密码重置失败:', updateError.message)
        return
      }

      console.log('✅ 密码重置成功!')
      console.log(`\n现在可以使用以下凭据登录:`)
      console.log(`邮箱: ${email}`)
      console.log(`密码: ${newPassword}`)

    } else {
      console.log('✅ 密码重置成功!')
      console.log(`\n现在可以使用以下凭据登录:`)
      console.log(`邮箱: ${email}`)
      console.log(`密码: ${newPassword}`)
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message)
  }
}

// 执行
resetPassword().catch(error => {
  console.error('❌ 执行失败:', error)
  process.exit(1)
})
