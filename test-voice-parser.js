/**
 * 语音解析器测试
 * 运行: node test-voice-parser.js
 */

// 模拟语音文本测试用例
const testCases = [
  {
    name: '测试1：带逗号分隔',
    input: '收到房费1200元，支付水电费245元',
    expected: 2,
    description: '应该识别为2笔交易'
  },
  {
    name: '测试2：日期+交易关键词（您的案例）',
    input: '今日支出水电在250元昨日支出买菜40元',
    expected: 2,
    description: '应该识别为2笔交易：今日支出250元，昨日支出40元'
  },
  {
    name: '测试3：无标点纯关键词',
    input: '收到房费1200元支付水电费245元',
    expected: 2,
    description: '应该识别为2笔交易'
  },
  {
    name: '测试4：带日期的单笔',
    input: '昨天收到房费1200元',
    expected: 1,
    description: '应该识别为1笔交易，日期为昨天'
  },
  {
    name: '测试5：多笔带日期',
    input: '今天收到房费1200元，昨天支付清洁费300元，前天收到押金2000元',
    expected: 3,
    description: '应该识别为3笔交易'
  },
  {
    name: '测试6：中文数字',
    input: '收到房费一千二百元',
    expected: 1,
    description: '应该识别中文数字：1200'
  },
  {
    name: '测试7：无日期多笔',
    input: '支付水电费250元支付买菜40元',
    expected: 2,
    description: '应该识别为2笔支出'
  },
  {
    name: '测试8：混合日期格式',
    input: '1月10号收到房费1200元，今天支付水电费245元',
    expected: 2,
    description: '应该识别为2笔交易，分别是1月10日和今天'
  }
]

console.log('\n========================================')
console.log('🎤 语音解析器测试开始')
console.log('========================================\n')

// 注意：这个测试需要在浏览器环境运行，因为使用了ES模块
console.log('⚠️  请在浏览器控制台运行此测试\n')
console.log('步骤：')
console.log('1. 打开 http://localhost:3000/voice-entry')
console.log('2. 打开浏览器开发者工具（F12）')
console.log('3. 将下面的代码复制到控制台运行：\n')

console.log('```javascript')
console.log(`
// 测试用例
const testCases = ${JSON.stringify(testCases, null, 2)}

// 运行测试
async function runTests() {
  console.log('\\n========================================')
  console.log('🎤 语音解析器测试')
  console.log('========================================\\n')

  let passed = 0
  let failed = 0

  for (const test of testCases) {
    console.log(\`\\n📝 \${test.name}\`)
    console.log(\`输入: "\${test.input}"\`)
    console.log(\`说明: \${test.description}\\n\`)

    // 调用解析函数（假设已导入）
    try {
      // 注意：parseVoiceText 需要从模块导入
      // 这里只是展示测试结构
      console.log('⏳ 解析中...')
      console.log('（实际解析过程会在控制台输出详细日志）\\n')

      // const result = parseVoiceText(test.input)
      // if (result.length === test.expected) {
      //   console.log(\`✅ 通过！识别了 \${result.length} 笔交易\`)
      //   console.log('交易详情:', result)
      //   passed++
      // } else {
      //   console.log(\`❌ 失败！预期 \${test.expected} 笔，实际 \${result.length} 笔\`)
      //   console.log('交易详情:', result)
      //   failed++
      // }

    } catch (error) {
      console.error(\`❌ 错误: \${error.message}\`)
      failed++
    }

    console.log('\\n' + '─'.repeat(60))
  }

  console.log(\`\\n\\n📊 测试结果: \${passed} 通过, \${failed} 失败\\n\`)
}

// 执行测试
runTests()
\`)
console.log('```\n')

console.log('\n========================================')
console.log('💡 更简单的测试方法：')
console.log('========================================')
console.log('\n直接在语音录入界面测试以下文本：\n')

testCases.forEach((test, i) => {
  console.log(`${i + 1}. ${test.name}`)
  console.log(`   输入：${test.input}`)
  console.log(`   预期：${test.description}`)
  console.log('')
})

console.log('\n✨ 测试重点：')
console.log('   ✓ 检查控制台日志中的"分割后的句子"')
console.log('   ✓ 查看"解析结果"卡片数量是否正确')
console.log('   ✓ 验证每笔交易的金额、分类、日期是否准确\n')
