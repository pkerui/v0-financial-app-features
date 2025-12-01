/**
 * 腾讯云语音识别工具
 * 使用 MediaRecorder API 录音,然后调用腾讯云 API 识别
 */

export class TencentASR {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  /**
   * 开始录音
   */
  async startRecording(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): Promise<() => void> {
    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm',
      })

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
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        console.log('合并后的音频 Blob 大小:', audioBlob.size, 'bytes')
        await this.recognizeAudio(audioBlob, onResult, onError)
      }

      // 开始录音（每100ms收集一次数据，确保能够捕获音频）
      this.mediaRecorder.start(100)
      console.log('开始录音（腾讯云引擎）')

      // 返回停止函数
      return () => this.stopRecording()
    } catch (error) {
      console.error('启动录音失败:', error)
      onError('无法访问麦克风,请检查浏览器权限')
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

      console.log('音频数据大小:', audioBlob.size, 'bytes')

      // 将 webm 转换为 WAV 格式
      const wavBlob = await this.convertToWav(audioBlob)
      console.log('WAV 数据大小:', wavBlob.size, 'bytes')

      // 创建 FormData
      const formData = new FormData()
      formData.append('audio', wavBlob, 'audio.wav')

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
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const data = []
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      data.push(buffer.getChannelData(i))
    }

    const interleaved = this.interleave(data)
    const dataLength = interleaved.length * bytesPerSample
    const headerLength = 44
    const totalLength = headerLength + dataLength

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
    this.floatTo16BitPCM(view, headerLength, interleaved)

    return arrayBuffer
  }

  /**
   * 交织多声道数据
   */
  private interleave(channelData: Float32Array[]): Float32Array {
    const length = channelData[0].length
    const numberOfChannels = channelData.length
    const result = new Float32Array(length * numberOfChannels)

    let offset = 0
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        result[offset++] = channelData[channel][i]
      }
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
