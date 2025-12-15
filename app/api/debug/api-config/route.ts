import { NextRequest, NextResponse } from 'next/server'
import { detectBackend } from '@/lib/backend/detector'
import { getLCSession } from '@/lib/leancloud/cookies'

export async function GET(request: NextRequest) {
  const backend = detectBackend()

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    backend,
    envVars: {
      TENCENT_SECRET_ID: process.env.TENCENT_SECRET_ID ? 'configured' : 'not configured',
      TENCENT_SECRET_KEY: process.env.TENCENT_SECRET_KEY ? 'configured' : 'not configured',
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'configured' : 'not configured',
    },
    session: null,
    profile: null,
    company: null,
    apiConfig: null,
    error: null,
  }

  try {
    if (backend === 'leancloud') {
      // 获取 session
      const session = await getLCSession()
      debugInfo.session = session ? {
        userId: session.userId,
        username: session.username,
        companyCode: session.companyCode,
        hasSessionToken: !!session.sessionToken,
      } : null

      if (!session) {
        debugInfo.error = 'No session found'
        return NextResponse.json(debugInfo)
      }

      // 获取 profile
      const { ProfileModel, CompanyModel } = await import('@/lib/leancloud/models')
      const profileResult = await ProfileModel.getByUserId(session.userId, 3, session.sessionToken)
      debugInfo.profile = profileResult.data ? {
        id: profileResult.data.id,
        companyId: profileResult.data.companyId,
        role: profileResult.data.role,
        fullName: profileResult.data.fullName,
      } : null
      debugInfo.profileError = profileResult.error

      if (!profileResult.data?.companyId) {
        debugInfo.error = 'No company ID in profile'
        return NextResponse.json(debugInfo)
      }

      // 获取公司信息
      const companyResult = await CompanyModel.getById(profileResult.data.companyId)
      debugInfo.company = companyResult.data ? {
        id: companyResult.data.id,
        name: companyResult.data.name,
        code: companyResult.data.code,
        hasDeepseekApiKey: !!companyResult.data.deepseekApiKey,
        hasTencentSecretId: !!companyResult.data.tencentSecretId,
        hasTencentSecretKey: !!companyResult.data.tencentSecretKey,
        // 显示部分密钥用于调试
        deepseekApiKeyPreview: companyResult.data.deepseekApiKey
          ? companyResult.data.deepseekApiKey.substring(0, 8) + '...'
          : null,
        tencentSecretIdPreview: companyResult.data.tencentSecretId
          ? companyResult.data.tencentSecretId.substring(0, 8) + '...'
          : null,
      } : null
      debugInfo.companyError = companyResult.error

      // 测试 getCurrentUserApiKeys
      const { getCurrentUserApiKeys } = await import('@/lib/backend/api-config')
      const apiKeys = await getCurrentUserApiKeys()
      debugInfo.apiConfig = apiKeys ? {
        hasDeepseekApiKey: !!apiKeys.deepseek_api_key,
        hasTencentSecretId: !!apiKeys.tencent_secret_id,
        hasTencentSecretKey: !!apiKeys.tencent_secret_key,
      } : null
    }
  } catch (error: any) {
    debugInfo.error = error.message
    debugInfo.stack = error.stack
  }

  return NextResponse.json(debugInfo)
}
