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
  store_id?: string
}

// 店铺信息类型
export interface StoreInfo {
  id: string
  name: string
  initial_balance: number
  initial_balance_date: string | null
}

// 新店资本投入信息
export interface NewStoreCapitalInvestment {
  storeId: string
  storeName: string
  amount: number
  date: string  // 开业日期
}

// 合并现金流结果（扩展基础 CashFlowData）
export interface ConsolidatedCashFlowData extends CashFlowData {
  // 新店资本投入列表（用于备注说明）
  newStoreCapitalInvestments: NewStoreCapitalInvestment[]
  // 各店铺明细
  storeBreakdown: Array<{
    storeId: string
    storeName: string
    beginningBalance: number
    endingBalance: number
    netCashFlow: number
    isNewStore: boolean
  }>
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

/**
 * 计算多店合并现金流量表
 *
 * 合并逻辑：
 * 1. 合并期初余额：只计算查询开始日已存在的店铺
 * 2. 新店期初余额：计入"筹资活动-资本投入"
 * 3. 现金流变动：各店只计算其存在期间的流量
 * 4. 合并期末余额：所有店铺期末余额之和
 */
export function calcConsolidatedCashFlow(
  transactions: Transaction[],
  stores: StoreInfo[],
  queryStartDate: string,
  queryEndDate: string
): ConsolidatedCashFlowData {
  const queryStart = new Date(queryStartDate)
  const queryEnd = new Date(queryEndDate)

  // 分类店铺：已存在店铺 vs 新开店铺
  const existingStores: StoreInfo[] = []
  const newStores: StoreInfo[] = []

  stores.forEach(store => {
    if (!store.initial_balance_date) {
      // 没有设置期初日期的店铺，视为已存在
      existingStores.push(store)
    } else {
      const storeStartDate = new Date(store.initial_balance_date)
      if (storeStartDate <= queryStart) {
        // 店铺在查询开始前已存在
        existingStores.push(store)
      } else if (storeStartDate <= queryEnd) {
        // 店铺在查询期间内开业（新店）
        newStores.push(store)
      }
      // 查询期间后开业的店铺不计入
    }
  })

  // 1. 计算合并期初余额（已存在店铺）
  let consolidatedBeginningBalance = 0
  const storeBreakdown: ConsolidatedCashFlowData['storeBreakdown'] = []

  existingStores.forEach(store => {
    // 获取该店铺的所有交易
    const storeTransactions = transactions.filter(t => t.store_id === store.id)

    // 计算该店铺在查询开始日的余额
    const storeBeginningBalance = store.initial_balance_date
      ? calculateBeginningBalance(
          store.initial_balance,
          store.initial_balance_date,
          queryStartDate,
          storeTransactions
        )
      : store.initial_balance

    consolidatedBeginningBalance += storeBeginningBalance

    // 计算该店铺在查询期间的现金流
    const periodTransactions = storeTransactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate >= queryStart && txDate <= queryEnd
    })
    const storeCashFlow = calculateCashFlow(periodTransactions, 0)
    const storeEndingBalance = storeBeginningBalance + storeCashFlow.summary.netIncrease

    storeBreakdown.push({
      storeId: store.id,
      storeName: store.name,
      beginningBalance: storeBeginningBalance,
      endingBalance: storeEndingBalance,
      netCashFlow: storeCashFlow.summary.netIncrease,
      isNewStore: false
    })
  })

  // 2. 处理新店资本投入
  const newStoreCapitalInvestments: NewStoreCapitalInvestment[] = []
  let totalNewStoreCapital = 0

  newStores.forEach(store => {
    // 新店期初余额作为资本投入
    newStoreCapitalInvestments.push({
      storeId: store.id,
      storeName: store.name,
      amount: store.initial_balance,
      date: store.initial_balance_date!
    })
    totalNewStoreCapital += store.initial_balance

    // 获取新店在开业后的交易
    const storeTransactions = transactions.filter(t => t.store_id === store.id)
    const storeStartDate = new Date(store.initial_balance_date!)

    const periodTransactions = storeTransactions.filter(t => {
      const txDate = new Date(t.date)
      return txDate >= storeStartDate && txDate <= queryEnd
    })

    const storeCashFlow = calculateCashFlow(periodTransactions, 0)
    const storeEndingBalance = store.initial_balance + storeCashFlow.summary.netIncrease

    storeBreakdown.push({
      storeId: store.id,
      storeName: store.name,
      beginningBalance: store.initial_balance,
      endingBalance: storeEndingBalance,
      netCashFlow: storeCashFlow.summary.netIncrease,
      isNewStore: true
    })
  })

  // 3. 计算所有店铺在查询期间的交易现金流
  const allStoreIds = [...existingStores, ...newStores].map(s => s.id)
  const periodTransactions = transactions.filter(t => {
    if (!t.store_id || !allStoreIds.includes(t.store_id)) return false
    const txDate = new Date(t.date)

    // 对于新店，只计算开业后的交易
    const store = newStores.find(s => s.id === t.store_id)
    if (store && store.initial_balance_date) {
      const storeStartDate = new Date(store.initial_balance_date)
      return txDate >= storeStartDate && txDate <= queryEnd
    }

    // 对于已存在店铺，计算整个查询期间
    return txDate >= queryStart && txDate <= queryEnd
  })

  // 计算基础现金流（不含新店资本投入）
  const baseCashFlow = calculateCashFlow(periodTransactions, consolidatedBeginningBalance)

  // 4. 将新店资本投入加入筹资活动
  if (totalNewStoreCapital > 0) {
    // 添加虚拟的"新店资本投入"流入项
    baseCashFlow.financing.inflows.unshift({
      category: '__new_store_capital__',
      label: '新店资本投入',
      amount: totalNewStoreCapital,
      count: newStores.length
    })
    baseCashFlow.financing.subtotalInflow += totalNewStoreCapital
    baseCashFlow.financing.netCashFlow += totalNewStoreCapital

    // 更新汇总
    baseCashFlow.summary.totalInflow += totalNewStoreCapital
    baseCashFlow.summary.netIncrease += totalNewStoreCapital
    baseCashFlow.summary.endingBalance += totalNewStoreCapital
  }

  // 5. 计算合并期末余额（所有店铺期末余额之和）
  const consolidatedEndingBalance = storeBreakdown.reduce(
    (sum, store) => sum + store.endingBalance,
    0
  )

  // 返回合并结果
  return {
    ...baseCashFlow,
    summary: {
      ...baseCashFlow.summary,
      beginningBalance: consolidatedBeginningBalance,
      endingBalance: consolidatedEndingBalance
    },
    newStoreCapitalInvestments,
    storeBreakdown
  }
}

/**
 * 计算多店合并的月度现金流数据（用于图表）
 *
 * 逻辑：
 * 1. 期初余额 = 最早店铺开业时的期初余额
 * 2. 每月计算时，如果有新店开业，将其期初余额计入筹资活动
 * 3. 正确累计各月的期末余额
 */
export function calculateConsolidatedMonthlyCashFlow(
  transactions: Transaction[],
  stores: StoreInfo[],
  startDate: Date,
  endDate: Date
): Array<{
  month: string
  operating: number
  investing: number
  financing: number
  netIncrease: number
  beginningBalance: number
  endingBalance: number
}> {
  // 找到最早开业的店铺
  const storesWithDate = stores
    .filter(s => s.initial_balance_date)
    .sort((a, b) => new Date(a.initial_balance_date!).getTime() - new Date(b.initial_balance_date!).getTime())

  if (storesWithDate.length === 0) {
    // 没有店铺有期初日期，返回空数组
    return []
  }

  const earliestStore = storesWithDate[0]
  const earliestDate = new Date(earliestStore.initial_balance_date!)

  // 按月分组交易
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

  // 生成从开始日期到结束日期的所有月份
  const allMonths: string[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  while (current <= end) {
    allMonths.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`)
    current.setMonth(current.getMonth() + 1)
  }

  const result: Array<{
    month: string
    operating: number
    investing: number
    financing: number
    netIncrease: number
    beginningBalance: number
    endingBalance: number
  }> = []

  // 计算初始期初余额
  // 如果查询开始日期在最早店铺开业日期之前，期初余额为0
  // 否则，计算到查询开始日期时的累计余额
  let currentBeginningBalance = 0

  // 确定在查询开始日期时已存在的店铺及其余额
  const queryStartDate = startDate
  stores.forEach(store => {
    if (!store.initial_balance_date) return

    const storeStartDate = new Date(store.initial_balance_date)
    if (storeStartDate <= queryStartDate) {
      // 店铺在查询开始前已存在，计算其在查询开始时的余额
      const storeTransactions = transactions.filter(t => t.store_id === store.id)
      const storeBeginningBalance = calculateBeginningBalance(
        store.initial_balance,
        store.initial_balance_date,
        queryStartDate.toISOString().split('T')[0],
        storeTransactions
      )
      currentBeginningBalance += storeBeginningBalance
    }
  })

  // 追踪每月新开店铺
  const processedNewStores = new Set<string>()

  allMonths.forEach(monthKey => {
    const monthStart = new Date(monthKey + '-01')
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

    // 获取本月交易
    const monthTransactions = monthlyTransactions.get(monthKey) || []

    // 计算本月基础现金流（不含新店资本投入）
    const baseCashFlow = calculateCashFlow(monthTransactions, 0)

    // 检查本月是否有新店开业
    let newStoreCapitalThisMonth = 0
    stores.forEach(store => {
      if (!store.initial_balance_date || processedNewStores.has(store.id)) return

      const storeStartDate = new Date(store.initial_balance_date)
      // 新店开业日期在本月内（不含查询开始日期之前已存在的店铺）
      if (storeStartDate > queryStartDate && storeStartDate >= monthStart && storeStartDate <= monthEnd) {
        newStoreCapitalThisMonth += store.initial_balance
        processedNewStores.add(store.id)
      }
    })

    // 筹资活动 = 基础筹资 + 新店资本投入
    const financingWithNewStore = baseCashFlow.financing.netCashFlow + newStoreCapitalThisMonth

    // 本月净增加额
    const netIncrease = baseCashFlow.operating.netCashFlow +
                        baseCashFlow.investing.netCashFlow +
                        financingWithNewStore

    const endingBalance = currentBeginningBalance + netIncrease

    result.push({
      month: monthKey,
      operating: baseCashFlow.operating.netCashFlow,
      investing: baseCashFlow.investing.netCashFlow,
      financing: financingWithNewStore,
      netIncrease: netIncrease,
      beginningBalance: currentBeginningBalance,
      endingBalance: endingBalance
    })

    // 下月期初 = 本月期末
    currentBeginningBalance = endingBalance
  })

  return result
}
