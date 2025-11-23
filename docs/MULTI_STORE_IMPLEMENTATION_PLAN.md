# 多店铺功能实施计划

## 📋 快速概览

基于行业最佳实践，采用 **Shared Database with Logical Isolation** 架构，通过 `company_id` + `store_id` 实现数据隔离。

---

## 🎯 核心设计

### 数据架构（三层结构）

```
公司层 (Company)
  ├── 店铺层 (Stores)
  │   ├── 交易数据 (Transactions)
  │   ├── 日汇总 (Daily Summary)
  │   └── 月汇总 (Monthly Summary)
  └── 权限层 (Permissions)
```

### 关键表结构

| 表名 | 用途 | 状态 |
|------|------|------|
| `companies` | 公司主表 | ✅ 已存在 |
| `stores` | 店铺管理 | ⚠️ 需增强 |
| `transactions` | 交易记录 | ⚠️ 需增强 |
| `store_daily_summary` | 日汇总 | ❌ 需创建 |
| `store_monthly_summary` | 月汇总 | ❌ 需创建 |
| `store_permissions` | 权限管理 | ❌ 需创建 |

---

## 🚀 分阶段实施

### 阶段1: 基础店铺功能 (1-2周)

**目标**: 让系统支持多店铺基本操作

#### 数据库改造
```sql
-- 1. 增强 stores 表
ALTER TABLE stores ADD COLUMN
  code TEXT,                    -- 店铺编码
  type TEXT,                    -- 直营/加盟
  status TEXT DEFAULT 'active', -- 状态管理
  city TEXT,                    -- 城市
  province TEXT;                -- 省份

-- 2. 确保 transactions 表有 store_id
-- (已存在，但需要确保所有交易都关联店铺)

-- 3. 增强 financial_settings 支持店铺级
ALTER TABLE financial_settings
  ADD COLUMN store_id UUID REFERENCES stores(id);
```

#### 功能开发
1. **店铺管理页面**
   - 路径: `/stores`
   - 功能: 列表、新增、编辑、删除（软删除）
   - 组件: `components/store-management.tsx`

2. **店铺选择器**
   - 组件: `components/store-selector.tsx`
   - 用途: 交易录入、报表查询时选择店铺

3. **交易录入增强**
   - 添加店铺选择字段
   - 验证: 店铺必须属于当前公司

#### API 开发
```typescript
// lib/api/stores.ts
- getStores()              // 获取店铺列表
- getStore(id)             // 获取店铺详情
- createStore(data)        // 创建店铺
- updateStore(id, data)    // 更新店铺
- deleteStore(id)          // 软删除店铺

// lib/api/transactions.ts (增强)
- createTransaction()      // 添加 store_id 参数
- getTransactions()        // 支持按 store_id 筛选
```

#### 验收标准
- [ ] 可以创建、编辑、删除店铺
- [ ] 录入交易时可以选择店铺
- [ ] 交易列表可以按店铺筛选
- [ ] 单店报表正常显示

---

### 阶段2: 汇总与对比功能 (2-3周)

**目标**: 实现多店数据汇总和对比分析

#### 数据库改造
```sql
-- 1. 创建日汇总表
CREATE TABLE store_daily_summary (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  store_id UUID NOT NULL,
  date DATE NOT NULL,
  total_income DECIMAL(12,2),
  total_expense DECIMAL(12,2),
  net_cash_flow DECIMAL(12,2),
  -- ... 更多字段见详细设计
  UNIQUE(store_id, date)
);

-- 2. 创建月汇总表
CREATE TABLE store_monthly_summary (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  store_id UUID NOT NULL,
  year INTEGER,
  month INTEGER,
  total_income DECIMAL(12,2),
  total_expense DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  -- ... 更多字段
  UNIQUE(store_id, year, month)
);

-- 3. 创建汇总视图
CREATE VIEW company_daily_summary AS
  SELECT company_id, date,
    SUM(total_income) as total_income,
    SUM(total_expense) as total_expense,
    COUNT(DISTINCT store_id) as active_stores
  FROM store_daily_summary
  GROUP BY company_id, date;
```

#### 汇总计算逻辑
```typescript
// lib/services/summary-calculator.ts

// 1. 实时触发（交易创建/更新时）
export async function refreshDailySummary(storeId: string, date: string) {
  const transactions = await getStoreTransactions(storeId, date)
  const summary = calculateSummary(transactions)
  await upsertDailySummary(summary)
}

// 2. 定时任务（每日凌晨，纠错机制）
export async function refreshAllSummaries(date: string) {
  const stores = await getAllActiveStores()
  await Promise.all(
    stores.map(store => refreshDailySummary(store.id, date))
  )
}
```

#### 功能开发
1. **多店铺看板**
   - 路径: `/dashboard/multi-store`
   - 功能:
     - 全公司汇总数据卡片
     - 店铺收入对比图（柱状图）
     - 店铺利润排行榜
     - 趋势分析（折线图）

2. **店铺对比报表**
   - 路径: `/reports/store-comparison`
   - 功能:
     - 选择多个店铺对比
     - 多维度指标（收入、支出、利润率、增长率）
     - 时间序列对比
     - 导出 Excel

3. **区域汇总报表**
   - 路径: `/reports/regional`
   - 功能:
     - 按省份/城市汇总
     - 同比环比分析
     - 区域排行

#### API 开发
```typescript
// lib/api/summaries.ts
- getStoreDailySummary(storeId, dateRange)
- getStoreMonthlySummary(storeId, year, month)
- getCompanySummary(companyId, dateRange)
- compareStores(storeIds, dateRange, metrics)
- getRegionalSummary(companyId, dateRange)

// lib/api/reports.ts
- getMultiStoreCashFlow(companyId, dateRange, storeIds?)
- getMultiStoreProfitLoss(companyId, dateRange, storeIds?)
```

#### 验收标准
- [ ] 多店看板显示正确的汇总数据
- [ ] 可以对比多个店铺的数据
- [ ] 区域汇总报表准确
- [ ] 数据可导出为 Excel
- [ ] 图表可视化清晰

---

### 阶段3: 权限管理 (1-2周)

**目标**: 实现细粒度的店铺权限控制

#### 数据库改造
```sql
-- 创建权限表
CREATE TABLE store_permissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  store_id UUID NOT NULL,
  role TEXT NOT NULL,  -- manager, accountant, cashier, viewer
  can_view_transactions BOOLEAN DEFAULT TRUE,
  can_create_transactions BOOLEAN DEFAULT TRUE,
  can_edit_transactions BOOLEAN DEFAULT FALSE,
  can_delete_transactions BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT TRUE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, store_id)
);

-- RLS 策略
CREATE POLICY "Users can view permitted stores"
ON stores FOR SELECT USING (
  -- 公司所有者看全部
  company_id IN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
  -- 店长看自己的店
  OR manager_id = auth.uid()
  -- 员工看授权的店
  OR id IN (
    SELECT store_id FROM store_permissions WHERE user_id = auth.uid()
  )
);
```

#### 功能开发
1. **权限管理页面**
   - 路径: `/settings/permissions`
   - 功能:
     - 查看所有用户及其权限
     - 分配店铺给用户
     - 设置角色和具体权限
     - 批量授权/撤销

2. **权限检查中间件**
   ```typescript
   // lib/permissions/check-store-access.ts
   export async function requireStoreAccess(
     userId: string,
     storeId: string,
     action: 'view' | 'edit' | 'delete' | 'manage'
   ): Promise<void> {
     const hasAccess = await checkStoreAccess(userId, storeId, action)
     if (!hasAccess) {
       throw new Error('无权限访问该店铺')
     }
   }
   ```

#### 验收标准
- [ ] 超级管理员可以看到所有店铺
- [ ] 店长只能看到自己管理的店铺
- [ ] 员工只能看到被授权的店铺
- [ ] 权限检查在数据库层(RLS)和应用层双重验证
- [ ] 无权限时显示友好提示

---

## 📊 功能清单总结

### 店铺管理
- [x] 店铺列表（带筛选、搜索）
- [x] 店铺详情（基本信息、数据预览）
- [x] 店铺 CRUD 操作
- [x] 店铺状态管理（营业中、停业、筹备中、已关闭）
- [x] 店铺分组（按城市、省份）

### 交易管理
- [x] 交易录入时选择店铺
- [x] 交易列表按店铺筛选
- [x] 跨店交易支持（可选）
- [x] 批量导入（按店铺分组）

### 财务报表
- [x] 单店现金流量表
- [x] 单店利润表
- [x] 多店汇总现金流量表
- [x] 多店汇总利润表
- [x] 店铺对比报表
- [x] 区域汇总报表

### 数据分析
- [x] 多店铺综合看板
- [x] 店铺收入对比图
- [x] 店铺利润排行榜
- [x] 趋势分析（折线图）
- [x] 异常提醒（亏损店铺、零交易）

### 权限管理
- [x] 用户-店铺权限分配
- [x] 角色级别控制（店长、会计、收银员、查看者）
- [x] 功能级别权限（查看、编辑、删除、管理）
- [x] 权限审计日志

---

## 🔧 技术实施要点

### 数据库优化
```sql
-- 关键索引
CREATE INDEX idx_transactions_store_date ON transactions(store_id, date DESC);
CREATE INDEX idx_stores_company_active ON stores(company_id, is_active);
CREATE INDEX idx_daily_summary_store_date ON store_daily_summary(store_id, date DESC);

-- 触发器：自动更新汇总
CREATE TRIGGER transaction_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_daily_summary();
```

### 性能策略
1. **查询优化**
   - 使用汇总表（避免大量实时聚合）
   - 限制默认查询时间范围（最近3个月）
   - 分页加载长列表

2. **缓存策略**
   - 汇总数据缓存 1 小时（Redis）
   - 静态报表缓存 24 小时
   - 用户权限缓存 15 分钟

3. **异步处理**
   - 月度汇总定时计算（凌晨）
   - 大批量导入后台任务
   - 报表导出异步生成

### 前端组件复用
```typescript
// 通用组件
- StoreSelector         // 店铺选择器
- StoreSummaryCard      // 店铺数据卡片
- StoreComparisonChart  // 对比图表
- StoreRankingList      // 排行榜
- RegionalMap           // 区域地图（可选）

// 布局
- MultiStoreLayout      // 多店铺页面布局
- StoreDetailLayout     // 店铺详情布局
```

---

## 📈 预期效果

### 业务价值
1. **全局视野**: 老板可以一眼看到所有店铺经营状况
2. **对比分析**: 快速找出表现最好/最差的店铺
3. **区域洞察**: 了解不同城市/地区的经营差异
4. **权限安全**: 员工只能看到被授权的店铺数据

### 数据示例
```
多店铺看板 - 2025年1月
┌────────────────────────────────────────┐
│ 总收入: ¥600,000  (+15% ↑)            │
│ 总支出: ¥425,000  (+12% ↑)            │
│ 净利润: ¥175,000  (+20% ↑)            │
│ 活跃店铺: 10 家                        │
└────────────────────────────────────────┘

店铺利润排行榜:
1. 🥇 BJ001 朝阳店   ¥45,000  (37.5%)
2. 🥈 SH001 浦东店   ¥40,000  (36.4%)
3. 🥉 BJ002 海淀店   ¥35,000  (35.0%)
4.    SH002 静安店   ¥30,000  (33.3%)
5.    GZ001 天河店   ¥25,000  (31.2%)

⚠️  异常提醒:
- SZ002 深圳店: 本月亏损 ¥5,000
- CD001 成都店: 连续3天零交易
```

---

## 🎯 开发建议

### Should I proceed with this plan?

建议采用 **MVP 迭代** 方式：

1. **第一步**: 阶段1（基础店铺功能）
   - 最小可用，快速验证
   - 2周内上线基本店铺管理

2. **第二步**: 阶段2（汇总功能）
   - 核心价值功能
   - 多店对比和看板

3. **第三步**: 阶段3（权限管理）
   - 企业级功能
   - 团队协作支持

**是否现在开始实施阶段1？**
