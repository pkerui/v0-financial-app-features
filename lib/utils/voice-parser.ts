/**
 * 语音文本解析工具
 * 从语音识别的文本中提取交易记录
 */

export type ParsedTransaction = {
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string // YYYY-MM-DD format
  confidence: 'high' | 'medium' | 'low'
  cash_flow_activity?: 'operating' | 'investing' | 'financing'
  transaction_nature?: 'operating' | 'non_operating' | 'income_tax'
}

// 收入关键词
const incomeKeywords = ['收到', '收入', '入账', '进账', '房费', '押金']

// 支出关键词
const expenseKeywords = ['支付', '支出', '花费', '购买', '买了', '采购']

// 分类关键词映射
const categoryKeywords: Record<string, string[]> = {
  '房费收入': ['房费', '住宿费', '客房费'],
  '押金收入': ['押金'],
  '额外服务': ['服务费', '接送', '早餐'],
  '水电费': ['水电', '水费', '电费', '水电费'],
  '维修费': ['维修', '修理', '修缮'],
  '清洁费': ['清洁', '保洁', '打扫', '卫生'],
  '采购费': ['采购', '购买', '买了'],
  '人工费': ['工资', '人工', '薪水'],
}

// 中文数字转阿拉伯数字映射
const chineseNumberMap: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  '十': 10, '百': 100, '千': 1000, '万': 10000,
  '两': 2, '俩': 2, '仨': 3,
}

// 日期相关关键词
const dateKeywords = {
  today: ['今天', '今日'],
  yesterday: ['昨天', '昨日'],
  beforeYesterday: ['前天', '前日'],
  tomorrow: ['明天', '明日'],
}

/**
 * 转换中文数字为阿拉伯数字
 */
function chineseToNumber(chinese: string): number | null {
  if (!chinese) return null

  // 如果已经是阿拉伯数字，直接返回
  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese)
  }

  let result = 0
  let temp = 0
  let unit = 1

  for (let i = chinese.length - 1; i >= 0; i--) {
    const char = chinese[i]
    const num = chineseNumberMap[char]

    if (num === undefined) continue

    if (num >= 10) {
      // 单位：十、百、千、万
      unit = num
      if (temp === 0) temp = 1
    } else {
      // 数字：0-9
      temp = num
    }

    if (num < 10 && unit > 1) {
      result += temp * unit
      temp = 0
      unit = 1
    } else if (i === 0) {
      result += temp * unit
    }
  }

  return result > 0 ? result : null
}

/**
 * 从文本中提取日期
 * 支持格式：今天、昨天、前天、明天、1月15日、1号、15号、十一月二十日等
 */
function extractDate(text: string): string | null {
  const today = new Date()

  console.log('extractDate - 输入文本:', text)

  // 检查相对日期关键词
  for (const keyword of dateKeywords.today) {
    if (text.includes(keyword)) {
      console.log('extractDate - 匹配到今天关键词:', keyword)
      return formatDate(today)
    }
  }

  for (const keyword of dateKeywords.yesterday) {
    if (text.includes(keyword)) {
      const date = new Date(today)
      date.setDate(date.getDate() - 1)
      console.log('extractDate - 匹配到昨天关键词:', keyword)
      return formatDate(date)
    }
  }

  for (const keyword of dateKeywords.beforeYesterday) {
    if (text.includes(keyword)) {
      const date = new Date(today)
      date.setDate(date.getDate() - 2)
      console.log('extractDate - 匹配到前天关键词:', keyword)
      return formatDate(date)
    }
  }

  for (const keyword of dateKeywords.tomorrow) {
    if (text.includes(keyword)) {
      const date = new Date(today)
      date.setDate(date.getDate() + 1)
      console.log('extractDate - 匹配到明天关键词:', keyword)
      return formatDate(date)
    }
  }

  // 匹配 "X月X日" 格式（阿拉伯数字）
  const monthDayPattern = /(\d{1,2})月(\d{1,2})[日号]/
  const monthDayMatch = text.match(monthDayPattern)
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1])
    const day = parseInt(monthDayMatch[2])
    const year = today.getFullYear()
    console.log(`extractDate - 匹配到阿拉伯数字日期: ${month}月${day}日`)

    try {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return formatDate(date)
      }
    } catch (e) {
      // 无效日期
    }
  }

  // 匹配 "X月X日" 格式（中文数字）
  const chineseMonthDayPattern = /([一二三四五六七八九十]+)月([一二三四五六七八九十]+)[日号]/
  const chineseMonthDayMatch = text.match(chineseMonthDayPattern)
  if (chineseMonthDayMatch) {
    const monthStr = chineseMonthDayMatch[1]
    const dayStr = chineseMonthDayMatch[2]
    const month = chineseToNumber(monthStr)
    const day = chineseToNumber(dayStr)

    console.log(`extractDate - 匹配到中文数字日期: ${monthStr}月${dayStr}日 -> ${month}月${day}日`)

    if (month && day) {
      const year = today.getFullYear()
      try {
        const date = new Date(year, month - 1, day)
        if (!isNaN(date.getTime())) {
          return formatDate(date)
        }
      } catch (e) {
        // 无效日期
      }
    }
  }

  // 匹配 "X号" 格式（本月X号，阿拉伯数字）
  const dayPattern = /(\d{1,2})[日号]/
  const dayMatch = text.match(dayPattern)
  if (dayMatch) {
    const day = parseInt(dayMatch[1])
    const year = today.getFullYear()
    const month = today.getMonth()
    console.log(`extractDate - 匹配到阿拉伯数字日: ${day}号`)

    try {
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) {
        return formatDate(date)
      }
    } catch (e) {
      // 无效日期
    }
  }

  // 匹配 "X号" 格式（本月X号，中文数字）
  const chineseDayPattern = /([一二三四五六七八九十]+)[日号]/
  const chineseDayMatch = text.match(chineseDayPattern)
  if (chineseDayMatch && !text.includes('月')) { // 确保不是月份的一部分
    const dayStr = chineseDayMatch[1]
    const day = chineseToNumber(dayStr)
    console.log(`extractDate - 匹配到中文数字日: ${dayStr}号 -> ${day}号`)

    if (day) {
      const year = today.getFullYear()
      const month = today.getMonth()
      try {
        const date = new Date(year, month, day)
        if (!isNaN(date.getTime())) {
          return formatDate(date)
        }
      } catch (e) {
        // 无效日期
      }
    }
  }

  // 匹配完整日期 "YYYY-MM-DD" 或 "YYYY/MM/DD"
  const fullDatePattern = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/
  const fullDateMatch = text.match(fullDatePattern)
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1])
    const month = parseInt(fullDateMatch[2])
    const day = parseInt(fullDateMatch[3])
    console.log(`extractDate - 匹配到完整日期: ${year}-${month}-${day}`)

    try {
      const date = new Date(year, month - 1, day)
      if (!isNaN(date.getTime())) {
        return formatDate(date)
      }
    } catch (e) {
      // 无效日期
    }
  }

  // 未找到日期，返回null（将使用默认的当前日期）
  console.log('extractDate - 未找到日期，返回null')
  return null
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 从文本中提取数字金额
 */
function extractAmount(text: string): number | null {
  // 先尝试匹配阿拉伯数字
  const arabicPatterns = [
    /(\d+(?:\.\d+)?)\s*元/,
    /(\d+(?:\.\d+)?)\s*块/,
    /(\d+(?:\.\d+)?)\s*圆/,
    /(\d+(?:\.\d+)?)\s*钱/,
    /(\d+(?:\.\d+)?)\s*$/,  // 纯数字
  ]

  for (const pattern of arabicPatterns) {
    const match = text.match(pattern)
    if (match) {
      return parseFloat(match[1])
    }
  }

  // 尝试匹配中文数字
  const chinesePatterns = [
    /([一二三四五六七八九十百千万零两俩仨]+)\s*元/,
    /([一二三四五六七八九十百千万零两俩仨]+)\s*块/,
    /([一二三四五六七八九十百千万零两俩仨]+)\s*圆/,
  ]

  for (const pattern of chinesePatterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = chineseToNumber(match[1])
      if (amount) return amount
    }
  }

  return null
}

/**
 * 识别交易类型（收入/支出）
 */
function detectTransactionType(text: string): 'income' | 'expense' | null {
  const lowerText = text.toLowerCase()

  // 检查收入关键词
  for (const keyword of incomeKeywords) {
    if (lowerText.includes(keyword)) {
      return 'income'
    }
  }

  // 检查支出关键词
  for (const keyword of expenseKeywords) {
    if (lowerText.includes(keyword)) {
      return 'expense'
    }
  }

  return null
}

/**
 * 识别交易分类
 */
function detectCategory(text: string, type: 'income' | 'expense'): string {
  const lowerText = text.toLowerCase()

  // 遍历分类关键词
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        // 检查分类类型是否匹配
        const isIncomeCategory = category.includes('收入')
        if ((type === 'income' && isIncomeCategory) || (type === 'expense' && !isIncomeCategory)) {
          return category
        }
      }
    }
  }

  // 默认分类
  return type === 'income' ? '其他收入' : '其他支出'
}

/**
 * 评估解析置信度
 */
function calculateConfidence(
  text: string,
  type: 'income' | 'expense' | null,
  amount: number | null,
  category: string
): 'high' | 'medium' | 'low' {
  if (!type || !amount) return 'low'

  let score = 0

  // 有明确的交易类型关键词 +1
  if (type) score += 1

  // 金额格式正确 +1
  if (amount && amount > 0) score += 1

  // 分类不是"其他" +1
  if (!category.includes('其他')) score += 1

  // 文本长度合理 (5-50字) +1
  if (text.length >= 5 && text.length <= 50) score += 1

  if (score >= 3) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

/**
 * 将语音文本分割成多个句子
 */
function splitIntoSentences(text: string): string[] {
  // 首先按标点符号分割
  let sentences = text
    .split(/[，。；,;、]/g)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 如果已经有多个句子，直接返回
  if (sentences.length > 1) {
    console.log('按标点符号分割后的句子:', sentences)
    return sentences
  }

  // 没有标点符号，尝试智能分割
  // 策略1: 优先按日期关键词+交易类型关键词的组合分割
  const allDateKeywords = [
    ...dateKeywords.today,
    ...dateKeywords.yesterday,
    ...dateKeywords.beforeYesterday,
    ...dateKeywords.tomorrow,
  ]
  const allTransactionKeywords = [...incomeKeywords, ...expenseKeywords]

  // 构建分割点：日期关键词 + 交易关键词的组合
  const splitPoints: Array<{ index: number; keyword: string }> = []

  // 查找所有可能的分割点
  for (const dateKw of allDateKeywords) {
    let startPos = 0
    while (true) {
      const idx = text.indexOf(dateKw, startPos)
      if (idx === -1) break

      // 检查这个日期关键词后面是否紧跟交易关键词
      const afterDate = text.slice(idx + dateKw.length)
      for (const transKw of allTransactionKeywords) {
        if (afterDate.startsWith(transKw) || afterDate.indexOf(transKw) < 10) {
          splitPoints.push({ index: idx, keyword: dateKw })
          break
        }
      }

      startPos = idx + 1
    }
  }

  // 如果没找到日期+交易的组合，尝试只按交易关键词分割
  if (splitPoints.length === 0) {
    for (const transKw of allTransactionKeywords) {
      let startPos = 0
      while (true) {
        const idx = text.indexOf(transKw, startPos)
        if (idx === -1) break
        splitPoints.push({ index: idx, keyword: transKw })
        startPos = idx + 1
      }
    }
  }

  // 按位置排序
  splitPoints.sort((a, b) => a.index - b.index)

  // 如果找到多个分割点，进行分割
  if (splitPoints.length > 1) {
    const parts: string[] = []

    for (let i = 0; i < splitPoints.length; i++) {
      const start = splitPoints[i].index
      const end = i < splitPoints.length - 1 ? splitPoints[i + 1].index : text.length
      const part = text.slice(start, end).trim()
      if (part) {
        parts.push(part)
      }
    }

    if (parts.length > 1) {
      console.log('按关键词分割后的句子:', parts)
      return parts
    }
  }

  // 最后的兜底策略：按金额分割（如果有多个金额）
  const amountPattern = /\d+(?:\.\d+)?\s*[元块圆]/g
  const amounts = text.match(amountPattern)
  if (amounts && amounts.length > 1) {
    // 尝试在金额后面分割
    const parts: string[] = []
    let lastIndex = 0
    let currentPart = ''

    for (let i = 0; i < amounts.length; i++) {
      const amountIndex = text.indexOf(amounts[i], lastIndex)
      const endOfAmount = amountIndex + amounts[i].length

      currentPart = text.slice(lastIndex, endOfAmount).trim()

      if (i < amounts.length - 1) {
        // 检查下一个金额前是否有交易关键词
        const nextAmountIndex = text.indexOf(amounts[i + 1], endOfAmount)
        const between = text.slice(endOfAmount, nextAmountIndex)

        let hasKeyword = false
        for (const kw of allTransactionKeywords) {
          if (between.includes(kw)) {
            hasKeyword = true
            break
          }
        }

        if (hasKeyword) {
          // 在当前金额后分割
          parts.push(currentPart)
          lastIndex = endOfAmount
          currentPart = ''
        }
      }
    }

    // 添加最后一部分
    const remaining = text.slice(lastIndex).trim()
    if (remaining) {
      parts.push(remaining)
    }

    if (parts.length > 1) {
      console.log('按金额分割后的句子:', parts)
      return parts
    }
  }

  console.log('无法分割，返回原文:', [text])
  return [text]
}

/**
 * 解析单个句子，提取交易信息
 */
function parseSentence(sentence: string): ParsedTransaction | null {
  console.log(`\n解析句子: "${sentence}"`)

  // 提取金额
  const amount = extractAmount(sentence)
  console.log('提取的金额:', amount)
  if (!amount) {
    console.log('❌ 未找到金额，跳过此句')
    return null
  }

  // 识别交易类型
  const type = detectTransactionType(sentence)
  console.log('识别的类型:', type)
  if (!type) {
    console.log('❌ 未找到交易类型关键词，跳过此句')
    return null
  }

  // 识别分类
  const category = detectCategory(sentence, type)
  console.log('识别的分类:', category)

  // 提取日期（如果没有提到日期，则使用当前日期）
  const date = extractDate(sentence) || formatDate(new Date())
  console.log('识别的日期:', date)

  // 清理描述（去掉金额部分）
  let description = sentence
    .replace(/\d+(?:\.\d+)?\s*(元|块|圆|钱)/g, '')
    .replace(/[一二三四五六七八九十百千万零两俩仨]+\s*(元|块|圆)/g, '')
    .trim()

  // 去掉交易类型关键词
  incomeKeywords.concat(expenseKeywords).forEach(keyword => {
    description = description.replace(new RegExp(keyword, 'g'), '')
  })

  description = description.trim() || `${category}${amount}元`

  // 计算置信度
  const confidence = calculateConfidence(sentence, type, amount, category)

  const result = {
    type,
    category,
    amount,
    description,
    date,
    confidence,
  }

  console.log('✅ 解析成功:', result)
  return result
}

/**
 * 主解析函数：从语音文本中提取多笔交易记录
 */
export function parseVoiceText(text: string): ParsedTransaction[] {
  console.log('\n========== 开始解析语音文本 ==========')
  console.log('原始文本:', text)

  if (!text || text.trim().length === 0) {
    console.log('文本为空，返回空数组')
    return []
  }

  // 分割成多个句子
  const sentences = splitIntoSentences(text)
  console.log(`文本分割为 ${sentences.length} 个句子`)

  // 解析每个句子
  const transactions: ParsedTransaction[] = []
  for (const sentence of sentences) {
    const parsed = parseSentence(sentence)
    if (parsed) {
      transactions.push(parsed)
    }
  }

  console.log(`\n解析完成！共识别出 ${transactions.length} 笔交易`)
  console.log('========== 解析结束 ==========\n')

  return transactions
}

/**
 * 启动浏览器语音识别
 */
export function startVoiceRecognition(
  onResult: (text: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): () => void {
  // 检查浏览器是否支持语音识别
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    onError?.('您的浏览器不支持语音识别功能，请使用 Chrome 浏览器')
    return () => {}
  }

  const recognition = new SpeechRecognition()
  let isManualStop = false
  let fullTranscript = '' // 累积完整的识别文本

  // 配置
  recognition.lang = 'zh-CN' // 中文
  recognition.continuous = true // 持续识别
  recognition.interimResults = true // 返回临时结果
  recognition.maxAlternatives = 1

  // 监听结果
  recognition.onresult = (event: any) => {
    let interimTranscript = ''
    let finalTranscript = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
        fullTranscript += transcript // 累积到完整文本
      } else {
        interimTranscript += transcript
      }
    }

    // 返回当前累积的完整文本 + 临时文本
    const currentText = fullTranscript + (finalTranscript || interimTranscript)
    onResult(currentText, !!finalTranscript)
  }

  // 监听结束事件（自动停止时）
  recognition.onend = () => {
    // 如果不是手动停止，并且没有错误，则自动重启（仅在持续模式下）
    if (!isManualStop) {
      try {
        recognition.start()
      } catch (e) {
        console.log('Recognition restart failed', e)
      }
    }
  }

  // 监听错误
  recognition.onerror = (event: any) => {
    console.error('语音识别错误:', event.error)

    // 对于某些错误不需要提示用户
    if (event.error === 'no-speech') {
      return // 用户暂时没说话，不算错误
    }

    if (event.error === 'aborted') {
      return // 用户主动停止，不算错误
    }

    let errorMessage = '语音识别失败'

    switch (event.error) {
      case 'audio-capture':
        errorMessage = '无法访问麦克风，请检查权限'
        break
      case 'not-allowed':
        errorMessage = '麦克风权限被拒绝，请在浏览器设置中允许'
        break
      case 'network':
        errorMessage = '网络错误，请检查网络连接'
        break
    }

    onError?.(errorMessage)
  }

  // 开始识别
  try {
    recognition.start()
  } catch (e) {
    onError?.('启动语音识别失败')
  }

  // 返回停止函数
  return () => {
    isManualStop = true
    try {
      recognition.stop()
    } catch (e) {
      console.log('Stop failed', e)
    }
  }
}
