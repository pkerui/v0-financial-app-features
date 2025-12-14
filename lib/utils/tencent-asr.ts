/**
 * 腾讯云语音识别工具
 * 使用 MediaRecorder API 录音,然后调用腾讯云 API 识别
 */

export class TencentASR {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private mimeType: string = 'audio/webm'

  /**
   * 开始录音
   */
  async startRecording(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): Promise<() => void> {
    try {
      // 检查是否为安全上下文（HTTPS 或 localhost）
      const isSecureContext = window.isSecureContext
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

      if (!isSecureContext && !isLocalhost) {
        onError('录音功能需要 HTTPS 环境。请使用 https:// 访问网站，或在本地使用 localhost')
        return () => {}
      }

      // 检查浏览器是否支持 getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError('您的浏览器不支持录音功能，请使用 Chrome、Safari 或 Firefox 最新版本')
        return () => {}
      }

      // 请求麦克风权限
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (permissionError: any) {
        console.error('麦克风权限错误:', permissionError)
        if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
          onError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
        } else if (permissionError.name === 'NotFoundError') {
          onError('未检测到麦克风设备')
        } else if (permissionError.name === 'NotReadableError') {
          onError('麦克风被其他应用占用')
        } else {
          onError('无法访问麦克风: ' + (permissionError.message || '未知错误'))
        }
        return () => {}
      }

      // 检测支持的音频格式
      // 优先使用 mp4/m4a 格式，因为腾讯云 ASR 不支持 webm
      // 腾讯云支持: wav, pcm, ogg-opus, speex, silk, mp3, m4a, aac
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        this.mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        // webm with opus 可以作为 ogg-opus 发送
        this.mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        this.mimeType = 'audio/ogg'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        // 纯 webm 腾讯云不支持，但作为最后的备选
        this.mimeType = 'audio/webm'
      } else {
        // 使用默认格式
        this.mimeType = ''
      }
      console.log('使用录音格式:', this.mimeType)

      // 创建 MediaRecorder
      const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {}
      this.mediaRecorder = new MediaRecorder(this.stream, options)

      this.audioChunks = []

      // 收集音频数据
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('收集音频数据块:', event.data.size, 'bytes')
          this.audioChunks.push(event.data)
        }
      }

      // 录音停止时处理
      this.mediaRecorder.onstop = async () => {
        console.log('录音停止，共收集', this.audioChunks.length, '个数据块')
        const audioBlob = new Blob(this.audioChunks, { type: this.mimeType || 'audio/webm' })
        console.log('合并后的音频 Blob 大小:', audioBlob.size, 'bytes, 格式:', this.mimeType)
        await this.recognizeAudio(audioBlob, onResult, onError)
      }

      // 开始录音（每100ms收集一次数据，确保能够捕获音频）
      this.mediaRecorder.start(100)
      console.log('开始录音（腾讯云引擎）')

      // 返回停止函数
      return () => this.stopRecording()
    } catch (error: any) {
      console.error('启动录音失败:', error)
      onError('录音初始化失败: ' + (error.message || '未知错误'))
      return () => {}
    }
  }

  /**
   * 停止录音
   */
  stopRecording() {
    console.log('停止录音请求')
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('MediaRecorder 状态:', this.mediaRecorder.state)
      this.mediaRecorder.stop()
    } else {
      console.warn('MediaRecorder 未激活或不存在')
    }

    // 停止所有音轨
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  /**
   * 调用腾讯云 API 识别音频
   */
  private async recognizeAudio(
    audioBlob: Blob,
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ) {
    try {
      // 检查音频大小
      if (audioBlob.size === 0) {
        console.warn('录音数据为空')
        onError('录音数据为空，请重新录音')
        return
      }

      if (audioBlob.size < 1000) {
        console.warn('录音时间太短:', audioBlob.size, 'bytes')
        onError('录音时间太短，请说完整的句子后再停止')
        return
      }

      console.log('音频数据大小:', audioBlob.size, 'bytes, 格式:', this.mimeType)

      // 腾讯云 ASR 需要 16kHz 采样率的音频
      // 浏览器录制的 mp4/webm 格式可能编码不兼容，统一转换为 WAV 格式
      // WAV 是最可靠的格式，转换过程中会自动调整采样率
      let finalBlob: Blob
      const fileName = 'audio.wav'

      console.log('正在将音频转换为 WAV 格式...')
      try {
        finalBlob = await this.convertToWav(audioBlob)
        console.log('WAV 转换成功，大小:', finalBlob.size, 'bytes')
      } catch (convertError) {
        console.error('WAV 转换失败:', convertError)
        onError('音频格式转换失败，请重试')
        return
      }

      const formData = new FormData()
      formData.append('audio', finalBlob, fileName)

      // 调用后端 API
      console.log('正在调用腾讯云 ASR API...')
      const response = await fetch('/api/tencent-asr', {
        method: 'POST',
        body: formData,
      })

      // 读取响应文本，然后解析为 JSON
      const responseText = await response.text()
      console.log('腾讯云 ASR 原始响应:', responseText)

      let data: { text?: string; error?: string; requestId?: string }
      try {
        data = JSON.parse(responseText)
      } catch {
        console.error('解析响应失败:', responseText)
        onError('服务器响应格式错误')
        return
      }

      console.log('腾讯云 ASR 响应:', data)

      if (!response.ok) {
        const errorMessage = data.error || '语音识别失败'
        onError(errorMessage)
        return
      }

      // 返回识别结果
      if (data.text && data.text.trim()) {
        console.log('识别成功:', data.text)
        onResult(data.text, true)
      } else {
        console.warn('识别结果为空')
        onError('未能识别出有效内容，请确保说话清晰且环境安静')
      }
    } catch (error) {
      console.error('语音识别错误:', error)
      onError('语音识别失败,请重试')
    }
  }

  /**
   * 将 WebM 音频转换为 WAV 格式
   * 腾讯云需要 WAV 格式
   */
  private async convertToWav(webmBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const fileReader = new FileReader()

      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // 转换为 WAV
          const wavBuffer = this.audioBufferToWav(audioBuffer)
          const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })

          resolve(wavBlob)
        } catch (error) {
          reject(error)
        }
      }

      fileReader.onerror = reject
      fileReader.readAsArrayBuffer(webmBlob)
    })
  }

  /**
   * 将 AudioBuffer 转换为 WAV 格式
   * 重新采样到 16kHz 以匹配腾讯云 ASR 要求
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const targetSampleRate = 16000 // 腾讯云 16k_zh 引擎需要 16kHz
    const numChannels = 1 // 单声道
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    // 获取第一个声道的数据（转换为单声道）
    const originalData = buffer.getChannelData(0)

    // 重新采样到 16kHz
    const resampledData = this.resample(originalData, buffer.sampleRate, targetSampleRate)
    console.log(`重新采样: ${buffer.sampleRate}Hz -> ${targetSampleRate}Hz, 样本数: ${originalData.length} -> ${resampledData.length}`)

    const dataLength = resampledData.length * bytesPerSample
    const headerLength = 44
    const totalLength = headerLength + dataLength
    const sampleRate = targetSampleRate

    const arrayBuffer = new ArrayBuffer(totalLength)
    const view = new DataView(arrayBuffer)

    // WAV 文件头
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, totalLength - 8, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // 写入音频数据
    this.floatTo16BitPCM(view, headerLength, resampledData)

    return arrayBuffer
  }

  /**
   * 重新采样音频数据
   * 使用线性插值将音频从源采样率转换到目标采样率
   */
  private resample(data: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return data
    }

    const ratio = fromSampleRate / toSampleRate
    const newLength = Math.round(data.length / ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const fraction = srcIndex - srcIndexFloor

      // 线性插值
      result[i] = data[srcIndexFloor] * (1 - fraction) + data[srcIndexCeil] * fraction
    }

    return result
  }

  /**
   * 写入字符串到 DataView
   */
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 将浮点数转换为 16 位 PCM
   */
  private floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }
}

/**
 * 启动腾讯云语音识别
 */
export function startTencentASR(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (error: string) => void
): () => void {
  const asr = new TencentASR()
  let stopFunction: (() => void) | null = null

  asr.startRecording(onResult, onError).then((stop) => {
    stopFunction = stop
  })

  return () => {
    if (stopFunction) {
      stopFunction()
    }
  }
}
