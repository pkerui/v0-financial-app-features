/**
 * 店铺管理中心 - 类型定义
 */

/**
 * 店铺汇总指标
 */
export interface StoreHubMetrics {
  // 基础汇总
  totalIncome: number        // 总收入
  totalExpense: number       // 总支出

  // 交易统计
  incomeCount: number        // 收入笔数
  expenseCount: number       // 支出笔数
  totalCount: number         // 总交易笔数

  // 店铺统计
  storeCount: number         // 店铺数量
  activeStoreCount: number   // 营业中店铺数

  // 平均值
  avgIncomePerStore: number  // 平均每店收入
  avgExpensePerStore: number // 平均每店支出

  // 现金流活动分类
  operatingCashFlow: number   // 经营活动现金流
  investingCashFlow: number   // 投资活动现金流
  financingCashFlow: number   // 筹资活动现金流
  netCashFlow: number         // 净现金流（现金流变动额）

  // 余额信息
  beginningBalance: number    // 期初余额
  endingBalance: number       // 期末余额

  // 利润表数据（与利润表详情页保持一致）
  revenue: number             // 营业收入
  cost: number                // 营业成本
  operatingProfit: number     // 营业利润
  nonOperatingIncome: number  // 营业外收入
  nonOperatingExpense: number // 营业外支出
  totalProfit: number         // 利润总额
  incomeTax: number           // 所得税费用
  netProfit: number           // 净利润
}

/**
 * 单店指标
 */
export interface SingleStoreMetrics {
  storeId: string
  storeName: string
  totalIncome: number
  totalExpense: number
  netProfit: number
  incomeCount: number
  expenseCount: number
}

/**
 * 获取店铺汇总指标的参数
 */
export interface GetStoreHubMetricsParams {
  startDate: string
  endDate: string
  storeIds?: string[]  // 可选：指定店铺，不传则查询所有
}

/**
 * 获取店铺汇总指标的返回值
 */
export interface GetStoreHubMetricsResult {
  success: boolean
  error?: string
  data?: {
    summary: StoreHubMetrics
    byStore: SingleStoreMetrics[]
  }
}
