/**
 * LeanCloud REST API 配置
 * 使用 REST API 代替 SDK 以避免与 Next.js Turbopack 的兼容性问题
 */

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 500, // 毫秒
  maxDelay: 3000, // 最大延迟 3 秒
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 判断是否为可重试的网络错误
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase()
    return message.includes('fetch failed') ||
           message.includes('network') ||
           message.includes('timeout') ||
           message.includes('abort') ||
           message.includes('connection')
  }
  return false
}

/**
 * 带重试机制的 fetch 请求
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      lastError = error

      // 如果不是可重试的错误，立即抛出
      if (!isRetryableError(error)) {
        throw error
      }

      // 如果还有重试次数
      if (attempt < retries) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        )
        console.log(`[LeanCloud] 请求失败，${delayMs}ms 后重试 (${attempt + 1}/${retries})...`)
        await delay(delayMs)
      }
    }
  }

  // 所有重试都失败了
  throw lastError
}

// LeanCloud 配置
export const config = {
  appId: process.env.NEXT_PUBLIC_LEANCLOUD_APP_ID || 'vJ1HlM4FiTSnu3K9skXu8vOf-gzGzoHsz',
  appKey: process.env.NEXT_PUBLIC_LEANCLOUD_APP_KEY || '9rkhfgrEqADpzLotXEqMPeBg',
  masterKey: process.env.LEANCLOUD_MASTER_KEY || '',  // Master Key 用于管理员操作
  serverURL: process.env.NEXT_PUBLIC_LEANCLOUD_SERVER_URL || 'https://vj1hlm4f.lc-cn-n1-shared.com',
}

/**
 * LeanCloud REST API 基础请求头
 */
export function getHeaders(sessionToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-LC-Id': config.appId,
    'X-LC-Key': config.appKey,
    'Content-Type': 'application/json',
  }
  if (sessionToken) {
    headers['X-LC-Session'] = sessionToken
  }
  return headers
}

/**
 * 获取使用 Master Key 的请求头（用于管理员操作）
 * Master Key 格式: {masterKey},master
 */
export function getHeadersWithMasterKey(): Record<string, string> {
  if (!config.masterKey) {
    throw new Error('Master Key 未配置，无法执行管理员操作')
  }
  return {
    'X-LC-Id': config.appId,
    'X-LC-Key': `${config.masterKey},master`,
    'Content-Type': 'application/json',
  }
}

/**
 * LeanCloud REST API 基础 URL
 */
export function getApiUrl(path: string): string {
  return `${config.serverURL}/1.1${path}`
}

/**
 * 初始化 LeanCloud（REST API 模式不需要实际初始化）
 */
export function initLeanCloud(): void {
  console.log('[LeanCloud] REST API 模式已启用')
}

/**
 * 获取 LeanCloud 客户端（REST API 模式）
 * 返回 REST API 工具函数
 */
export function getLeanCloud() {
  return {
    request: lcRequest,
    getHeaders,
    getApiUrl,
  }
}

/**
 * LeanCloud REST API 请求封装
 */
export async function lcRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
  sessionToken?: string
): Promise<T> {
  const url = getApiUrl(path)
  const headers = getHeaders(sessionToken)

  const options: RequestInit = {
    method,
    headers,
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data)
  }

  // 使用带重试机制的 fetch
  const response = await fetchWithRetry(url, options)
  const result = await response.json()

  if (!response.ok) {
    // 特殊处理：如果是 GET 请求且 Class 不存在，返回空结果而不是抛错
    // LeanCloud 会在首次写入时自动创建 Class，所以查询时 Class 可能不存在
    const errorMsg = result.error || 'LeanCloud API Error'
    if (method === 'GET' && (errorMsg.includes("doesn't exist") || errorMsg.includes('Class or object'))) {
      console.log(`[LeanCloud] Class 尚未创建，返回空结果: ${path}`)
      // 对于查询请求，返回空数组
      return { results: [] } as T
    }

    const error = new Error(errorMsg)
    ;(error as any).code = result.code
    throw error
  }

  return result as T
}

/**
 * 使用 Master Key 的 LeanCloud REST API 请求封装
 * 用于管理员操作（如删除其他用户）
 */
export async function lcRequestWithMasterKey<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown
): Promise<T> {
  const url = getApiUrl(path)
  const headers = getHeadersWithMasterKey()

  const options: RequestInit = {
    method,
    headers,
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data)
  }

  // 使用带重试机制的 fetch
  const response = await fetchWithRetry(url, options)
  const result = await response.json()

  if (!response.ok) {
    const error = new Error(result.error || 'LeanCloud API Error')
    ;(error as any).code = result.code
    throw error
  }

  return result as T
}

/**
 * 检查 LeanCloud 连接状态
 */
export async function checkConnection(): Promise<boolean> {
  try {
    // 尝试获取时间戳来验证连接
    await lcRequest('GET', '/date')
    return true
  } catch (error) {
    console.error('[LeanCloud] 连接检查失败:', error)
    return false
  }
}

// 为了兼容性，导出一个模拟的 AV 对象
export const AV = {
  // REST API 不需要 AV 对象，但保留接口兼容性
}
