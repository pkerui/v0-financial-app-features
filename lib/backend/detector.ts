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
 * 2. 如果 Supabase 配置完整，使用 Supabase
 * 3. 否则默认使用 LeanCloud（因为 LeanCloud 有内置默认配置）
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

  // 2. 检查 Supabase 是否配置完整
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

  // 3. 如果 Supabase 配置完整，使用 Supabase
  if (isSupabaseConfigured) {
    return 'supabase'
  }

  // 4. 否则默认使用 LeanCloud（LeanCloud 在 init.ts 中有硬编码默认配置）
  return 'leancloud'
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
