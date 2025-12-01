import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUserApiKeys } from '@/lib/api/api-config'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: '请提供音频文件' }, { status: 400 })
    }

    // 优先使用公司配置的 API Key，否则使用环境变量
    let secretId = process.env.TENCENT_SECRET_ID
    let secretKey = process.env.TENCENT_SECRET_KEY
    const companyKeys = await getCurrentUserApiKeys()
    if (companyKeys?.tencent_secret_id && companyKeys?.tencent_secret_key) {
      secretId = companyKeys.tencent_secret_id
      secretKey = companyKeys.tencent_secret_key
    }

    if (!secretId || !secretKey) {
      return NextResponse.json({ error: '腾讯云 API 密钥未配置，请在系统设置中配置 API 密钥' }, { status: 500 })
    }

    // 将音频文件转换为 Base64
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const audioBase64 = buffer.toString('base64')

    // 腾讯云 API 参数
    const endpoint = 'asr.tencentcloudapi.com'
    const service = 'asr'
    const action = 'SentenceRecognition'
    const version = '2019-06-14'
    const region = 'ap-guangzhou'
    const timestamp = Math.floor(Date.now() / 1000)
    const date = new Date(timestamp * 1000).toISOString().split('T')[0]

    // 请求体
    const params = {
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: '16k_zh',
      SourceType: 1,
      VoiceFormat: 'wav',
      UsrAudioKey: Date.now().toString(),
      Data: audioBase64,
      DataLen: buffer.length,
    }

    const payload = JSON.stringify(params)

    // Step 1: 创建规范请求
    const httpRequestMethod = 'POST'
    const canonicalUri = '/'
    const canonicalQueryString = ''
    const canonicalHeaders = `content-type:application/json\nhost:${endpoint}\n`
    const signedHeaders = 'content-type;host'
    const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex')
    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`

    // Step 2: 创建待签名字符串
    const algorithm = 'TC3-HMAC-SHA256'
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    const credentialScope = `${date}/${service}/tc3_request`
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`

    // Step 3: 计算签名
    const kDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest()
    const kService = crypto.createHmac('sha256', kDate).update(service).digest()
    const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest()
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')

    // Step 4: 构造 Authorization
    const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    // 发送请求
    const response = await fetch(`https://${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': endpoint,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': region,
        'Authorization': authorization,
      },
      body: payload,
    })

    const data = await response.json()

    if (!response.ok || data.Response?.Error) {
      console.error('腾讯云 ASR 错误:', data)
      const errorCode = data.Response?.Error?.Code || ''
      const errorMessage = data.Response?.Error?.Message || '语音识别失败'

      // 检查是否是密钥错误
      if (errorCode.includes('AuthFailure') || errorCode.includes('SecretId') || errorCode.includes('SecretKey')) {
        return NextResponse.json(
          { error: '腾讯云密钥无效，请联系管理员在系统设置中检查 API 配置' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    // 返回识别结果
    const result = data.Response?.Result || ''

    return NextResponse.json({
      text: result,
      requestId: data.Response?.RequestId,
    })
  } catch (error) {
    console.error('语音识别失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
