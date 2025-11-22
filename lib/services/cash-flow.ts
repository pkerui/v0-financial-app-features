/**
 * 现金流量表计算服务
 */

import { getCategoryMapping, type CashFlowActivity } from '../cash-flow-config'

// 扩展的交易类型，包含 category_id 和 cash_flow_activity
type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  description?: string
  category_id?: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing'
}

/**
 * 现金流数据结构
 */
export interface CashFlowData {
  // 经营活动
  operating: {
    inflows: CategoryFlow[]
    outflows: CategoryFlow[]
    subtotalInflow: number
    subtotalOutflow: number
    netCashFlow: number
  }
  // 投资活动
  investing: {
    inflows: CategoryFlow[]
    outflows: CategoryFlow[]
    subtotalInflow: number
    subtotalOutflow: number
    netCashFlow: number
  }
  // 筹资活动
  financing: {
    inflows: CategoryFlow[]
    outflows: CategoryFlow[]
    subtotalInflow: number
    subtotalOutflow: number
    netCashFlow: number
  }
  // 汇总
  summary: {
    totalInflow: number
    totalOutflow: number
    netIncrease: number
    beginningBalance: number
    endingBalance: number
  }
}

/**
 * 分类现金流
 */
export interface CategoryFlow {
  category: string
  label: string
  amount: number
  count: number
}

/**
 * 计算现金流量表
 */
export function calculateCashFlow(
  transactions: Transaction[],
  beginningBalance: number = 0
): CashFlowData {
  // 初始化结果
  const result: CashFlowData = {
    operating: {
      inflows: [],
      outflows: [],
      subtotalInflow: 0,
      subtotalOutflow: 0,
      netCashFlow: 0
    },
    investing: {
      inflows: [],
      outflows: [],
      subtotalInflow: 0,
      subtotalOutflow: 0,
      netCashFlow: 0
    },
    financing: {
      inflows: [],
      outflows: [],
      subtotalInflow: 0,
      subtotalOutflow: 0,
      netCashFlow: 0
    },
    summary: {
      totalInflow: 0,
      totalOutflow: 0,
      netIncrease: 0,
      beginningBalance,
      endingBalance: 0
    }
  }

  // 按活动和分类聚合
  const aggregated: Record<
    CashFlowActivity,
    {
      inflow: Map<string, { label: string; amount: number; count: number }>
      outflow: Map<string, { label: string; amount: number; count: number }>
    }
  > = {
    operating: { inflow: new Map(), outflow: new Map() },
    investing: { inflow: new Map(), outflow: new Map() },
    financing: { inflow: new Map(), outflow: new Map() }
  }

  // 遍历所有交易
  transactions.forEach(transaction => {
    // 优先使用数据库中的 cash_flow_activity
    // 如果没有（旧数据或未设置），则回退到配置文件映射
    let activity: CashFlowActivity
    let label: string

    if (transaction.cash_flow_activity) {
      // 使用数据库中的活动类型
      activity = transaction.cash_flow_activity as CashFlowActivity
      label = transaction.category
    } else {
      // 回退到旧的配置文件映射
      const mapping = getCategoryMapping(transaction.type, transaction.category)
      activity = mapping?.activity || 'operating'
      label = mapping?.label || transaction.category
    }

    const direction = transaction.type === 'income' ? 'inflow' : 'outflow'
    const flowMap = aggregated[activity][direction]
    const existing = flowMap.get(transaction.category)

    if (existing) {
      existing.amount = existing.amount + transaction.amount
      existing.count = existing.count + 1
    } else {
      flowMap.set(transaction.category, {
        label,
        amount: transaction.amount,
        count: 1
      })
    }
  })

  // 转换为数组并计算小计
  ;(['operating', 'investing', 'financing'] as CashFlowActivity[]).forEach(activity => {
    // 流入
    const inflows: CategoryFlow[] = []
    aggregated[activity].inflow.forEach((data, category) => {
      inflows.push({
        category,
        label: data.label,
        amount: data.amount,
        count: data.count
      })
      result[activity].subtotalInflow = result[activity].subtotalInflow + data.amount
    })
    result[activity].inflows = inflows.sort((a, b) => b.amount - a.amount)

    // 流出
    const outflows: CategoryFlow[] = []
    aggregated[activity].outflow.forEach((data, category) => {
      outflows.push({
        category,
        label: data.label,
        amount: data.amount,
        count: data.count
      })
      result[activity].subtotalOutflow = result[activity].subtotalOutflow + data.amount
    })
    result[activity].outflows = outflows.sort((a, b) => b.amount - a.amount)

    // 净现金流
    result[activity].netCashFlow =
      result[activity].subtotalInflow - result[activity].subtotalOutflow
  })

  // 计算汇总
  result.summary.totalInflow =
    result.operating.subtotalInflow +
    result.investing.subtotalInflow +
    result.financing.subtotalInflow

  result.summary.totalOutflow =
    result.operating.subtotalOutflow +
    result.investing.subtotalOutflow +
    result.financing.subtotalOutflow

  result.summary.netIncrease = result.summary.totalInflow - result.summary.totalOutflow

  result.summary.endingBalance = beginningBalance + result.summary.netIncrease

  return result
}

/**
 * 按月份分组计算现金流
 */
export function calculateMonthlyCashFlow(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date,
  initialCashBalance: number = 0,
  initialBalanceDate?: string
): Array<{
  month: string
  operating: number
  investing: number
  financing: number
  netIncrease: number
  beginningBalance: number
  endingBalance: number
}> {
  // 按月分组
  const monthlyTransactions = new Map<string, Transaction[]>()

  transactions.forEach(transaction => {
    const date = new Date(transaction.date)
    if (date >= startDate && date <= endDate) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyTransactions.get(monthKey) || []
      existing.push(transaction)
      monthlyTransactions.set(monthKey, existing)
    }
  })

  // 计算每月现金流
  const result: Array<{
    month: string
    operating: number
    investing: number
    financing: number
    netIncrease: number
    beginningBalance: number
    endingBalance: number
  }> = []

  const sortedMonths = Array.from(monthlyTransactions.keys()).sort()

  // 计算第一个月的期初余额
  let currentBeginningBalance = initialCashBalance
  if (sortedMonths.length > 0 && initialBalanceDate) {
    const firstMonthStart = new Date(sortedMonths[0] + '-01')
    currentBeginningBalance = calculateBeginningBalance(
      initialCashBalance,
      initialBalanceDate,
      firstMonthStart.toISOString().split('T')[0],
      transactions
    )
  }

  sortedMonths.forEach(monthKey => {
    const monthTransactions = monthlyTransactions.get(monthKey) || []
    const cashFlow = calculateCashFlow(monthTransactions)

    const endingBalance = currentBeginningBalance + cashFlow.summary.netIncrease

    result.push({
      month: monthKey,
      operating: cashFlow.operating.netCashFlow,
      investing: cashFlow.investing.netCashFlow,
      financing: cashFlow.financing.netCashFlow,
      netIncrease: cashFlow.summary.netIncrease,
      beginningBalance: currentBeginningBalance,
      endingBalance: endingBalance
    })

    // 下一个月的期初余额 = 本月的期末余额
    currentBeginningBalance = endingBalance
  })

  return result
}

/**
 * 获取日期范围
 */
export function getDateRange(period: 'month' | 'quarter' | 'year' | 'custom', customStart?: Date, customEnd?: Date): {
  startDate: Date
  endDate: Date
} {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'month':
      return {
        startDate: new Date(year, month, 1),
        endDate: new Date(year, month + 1, 0, 23, 59, 59)
      }
    case 'quarter':
      const quarterStartMonth = Math.floor(month / 3) * 3
      return {
        startDate: new Date(year, quarterStartMonth, 1),
        endDate: new Date(year, quarterStartMonth + 3, 0, 23, 59, 59)
      }
    case 'year':
      return {
        startDate: new Date(year, 0, 1),
        endDate: new Date(year, 11, 31, 23, 59, 59)
      }
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires start and end dates')
      }
      return {
        startDate: customStart,
        endDate: customEnd
      }
  }
}

/**
 * 筛选日期范围内的交易
 */
export function filterTransactionsByDateRange(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter(t => {
    const date = new Date(t.date)
    return date >= startDate && date <= endDate
  })
}

/**
 * 计算期初余额
 * @param initialCashBalance 初始现金余额（从财务设置中获取）
 * @param initialBalanceDate 初始余额日期（从财务设置中获取）
 * @param queryStartDate 查询的起始日期
 * @param allTransactions 所有交易记录
 * @returns 查询期间的期初余额
 */
export function calculateBeginningBalance(
  initialCashBalance: number,
  initialBalanceDate: string,
  queryStartDate: string,
  allTransactions: Transaction[]
): number {
  const initialDate = new Date(initialBalanceDate)
  const startDate = new Date(queryStartDate)

  // 如果查询起始日期 <= 初始余额日期，直接返回初始余额
  if (startDate <= initialDate) {
    return initialCashBalance
  }

  // 否则，计算从初始日期到查询起始日期前一天的所有现金流
  // 期初余额 = 初始余额 + Σ(初始日期 到 起始日期-1 的所有现金流)
  const dayBeforeStart = new Date(startDate)
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1)

  const transactionsBeforeQuery = filterTransactionsByDateRange(
    allTransactions,
    initialDate,
    dayBeforeStart
  )

  const cashFlowBeforeQuery = transactionsBeforeQuery.reduce((sum, t) => {
    return sum + (t.type === 'income' ? t.amount : -t.amount)
  }, 0)

  return initialCashBalance + cashFlowBeforeQuery
}
