/**
 * 现金流量表分类配置
 * 将交易分类映射到现金流三大活动
 */

export type CashFlowActivity = 'operating' | 'investing' | 'financing'
export type FlowDirection = 'inflow' | 'outflow'

export interface CategoryMapping {
  activity: CashFlowActivity
  direction: FlowDirection
  label: string
}

/**
 * 收入分类映射
 */
export const incomeCategoryMapping: Record<string, CategoryMapping> = {
  '房费收入': {
    activity: 'operating',
    direction: 'inflow',
    label: '房费收入'
  },
  '押金收入': {
    activity: 'operating',
    direction: 'inflow',
    label: '押金收入'
  },
  '额外服务': {
    activity: 'operating',
    direction: 'inflow',
    label: '额外服务收入'
  },
  '其他收入': {
    activity: 'operating',
    direction: 'inflow',
    label: '其他营业收入'
  },
  // 投资活动收入（资产处置等）
  '资产处置收入': {
    activity: 'investing',
    direction: 'inflow',
    label: '处置固定资产收入'
  },
  // 筹资活动收入
  '银行贷款': {
    activity: 'financing',
    direction: 'inflow',
    label: '取得借款收入'
  },
  '股东投资': {
    activity: 'financing',
    direction: 'inflow',
    label: '股东投资收入'
  }
}

/**
 * 支出分类映射
 */
export const expenseCategoryMapping: Record<string, CategoryMapping> = {
  // 经营活动支出
  '水电费': {
    activity: 'operating',
    direction: 'outflow',
    label: '水电费支出'
  },
  '维修费': {
    activity: 'operating',
    direction: 'outflow',
    label: '维修保养费'
  },
  '清洁费': {
    activity: 'operating',
    direction: 'outflow',
    label: '清洁费支出'
  },
  '采购费': {
    activity: 'operating',
    direction: 'outflow',
    label: '采购支出'
  },
  '人工费': {
    activity: 'operating',
    direction: 'outflow',
    label: '人工工资'
  },
  '租金': {
    activity: 'operating',
    direction: 'outflow',
    label: '租金支出'
  },
  '营销费': {
    activity: 'operating',
    direction: 'outflow',
    label: '营销推广费'
  },
  '其他支出': {
    activity: 'operating',
    direction: 'outflow',
    label: '其他运营支出'
  },
  // 投资活动支出
  '固定资产购置': {
    activity: 'investing',
    direction: 'outflow',
    label: '购置固定资产'
  },
  '设备升级': {
    activity: 'investing',
    direction: 'outflow',
    label: '设备升级改造'
  },
  '装修改造': {
    activity: 'investing',
    direction: 'outflow',
    label: '装修改造支出'
  },
  '系统软件': {
    activity: 'investing',
    direction: 'outflow',
    label: '软件系统购置'
  },
  // 筹资活动支出
  '偿还贷款': {
    activity: 'financing',
    direction: 'outflow',
    label: '偿还借款本金'
  },
  '支付利息': {
    activity: 'financing',
    direction: 'outflow',
    label: '支付利息费用'
  },
  '股东分红': {
    activity: 'financing',
    direction: 'outflow',
    label: '股东分红支出'
  }
}

/**
 * 获取分类的现金流映射
 */
export function getCategoryMapping(
  type: 'income' | 'expense',
  category: string
): CategoryMapping | null {
  const mapping = type === 'income'
    ? incomeCategoryMapping[category]
    : expenseCategoryMapping[category]

  return mapping || null
}

/**
 * 现金流活动中文名称
 */
export const activityNames: Record<CashFlowActivity, string> = {
  operating: '经营活动',
  investing: '投资活动',
  financing: '筹资活动'
}

/**
 * 获取所有分类列表（按活动分组）
 */
export function getCategoriesByActivity() {
  const result: Record<CashFlowActivity, { income: string[], expense: string[] }> = {
    operating: { income: [], expense: [] },
    investing: { income: [], expense: [] },
    financing: { income: [], expense: [] }
  }

  // 收入分类
  Object.entries(incomeCategoryMapping).forEach(([category, mapping]) => {
    result[mapping.activity].income.push(category)
  })

  // 支出分类
  Object.entries(expenseCategoryMapping).forEach(([category, mapping]) => {
    result[mapping.activity].expense.push(category)
  })

  return result
}

/**
 * 中文分类名称映射
 */
export const categoryDisplayNames: Record<string, string> = {
  // 收入
  '房费收入': '房费收入',
  '押金收入': '押金收入',
  '额外服务': '额外服务',
  '其他收入': '其他收入',
  '资产处置收入': '资产处置收入',
  '银行贷款': '银行贷款',
  '股东投资': '股东投资',
  // 支出
  '水电费': '水电费',
  '维修费': '维修费',
  '清洁费': '清洁费',
  '采购费': '采购费',
  '人工费': '人工费',
  '租金': '租金',
  '营销费': '营销费',
  '其他支出': '其他支出',
  '固定资产购置': '固定资产购置',
  '设备升级': '设备升级',
  '装修改造': '装修改造',
  '系统软件': '系统软件',
  '偿还贷款': '偿还贷款',
  '支付利息': '支付利息',
  '股东分红': '股东分红'
}
