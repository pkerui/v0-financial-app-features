/**
 * 通用财务指标聚合模块
 * 用于全局总览的多店铺数据汇总计算
 *
 * 设计思路：
 * 1. 规则表定义每个指标的过滤条件
 * 2. 通用计算函数根据规则过滤交易并求和
 * 3. 一次遍历计算所有指标（性能优化）
 * 4. 派生指标由基础指标加减得到
 */

// ============ 类型定义 ============

export type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  date: string
  category: string
  store_id?: string | null
  transaction_nature?: 'operating' | 'non_operating' | 'income_tax' | null
  cash_flow_activity?: 'operating' | 'investing' | 'financing' | null
  include_in_profit_loss?: boolean | null
}

// 过滤规则类型
type MetricRule = {
  type?: 'income' | 'expense'
  nature?: 'operating' | 'non_operating' | 'income_tax'
  activity?: 'operating' | 'investing' | 'financing'
  includeProfitLoss?: boolean  // 是否只计算计入利润表的
}

// ============ 指标规则表 ============
// 定义每个指标的过滤条件，新增指标只需在这里加一行

export const METRIC_RULES: Record<string, MetricRule> = {
  // ---- 基础指标 ----
  totalIncome: { type: 'income' },
  totalExpense: { type: 'expense' },

  // ---- 利润表指标 ----
  // 营业内
  operatingIncome: { type: 'income', nature: 'operating', includeProfitLoss: true },
  operatingExpense: { type: 'expense', nature: 'operating', includeProfitLoss: true },
  // 营业外
  nonOperatingIncome: { type: 'income', nature: 'non_operating', includeProfitLoss: true },
  nonOperatingExpense: { type: 'expense', nature: 'non_operating', includeProfitLoss: true },
  // 所得税
  incomeTax: { type: 'expense', nature: 'income_tax', includeProfitLoss: true },

  // ---- 现金流指标 ----
  // 经营活动
  operatingCashInflow: { type: 'income', activity: 'operating' },
  operatingCashOutflow: { type: 'expense', activity: 'operating' },
  // 投资活动
  investingCashInflow: { type: 'income', activity: 'investing' },
  investingCashOutflow: { type: 'expense', activity: 'investing' },
  // 筹资活动
  financingCashInflow: { type: 'income', activity: 'financing' },
  financingCashOutflow: { type: 'expense', activity: 'financing' },
}

// ============ 核心计算函数 ============

/**
 * 检查一笔交易是否符合规则
 */
function matchRule(t: Transaction, rule: MetricRule): boolean {
  // 类型过滤（收入/支出）
  if (rule.type && t.type !== rule.type) {
    return false
  }

  // 交易性质过滤（营业内/营业外/所得税）
  // 默认值：如果交易没有设置 nature，视为 'operating'
  if (rule.nature) {
    const nature = t.transaction_nature || 'operating'
    if (nature !== rule.nature) {
      return false
    }
  }

  // 现金流活动过滤（经营/投资/筹资）
  // 默认值：如果交易没有设置 activity，视为 'operating'
  if (rule.activity) {
    const activity = t.cash_flow_activity || 'operating'
    if (activity !== rule.activity) {
      return false
    }
  }

  // 利润表过滤
  // 如果规则要求 includeProfitLoss，则排除 include_in_profit_loss = false 的交易
  if (rule.includeProfitLoss) {
    if (t.include_in_profit_loss === false) {
      return false
    }
  }

  return true
}

/**
 * 计算单个指标
 * @param transactions 交易列表
 * @param rule 过滤规则
 * @returns 符合规则的交易金额总和
 */
export function calcMetric(transactions: Transaction[], rule: MetricRule): number {
  let sum = 0
  for (const t of transactions) {
    if (matchRule(t, rule)) {
      sum += t.amount
    }
  }
  return sum
}

/**
 * 一次遍历计算所有指标（性能优化版）
 * @param transactions 交易列表
 * @returns 所有指标的计算结果
 */
export function calcAllMetrics(transactions: Transaction[]): Record<string, number> {
  // 初始化结果：每个指标默认为0
  const result: Record<string, number> = {}
  for (const key of Object.keys(METRIC_RULES)) {
    result[key] = 0
  }

  // 只遍历一次交易列表
  for (const t of transactions) {
    // 检查每个规则
    for (const [key, rule] of Object.entries(METRIC_RULES)) {
      if (matchRule(t, rule)) {
        result[key] += t.amount
      }
    }
  }

  return result
}

// ============ 派生指标：利润表汇总 ============

export interface ProfitLossSummary {
  // 营业内
  operatingIncome: number      // 营业收入
  operatingExpense: number     // 营业成本
  operatingProfit: number      // 营业利润 = 营业收入 - 营业成本
  // 营业外
  nonOperatingIncome: number   // 营业外收入
  nonOperatingExpense: number  // 营业外支出
  nonOperatingNet: number      // 营业外净额 = 营业外收入 - 营业外支出
  // 汇总
  totalProfit: number          // 利润总额 = 营业利润 + 营业外净额
  incomeTax: number            // 所得税费用
  netProfit: number            // 净利润 = 利润总额 - 所得税
}

/**
 * 计算利润表汇总
 * @param metrics calcAllMetrics 的返回值
 */
export function calcProfitLossSummary(metrics: Record<string, number>): ProfitLossSummary {
  const operatingProfit = metrics.operatingIncome - metrics.operatingExpense
  const nonOperatingNet = metrics.nonOperatingIncome - metrics.nonOperatingExpense
  const totalProfit = operatingProfit + nonOperatingNet
  const netProfit = totalProfit - metrics.incomeTax

  return {
    operatingIncome: metrics.operatingIncome,
    operatingExpense: metrics.operatingExpense,
    operatingProfit,
    nonOperatingIncome: metrics.nonOperatingIncome,
    nonOperatingExpense: metrics.nonOperatingExpense,
    nonOperatingNet,
    totalProfit,
    incomeTax: metrics.incomeTax,
    netProfit,
  }
}

// ============ 派生指标：现金流汇总 ============

export interface CashFlowSummary {
  beginningBalance: number     // 期初余额
  // 经营活动
  operating: {
    inflow: number             // 经营活动现金流入
    outflow: number            // 经营活动现金流出
    net: number                // 经营活动净额
  }
  // 投资活动
  investing: {
    inflow: number
    outflow: number
    net: number
  }
  // 筹资活动
  financing: {
    inflow: number
    outflow: number
    net: number
  }
  netCashFlow: number          // 现金净增加额
  endingBalance: number        // 期末余额
}

/**
 * 计算现金流汇总
 * @param metrics calcAllMetrics 的返回值
 * @param beginningBalance 期初余额
 */
export function calcCashFlowSummary(
  metrics: Record<string, number>,
  beginningBalance: number = 0
): CashFlowSummary {
  const operatingNet = metrics.operatingCashInflow - metrics.operatingCashOutflow
  const investingNet = metrics.investingCashInflow - metrics.investingCashOutflow
  const financingNet = metrics.financingCashInflow - metrics.financingCashOutflow
  const netCashFlow = operatingNet + investingNet + financingNet
  const endingBalance = beginningBalance + netCashFlow

  return {
    beginningBalance,
    operating: {
      inflow: metrics.operatingCashInflow,
      outflow: metrics.operatingCashOutflow,
      net: operatingNet,
    },
    investing: {
      inflow: metrics.investingCashInflow,
      outflow: metrics.investingCashOutflow,
      net: investingNet,
    },
    financing: {
      inflow: metrics.financingCashInflow,
      outflow: metrics.financingCashOutflow,
      net: financingNet,
    },
    netCashFlow,
    endingBalance,
  }
}

// ============ 分组计算：按店铺 ============

/**
 * 按店铺分组计算指标（用于店铺对比）
 * @param transactions 交易列表
 * @returns { 店铺ID: 指标结果 }
 */
export function calcMetricsByStore(
  transactions: Transaction[]
): Record<string, Record<string, number>> {
  // 按 store_id 分组
  const byStore = new Map<string, Transaction[]>()

  for (const t of transactions) {
    const storeId = t.store_id || 'unknown'
    const list = byStore.get(storeId) || []
    list.push(t)
    byStore.set(storeId, list)
  }

  // 计算每个店铺的指标
  const result: Record<string, Record<string, number>> = {}
  for (const [storeId, storeTx] of byStore) {
    result[storeId] = calcAllMetrics(storeTx)
  }

  return result
}

// ============ 分组计算：按月份 ============

export interface MonthlyMetrics {
  month: string  // "2025-11"
  metrics: Record<string, number>
}

/**
 * 按月份分组计算指标（用于趋势图表）
 * @param transactions 交易列表
 * @returns 按月份排序的指标数组
 */
export function calcMetricsByMonth(transactions: Transaction[]): MonthlyMetrics[] {
  // 按月份分组
  const byMonth = new Map<string, Transaction[]>()

  for (const t of transactions) {
    const month = t.date.substring(0, 7) // "2025-11"
    const list = byMonth.get(month) || []
    list.push(t)
    byMonth.set(month, list)
  }

  // 计算每个月的指标，按月份排序
  const sortedMonths = Array.from(byMonth.keys()).sort()
  const result: MonthlyMetrics[] = []

  for (const month of sortedMonths) {
    const monthTx = byMonth.get(month) || []
    result.push({
      month,
      metrics: calcAllMetrics(monthTx),
    })
  }

  return result
}

// ============ 便捷函数：一站式计算 ============

export interface GlobalOverviewData {
  // 基础指标
  metrics: Record<string, number>
  // 利润表汇总
  profitLoss: ProfitLossSummary
  // 现金流汇总
  cashFlow: CashFlowSummary
  // 按店铺分组（可选）
  byStore?: Record<string, Record<string, number>>
  // 按月份分组（可选）
  byMonth?: MonthlyMetrics[]
}

/**
 * 一站式计算全局总览数据
 * @param transactions 所有店铺的交易列表
 * @param options 选项
 */
export function calcGlobalOverview(
  transactions: Transaction[],
  options: {
    beginningBalance?: number
    includeByStore?: boolean
    includeByMonth?: boolean
  } = {}
): GlobalOverviewData {
  const {
    beginningBalance = 0,
    includeByStore = false,
    includeByMonth = false,
  } = options

  // 计算基础指标
  const metrics = calcAllMetrics(transactions)

  // 计算派生指标
  const profitLoss = calcProfitLossSummary(metrics)
  const cashFlow = calcCashFlowSummary(metrics, beginningBalance)

  // 构建结果
  const result: GlobalOverviewData = {
    metrics,
    profitLoss,
    cashFlow,
  }

  // 可选：按店铺分组
  if (includeByStore) {
    result.byStore = calcMetricsByStore(transactions)
  }

  // 可选：按月份分组
  if (includeByMonth) {
    result.byMonth = calcMetricsByMonth(transactions)
  }

  return result
}
