/**
 * 后端检测器
 * 根据运行环境自动选择使用 Supabase 或 LeanCloud
 */

export type BackendType = 'supabase' | 'leancloud'

/**
 * 检测当前应该使用哪个后端
 *
 * 规则：
 * 1. 环境变量 NEXT_PUBLIC_BACKEND 可以强制指定后端
 * 2. 如果配置了 LeanCloud 且 Supabase 未配置，使用 LeanCloud
 * 3. 默认使用 Supabase
 */
export function detectBackend(): BackendType {
  // 1. 检查环境变量是否强制指定
  const envBackend = process.env.NEXT_PUBLIC_BACKEND?.toLowerCase()
  if (envBackend === 'leancloud') {
    return 'leancloud'
  }
  if (envBackend === 'supabase') {
    return 'supabase'
  }

  // 2. 检查 LeanCloud 是否配置
  const lcAppId = process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID
  const lcAppKey = process.env.NEXT_PUBLIC_LEANCLOUD_APP_KEY
  const lcServerURL = process.env.NEXT_PUBLIC_LEANCLOUD_SERVER_URL
  const isLeanCloudConfigured = !!(lcAppId && lcAppKey && lcServerURL)

  // 3. 检查 Supabase 是否配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

  // 4. 如果只配置了 LeanCloud，使用 LeanCloud
  if (isLeanCloudConfigured && !isSupabaseConfigured) {
    return 'leancloud'
  }

  // 5. 默认使用 Supabase
  return 'supabase'
}

/**
 * 检查当前是否使用 LeanCloud
 */
export function isLeanCloudMode(): boolean {
  return detectBackend() === 'leancloud'
}

/**
 * 检查当前是否使用 Supabase
 */
export function isSupabaseMode(): boolean {
  return detectBackend() === 'supabase'
}

/**
 * 获取后端配置信息（用于调试）
 */
export function getBackendInfo() {
  const backend = detectBackend()

  return {
    backend,
    leancloud: {
      configured: !!(
        process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID &&
        process.env.NEXT_PUBLIC_LEANCLOUD_APP_KEY
      ),
      appId: process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID ?
        process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID.substring(0, 8) + '...' : null,
      serverURL: process.env.NEXT_PUBLIC_LEANCLOUD_SERVER_URL || null,
    },
    supabase: {
      configured: !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    },
    env: {
      NEXT_PUBLIC_BACKEND: process.env.NEXT_PUBLIC_BACKEND || null,
    },
  }
}
