# 多店铺财务管理系统 - 设计方案

## 📋 目录

1. [行业最佳实践研究](#行业最佳实践研究)
2. [数据架构设计](#数据架构设计)
3. [功能模块说明](#功能模块说明)
4. [技术实现方案](#技术实现方案)
5. [权限控制方案](#权限控制方案)
6. [报表汇总逻辑](#报表汇总逻辑)

---

## 行业最佳实践研究

### 参考来源

基于 2024-2025 年行业研究和最佳实践：

1. **[Multi-Tenant Database Design Patterns](https://daily.dev/blog/multi-tenant-database-design-patterns-2024)** - 多租户数据库设计模式
2. **[Financial Database Design Best Practices](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-financial-applications/)** - 财务数据库设计最佳实践
3. **[连锁零售业财务数智化白皮书 2024](https://www.dama.org.cn)** - 中国连锁零售行业财务数字化趋势

### 核心原则

#### 1. 数据隔离策略
采用 **Shared Database with Logical Isolation** 模式：
- ✅ 所有店铺共享同一数据库
- ✅ 通过 `company_id` + `store_id` 实现逻辑隔离
- ✅ 使用 Row-Level Security (RLS) 确保数据安全
- ✅ 平衡了性能、成本和安全性

#### 2. 财务数据完整性
- ✅ 软删除 (Soft Delete) - 保留历史数据
- ✅ 审计追踪 (Audit Trail) - 记录所有变更
- ✅ 事务一致性 - ACID 保证
- ✅ 数据备份 - 定期自动备份

#### 3. 汇总计算策略
- ✅ 实时计算 - 查询时聚合（小规模）
- ✅ 物化视图 - 预计算汇总（中等规模）
- ✅ 定时任务 - 批量计算存储（大规模）

---

## 数据架构设计

### 核心设计理念

```
公司 (Company)
  └── 店铺 (Stores) [1对多]
      ├── 交易记录 (Transactions) [1对多]
      ├── 财务设置 (Financial Settings) [1对1]
      └── 分类配置 (Categories) [共享或独立]
```

### 1. 组织架构层

#### 1.1 公司表 (companies) - 已存在 ✅

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),

  -- 业务信息
  business_type TEXT,                    -- 业务类型：民宿、连锁酒店、餐饮等
  registration_number TEXT,              -- 营业执照号
  tax_id TEXT,                          -- 税号

  -- 系统设置
  settings JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'Asia/Shanghai',

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 软删除
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);
```

**关键字段说明**：
- `owner_id`: 公司所有者（超级管理员）
- `settings`: 公司级别配置（JSON格式，灵活扩展）
- `is_active`: 软删除标记

#### 1.2 店铺表 (stores) - 需要增强 ⚠️

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 基本信息
  name TEXT NOT NULL,                    -- 店铺名称
  code TEXT,                            -- 店铺编码（用于报表）
  type TEXT,                            -- 店铺类型：直营、加盟

  -- 联系信息
  address TEXT,
  city TEXT,                            -- 城市
  province TEXT,                        -- 省份
  phone TEXT,
  email TEXT,

  -- 管理信息
  manager_id UUID REFERENCES auth.users(id),  -- 店长
  opening_date DATE,                    -- 开业日期

  -- 业务配置
  business_hours JSONB,                 -- 营业时间
  settings JSONB DEFAULT '{}'::jsonb,   -- 店铺级别配置

  -- 状态
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'closed')),
  is_active BOOLEAN DEFAULT TRUE,

  -- 排序
  sort_order INTEGER DEFAULT 0,

  -- 审计字段
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 软删除
  deleted_at TIMESTAMPTZ,

  -- 唯一约束
  UNIQUE(company_id, code)
);

-- 索引
CREATE INDEX idx_stores_company_active ON stores(company_id, is_active);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_manager ON stores(manager_id);
CREATE INDEX idx_stores_city ON stores(city);
```

**新增字段说明**：
- `code`: 店铺唯一编码（如：BJ001, SH002），用于报表展示
- `type`: 区分直营店和加盟店
- `status`: 详细的状态管理（营业中、停业、筹备中、已关闭）
- `business_hours`: 营业时间配置
- `city`/`province`: 用于区域汇总分析

### 2. 交易数据层

#### 2.1 交易记录表 (transactions) - 已存在，需增强 ⚠️

```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);  -- 已存在 ✅

-- 新增字段（如果不存在）
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  -- 财务字段
  category_id UUID REFERENCES transaction_categories(id),  -- 关联分类表
  cash_flow_activity TEXT,                                -- 现金流活动
  transaction_nature TEXT,                                 -- 交易性质

  -- 业务字段
  customer_id UUID,                                       -- 客户ID（可选）
  invoice_number TEXT,                                    -- 发票号
  tax_amount DECIMAL(12,2),                              -- 税额

  -- 对账字段
  reconciled BOOLEAN DEFAULT FALSE,                       -- 是否已对账
  reconciled_at TIMESTAMPTZ,                             -- 对账时间
  reconciled_by UUID REFERENCES auth.users(id),          -- 对账人

  -- 软删除
  deleted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE;

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_transactions_store_date ON transactions(store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled ON transactions(reconciled, store_id);
```

**关键增强**：
- `store_id`: 关联店铺（支持总部记账：store_id 可为 NULL）
- `reconciled`: 对账功能（月末对账）
- `tax_amount`: 税额单独记录（便于税务报表）

### 3. 配置数据层

#### 3.1 财务设置表 (financial_settings) - 需要支持店铺级别

```sql
-- 方案：支持公司级和店铺级设置
ALTER TABLE financial_settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- 约束：每个公司或每个店铺只有一条设置记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_settings_company
  ON financial_settings(company_id) WHERE store_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_settings_store
  ON financial_settings(store_id) WHERE store_id IS NOT NULL;
```

**逻辑**：
- `store_id IS NULL` → 公司级设置（作为默认值）
- `store_id NOT NULL` → 店铺级设置（覆盖公司级）

#### 3.2 分类配置策略

**方案选择**：

**选项 A：共享分类（推荐）**
```sql
-- transaction_categories 保持不变
-- 所有店铺共享分类配置
-- 优点：配置统一，便于管理
-- 缺点：无法个性化
```

**选项 B：店铺独立分类**
```sql
ALTER TABLE transaction_categories
  ADD COLUMN store_id UUID REFERENCES stores(id);

-- 允许公司级（store_id IS NULL）和店铺级（store_id NOT NULL）
CREATE INDEX idx_categories_company_store
  ON transaction_categories(company_id, store_id);
```

**推荐**：使用选项 A（共享分类），理由：
1. 便于跨店对比
2. 简化管理
3. 如需个性化，可通过 `settings` JSONB 字段扩展

### 4. 汇总数据层（新增）

#### 4.1 店铺日汇总表 (store_daily_summary)

```sql
CREATE TABLE store_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- 收入汇总
  total_income DECIMAL(12,2) DEFAULT 0,
  operating_income DECIMAL(12,2) DEFAULT 0,        -- 经营活动收入
  investing_income DECIMAL(12,2) DEFAULT 0,        -- 投资活动收入
  financing_income DECIMAL(12,2) DEFAULT 0,        -- 筹资活动收入

  -- 支出汇总
  total_expense DECIMAL(12,2) DEFAULT 0,
  operating_expense DECIMAL(12,2) DEFAULT 0,
  investing_expense DECIMAL(12,2) DEFAULT 0,
  financing_expense DECIMAL(12,2) DEFAULT 0,

  -- 净额
  net_cash_flow DECIMAL(12,2) DEFAULT 0,           -- 现金净流量
  net_profit DECIMAL(12,2) DEFAULT 0,              -- 净利润（不含非经营）

  -- 累计余额
  cash_balance DECIMAL(12,2) DEFAULT 0,            -- 现金余额

  -- 交易统计
  transaction_count INTEGER DEFAULT 0,
  income_count INTEGER DEFAULT 0,
  expense_count INTEGER DEFAULT 0,

  -- 审计
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一约束
  UNIQUE(store_id, date)
);

-- 索引
CREATE INDEX idx_daily_summary_store_date ON store_daily_summary(store_id, date DESC);
CREATE INDEX idx_daily_summary_company_date ON store_daily_summary(company_id, date DESC);
```

**用途**：
- 加速日报查询
- 支持趋势分析
- 减少实时计算压力

#### 4.2 店铺月汇总表 (store_monthly_summary)

```sql
CREATE TABLE store_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- 收入汇总
  total_income DECIMAL(12,2) DEFAULT 0,
  operating_income DECIMAL(12,2) DEFAULT 0,
  investing_income DECIMAL(12,2) DEFAULT 0,
  financing_income DECIMAL(12,2) DEFAULT 0,

  -- 支出汇总
  total_expense DECIMAL(12,2) DEFAULT 0,
  operating_expense DECIMAL(12,2) DEFAULT 0,
  investing_expense DECIMAL(12,2) DEFAULT 0,
  financing_expense DECIMAL(12,2) DEFAULT 0,

  -- 净额
  net_cash_flow DECIMAL(12,2) DEFAULT 0,
  net_profit DECIMAL(12,2) DEFAULT 0,

  -- 期初期末余额
  beginning_balance DECIMAL(12,2) DEFAULT 0,
  ending_balance DECIMAL(12,2) DEFAULT 0,

  -- 分类明细 (JSONB存储，灵活扩展)
  category_breakdown JSONB DEFAULT '{}'::jsonb,

  -- 统计
  transaction_count INTEGER DEFAULT 0,
  operating_days INTEGER DEFAULT 0,                -- 营业天数

  -- 审计
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(store_id, year, month)
);

CREATE INDEX idx_monthly_summary_store_year ON store_monthly_summary(store_id, year DESC, month DESC);
CREATE INDEX idx_monthly_summary_company_year ON store_monthly_summary(company_id, year DESC, month DESC);
```

#### 4.3 公司汇总视图 (company_summary_view)

```sql
-- 实时汇总视图（适合小规模）
CREATE OR REPLACE VIEW company_daily_summary AS
SELECT
  company_id,
  date,
  SUM(total_income) as total_income,
  SUM(total_expense) as total_expense,
  SUM(net_cash_flow) as net_cash_flow,
  SUM(net_profit) as net_profit,
  SUM(transaction_count) as transaction_count,
  COUNT(DISTINCT store_id) as active_stores,
  AVG(net_profit) as avg_store_profit,
  created_at,
  updated_at
FROM store_daily_summary
GROUP BY company_id, date, created_at, updated_at;

-- 月度汇总视图
CREATE OR REPLACE VIEW company_monthly_summary AS
SELECT
  company_id,
  year,
  month,
  SUM(total_income) as total_income,
  SUM(total_expense) as total_expense,
  SUM(net_cash_flow) as net_cash_flow,
  SUM(net_profit) as net_profit,
  SUM(transaction_count) as transaction_count,
  COUNT(DISTINCT store_id) as active_stores,
  AVG(net_profit) as avg_store_profit,
  MAX(ending_balance) as total_ending_balance,
  created_at,
  updated_at
FROM store_monthly_summary
GROUP BY company_id, year, month, created_at, updated_at;
```

### 5. 权限管理表（新增）

#### 5.1 店铺权限表 (store_permissions)

```sql
CREATE TABLE store_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- 权限级别
  role TEXT NOT NULL CHECK (role IN ('manager', 'accountant', 'cashier', 'viewer')),

  -- 权限范围
  can_view_transactions BOOLEAN DEFAULT TRUE,
  can_create_transactions BOOLEAN DEFAULT TRUE,
  can_edit_transactions BOOLEAN DEFAULT FALSE,
  can_delete_transactions BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT TRUE,
  can_manage_settings BOOLEAN DEFAULT FALSE,

  -- 审计
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_store_permissions_user ON store_permissions(user_id);
CREATE INDEX idx_store_permissions_store ON store_permissions(store_id);
```

**权限角色**：
- `manager`: 店长 - 全部权限（本店）
- `accountant`: 会计 - 可查看、编辑、生成报表
- `cashier`: 收银员 - 只能录入交易
- `viewer`: 查看者 - 只读权限

---

## 功能模块说明

### 1. 店铺管理模块

#### 1.1 店铺列表
**路径**: `/stores`

**功能**:
- ✅ 显示所有店铺卡片
- ✅ 状态筛选（营业中、停业、筹备中）
- ✅ 区域筛选（按省份/城市）
- ✅ 搜索（店铺名称、编码）
- ✅ 快速数据预览（今日/本月收入支出）

**界面元素**:
```
┌─────────────────────────────────────────┐
│  店铺管理                    [+ 新增店铺] │
├─────────────────────────────────────────┤
│  筛选: [全部] [营业中] [停业]            │
│  区域: [全部区域] ▼    搜索: [       ] 🔍│
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐            │
│  │ BJ001    │  │ BJ002    │            │
│  │ 朝阳店   │  │ 海淀店   │            │
│  │ 营业中 🟢 │  │ 营业中 🟢 │            │
│  │ 今日: ¥5K│  │ 今日: ¥4K│            │
│  │ 本月: ¥80K│  │ 本月: ¥75K│           │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

#### 1.2 店铺详情
**路径**: `/stores/[id]`

**Tab页**:
1. **概览** - 基本信息、今日数据、本月趋势
2. **交易记录** - 本店所有交易
3. **财务报表** - 现金流量表、利润表
4. **设置** - 店铺配置、财务设置
5. **权限管理** - 人员权限配置

### 2. 多店汇总模块

#### 2.1 综合看板
**路径**: `/dashboard/multi-store`

**功能**:
- ✅ 全公司汇总数据
- ✅ 各店铺对比图表（柱状图、饼图）
- ✅ 趋势分析（折线图）
- ✅ 排行榜（收入、利润、增长率）
- ✅ 异常提醒（亏损店铺、零交易）

**数据卡片**:
```
┌─────────────────────────────────────────┐
│  多店铺综合看板         [筛选时间: 本月] │
├─────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │总收入    │ │总支出    │ │净利润    ││
│  │¥500,000  │ │¥350,000  │ │¥150,000  ││
│  │ +15% ↑   │ │ +12% ↑   │ │ +20% ↑   ││
│  └──────────┘ └──────────┘ └──────────┘│
├─────────────────────────────────────────┤
│  店铺收入对比 (本月)                     │
│  ┌────────────────────────────────────┐ │
│  │ BJ001 ████████████████  ¥120K      │ │
│  │ BJ002 ████████████      ¥100K      │ │
│  │ SH001 ███████████████   ¥110K      │ │
│  │ SH002 ██████████        ¥90K       │ │
│  └────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  店铺利润排行榜                          │
│  1. BJ001 朝阳店    ¥45,000  利润率: 37.5%│
│  2. SH001 浦东店    ¥40,000  利润率: 36.4%│
│  3. BJ002 海淀店    ¥35,000  利润率: 35.0%│
│  4. SH002 静安店    ¥30,000  利润率: 33.3%│
└─────────────────────────────────────────┘
```

#### 2.2 区域对比报表
**路径**: `/reports/regional-comparison`

**功能**:
- ✅ 按省份/城市汇总
- ✅ 同比环比分析
- ✅ 导出 Excel
- ✅ 自定义时间范围

**报表格式**:
```
区域对比报表 - 2025年1月
┌────────┬──────┬────────┬────────┬────────┬────────┐
│ 区域   │店铺数│总收入  │总支出  │净利润  │利润率  │
├────────┼──────┼────────┼────────┼────────┼────────┤
│ 北京   │ 5    │¥320K   │¥220K   │¥100K   │31.25%  │
│ 上海   │ 3    │¥180K   │¥130K   │¥50K    │27.78%  │
│ 广州   │ 2    │¥100K   │¥75K    │¥25K    │25.00%  │
├────────┼──────┼────────┼────────┼────────┼────────┤
│ 合计   │ 10   │¥600K   │¥425K   │¥175K   │29.17%  │
└────────┴──────┴────────┴────────┴────────┴────────┘
```

#### 2.3 店铺对比分析
**路径**: `/reports/store-comparison`

**功能**:
- ✅ 选择多个店铺对比
- ✅ 多维度指标（收入、支出、利润、利润率、增长率）
- ✅ 时间序列对比
- ✅ 雷达图、折线图可视化

### 3. 交易管理模块（增强）

#### 3.1 交易录入
**新增功能**:
- ✅ 店铺选择（必填）
- ✅ 跨店转账（特殊类型）
- ✅ 批量导入（Excel/CSV）

#### 3.2 交易查询
**新增筛选**:
- ✅ 按店铺筛选
- ✅ 跨店汇总视图
- ✅ 导出（按店铺分组）

### 4. 财务报表模块（增强）

#### 4.1 现金流量表
**新增模式**:
- 单店模式：`/cash-flow?store_id=xxx`
- 多店汇总：`/cash-flow?mode=all-stores`
- 多店对比：`/cash-flow?mode=comparison&stores=xxx,yyy`

#### 4.2 利润表
**新增模式**:
- 单店模式：`/profit-loss?store_id=xxx`
- 多店汇总：`/profit-loss?mode=all-stores`
- 区域汇总：`/profit-loss?mode=regional`

### 5. 权限管理模块（新增）

#### 5.1 人员管理
**路径**: `/settings/users`

**功能**:
- ✅ 查看所有用户
- ✅ 分配店铺权限
- ✅ 设置角色级别
- ✅ 批量授权

**界面**:
```
┌─────────────────────────────────────────┐
│  人员与权限管理             [+ 邀请成员] │
├─────────────────────────────────────────┤
│  张三                          店长      │
│  权限店铺: BJ001 朝阳店                  │
│  权限: 全部 ✓                  [编辑]    │
├─────────────────────────────────────────┤
│  李四                          会计      │
│  权限店铺: 全部店铺                      │
│  权限: 查看、编辑、报表        [编辑]    │
└─────────────────────────────────────────┘
```

---

## 技术实现方案

### 1. 数据查询策略

#### 1.1 单店查询（简单）

```typescript
// lib/api/store-transactions.ts
export async function getStoreTransactions(storeId: string, dateRange: DateRange) {
  const { data } = await supabase
    .from('transactions')
    .select('*')
    .eq('store_id', storeId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)
    .order('date', { ascending: false })

  return data
}
```

#### 1.2 多店汇总（中等复杂度）

```typescript
// lib/api/company-summary.ts
export async function getCompanySummary(companyId: string, dateRange: DateRange) {
  // 方案1: 实时聚合（适合小规模）
  const { data } = await supabase
    .from('transactions')
    .select('store_id, type, amount, cash_flow_activity')
    .eq('company_id', companyId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)

  // 客户端聚合
  const summary = aggregateByStore(data)
  return summary
}
```

#### 1.3 预计算汇总（高性能）

```typescript
// lib/services/summary-calculator.ts
export async function calculateDailySummary(storeId: string, date: string) {
  // 1. 查询当天所有交易
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('store_id', storeId)
    .eq('date', date)

  // 2. 计算汇总数据
  const summary = {
    store_id: storeId,
    date: date,
    total_income: sumByType(transactions, 'income'),
    total_expense: sumByType(transactions, 'expense'),
    operating_income: sumByActivity(transactions, 'income', 'operating'),
    // ... 其他字段
  }

  // 3. Upsert 到汇总表
  await supabase
    .from('store_daily_summary')
    .upsert(summary, { onConflict: 'store_id,date' })

  return summary
}
```

### 2. 汇总触发机制

#### 2.1 实时触发（推荐）

```sql
-- 创建触发器：交易创建/更新/删除时自动更新汇总
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- 调用存储过程更新汇总
  PERFORM refresh_daily_summary(
    COALESCE(NEW.store_id, OLD.store_id),
    COALESCE(NEW.date, OLD.date)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_daily_summary();
```

#### 2.2 定时任务（辅助）

```typescript
// 每天凌晨1点重新计算前一天的汇总（纠错机制）
import { CronJob } from 'cron'

const job = new CronJob('0 1 * * *', async () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  // 获取所有活跃店铺
  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('is_active', true)

  // 并发计算所有店铺的汇总
  await Promise.all(
    stores.map(store =>
      calculateDailySummary(store.id, yesterday.toISOString().split('T')[0])
    )
  )
})

job.start()
```

### 3. API 路由设计

```
/api/stores
  GET     /                      # 获取店铺列表
  POST    /                      # 创建店铺
  GET     /:id                   # 获取店铺详情
  PUT     /:id                   # 更新店铺
  DELETE  /:id                   # 删除店铺（软删除）

/api/stores/:id/transactions
  GET     /                      # 获取店铺交易
  POST    /                      # 创建交易（自动关联店铺）

/api/stores/:id/summary
  GET     /daily                 # 获取日汇总
  GET     /monthly               # 获取月汇总
  GET     /reports/cash-flow     # 现金流量表
  GET     /reports/profit-loss   # 利润表

/api/company/summary
  GET     /all-stores            # 全公司汇总
  GET     /comparison            # 店铺对比
  GET     /regional              # 区域汇总

/api/permissions
  GET     /users                 # 获取用户权限
  POST    /grant                 # 授予权限
  DELETE  /revoke                # 撤销权限
```

---

## 权限控制方案

### 1. RLS 策略（数据库层）

```sql
-- 店铺查看权限
CREATE POLICY "Users can view permitted stores"
ON stores FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  -- 超级管理员看全部
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'owner'
  )
  -- 店长只看自己的店
  OR manager_id = auth.uid()
  -- 有权限的员工看授权的店
  OR id IN (
    SELECT store_id FROM store_permissions WHERE user_id = auth.uid()
  )
);

-- 交易记录权限
CREATE POLICY "Users can view store transactions"
ON transactions FOR SELECT
USING (
  -- 公司内可见
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
  -- 且有店铺权限
  AND (
    store_id IS NULL  -- 总部记账
    OR store_id IN (
      SELECT store_id FROM store_permissions
      WHERE user_id = auth.uid() AND can_view_transactions = TRUE
    )
  )
);
```

### 2. 应用层权限检查

```typescript
// lib/permissions/check-store-access.ts
export async function checkStoreAccess(
  userId: string,
  storeId: string,
  action: 'view' | 'edit' | 'delete' | 'manage'
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', userId)
    .single()

  // 超级管理员全部权限
  if (profile.role === 'owner') return true

  // 检查店铺权限表
  const { data: permission } = await supabase
    .from('store_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single()

  if (!permission) return false

  // 根据操作类型检查权限
  switch (action) {
    case 'view':
      return permission.can_view_transactions
    case 'edit':
      return permission.can_edit_transactions
    case 'delete':
      return permission.can_delete_transactions
    case 'manage':
      return permission.can_manage_settings
    default:
      return false
  }
}
```

---

## 报表汇总逻辑

### 1. 现金流量表汇总

#### 单店模式
```typescript
// 直接计算
const cashFlow = await calculateCashFlow(storeId, dateRange)
```

#### 多店汇总模式
```typescript
// lib/services/multi-store-cash-flow.ts
export async function calculateMultiStoreCashFlow(
  companyId: string,
  dateRange: DateRange,
  storeIds?: string[]  // 可选：指定店铺，为空则全部
) {
  // 1. 获取所有店铺的汇总数据
  const summaries = await Promise.all(
    (storeIds || allActiveStores).map(storeId =>
      getStoreDailySummary(storeId, dateRange)
    )
  )

  // 2. 聚合所有店铺数据
  const aggregated = {
    operating: {
      inflow: sum(summaries, 'operating_income'),
      outflow: sum(summaries, 'operating_expense'),
      netCashFlow: sum(summaries, 'operating_income') - sum(summaries, 'operating_expense')
    },
    investing: { /* 同上 */ },
    financing: { /* 同上 */ },
    summary: {
      totalInflow: sum(summaries, 'total_income'),
      totalOutflow: sum(summaries, 'total_expense'),
      netIncrease: sum(summaries, 'net_cash_flow'),
      beginningBalance: sumFirst(summaries, 'cash_balance'),  // 期初
      endingBalance: sumLast(summaries, 'cash_balance')        // 期末
    }
  }

  return aggregated
}
```

### 2. 店铺对比逻辑

```typescript
// lib/services/store-comparison.ts
export async function compareStores(
  storeIds: string[],
  dateRange: DateRange,
  metrics: string[]  // ['income', 'expense', 'profit', 'profit_margin']
) {
  const comparisons = await Promise.all(
    storeIds.map(async storeId => {
      const summary = await getStoreMonthlySummary(storeId, dateRange)
      const store = await getStore(storeId)

      return {
        store_id: storeId,
        store_name: store.name,
        store_code: store.code,
        metrics: {
          total_income: summary.total_income,
          total_expense: summary.total_expense,
          net_profit: summary.net_profit,
          profit_margin: (summary.net_profit / summary.total_income) * 100,
          transaction_count: summary.transaction_count,
          avg_transaction: summary.total_income / summary.transaction_count
        }
      }
    })
  )

  // 排序
  comparisons.sort((a, b) => b.metrics.net_profit - a.metrics.net_profit)

  return comparisons
}
```

---

## 实施建议

### 阶段1：基础功能（MVP）
**优先级：P0**
- ✅ 完善 `stores` 表结构
- ✅ 店铺管理 CRUD
- ✅ 交易记录关联店铺
- ✅ 单店财务报表
- ✅ 基础权限控制

**时间估算**：1-2周

### 阶段2：汇总功能
**优先级：P1**
- ✅ 创建汇总表
- ✅ 汇总计算逻辑
- ✅ 多店看板
- ✅ 店铺对比报表

**时间估算**：2-3周

### 阶段3：高级功能
**优先级：P2**
- ✅ 细粒度权限管理
- ✅ 区域汇总分析
- ✅ 趋势预测
- ✅ 异常检测告警

**时间估算**：2-3周

---

## 技术栈建议

### 前端
- **报表可视化**: Recharts / ECharts
- **数据表格**: TanStack Table
- **Excel导出**: SheetJS (xlsx)
- **权限管理**: RBAC + Context

### 后端
- **汇总计算**: PostgreSQL 存储过程 + TypeScript
- **定时任务**: Node-cron / Vercel Cron
- **缓存**: Redis (可选，用于高频查询)

### 数据库
- **汇总策略**: 实时触发 + 定时纠错
- **索引优化**: 复合索引 (company_id, store_id, date)
- **分区**: 按时间分区（大规模时）

---

## 性能优化建议

### 1. 查询优化
- ✅ 使用汇总表（避免实时聚合）
- ✅ 合理建立索引
- ✅ 限制查询时间范围（默认最近3个月）

### 2. 缓存策略
```typescript
// 缓存汇总数据（Redis）
const cacheKey = `summary:${storeId}:${date}`
let data = await redis.get(cacheKey)

if (!data) {
  data = await calculateDailySummary(storeId, date)
  await redis.set(cacheKey, JSON.stringify(data), 'EX', 3600)  // 1小时过期
}
```

### 3. 分页加载
- 店铺列表分页
- 交易记录虚拟滚动
- 报表按需加载

---

## 总结

### 核心架构
```
公司 (Company)
  ├── 店铺 (Stores) [1对多]
  │   ├── 交易 (Transactions)
  │   ├── 日汇总 (Daily Summary)
  │   └── 月汇总 (Monthly Summary)
  ├── 汇总视图 (Company Summary)
  └── 权限管理 (Permissions)
```

### 关键特性
1. ✅ **数据隔离**: Company + Store 两层隔离
2. ✅ **灵活汇总**: 支持单店、多店、区域多种维度
3. ✅ **性能优化**: 预计算汇总表 + 实时触发
4. ✅ **权限精细**: 店铺级 + 功能级双重控制
5. ✅ **可扩展性**: JSONB 字段支持灵活配置

### 数据流
```
交易录入 → 写入 transactions
         ↓
      触发器
         ↓
   更新 daily_summary
         ↓
   定时任务
         ↓
   生成 monthly_summary
         ↓
   查询 company_summary_view
         ↓
      展示报表
```

---

## 参考资料

- [Multi-Tenant Database Design Patterns 2024](https://daily.dev/blog/multi-tenant-database-design-patterns-2024)
- [How to Design a Database for Financial Applications](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-financial-applications/)
- [Financial Database Design Best Practices](https://stackoverflow.com/questions/2137754/design-principles-for-designing-database-architecture-of-financial-transaction-s)
