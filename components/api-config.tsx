'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Key, Eye, EyeOff, CheckCircle, XCircle, ExternalLink, Info, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { getApiConfig, updateApiConfig, type ApiConfigDisplay } from '@/lib/backend/api-config'

export function ApiConfig() {
  const [config, setConfig] = useState<ApiConfigDisplay | null>(null)
  const [loading, setLoading] = useState(true)

  // DeepSeek 表单状态
  const [deepseekKey, setDeepseekKey] = useState('')
  const [showDeepseekKey, setShowDeepseekKey] = useState(false)
  const [savingDeepseek, setSavingDeepseek] = useState(false)
  const [showDeepseekGuide, setShowDeepseekGuide] = useState(false)

  // 腾讯云表单状态
  const [tencentSecretId, setTencentSecretId] = useState('')
  const [tencentSecretKey, setTencentSecretKey] = useState('')
  const [showTencentId, setShowTencentId] = useState(false)
  const [showTencentKey, setShowTencentKey] = useState(false)
  const [savingTencent, setSavingTencent] = useState(false)
  const [showTencentGuide, setShowTencentGuide] = useState(false)

  // 已配置密钥显示状态
  const [showConfiguredDeepseek, setShowConfiguredDeepseek] = useState(false)
  const [showConfiguredTencentId, setShowConfiguredTencentId] = useState(false)
  const [showConfiguredTencentKey, setShowConfiguredTencentKey] = useState(false)

  // 加载配置
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const result = await getApiConfig()
      if (result.data) {
        setConfig(result.data)
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存 DeepSeek 配置
  const handleSaveDeepseek = async () => {
    if (!deepseekKey.trim()) {
      toast.error('请输入 API Key')
      return
    }

    setSavingDeepseek(true)
    try {
      const result = await updateApiConfig({ deepseek_api_key: deepseekKey.trim() })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('DeepSeek API Key 保存成功')
        setDeepseekKey('')
        loadConfig()
      }
    } finally {
      setSavingDeepseek(false)
    }
  }

  // 清除 DeepSeek 配置
  const handleClearDeepseek = async () => {
    setSavingDeepseek(true)
    try {
      const result = await updateApiConfig({ deepseek_api_key: null })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('DeepSeek API Key 已清除')
        loadConfig()
      }
    } finally {
      setSavingDeepseek(false)
    }
  }

  // 保存腾讯云配置
  const handleSaveTencent = async () => {
    if (!tencentSecretId.trim() || !tencentSecretKey.trim()) {
      toast.error('请输入完整的腾讯云密钥')
      return
    }

    setSavingTencent(true)
    try {
      const result = await updateApiConfig({
        tencent_secret_id: tencentSecretId.trim(),
        tencent_secret_key: tencentSecretKey.trim(),
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('腾讯云密钥保存成功')
        setTencentSecretId('')
        setTencentSecretKey('')
        loadConfig()
      }
    } finally {
      setSavingTencent(false)
    }
  }

  // 清除腾讯云配置
  const handleClearTencent = async () => {
    setSavingTencent(true)
    try {
      const result = await updateApiConfig({
        tencent_secret_id: null,
        tencent_secret_key: null,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('腾讯云密钥已清除')
        loadConfig()
      }
    } finally {
      setSavingTencent(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 说明卡片 */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            关于 API 配置
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-600 space-y-2">
          <p>系统使用以下第三方服务实现智能记账功能：</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>DeepSeek</strong>：AI 文本解析，将语音转文字后的内容解析为结构化的收支记录</li>
            <li><strong>腾讯云语音识别</strong>：将语音转换为文字</li>
          </ul>
          <p className="pt-2">
            <strong>未配置</strong>：系统使用测试账户，有额度限制。请尽快配置您的账户，避免记账失败。
            <br />
            <strong>已配置</strong>：使用您自己的账户额度。如何配置详见下方"如何获取 DeepSeek API Key"及"如何获取腾讯云密钥"说明。
          </p>
        </CardContent>
      </Card>

      {/* DeepSeek 配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                DeepSeek API
                {config?.deepseek_configured ? (
                  <Badge variant="default" className="ml-2 bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    已配置
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">
                    <XCircle className="h-3 w-3 mr-1" />
                    未配置
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>用于 AI 智能解析记账文本</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.deepseek_configured && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">当前配置</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm truncate">
                    {showConfiguredDeepseek ? config.deepseek_api_key_full : config.deepseek_api_key_masked}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => setShowConfiguredDeepseek(!showConfiguredDeepseek)}
                  >
                    {showConfiguredDeepseek ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive ml-2">
                    <Trash2 className="h-4 w-4 mr-1" />
                    清除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认清除 DeepSeek API Key？</AlertDialogTitle>
                    <AlertDialogDescription>
                      清除后将使用系统测试账户，有额度限制。此操作可以随时重新配置。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearDeepseek}>确认清除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* 可折叠的指南 */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowDeepseekGuide(!showDeepseekGuide)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span>如何获取 DeepSeek API Key？</span>
              {showDeepseekGuide ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showDeepseekGuide && (
              <div className="px-3 pb-3 border-t">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pt-3">
                  <li>
                    访问{' '}
                    <a
                      href="https://platform.deepseek.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      DeepSeek 开放平台
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>注册并登录账号</li>
                  <li>进入「API Keys」页面</li>
                  <li>点击「创建 API Key」</li>
                  <li>复制生成的 Key 并粘贴到下方输入框</li>
                </ol>
                <p className="mt-3 text-sm text-muted-foreground">
                  <strong>费用说明</strong>：DeepSeek 按调用量计费，解析一条记录约消耗 0.001-0.01 元。
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{config?.deepseek_configured ? '更新 API Key' : '输入 API Key'}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showDeepseekKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                >
                  {showDeepseekKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleSaveDeepseek} disabled={savingDeepseek || !deepseekKey.trim()}>
                {savingDeepseek ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 腾讯云配置 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                腾讯云语音识别
                {config?.tencent_configured ? (
                  <Badge variant="default" className="ml-2 bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    已配置
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">
                    <XCircle className="h-3 w-3 mr-1" />
                    未配置
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>用于语音转文字功能</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.tencent_configured && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">当前配置</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">SecretId:</span>
                  <p className="font-mono text-sm truncate">
                    {showConfiguredTencentId ? config.tencent_secret_id_full : config.tencent_secret_id_masked}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => setShowConfiguredTencentId(!showConfiguredTencentId)}
                  >
                    {showConfiguredTencentId ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">SecretKey:</span>
                  <p className="font-mono text-sm truncate">
                    {showConfiguredTencentKey ? config.tencent_secret_key_full : '••••••••'}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => setShowConfiguredTencentKey(!showConfiguredTencentKey)}
                  >
                    {showConfiguredTencentKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive ml-2">
                    <Trash2 className="h-4 w-4 mr-1" />
                    清除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认清除腾讯云密钥？</AlertDialogTitle>
                    <AlertDialogDescription>
                      清除后将使用系统测试账户，有额度限制。此操作可以随时重新配置。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearTencent}>确认清除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* 可折叠的指南 */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowTencentGuide(!showTencentGuide)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span>如何获取腾讯云密钥？</span>
              {showTencentGuide ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {showTencentGuide && (
              <div className="px-3 pb-3 border-t">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground pt-3">
                  <li>
                    访问{' '}
                    <a
                      href="https://console.cloud.tencent.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      腾讯云控制台
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>注册并登录账号，完成实名认证</li>
                  <li>
                    开通{' '}
                    <a
                      href="https://console.cloud.tencent.com/asr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      语音识别服务
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>
                    进入{' '}
                    <a
                      href="https://console.cloud.tencent.com/cam/capi"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      API 密钥管理
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>创建或查看 SecretId 和 SecretKey</li>
                  <li>复制并粘贴到下方输入框</li>
                </ol>
                <p className="mt-3 text-sm text-muted-foreground">
                  <strong>费用说明</strong>：腾讯云语音识别新用户有免费额度，之后按调用量计费，约 0.006 元/15秒。
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{config?.tencent_configured ? '更新 SecretId' : 'SecretId'}</Label>
              <div className="relative">
                <Input
                  type={showTencentId ? 'text' : 'password'}
                  placeholder="AKID..."
                  value={tencentSecretId}
                  onChange={(e) => setTencentSecretId(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowTencentId(!showTencentId)}
                >
                  {showTencentId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{config?.tencent_configured ? '更新 SecretKey' : 'SecretKey'}</Label>
              <div className="relative">
                <Input
                  type={showTencentKey ? 'text' : 'password'}
                  placeholder="输入 SecretKey"
                  value={tencentSecretKey}
                  onChange={(e) => setTencentSecretKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowTencentKey(!showTencentKey)}
                >
                  {showTencentKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleSaveTencent}
              disabled={savingTencent || !tencentSecretId.trim() || !tencentSecretKey.trim()}
              className="w-full"
            >
              {savingTencent ? '保存中...' : '保存腾讯云配置'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
