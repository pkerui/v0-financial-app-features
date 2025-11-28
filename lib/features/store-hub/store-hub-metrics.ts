'use server'

/**
 * 店铺管理中心 - 数据服务
 * 使用 metrics.ts 模块计算汇总数据
 */

import { createClient } from '@/lib/supabase/server'
import { calcAllMetrics, type Transaction } from '@/lib/services/metrics'
import {
  calcConsolidatedCashFlow,
  type StoreInfo,
} from '@/lib/services/cash-flow'
import { calculateProfitLoss } from '@/lib/services/profit-loss'
import type {
  GetStoreHubMetricsParams,
  GetStoreHubMetricsResult,
  StoreHubMetrics,
  SingleStoreMetrics,
} from './types'

/**
 * 获取店铺管理中心汇总指标
 */
export async function getStoreHubMetrics(
  params: GetStoreHubMetricsParams
): Promise<GetStoreHubMetricsResult> {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: '未登录' }
    }

    // 获取用户配置
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return { success: false, error: '用户未关联公司' }
    }

    // 获取店铺列表（包含期初余额信息）
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, status, initial_balance, initial_balance_date')
      .eq('company_id', profile.company_id)

    const storeList = stores || []
    const activeStoreCount = storeList.filter(s => s.status === 'active').length
    const activeStores = storeList.filter(s => s.status === 'active')

    // 获取所有交易记录（用于计算期初余额和利润表）
    // include_in_profit_loss 和 transaction_nature 在 transaction_categories 表中，通过 JOIN 获取
    let allTxQuery = supabase
      .from('transactions')
      .select(`
        id, type, amount, date, category, store_id, cash_flow_activity,
        transaction_categories!category_id (
          include_in_profit_loss,
          transaction_nature
        )
      `)
      .eq('company_id', profile.company_id)

    // 如果指定了店铺
    if (params.storeIds && params.storeIds.length > 0) {
      allTxQuery = allTxQuery.in('store_id', params.storeIds)
    }

    const { data: allTransactions, error } = await allTxQuery

    if (error) {
      console.error('获取交易记录失败:', error)
      return { success: false, error: '获取交易记录失败' }
    }

    // 将 JOIN 的数据转换为扁平结构
    const allTxList = (allTransactions || []).map(t => ({
      ...t,
      include_in_profit_loss: (t as any).transaction_categories?.include_in_profit_loss,
      transaction_nature: (t as any).transaction_categories?.transaction_nature
    })) as (Transaction & { cash_flow_activity?: string; include_in_profit_loss?: boolean; transaction_nature?: string })[]

    // 获取期间内交易（用于基础指标计算）
    const txList = allTxList.filter(t => {
      const txDate = new Date(t.date)
      return txDate >= new Date(params.startDate) && txDate <= new Date(params.endDate)
    })

    // 使用 metrics 模块计算汇总
    const metrics = calcAllMetrics(txList)

    // 计算交易笔数
    const incomeCount = txList.filter(t => t.type === 'income').length
    const expenseCount = txList.filter(t => t.type === 'expense').length

    // 计算平均值
    const storeCount = storeList.length
    const avgIncomePerStore = storeCount > 0 ? metrics.totalIncome / storeCount : 0
    const avgExpensePerStore = storeCount > 0 ? metrics.totalExpense / storeCount : 0

    // 使用 calcConsolidatedCashFlow 计算现金流（正确处理新店/老店期初余额）
    const storeInfoList: StoreInfo[] = activeStores.map(s => ({
      id: s.id,
      name: s.name,
      initial_balance: s.initial_balance || 0,
      initial_balance_date: s.initial_balance_date || null
    }))

    const consolidatedCashFlow = calcConsolidatedCashFlow(
      allTxList,
      storeInfoList,
      params.startDate,
      params.endDate
    )

    // 使用 calculateProfitLoss 计算利润表数据（与利润表详情页一致）
    const profitLossData = calculateProfitLoss(txList)

    // 构建汇总结果
    const summary: StoreHubMetrics = {
      totalIncome: metrics.totalIncome,
      totalExpense: metrics.totalExpense,
      incomeCount,
      expenseCount,
      totalCount: incomeCount + expenseCount,
      storeCount,
      activeStoreCount,
      avgIncomePerStore,
      avgExpensePerStore,
      operatingCashFlow: consolidatedCashFlow.operating.netCashFlow,
      investingCashFlow: consolidatedCashFlow.investing.netCashFlow,
      financingCashFlow: consolidatedCashFlow.financing.netCashFlow,
      netCashFlow: consolidatedCashFlow.summary.netIncrease,
      beginningBalance: consolidatedCashFlow.summary.beginningBalance,
      endingBalance: consolidatedCashFlow.summary.endingBalance,
      // 利润表数据
      revenue: profitLossData.revenue.total,
      cost: profitLossData.cost.total,
      operatingProfit: profitLossData.operatingProfit,
      nonOperatingIncome: profitLossData.nonOperatingIncome.total,
      nonOperatingExpense: profitLossData.nonOperatingExpense.total,
      totalProfit: profitLossData.totalProfit,
      incomeTax: profitLossData.incomeTax.total,
      netProfit: profitLossData.netProfit,
    }

    // 按店铺分组计算
    const byStoreMap = new Map<string, { income: number; expense: number; incomeCount: number; expenseCount: number }>()

    for (const t of txList) {
      const storeId = t.store_id || 'unknown'
      const existing = byStoreMap.get(storeId) || { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }

      if (t.type === 'income') {
        existing.income += t.amount
        existing.incomeCount += 1
      } else {
        existing.expense += t.amount
        existing.expenseCount += 1
      }

      byStoreMap.set(storeId, existing)
    }

    // 转换为数组
    const byStore: SingleStoreMetrics[] = []
    for (const store of storeList) {
      const data = byStoreMap.get(store.id) || { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }
      byStore.push({
        storeId: store.id,
        storeName: store.name,
        totalIncome: data.income,
        totalExpense: data.expense,
        netProfit: data.income - data.expense,
        incomeCount: data.incomeCount,
        expenseCount: data.expenseCount,
      })
    }

    // 按净利润降序排列
    byStore.sort((a, b) => b.netProfit - a.netProfit)

    return {
      success: true,
      data: {
        summary,
        byStore,
      },
    }
  } catch (error) {
    console.error('获取店铺汇总指标异常:', error)
    return { success: false, error: '获取店铺汇总指标失败' }
  }
}
