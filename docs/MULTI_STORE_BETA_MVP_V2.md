# 多店功能 BETA 版 MVP 方案 v2.0

## 🎯 调整后的核心目标

**各店数据汇总是基础核心功能，必须包含**

---

## ✅ BETA 版功能范围（重新定义）

### 核心必须功能（6个）

#### 1. 店铺基础管理 ⭐⭐⭐⭐⭐
**工作量**: 2天

- 店铺 CRUD
- 店铺状态管理
- 店铺列表页面

#### 2. 店铺选择器 ⭐⭐⭐⭐⭐
**工作量**: 1天

- 顶部下拉选择
- 增加「全部店铺」选项
- URL + localStorage 状态管理

#### 3. 交易关联店铺 ⭐⭐⭐⭐⭐
**工作量**: 1天

- 录入时选择店铺
- 列表显示店铺
- 按店铺筛选

#### 4. 收入/支出汇总 ⭐⭐⭐⭐⭐ **（新增必须）**
**工作量**: 2天

- **单店模式**: 显示单店收入/支出（现有功能）
- **汇总模式**: 显示所有店铺汇总收入/支出
- 支持按店铺分组展示

#### 5. 交易记录汇总 ⭐⭐⭐⭐⭐ **（新增必须）**
**工作量**: 1天

- **单店模式**: 显示单店交易（现有功能）
- **汇总模式**: 显示所有店铺交易
- 交易列表增加店铺列

#### 6. 财务报表汇总 ⭐⭐⭐⭐⭐ **（新增必须）**
**工作量**: 3天

- **现金流量表汇总**: 所有店铺的现金流汇总
- **利润表汇总**: 所有店铺的利润汇总
- 支持单店/汇总模式切换

**总工作量**: 10 天 → **2周完成**

---

## 🏗️ 技术实现方案

### 模式切换机制

```typescript
// lib/contexts/store-mode.ts
export type StoreMode = 'single' | 'all'

export function getStoreMode(): { mode: StoreMode; storeId: string | null } {
  const params = new URLSearchParams(window.location.search)
  const storeId = params.get('store')

  if (!storeId || storeId === 'all') {
    return { mode: 'all', storeId: null }
  }

  return { mode: 'single', storeId }
}
```

### 店铺选择器（增强版）

```typescript
// components/store-selector.tsx
export function StoreSelector({ stores, currentStoreId }) {
  return (
    <Select
      value={currentStoreId || 'all'}
      onValueChange={(value) => {
        if (value === 'manage') {
          router.push('/stores')
        } else {
          router.push(`${pathname}?store=${value}`)
        }
      }}
    >
      <SelectTrigger className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* 汇总选项 */}
        <SelectItem value="all">
          <div className="flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            全部店铺（汇总）
          </div>
        </SelectItem>

        <div className="border-t my-1" />

        {/* 单店选项 */}
        {stores.map(store => (
          <SelectItem key={store.id} value={store.id}>
            {store.name} ({store.code})
          </SelectItem>
        ))}

        <div className="border-t my-1" />

        {/* 管理选项 */}
        <SelectItem value="manage">
          <div className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            店铺管理
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}
```

---

## 📊 各功能详细实现

### 1. 收入/支出页面（增强）

**路径**: `/income`, `/expense`

#### 单店模式（现有逻辑，不变）

```typescript
// app/income/page.tsx
export default async function IncomePage({ searchParams }) {
  const { mode, storeId } = getStoreMode(searchParams)

  if (mode === 'single') {
    // 现有逻辑：显示单店收入
    const data = await getIncomeByStore(storeId, dateRange)
    return <IncomeDetailContent data={data} />
  }

  // ... 汇总模式见下方
}
```

#### 汇总模式（新增）

**界面设计**:

```
┌─────────────────────────────────────────────┐
│ 收入明细            当前: 全部店铺（汇总）  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 总收入汇总                              │ │
│ │ ¥150,000                                │ │
│ │ 涉及 3 家店铺 | 共 125 笔交易           │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 按店铺分组                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ 📍 朝阳店 (BJ001)              ¥60,000 │ │
│ │ ───────────────────────────────────────│ │
│ │ 房费收入    45笔    ¥45,000           │ │
│ │ 服务费收入  10笔    ¥10,000           │ │
│ │ 其他收入     5笔    ¥5,000            │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📍 海淀店 (BJ002)              ¥50,000 │ │
│ │ ───────────────────────────────────────│ │
│ │ 房费收入    40笔    ¥38,000           │ │
│ │ 服务费收入   8笔    ¥8,000            │ │
│ │ 其他收入     4笔    ¥4,000            │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📍 浦东店 (SH001)              ¥40,000 │ │
│ │ ───────────────────────────────────────│ │
│ │ 房费收入    35笔    ¥32,000           │ │
│ │ 服务费收入   5笔    ¥5,000            │ │
│ │ 其他收入     3笔    ¥3,000            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**实现代码**:

```typescript
// app/income/page.tsx (汇总模式)
export default async function IncomePage({ searchParams }) {
  const { mode, storeId } = getStoreMode(searchParams)
  const dateRange = getDateRangeFromParams(searchParams)

  if (mode === 'all') {
    // 汇总模式：获取所有店铺数据
    const stores = await getActiveStores()

    const summaryByStore = await Promise.all(
      stores.map(async (store) => {
        const { data } = await supabase
          .from('transactions')
          .select('category, amount')
          .eq('store_id', store.id)
          .eq('type', 'income')
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)

        // 按分类聚合
        const byCategory = data.reduce((acc, tx) => {
          if (!acc[tx.category]) {
            acc[tx.category] = { count: 0, amount: 0 }
          }
          acc[tx.category].count++
          acc[tx.category].amount += tx.amount
          return acc
        }, {})

        return {
          store,
          total: data.reduce((sum, tx) => sum + tx.amount, 0),
          count: data.length,
          byCategory
        }
      })
    )

    // 总计
    const grandTotal = summaryByStore.reduce((sum, s) => sum + s.total, 0)
    const grandCount = summaryByStore.reduce((sum, s) => sum + s.count, 0)

    return (
      <AllStoresIncomeView
        summaryByStore={summaryByStore}
        grandTotal={grandTotal}
        grandCount={grandCount}
        storeCount={stores.length}
      />
    )
  }

  // 单店模式（现有逻辑）
  return <SingleStoreIncomeView storeId={storeId} dateRange={dateRange} />
}
```

**组件实现**:

```typescript
// components/all-stores-income-view.tsx
export function AllStoresIncomeView({ summaryByStore, grandTotal, grandCount, storeCount }) {
  return (
    <div className="space-y-6">
      {/* 汇总卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>总收入汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">¥{grandTotal.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-2">
            涉及 {storeCount} 家店铺 | 共 {grandCount} 笔交易
          </p>
        </CardContent>
      </Card>

      {/* 按店铺分组 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">按店铺分组</h3>
        {summaryByStore.map(({ store, total, count, byCategory }) => (
          <Card key={store.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <CardTitle>{store.name} ({store.code})</CardTitle>
                </div>
                <div className="text-2xl font-bold">
                  ¥{total.toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(byCategory).map(([category, stats]) => (
                  <div key={category} className="flex justify-between text-sm">
                    <span>{category}</span>
                    <span>
                      {stats.count}笔 · ¥{stats.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 2. 交易记录页面（增强）

**路径**: `/transactions`

#### 汇总模式

**界面设计**:

```
┌─────────────────────────────────────────────┐
│ 交易记录            当前: 全部店铺（汇总）  │
├─────────────────────────────────────────────┤
│ 筛选: [类型] [店铺] [分类] [日期范围]       │
├─────────────────────────────────────────────┤
│ 日期    │店铺    │类型│分类  │金额    │操作│
├─────────┼────────┼────┼──────┼────────┼────┤
│ 01-15   │朝阳店  │收入│房费  │¥1,200  │... │
│ 01-15   │海淀店  │支出│水电  │¥300    │... │
│ 01-14   │浦东店  │收入│服务费│¥500    │... │
│ 01-14   │朝阳店  │支出│采购  │¥800    │... │
└─────────────────────────────────────────────┘
        统计: 共 125 笔 | 收入 ¥85,000 | 支出 ¥40,000
```

**实现**:

```typescript
// app/transactions/page.tsx
export default async function TransactionsPage({ searchParams }) {
  const { mode, storeId } = getStoreMode(searchParams)

  // 查询条件
  let query = supabase
    .from('transactions')
    .select('*, stores(name, code)')  // JOIN 店铺信息
    .eq('company_id', companyId)

  // 单店模式：过滤店铺
  if (mode === 'single') {
    query = query.eq('store_id', storeId)
  }

  // 应用其他筛选
  if (searchParams.type) {
    query = query.eq('type', searchParams.type)
  }
  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }

  const { data: transactions } = await query.order('date', { ascending: false })

  // 统计
  const stats = {
    total: transactions.length,
    totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    totalExpense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  }

  return (
    <TransactionsView
      transactions={transactions}
      stats={stats}
      mode={mode}
      showStoreColumn={mode === 'all'}  // 汇总模式显示店铺列
    />
  )
}
```

### 3. 现金流量表（汇总）

**路径**: `/cash-flow?store=all`

#### 汇总逻辑

```typescript
// lib/services/multi-store-cash-flow.ts
export async function calculateAllStoresCashFlow(
  companyId: string,
  dateRange: DateRange
) {
  // 1. 获取所有店铺
  const stores = await getActiveStores(companyId)

  // 2. 并行计算每个店铺的现金流
  const storeFlows = await Promise.all(
    stores.map(store =>
      calculateCashFlow(store.id, dateRange)
    )
  )

  // 3. 汇总计算
  const aggregated = {
    operating: {
      inflows: aggregateItems(storeFlows, 'operating.inflows'),
      outflows: aggregateItems(storeFlows, 'operating.outflows'),
      subtotalInflow: sum(storeFlows, 'operating.subtotalInflow'),
      subtotalOutflow: sum(storeFlows, 'operating.subtotalOutflow'),
      netCashFlow: sum(storeFlows, 'operating.netCashFlow')
    },
    investing: {
      // 同上
    },
    financing: {
      // 同上
    },
    summary: {
      totalInflow: sum(storeFlows, 'summary.totalInflow'),
      totalOutflow: sum(storeFlows, 'summary.totalOutflow'),
      netIncrease: sum(storeFlows, 'summary.netIncrease'),
      beginningBalance: sum(storeFlows, 'summary.beginningBalance'),
      endingBalance: sum(storeFlows, 'summary.endingBalance')
    }
  }

  return aggregated
}

// 辅助函数：聚合明细项
function aggregateItems(flows: CashFlow[], path: string) {
  const allItems = flows.flatMap(flow => getPath(flow, path))
  const grouped = groupBy(allItems, 'label')

  return Object.entries(grouped).map(([label, items]) => ({
    label,
    amount: items.reduce((sum, item) => sum + item.amount, 0),
    count: items.reduce((sum, item) => sum + item.count, 0)
  }))
}
```

**界面增强**:

```
┌─────────────────────────────────────────────┐
│ 现金流量表          当前: 全部店铺（汇总）  │
├─────────────────────────────────────────────┤
│ 💡 提示: 当前显示所有店铺的汇总数据        │
│    切换到单店模式可查看单个店铺详情        │
├─────────────────────────────────────────────┤
│ 一、经营活动产生的现金流量                  │
│   现金流入：                                │
│     房费收入          ¥95,000  (120笔)     │
│     服务费收入        ¥23,000   (23笔)     │
│     ...                                     │
│   小计               ¥150,000               │
│                                             │
│   现金流出：                                │
│     水电费            ¥8,000    (15笔)     │
│     ...                                     │
│   小计               ¥50,000                │
│                                             │
│   经营活动现金流量净额  ¥100,000            │
│                                             │
│ 二、投资活动 ...                            │
│ 三、筹资活动 ...                            │
│                                             │
│ 四、汇总                                    │
│   现金净增加额        ¥80,000               │
│   期初余额            ¥120,000              │
│   期末余额            ¥200,000              │
└─────────────────────────────────────────────┘
```

### 4. 利润表（汇总）

**路径**: `/profit-loss?store=all`

#### 汇总逻辑

```typescript
// lib/services/multi-store-profit-loss.ts
export async function calculateAllStoresProfitLoss(
  companyId: string,
  dateRange: DateRange
) {
  const stores = await getActiveStores(companyId)

  // 并行计算
  const storePLs = await Promise.all(
    stores.map(store =>
      calculateProfitLoss(store.id, dateRange)
    )
  )

  // 汇总
  return {
    // 营业收入
    operatingRevenue: {
      items: aggregateItems(storePLs, 'operatingRevenue.items'),
      total: sum(storePLs, 'operatingRevenue.total')
    },

    // 营业成本
    operatingCost: {
      items: aggregateItems(storePLs, 'operatingCost.items'),
      total: sum(storePLs, 'operatingCost.total')
    },

    // 营业利润
    operatingProfit: sum(storePLs, 'operatingProfit'),

    // 营业外收支
    nonOperatingIncome: sum(storePLs, 'nonOperatingIncome'),
    nonOperatingExpense: sum(storePLs, 'nonOperatingExpense'),

    // 利润总额
    totalProfit: sum(storePLs, 'totalProfit'),

    // 净利润
    netProfit: sum(storePLs, 'netProfit')
  }
}
```

**界面展示**:

```
┌─────────────────────────────────────────────┐
│ 利润表              当前: 全部店铺（汇总）  │
├─────────────────────────────────────────────┤
│ 一、营业收入                                │
│   房费收入            ¥95,000               │
│   服务费收入          ¥23,000               │
│   ...                                       │
│ 营业收入合计         ¥150,000               │
│                                             │
│ 二、营业成本                                │
│   水电费              ¥8,000                │
│   人工费              ¥20,000               │
│   ...                                       │
│ 营业成本合计          ¥50,000               │
│                                             │
│ 三、营业利润          ¥100,000              │
│                                             │
│ 四、营业外收支        ¥0                    │
│                                             │
│ 五、利润总额          ¥100,000              │
│                                             │
│ 六、净利润            ¥100,000              │
│    利润率             66.67%                │
└─────────────────────────────────────────────┘
```

---

## 📋 调整后的实施计划

### Week 1: 基础 + 汇总数据

**Day 1: 店铺管理**
- [ ] 店铺 CRUD API
- [ ] 店铺管理页面

**Day 2: 店铺选择器**
- [ ] 选择器组件（含"全部店铺"选项）
- [ ] 集成到导航栏
- [ ] 模式切换逻辑

**Day 3: 交易关联**
- [ ] 交易表单增加店铺选择
- [ ] 交易列表增加店铺列
- [ ] 交易汇总逻辑

**Day 4: 收入/支出汇总**
- [ ] 收入页面汇总模式
- [ ] 支出页面汇总模式
- [ ] 按店铺分组展示

**Day 5: 交易记录汇总**
- [ ] 交易列表汇总模式
- [ ] 店铺筛选功能
- [ ] 统计数据展示

### Week 2: 财务报表汇总

**Day 1-2: 现金流量表汇总**
- [ ] 多店铺现金流计算逻辑
- [ ] 明细项聚合
- [ ] 汇总界面展示
- [ ] 测试准确性

**Day 3-4: 利润表汇总**
- [ ] 多店铺利润表计算逻辑
- [ ] 收入成本聚合
- [ ] 汇总界面展示
- [ ] 测试准确性

**Day 5: 整体测试优化**
- [ ] 端到端测试
- [ ] 性能优化
- [ ] Bug 修复
- [ ] 准备上线

---

## ✅ 完整功能 Checklist

### 店铺管理
- [ ] CRUD API
- [ ] 管理页面
- [ ] 状态管理

### 店铺选择器
- [ ] 组件开发
- [ ] "全部店铺"选项
- [ ] 单店选项
- [ ] 模式切换

### 交易功能
- [ ] 录入选择店铺
- [ ] 列表店铺列
- [ ] 店铺筛选
- [ ] 汇总统计

### 收入汇总
- [ ] 单店模式（现有）
- [ ] 汇总模式
- [ ] 按店铺分组
- [ ] 按分类聚合

### 支出汇总
- [ ] 单店模式（现有）
- [ ] 汇总模式
- [ ] 按店铺分组
- [ ] 按分类聚合

### 现金流量表汇总
- [ ] 计算逻辑
- [ ] 经营活动汇总
- [ ] 投资活动汇总
- [ ] 筹资活动汇总
- [ ] 总计汇总
- [ ] 界面展示

### 利润表汇总
- [ ] 计算逻辑
- [ ] 营业收入汇总
- [ ] 营业成本汇总
- [ ] 营业利润计算
- [ ] 净利润计算
- [ ] 界面展示

---

## 🎯 验收标准

### 基础功能
- [ ] 可创建多个店铺
- [ ] 可切换单店/汇总模式
- [ ] 交易可关联店铺

### 汇总功能（核心）
- [ ] 收入汇总数据准确
- [ ] 支出汇总数据准确
- [ ] 交易汇总数据准确
- [ ] 现金流量表汇总准确
- [ ] 利润表汇总准确
- [ ] 汇总 = 各店铺之和（数据一致性）

### 性能要求
- [ ] 汇总查询 <3秒
- [ ] 报表生成 <5秒
- [ ] 切换模式 <2秒

---

## 💡 技术要点

### 数据聚合策略

```typescript
// 通用聚合函数
function aggregateByStore<T>(
  items: Array<T & { store_id: string }>,
  groupBy: string
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = item[groupBy]
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

// 使用示例
const byStore = aggregateByStore(transactions, 'store_id')
```

### 并行查询优化

```typescript
// 并行获取所有店铺数据
const results = await Promise.all(
  stores.map(store => getStoreData(store.id, dateRange))
)

// 而不是串行
for (const store of stores) {
  await getStoreData(store.id, dateRange)  // 慢
}
```

### 缓存策略（可选）

```typescript
// 缓存汇总数据 5 分钟
const cacheKey = `all-stores-summary:${dateRange.start}:${dateRange.end}`
const cached = await redis.get(cacheKey)

if (cached) return JSON.parse(cached)

const data = await calculateSummary()
await redis.set(cacheKey, JSON.stringify(data), 'EX', 300)

return data
```

---

## 📊 总结

### BETA 版核心价值（调整后）

**对用户**:
- ✅ 管理多个店铺
- ✅ 查看单店详情
- ✅ **查看汇总数据（核心）**
- ✅ **收入/支出/交易汇总**
- ✅ **现金流量表汇总**
- ✅ **利润表汇总**

**对开发**:
- ✅ 2周完成
- ✅ 最小改动
- ✅ 满足核心需求

### 工作量对比

| 功能 | v1.0方案 | v2.0方案（当前）|
|------|---------|---------------|
| 店铺管理 | 2天 | 2天 |
| 店铺选择器 | 1天 | 1天 |
| 交易关联 | 1天 | 1天 |
| 收入/支出汇总 | - | 2天 ⭐ |
| 交易汇总 | - | 1天 ⭐ |
| 财务报表汇总 | - | 3天 ⭐ |
| **总计** | **4天** | **10天** |

---

**准备开始实施吗？** 🚀

从 Day 1 开始：店铺管理基础功能开发。
