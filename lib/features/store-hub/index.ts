/**
 * 店铺管理中心功能模块
 * 统一导出入口
 */

// 类型导出
export type {
  StoreHubMetrics,
  SingleStoreMetrics,
  GetStoreHubMetricsParams,
  GetStoreHubMetricsResult,
} from './types'

// 服务函数导出
export { getStoreHubMetrics } from './store-hub-metrics'
