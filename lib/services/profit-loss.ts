/**
 * 利润表计算服务
 */

type Transaction = {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  description?: string
  category_id?: string
  cash_flow_activity?: 'operating' | 'investing' | 'financing'
  transaction_nature?: 'operating' | 'non_operating'
  include_in_profit_loss?: boolean
}

/**
 * 分类明细
 */
export interface CategoryDetail {
  category: string
  amount: number
  count: number
  percentage: number // 占总收入/总成本的百分比
}

/**
 * 利润表数据结构
 */
export interface ProfitLossData {
  // 一、营业收入
  revenue: {
    items: CategoryDetail[]
    total: number
  }
  // 二、营业成本
  cost: {
    items: CategoryDetail[]
    total: number
  }
  // 三、营业利润
  operatingProfit: number
  // 加：营业外收入
  nonOperatingIncome: {
    items: CategoryDetail[]
    total: number
  }
  // 减：营业外支出
  nonOperatingExpense: {
    items: CategoryDetail[]
    total: number
  }
  // 四、利润总额
  totalProfit: number
  // 五、净利润（等于利润总额，所得税已在营业外支出中）
  netProfit: number
}

/**
 * 计算利润表
 */
export function calculateProfitLoss(transactions: Transaction[]): ProfitLossData {
  // 分离收入和支出，只计算标记为"计入利润表"的交易
  // include_in_profit_loss 默认为 true（未设置时视为计入）
  // transaction_nature 默认为 'operating'（未设置时视为营业内）

  // 营业内收入
  const operatingIncomeTransactions = transactions.filter(t =>
    t.type === 'income' &&
    (t.include_in_profit_loss !== false) &&
    (t.transaction_nature === 'operating' || !t.transaction_nature)
  )

  // 营业内支出（成本）
  const operatingExpenseTransactions = transactions.filter(t =>
    t.type === 'expense' &&
    (t.include_in_profit_loss !== false) &&
    (t.transaction_nature === 'operating' || !t.transaction_nature)
  )

  // 营业外收入
  const nonOperatingIncomeTransactions = transactions.filter(t =>
    t.type === 'income' &&
    (t.include_in_profit_loss !== false) &&
    t.transaction_nature === 'non_operating'
  )

  // 营业外支出
  const nonOperatingExpenseTransactions = transactions.filter(t =>
    t.type === 'expense' &&
    (t.include_in_profit_loss !== false) &&
    t.transaction_nature === 'non_operating'
  )

  // 计算总收入和总成本
  const totalRevenue = operatingIncomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalCost = operatingExpenseTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalNonOperatingIncome = nonOperatingIncomeTransactions.reduce((sum, t) => sum + t.amount, 0)
  const totalNonOperatingExpense = nonOperatingExpenseTransactions.reduce((sum, t) => sum + t.amount, 0)

  // 按类别聚合营业内收入
  const revenueByCategory = new Map<string, { amount: number; count: number }>()
  operatingIncomeTransactions.forEach(t => {
    const existing = revenueByCategory.get(t.category)
    if (existing) {
      existing.amount += t.amount
      existing.count += 1
    } else {
      revenueByCategory.set(t.category, { amount: t.amount, count: 1 })
    }
  })

  // 按类别聚合营业内成本
  const costByCategory = new Map<string, { amount: number; count: number }>()
  operatingExpenseTransactions.forEach(t => {
    const existing = costByCategory.get(t.category)
    if (existing) {
      existing.amount += t.amount
      existing.count += 1
    } else {
      costByCategory.set(t.category, { amount: t.amount, count: 1 })
    }
  })

  // 按类别聚合营业外收入
  const nonOperatingIncomeByCategory = new Map<string, { amount: number; count: number }>()
  nonOperatingIncomeTransactions.forEach(t => {
    const existing = nonOperatingIncomeByCategory.get(t.category)
    if (existing) {
      existing.amount += t.amount
      existing.count += 1
    } else {
      nonOperatingIncomeByCategory.set(t.category, { amount: t.amount, count: 1 })
    }
  })

  // 按类别聚合营业外支出
  const nonOperatingExpenseByCategory = new Map<string, { amount: number; count: number }>()
  nonOperatingExpenseTransactions.forEach(t => {
    const existing = nonOperatingExpenseByCategory.get(t.category)
    if (existing) {
      existing.amount += t.amount
      existing.count += 1
    } else {
      nonOperatingExpenseByCategory.set(t.category, { amount: t.amount, count: 1 })
    }
  })

  // 转换为数组并计算百分比
  const revenueItems: CategoryDetail[] = []
  revenueByCategory.forEach((data, category) => {
    revenueItems.push({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0
    })
  })
  revenueItems.sort((a, b) => b.amount - a.amount)

  const costItems: CategoryDetail[] = []
  costByCategory.forEach((data, category) => {
    costItems.push({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalCost > 0 ? (data.amount / totalCost) * 100 : 0
    })
  })
  costItems.sort((a, b) => b.amount - a.amount)

  const nonOperatingIncomeItems: CategoryDetail[] = []
  nonOperatingIncomeByCategory.forEach((data, category) => {
    nonOperatingIncomeItems.push({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalNonOperatingIncome > 0 ? (data.amount / totalNonOperatingIncome) * 100 : 0
    })
  })
  nonOperatingIncomeItems.sort((a, b) => b.amount - a.amount)

  const nonOperatingExpenseItems: CategoryDetail[] = []
  nonOperatingExpenseByCategory.forEach((data, category) => {
    nonOperatingExpenseItems.push({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalNonOperatingExpense > 0 ? (data.amount / totalNonOperatingExpense) * 100 : 0
    })
  })
  nonOperatingExpenseItems.sort((a, b) => b.amount - a.amount)

  // 计算利润
  const operatingProfit = totalRevenue - totalCost
  const totalProfit = operatingProfit + totalNonOperatingIncome - totalNonOperatingExpense
  const netProfit = totalProfit // 等于利润总额（所得税已在营业外支出中）

  return {
    revenue: {
      items: revenueItems,
      total: totalRevenue
    },
    cost: {
      items: costItems,
      total: totalCost
    },
    operatingProfit,
    nonOperatingIncome: {
      items: nonOperatingIncomeItems,
      total: totalNonOperatingIncome
    },
    nonOperatingExpense: {
      items: nonOperatingExpenseItems,
      total: totalNonOperatingExpense
    },
    totalProfit,
    netProfit
  }
}

/**
 * 按月份计算利润表
 */
export function calculateMonthlyProfitLoss(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Array<{
  month: string
  revenue: number
  cost: number
  profit: number
  nonOperatingIncome: number
  nonOperatingExpense: number
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

  // 计算每月利润
  const result: Array<{
    month: string
    revenue: number
    cost: number
    profit: number
    nonOperatingIncome: number
    nonOperatingExpense: number
  }> = []

  const sortedMonths = Array.from(monthlyTransactions.keys()).sort()

  sortedMonths.forEach(monthKey => {
    const monthTransactions = monthlyTransactions.get(monthKey) || []
    const profitLoss = calculateProfitLoss(monthTransactions)

    result.push({
      month: monthKey,
      revenue: profitLoss.revenue.total,
      cost: profitLoss.cost.total,
      profit: profitLoss.netProfit,
      nonOperatingIncome: profitLoss.nonOperatingIncome.total,
      nonOperatingExpense: profitLoss.nonOperatingExpense.total
    })
  })

  return result
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
