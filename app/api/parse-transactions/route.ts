import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserApiKeys } from '@/lib/backend/api-config'

export async function POST(request: NextRequest) {
  try {
    const { text, incomeCategories, expenseCategories } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: '请输入要解析的文本' }, { status: 400 })
    }

    // 优先使用公司配置的 API Key，否则使用环境变量
    let apiKey = process.env.DEEPSEEK_API_KEY
    const companyKeys = await getCurrentUserApiKeys()
    if (companyKeys?.deepseek_api_key) {
      apiKey = companyKeys.deepseek_api_key
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'DeepSeek API 密钥未配置，请在系统设置中配置 API 密钥' }, { status: 500 })
    }

    // 获取当前日期
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 构建分类到活动类型的映射
    const categoryActivityMap: { [key: string]: string } = {}
    incomeCategories.forEach((cat: any) => {
      categoryActivityMap[cat.name] = cat.activity
    })
    expenseCategories.forEach((cat: any) => {
      categoryActivityMap[cat.name] = cat.activity
    })

    // 构建分类提示信息
    const categoryHints = `
收入分类及现金流活动类型：
${incomeCategories.map((cat: any) => {
  const hints: { [key: string]: string[] } = {
    '房费收入': ['房费', '房租', '租金', '收房租', '房费收入', '租房收入'],
    '押金收入': ['押金', '保证金', '收押金', '押金收入'],
    '额外服务': ['服务费', '清洁', '维修', '接送', '额外收入', '其他服务'],
    '银行贷款': ['贷款', '借款', '银行贷款', '取得借款'],
    '股东投资': ['股东投资', '投资款', '注资'],
  }
  const activityName = cat.activity === 'operating' ? '经营活动' : cat.activity === 'investing' ? '投资活动' : '筹资活动'
  return `- ${cat.name}（活动类型：${activityName}）${hints[cat.name] ? `（关键词：${hints[cat.name].join('、')}）` : ''}`
}).join('\n')}

支出分类及现金流活动类型：
${expenseCategories.map((cat: any) => {
  const hints: { [key: string]: string[] } = {
    '水电费': ['水费', '电费', '燃气费', '网费', '宽带', '水电', '电费单', '水费单', '缴费'],
    '菜钱': ['蔬菜', '水果', '肉类', '食材', '菜', '食品', '买菜', '采购菜', '菜市场', '超市买菜'],
    '餐饮': ['饭钱', '吃饭', '餐饮', '点餐', '外卖', '聚餐', '请客', '吃饭钱', '午饭', '晚饭', '早餐', '午餐', '晚餐', '饭费', '餐费', '就餐', '食堂', '餐厅'],
    '家具电器': ['家具', '电器', '家电', '冰箱', '洗衣机', '空调', '沙发', '床', '桌椅', '柜子', '购买家具', '购买电器'],
    '押金退还': ['退还押金', '退押金', '押金退还', '归还押金'],
    '维修费': ['维修', '修理', '维护', '维修费', '修理费', '保养', '维护费'],
    '交通费': ['交通', '打车', '出租车', '滴滴', '公交', '地铁', '加油', '油费', '停车', '停车费', '过路费'],
    '办公用品': ['办公', '文具', '纸张', '笔', '办公用品', '耗材', '打印'],
    '支付利息': ['利息', '银行利息', '贷款利息', '利息支出', '付息'],
    '偿还贷款': ['还贷', '还款', '偿还贷款', '贷款本金', '还贷款'],
    '股东分红': ['分红', '股东分红', '利润分配', '股利'],
    '固定资产购置': ['购买固定资产', '资产购置', '购置设备'],
    '装修改造': ['装修', '改造', '装修费'],
  }
  const activityName = cat.activity === 'operating' ? '经营活动' : cat.activity === 'investing' ? '投资活动' : '筹资活动'
  return `- ${cat.name}（活动类型：${activityName}）${hints[cat.name] ? `（关键词：${hints[cat.name].join('、')}）` : ''}`
}).join('\n')}`

    // 构建提示词
    const systemPrompt = `你是一个财务记录解析助手。你的任务是将用户输入的自然语言文本解析成结构化的财务交易记录。

当前日期：${todayStr}（今天）
昨天日期：${yesterdayStr}

${categoryHints}

请严格按照以下 JSON 格式返回，不要包含任何其他文本：

{
  "transactions": [
    {
      "type": "income" 或 "expense",
      "category": "从上面可用类型中选择最匹配的",
      "amount": 数字,
      "date": "YYYY-MM-DD 格式",
      "description": "简短描述",
      "cash_flow_activity": "operating" 或 "investing" 或 "financing"
    }
  ]
}

分类选择规则（非常重要）：
1. 优先根据关键词精确匹配：先查找描述中是否包含上面列出的关键词
2. 语义理解和同义词匹配：
   - "饭钱"、"吃饭"、"午饭"、"晚饭" = "餐饮"
   - "买菜"、"菜市场"、"采购蔬菜" = "菜钱"
   - "打车"、"滴滴"、"出租车" = "交通费"（如果有此分类）
   - "外卖"、"点餐"、"餐厅" = "餐饮"
3. 常见分类映射（按优先级）：
   - 蔬菜、水果、肉类、食材、买菜 → "菜钱"
   - 饭钱、吃饭、外卖、餐厅、午饭、晚饭 → "餐饮"（如果有此分类）
   - 电费、水费、燃气费、网费 → "水电费"
   - 家具、电器、家电 → "家具电器"（如果有此分类）
   - 房租、租金 → "房费收入"（收入）或相应的房租支出（支出）
   - 押金 → "押金收入"（收到）或"押金退还"（退还）
   - 维修、修理 → "维修费"（如果有此分类）
   - 打车、滴滴、公交、地铁 → "交通费"（如果有此分类）
4. 智能推断：如果描述中包含"采购"、"购买"等词，重点分析采购的是什么物品
5. 分类不存在时的处理：
   - 如果用户说的是"餐饮"但系统只有"菜钱"，选择最相近的"菜钱"
   - 如果用户说的是"交通"但没有"交通费"分类，选择最相近的分类
6. 优先匹配具体的分类，如果没有精确匹配，选择语义最相近的分类

日期解析规则（非常重要）：
1. "今天"、"今日" → 使用 ${todayStr}
2. "昨天"、"昨日" → 使用 ${yesterdayStr}
3. "X月X日" → 使用今年的该日期（例如："11月15日" → "2025-11-15"）
4. "X号" → 使用本月的该日期（例如："15号" → "2025-11-15"）
5. 完整日期格式直接使用（例如："2025-11-15"）
6. 如果未指定日期 → 使用 ${todayStr}

金额解析规则：
1. 支持"元"、"块"后缀（例如："100元"、"50块" → 100、50）
2. 支持"千"、"万"单位（例如："3千" → 3000，"1万" → 10000）
3. 数字必须大于 0

其他规则：
1. 类型必须从可用类型列表中选择最接近的
2. 支持一次性解析多条交易记录
3. 如果无法确定分类，选择最相近的类型

示例1：
输入："今天收到房租3000元，昨天交了水电费500"
输出：
{
  "transactions": [
    {
      "type": "income",
      "category": "房费收入",
      "amount": 3000,
      "date": "${todayStr}",
      "description": "房租",
      "cash_flow_activity": "operating"
    },
    {
      "type": "expense",
      "category": "水电费",
      "amount": 500,
      "date": "${yesterdayStr}",
      "description": "水电费",
      "cash_flow_activity": "operating"
    }
  ]
}

示例2（分类匹配）：
输入："采购蔬菜200元，购买家具电器5000元"
输出：
{
  "transactions": [
    {
      "type": "expense",
      "category": "菜钱",
      "amount": 200,
      "date": "${todayStr}",
      "description": "采购蔬菜",
      "cash_flow_activity": "operating"
    },
    {
      "type": "expense",
      "category": "家具电器",
      "amount": 5000,
      "date": "${todayStr}",
      "description": "购买家具电器",
      "cash_flow_activity": "investing"
    }
  ]
}

示例3（餐饮相关）：
输入："今天吃饭花了50元，昨天点外卖80块"
输出：
{
  "transactions": [
    {
      "type": "expense",
      "category": "餐饮",
      "amount": 50,
      "date": "${todayStr}",
      "description": "吃饭",
      "cash_flow_activity": "operating"
    },
    {
      "type": "expense",
      "category": "餐饮",
      "amount": 80,
      "date": "${yesterdayStr}",
      "description": "点外卖",
      "cash_flow_activity": "operating"
    }
  ]
}

示例4（口语化表达）：
输入："今天的饭钱100，打车20，买菜50"
输出：
{
  "transactions": [
    {
      "type": "expense",
      "category": "餐饮",
      "amount": 100,
      "date": "${todayStr}",
      "description": "饭钱",
      "cash_flow_activity": "operating"
    },
    {
      "type": "expense",
      "category": "交通费",
      "amount": 20,
      "date": "${todayStr}",
      "description": "打车",
      "cash_flow_activity": "operating"
    },
    {
      "type": "expense",
      "category": "菜钱",
      "amount": 50,
      "date": "${todayStr}",
      "description": "买菜",
      "cash_flow_activity": "operating"
    }
  ]
}

示例5（筹资活动 - 非常重要）：
输入："今天支付银行利息200元，昨天还贷款5000"
输出：
{
  "transactions": [
    {
      "type": "expense",
      "category": "支付利息",
      "amount": 200,
      "date": "${todayStr}",
      "description": "银行利息",
      "cash_flow_activity": "financing"
    },
    {
      "type": "expense",
      "category": "偿还贷款",
      "amount": 5000,
      "date": "${yesterdayStr}",
      "description": "还贷款",
      "cash_flow_activity": "financing"
    }
  ]
}

重要提示：
1. 必须根据采购的具体物品选择分类，不要仅仅因为有"采购"、"购买"等词就选错分类
2. "饭钱"、"吃饭"、"外卖"都应该归类到"餐饮"（如果有此分类）
3. "买菜"、"蔬菜"应该归类到"菜钱"
4. 优先使用用户设置的具体分类名称，如果没有则选择最相近的分类
5. **关键**：所有包含"利息"、"还贷"、"还款"、"分红"、"股东"关键词的交易，cash_flow_activity 必须是 "financing"！

现金流活动分类规则（必须严格遵守）：
**非常重要：cash_flow_activity 必须严格根据所选分类的活动类型来确定！**

规则：
1. 先确定交易的分类（category）
2. 然后查找该分类对应的活动类型（在上面的分类列表中已标注）
3. cash_flow_activity 必须与该分类的活动类型完全一致

示例规则：
- 如果 category 是 "支付利息" → cash_flow_activity 必须是 "financing"（筹资活动）
- 如果 category 是 "偿还贷款" → cash_flow_activity 必须是 "financing"（筹资活动）
- 如果 category 是 "股东分红" → cash_flow_activity 必须是 "financing"（筹资活动）
- 如果 category 是 "水电费" → cash_flow_activity 必须是 "operating"（经营活动）
- 如果 category 是 "固定资产购置" → cash_flow_activity 必须是 "investing"（投资活动）

**关键**：不要自己判断活动类型，而是直接使用上面列出的每个分类对应的活动类型！`

    const userPrompt = `请解析以下财务记录文本：\n\n${text}`

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('DeepSeek API 错误:', errorData)

      // 检查是否是密钥错误（401 或包含 auth 相关错误）
      if (response.status === 401 || response.status === 403 || errorData.toLowerCase().includes('auth') || errorData.toLowerCase().includes('invalid')) {
        return NextResponse.json(
          { error: 'DeepSeek 密钥无效，请联系管理员在系统设置中检查 API 配置' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'DeepSeek API 调用失败' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: '解析失败：API 返回为空' }, { status: 500 })
    }

    // 尝试解析 JSON
    let parsed
    try {
      // 移除可能的 markdown 代码块标记
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleanedContent)
    } catch (e) {
      console.error('JSON 解析失败:', content)
      return NextResponse.json(
        { error: '解析失败：AI 返回格式不正确', rawContent: content },
        { status: 500 }
      )
    }

    // 验证返回格式
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      return NextResponse.json(
        { error: '解析失败：返回数据格式不正确', rawContent: content },
        { status: 500 }
      )
    }

    // 验证每条交易记录并根据分类自动设置现金流活动类型
    const validTransactions = parsed.transactions
      .filter((t: any) => {
        return (
          t.type &&
          ['income', 'expense'].includes(t.type) &&
          t.category &&
          typeof t.amount === 'number' &&
          t.amount > 0 &&
          t.date &&
          /^\d{4}-\d{2}-\d{2}$/.test(t.date)
        )
      })
      .map((t: any) => {
        // 根据分类自动设置现金流活动类型（强制使用映射关系）
        const activity = categoryActivityMap[t.category] || 'operating'
        return {
          ...t,
          cash_flow_activity: activity
        }
      })

    if (validTransactions.length === 0) {
      return NextResponse.json(
        { error: '未能解析出有效的交易记录' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      transactions: validTransactions,
      parsed: validTransactions.length,
      total: parsed.transactions.length,
    })
  } catch (error) {
    console.error('解析交易失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
