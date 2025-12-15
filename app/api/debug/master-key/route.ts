import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/leancloud/init'
import { getUsersByIds } from '@/lib/leancloud/auth'

export async function GET(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    masterKeyConfigured: !!config.masterKey,
    masterKeyLength: config.masterKey?.length || 0,
    masterKeyPreview: config.masterKey ? config.masterKey.substring(0, 4) + '...' : null,
  }

  // 测试获取用户
  try {
    // 用一个测试 ID 来验证 API 是否工作
    const testResult = await getUsersByIds(['test-id'])
    debugInfo.apiTest = {
      success: !testResult.error,
      error: testResult.error,
      usersCount: testResult.users?.length || 0,
    }
  } catch (error: any) {
    debugInfo.apiTest = {
      success: false,
      error: error.message,
    }
  }

  return NextResponse.json(debugInfo)
}
