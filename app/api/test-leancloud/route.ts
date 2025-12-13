import { NextResponse } from 'next/server'
import { initLeanCloud, checkConnection, config } from '@/lib/leancloud'

export async function GET() {
  try {
    // 初始化 LeanCloud
    initLeanCloud()

    // 测试连接
    const connected = await checkConnection()

    return NextResponse.json({
      success: true,
      message: 'LeanCloud REST API 已配置',
      config: {
        appId: config.appId.substring(0, 8) + '...',
        serverURL: config.serverURL,
      },
      connection: connected ? '连接成功' : '连接失败',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Test LeanCloud] 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '未知错误',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
