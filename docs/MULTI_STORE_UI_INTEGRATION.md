# 多店功能界面集成方案

## 🎯 核心原则

**零破坏性集成** - 现有单店功能完全保留，多店功能作为独立模块叠加

### 设计理念

```
现有单店功能 (保持不变)
     ↓
   增加
     ↓
店铺切换器 (全局)
     ↓
   启用
     ↓
多店管理界面 (新增)
```

---

## 📋 集成架构

### 1. 导航结构设计

#### 方案：顶部增加「店铺切换器」

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] 民宿财务管理系统                    [店铺选择器] │
│                                             [用户菜单]   │
├─────────────────────────────────────────────────────────┤
│ 📊 总览  💰 收支  📈 报表  ⚙️ 设置  🏪 多店管理        │
└─────────────────────────────────────────────────────────┘
```

**店铺选择器**（右上角）:
```
┌──────────────────────┐
│ 🏪 当前店铺: 朝阳店  │ ▼
├──────────────────────┤
│ ✅ 朝阳店 (BJ001)    │ ← 当前选中
│    海淀店 (BJ002)    │
│    浦东店 (SH001)    │
├──────────────────────┤
│ 📊 查看全部店铺      │ ← 跳转多店管理
│ ⚙️  店铺管理         │ ← 跳转店铺设置
└──────────────────────┘
```

### 2. 功能模式切换

#### 模式说明

| 模式 | 触发条件 | 页面行为 | 数据范围 |
|------|---------|---------|---------|
| **单店模式** | 选择了某个店铺 | 现有页面正常显示 | 仅该店铺数据 |
| **多店模式** | 选择「全部店铺」 | 显示汇总视图 | 所有店铺汇总 |
| **管理模式** | 点击「多店管理」 | 跳转专属页面 | 管理功能 |

#### 实现方式

```typescript
// lib/contexts/store-context.tsx
import { createContext, useContext, useState } from 'react'

type StoreMode = 'single' | 'multi'

interface StoreContextValue {
  // 当前选择
  selectedStoreId: string | null  // null = 全部店铺
  mode: StoreMode

  // 操作
  selectStore: (storeId: string | null) => void
  switchToMultiMode: () => void
  switchToSingleMode: (storeId: string) => void
}

export const StoreContext = createContext<StoreContextValue>(...)

export function StoreProvider({ children }) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  const mode = selectedStoreId === null ? 'multi' : 'single'

  return (
    <StoreContext.Provider value={{
      selectedStoreId,
      mode,
      selectStore: setSelectedStoreId,
      switchToMultiMode: () => setSelectedStoreId(null),
      switchToSingleMode: setSelectedStoreId
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
```

---

## 🗂️ 页面路由设计

### 新增路由（不影响现有）

```
现有路由 (保持不变):
  /dashboard              # 总览
  /income                 # 收入
  /expense                # 支出
  /transactions           # 交易记录
  /cash-flow              # 现金流量表
  /profit-loss            # 利润表
  /settings               # 设置

新增路由 (多店专属):
  /multi-store            # 多店管理主页
  /multi-store/overview   # 多店总览
  /multi-store/stores     # 店铺管理
  /multi-store/comparison # 店铺对比
  /multi-store/regional   # 区域分析
```

### 智能路由策略

```typescript
// app/dashboard/page.tsx (现有页面，增强)
export default async function DashboardPage() {
  const { selectedStoreId } = useStore()

  // 根据模式加载不同组件
  if (selectedStoreId === null) {
    // 多店模式：显示汇总数据
    return <MultiStoreDashboard />
  } else {
    // 单店模式：显示单店数据（现有逻辑）
    return <SingleStoreDashboard storeId={selectedStoreId} />
  }
}
```

---

## 🎨 界面集成详细方案

### 1. 顶部导航栏增强

**位置**: `components/navbar.tsx` 或 `app/layout.tsx`

**新增组件**: `components/store-selector.tsx`

```typescript
// components/store-selector.tsx
'use client'

import { useState } from 'react'
import { useStore } from '@/lib/contexts/store-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, LayoutDashboard, Settings } from 'lucide-react'

export function StoreSelector({ stores }: { stores: Store[] }) {
  const { selectedStoreId, selectStore, switchToMultiMode } = useStore()

  return (
    <Select
      value={selectedStoreId || 'all'}
      onValueChange={(value) => {
        if (value === 'all') {
          switchToMultiMode()
        } else if (value === 'manage') {
          window.location.href = '/multi-store/stores'
        } else {
          selectStore(value)
        }
      }}
    >
      <SelectTrigger className="w-[200px]">
        <Building2 className="mr-2 h-4 w-4" />
        <SelectValue placeholder="选择店铺" />
      </SelectTrigger>
      <SelectContent>
        {/* 当前选中店铺 */}
        {stores.map(store => (
          <SelectItem key={store.id} value={store.id}>
            {store.name} ({store.code})
          </SelectItem>
        ))}

        {/* 分隔线 */}
        <div className="my-1 border-t" />

        {/* 多店选项 */}
        <SelectItem value="all">
          <div className="flex items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            查看全部店铺
          </div>
        </SelectItem>

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

**集成到布局**:

```typescript
// app/layout.tsx (修改)
import { StoreProvider } from '@/lib/contexts/store-context'
import { StoreSelector } from '@/components/store-selector'

export default async function RootLayout({ children }) {
  const { data: stores } = await getActiveStores()

  return (
    <html>
      <body>
        <StoreProvider>
          {/* 导航栏 */}
          <nav>
            <div className="flex justify-between items-center">
              <Logo />

              {/* 店铺选择器 (新增) */}
              <StoreSelector stores={stores} />

              <UserMenu />
            </div>
          </nav>

          {/* 主内容 */}
          <main>{children}</main>
        </StoreProvider>
      </body>
    </html>
  )
}
```

### 2. 侧边导航增强

**位置**: `components/sidebar.tsx`

**新增导航项**:

```typescript
const navigationItems = [
  // 现有项目 (保持不变)
  { name: '总览', href: '/dashboard', icon: Home },
  { name: '收入明细', href: '/income', icon: TrendingUp },
  { name: '支出明细', href: '/expense', icon: TrendingDown },
  { name: '交易记录', href: '/transactions', icon: Receipt },
  { name: '现金流量表', href: '/cash-flow', icon: Activity },
  { name: '利润表', href: '/profit-loss', icon: BarChart },

  // 分隔线
  { type: 'separator' },

  // 新增多店管理 (仅多店铺用户可见)
  {
    name: '多店管理',
    href: '/multi-store',
    icon: Building2,
    badge: stores.length > 1 ? stores.length : null  // 显示店铺数量
  },

  { type: 'separator' },

  // 设置
  { name: '财务设置', href: '/settings', icon: Settings },
]
```

### 3. 现有页面适配（最小改动）

#### 方案A: 组件级适配（推荐）

```typescript
// app/dashboard/page.tsx (现有文件，轻微修改)
import { useStore } from '@/lib/contexts/store-context'
import { SingleStoreDashboard } from '@/components/single-store-dashboard'
import { MultiStoreDashboard } from '@/components/multi-store-dashboard'

export default function DashboardPage() {
  const { mode, selectedStoreId } = useStore()

  // 根据模式切换组件
  if (mode === 'multi') {
    return <MultiStoreDashboard />
  }

  // 单店模式：使用现有逻辑
  return <SingleStoreDashboard storeId={selectedStoreId} />
}
```

**将现有代码封装为组件**:

```typescript
// components/single-store-dashboard.tsx (新文件)
// 将 app/dashboard/page.tsx 的现有代码移到这里
export function SingleStoreDashboard({ storeId }: { storeId: string }) {
  // 原有的 dashboard 逻辑
  const { data } = await getStoreSummary(storeId)

  return (
    <div>
      {/* 原有的 dashboard UI */}
    </div>
  )
}
```

#### 方案B: 数据层适配（更优雅）

```typescript
// lib/api/dashboard.ts (修改)
export async function getDashboardData(storeId?: string | null) {
  if (!storeId || storeId === 'all') {
    // 多店模式：返回汇总数据
    return await getMultiStoreSummary()
  } else {
    // 单店模式：返回单店数据（现有逻辑）
    return await getSingleStoreSummary(storeId)
  }
}

// app/dashboard/page.tsx (现有文件，只改数据获取)
export default async function DashboardPage({ searchParams }) {
  const storeId = searchParams.store  // 从 URL 获取
  const data = await getDashboardData(storeId)

  // UI 保持不变，数据自动适配
  return <DashboardUI data={data} />
}
```

---

## 📊 各页面适配策略

### 总览页 (`/dashboard`)

**现有功能**: 显示单店总览数据

**适配方式**:
```typescript
if (mode === 'multi') {
  return (
    <div>
      {/* 多店汇总卡片 */}
      <SummaryCards data={multiStoreData} />

      {/* 店铺对比图 */}
      <StoreComparisonChart stores={allStores} />

      {/* 快速链接 */}
      <QuickLinks />
    </div>
  )
} else {
  return <ExistingDashboard storeId={selectedStoreId} />
}
```

### 收入/支出页 (`/income`, `/expense`)

**现有功能**: 显示收入/支出明细

**适配方式**:
```typescript
// 数据查询时增加店铺过滤
const { data } = await getTransactions({
  type: 'income',
  storeId: selectedStoreId,  // null = 全部，有值 = 单店
  ...otherFilters
})

// UI 增加店铺列显示（多店模式）
if (mode === 'multi') {
  columns.push({
    header: '所属店铺',
    cell: (row) => row.store_name
  })
}
```

### 交易记录页 (`/transactions`)

**现有功能**: 显示所有交易

**适配方式**:
```typescript
// 筛选器增加店铺选项
<Filters>
  <TypeFilter />
  <DateRangeFilter />

  {/* 新增：多店模式下显示店铺筛选 */}
  {mode === 'multi' && (
    <StoreFilter stores={stores} />
  )}
</Filters>

// 表格增加店铺列
<Table
  columns={[
    ...existingColumns,
    mode === 'multi' && { header: '店铺', accessor: 'store_name' }
  ].filter(Boolean)}
/>
```

### 现金流量表 (`/cash-flow`)

**现有功能**: 单店现金流量表

**适配方式**:
```typescript
// 顶部增加模式切换提示
{mode === 'multi' && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertDescription>
      当前显示所有店铺汇总数据。
      <Link href="?mode=comparison">切换到店铺对比模式</Link>
    </AlertDescription>
  </Alert>
)}

// 数据计算逻辑
const cashFlowData = mode === 'multi'
  ? await calculateMultiStoreCashFlow(companyId, dateRange)
  : await calculateSingleStoreCashFlow(selectedStoreId, dateRange)

// UI 保持不变，数据自动适配
```

### 利润表 (`/profit-loss`)

**适配方式**: 同现金流量表

---

## 🆕 新增多店管理页面

### 主页 (`/multi-store`)

```typescript
// app/multi-store/page.tsx
export default function MultiStoreHomePage() {
  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">多店铺管理</h1>
          <p className="text-muted-foreground">
            管理您的 {storeCount} 家店铺
          </p>
        </div>
        <Button onClick={() => router.push('/multi-store/stores/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新增店铺
        </Button>
      </div>

      {/* 快速导航卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <QuickActionCard
          title="店铺总览"
          description="查看所有店铺汇总数据"
          icon={LayoutDashboard}
          href="/multi-store/overview"
        />
        <QuickActionCard
          title="店铺管理"
          description="管理店铺信息和状态"
          icon={Building2}
          href="/multi-store/stores"
        />
        <QuickActionCard
          title="店铺对比"
          description="对比分析店铺表现"
          icon={BarChart}
          href="/multi-store/comparison"
        />
        <QuickActionCard
          title="区域分析"
          description="按区域查看经营数据"
          icon={Map}
          href="/multi-store/regional"
        />
      </div>

      {/* 概览数据 */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          title="总收入（本月）"
          value="¥500,000"
          trend={+15}
        />
        <SummaryCard
          title="总支出（本月）"
          value="¥350,000"
          trend={+12}
        />
        <SummaryCard
          title="净利润（本月）"
          value="¥150,000"
          trend={+20}
        />
      </div>

      {/* 店铺表现排行 */}
      <Card>
        <CardHeader>
          <CardTitle>店铺表现排行（本月）</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreRankingTable stores={rankedStores} />
        </CardContent>
      </Card>
    </div>
  )
}
```

### 店铺管理 (`/multi-store/stores`)

```typescript
// app/multi-store/stores/page.tsx
export default function StoresManagementPage() {
  return (
    <div>
      {/* 筛选和搜索 */}
      <div className="flex gap-4 mb-6">
        <StatusFilter />
        <RegionFilter />
        <SearchInput placeholder="搜索店铺..." />
      </div>

      {/* 店铺网格 */}
      <div className="grid grid-cols-3 gap-4">
        {stores.map(store => (
          <StoreCard
            key={store.id}
            store={store}
            onEdit={() => router.push(`/multi-store/stores/${store.id}/edit`)}
            onView={() => selectStore(store.id)}
          />
        ))}
      </div>
    </div>
  )
}

// components/store-card.tsx
function StoreCard({ store, onEdit, onView }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle>{store.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{store.code}</p>
          </div>
          <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
            {store.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>今日收入</span>
            <span className="font-semibold">¥{store.todayIncome}</span>
          </div>
          <div className="flex justify-between">
            <span>本月收入</span>
            <span className="font-semibold">¥{store.monthIncome}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onView}>
          查看详情
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          编辑
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### 店铺对比 (`/multi-store/comparison`)

```typescript
// app/multi-store/comparison/page.tsx
export default function StoreComparisonPage() {
  const [selectedStores, setSelectedStores] = useState<string[]>([])

  return (
    <div>
      {/* 店铺选择 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择要对比的店铺</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiSelect
            options={stores}
            value={selectedStores}
            onChange={setSelectedStores}
            max={5}  // 最多选5个
          />
        </CardContent>
      </Card>

      {/* 对比图表 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 收入对比 */}
        <Card>
          <CardHeader>
            <CardTitle>收入对比</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={comparisonData.income} />
          </CardContent>
        </Card>

        {/* 利润对比 */}
        <Card>
          <CardHeader>
            <CardTitle>利润对比</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={comparisonData.profit} />
          </CardContent>
        </Card>

        {/* 趋势对比 */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>收入趋势对比</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={comparisonData.trend} />
          </CardContent>
        </Card>

        {/* 雷达图 */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>综合指标对比</CardTitle>
          </CardHeader>
          <CardContent>
            <RadarChart
              data={comparisonData.radar}
              metrics={['收入', '利润', '增长率', '客单价', '交易量']}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 🔄 数据查询适配

### 统一查询接口

```typescript
// lib/api/unified-query.ts
export async function getFinancialData(
  type: 'transactions' | 'summary' | 'cash-flow' | 'profit-loss',
  options: {
    companyId: string
    storeId?: string | null  // null = 全部，有值 = 单店
    dateRange: DateRange
    filters?: any
  }
) {
  const { companyId, storeId, dateRange, filters } = options

  // 构建基础查询
  let query = supabase
    .from(getTableName(type))
    .select('*')
    .eq('company_id', companyId)
    .gte('date', dateRange.start)
    .lte('date', dateRange.end)

  // 单店模式：添加店铺过滤
  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  // 多店模式：可能需要 JOIN 店铺信息
  if (!storeId && type === 'transactions') {
    query = query.select('*, stores(name, code)')
  }

  const { data, error } = await query

  return { data, error }
}
```

---

## 🎨 UI 组件复用

### 通用组件库

```typescript
// components/multi-store/
├── store-selector.tsx          # 店铺选择器
├── store-card.tsx              # 店铺卡片
├── store-comparison-chart.tsx  # 对比图表
├── store-ranking-table.tsx     # 排行榜
├── regional-map.tsx            # 区域地图
├── summary-cards.tsx           # 汇总卡片
└── quick-action-card.tsx       # 快速操作卡片
```

### 复用现有组件

```typescript
// 现有组件可以直接复用
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { DateRangePicker } from '@/components/date-range-picker'

// 只需新增多店特有组件
import { StoreSelector } from '@/components/multi-store/store-selector'
import { StoreComparisonChart } from '@/components/multi-store/comparison-chart'
```

---

## 📱 响应式设计

### 移动端适配

```typescript
// 店铺选择器在移动端显示为底部抽屉
<div className="hidden md:block">
  <StoreSelector />  {/* 桌面端：下拉选择 */}
</div>

<div className="md:hidden">
  <Button onClick={() => setSheetOpen(true)}>
    <Building2 /> 切换店铺
  </Button>
  <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
    <StoreList />  {/* 移动端：底部抽屉 */}
  </Sheet>
</div>
```

---

## ✅ 实施检查清单

### 阶段1: 基础集成（本次实施）

- [ ] 创建 `StoreContext` 全局上下文
- [ ] 开发 `StoreSelector` 组件
- [ ] 集成到顶部导航栏
- [ ] 增加侧边栏「多店管理」菜单项
- [ ] 创建 `/multi-store` 主页
- [ ] 创建 `/multi-store/stores` 店铺管理页
- [ ] 测试店铺切换功能

### 阶段2: 现有页面适配

- [ ] 适配 `/dashboard` 总览页
- [ ] 适配 `/transactions` 交易记录页
- [ ] 适配 `/income` 收入页
- [ ] 适配 `/expense` 支出页
- [ ] 适配 `/cash-flow` 现金流量表
- [ ] 适配 `/profit-loss` 利润表

### 阶段3: 高级功能

- [ ] 店铺对比页面
- [ ] 区域分析页面
- [ ] 多店汇总报表
- [ ] 数据导出功能

---

## 💡 关键实施建议

### 1. 渐进式集成

```
第1周: 店铺切换器 + 店铺管理页
第2周: 总览页适配 + 交易记录适配
第3周: 报表页面适配
第4周: 对比和分析功能
```

### 2. 数据兼容

```typescript
// 确保现有数据不受影响
// 所有现有交易记录的 store_id 可以为 NULL
// 查询时自动处理

if (transaction.store_id === null) {
  // 旧数据，显示为"总部"或"未分配"
  transaction.store_name = '总部'
}
```

### 3. 用户体验

```typescript
// 保存用户的店铺选择偏好
localStorage.setItem('selectedStoreId', storeId)

// 下次访问自动恢复
const defaultStoreId = localStorage.getItem('selectedStoreId')
```

---

## 📊 预期效果

### 单店用户体验

- 看不到店铺选择器（只有1家店）
- 界面和现在完全一样
- 零学习成本

### 多店用户体验

- 右上角随时切换店铺
- 可查看单店或全部店铺
- 专属多店管理入口
- 强大的对比分析功能

---

## 🎯 总结

### 核心优势

✅ **零破坏** - 现有功能完全保留
✅ **轻集成** - 只需增加选择器和上下文
✅ **高复用** - 最大化利用现有组件
✅ **易扩展** - 模块化设计，便于迭代

### 实施路径

```
现有系统
    ↓
增加 StoreContext
    ↓
增加 StoreSelector
    ↓
适配现有页面（数据层）
    ↓
新增多店管理页面
    ↓
完成 ✅
```

---

**准备好开始实施了吗？** 🚀
