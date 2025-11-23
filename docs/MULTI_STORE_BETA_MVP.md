# 多店功能 BETA 版 MVP 方案

## 🎯 BETA 版核心目标

**用最小的改动，实现最核心的多店价值**

### 行业 BETA 版最佳实践

基于 SaaS 行业经验：
- ✅ **80/20 原则** - 20%的功能解决80%的需求
- ✅ **快速验证** - 2周内上线，快速收集用户反馈
- ✅ **零破坏** - 现有功能100%保留
- ✅ **核心价值优先** - 先解决"看到所有店铺"的需求

---

## 📊 BETA 版功能范围

### ✅ 包含（核心必须）

#### 1. 店铺基础管理 ⭐⭐⭐⭐⭐
**价值**: 让用户能管理多个店铺

**功能**:
- 店铺列表页面
- 新增/编辑/删除店铺
- 店铺状态管理（营业中/停业）

**工作量**: 2-3天

#### 2. 店铺选择器 ⭐⭐⭐⭐⭐
**价值**: 让用户能切换查看不同店铺的数据

**功能**:
- 顶部店铺选择下拉框
- 选择后自动刷新当前页面数据

**工作量**: 1-2天

#### 3. 交易记录关联店铺 ⭐⭐⭐⭐⭐
**价值**: 让交易能归属到具体店铺

**功能**:
- 录入交易时选择店铺（必填）
- 交易列表显示店铺名称
- 按店铺筛选交易

**工作量**: 1-2天

#### 4. 简单汇总看板 ⭐⭐⭐⭐
**价值**: 老板能快速看到所有店铺整体情况

**功能**:
- 一个页面显示所有店铺的收入/支出汇总
- 店铺数据卡片（基础数据）

**工作量**: 2-3天

### ❌ 不包含（延后到正式版）

- ❌ 店铺对比分析（图表）
- ❌ 区域汇总
- ❌ 权限管理（店长只看自己店）
- ❌ 高级报表（现金流、利润表的多店汇总）
- ❌ 汇总表（预计算）
- ❌ 复杂筛选和导出

---

## 🏗️ 技术架构（最小改动）

### 数据库改动

#### 方案：只增强现有表，不新增表

```sql
-- 1. 确保 stores 表字段完整（可能已存在部分）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS
  code TEXT,                           -- 店铺编码
  status TEXT DEFAULT 'active';        -- 状态

-- 2. 确保 transactions 表有 store_id（已存在）
-- 不需要改动

-- 3. 为旧数据补充默认店铺（可选）
-- 如果有旧交易没有 store_id，可以先不管
```

**改动量**: 几乎为0，只是确保字段存在

### 前端架构（最简单方式）

#### 方案：URL 参数 + localStorage，不用 Context

```typescript
// lib/utils/store-selection.ts
export function getSelectedStoreId(): string | null {
  // 1. 优先从 URL 读取
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const storeId = params.get('store')
    if (storeId) {
      localStorage.setItem('selectedStoreId', storeId)
      return storeId
    }
  }

  // 2. 从 localStorage 读取
  return localStorage.getItem('selectedStoreId')
}

export function setSelectedStore(storeId: string) {
  localStorage.setItem('selectedStoreId', storeId)
  // 刷新页面
  window.location.href = `${window.location.pathname}?store=${storeId}`
}
```

**优势**:
- ✅ 无需全局状态管理
- ✅ URL 可分享
- ✅ 最简单实现

### 现有页面改动策略

#### 原则：只改数据获取，UI 不变

```typescript
// app/dashboard/page.tsx (现有文件)
export default async function DashboardPage({ searchParams }) {
  // 新增：读取店铺参数
  const storeId = searchParams.store || null

  // 修改：数据查询增加店铺过滤
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('company_id', companyId)
    // 新增这一行 ↓
    .eq(storeId ? 'store_id' : 'company_id', storeId || companyId)
    .gte('date', startDate)
    .lte('date', endDate)

  // UI 完全不变
  return <DashboardUI data={transactions} />
}
```

**改动量**: 每个页面只改 2-3 行

---

## 📱 界面设计（极简版）

### 1. 店铺选择器（顶部导航栏）

```
┌─────────────────────────────────────────┐
│ Logo  民宿财务管理         [选择店铺 ▼] │
│                            [用户菜单]    │
└─────────────────────────────────────────┘
                               ↑
                          简单下拉选择
```

**下拉菜单**:
```
┌──────────────────┐
│ 朝阳店 (BJ001)   │ ← 点击切换
│ 海淀店 (BJ002)   │
│ 浦东店 (SH001)   │
├──────────────────┤
│ 🏪 管理店铺      │ ← 跳转店铺管理
└──────────────────┘
```

**实现**:
```typescript
// components/simple-store-selector.tsx
'use client'

import { Select, SelectContent, SelectItem } from '@/components/ui/select'

export function SimpleStoreSelector({ stores, currentStoreId }) {
  return (
    <Select
      value={currentStoreId || ''}
      onValueChange={(value) => {
        if (value === 'manage') {
          window.location.href = '/stores'
        } else {
          window.location.href = `?store=${value}`
        }
      }}
    >
      <SelectTrigger className="w-[180px]">
        {stores.find(s => s.id === currentStoreId)?.name || '选择店铺'}
      </SelectTrigger>
      <SelectContent>
        {stores.map(store => (
          <SelectItem key={store.id} value={store.id}>
            {store.name} ({store.code})
          </SelectItem>
        ))}
        <div className="border-t my-1" />
        <SelectItem value="manage">🏪 管理店铺</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

### 2. 店铺管理页面（新增）

**路径**: `/stores`

**界面**:
```
┌─────────────────────────────────────┐
│ 店铺管理              [+ 新增店铺]  │
├─────────────────────────────────────┤
│ ┌────────────────────────────────┐  │
│ │ BJ001 - 朝阳店      [营业中]  │  │
│ │ 北京市朝阳区                   │  │
│ │ 本月收入: ¥50,000             │  │
│ │              [查看] [编辑]     │  │
│ └────────────────────────────────┘  │
│                                     │
│ ┌────────────────────────────────┐  │
│ │ BJ002 - 海淀店      [营业中]  │  │
│ │ 北京市海淀区                   │  │
│ │ 本月收入: ¥45,000             │  │
│ │              [查看] [编辑]     │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 3. 交易录入（轻微改动）

**现有页面**: `/voice-entry`, `/transactions/new`

**改动**:
```typescript
// 增加店铺选择字段
<FormField
  control={form.control}
  name="store_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>选择店铺 *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <SelectTrigger>
          <SelectValue placeholder="选择店铺" />
        </SelectTrigger>
        <SelectContent>
          {stores.map(store => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### 4. 多店汇总页面（新增）

**路径**: `/stores/overview`

**界面**:
```
┌─────────────────────────────────────┐
│ 多店铺总览                          │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │活跃店铺 │ │总收入   │ │总支出   ││
│ │ 3 家    │ │¥150,000 │ │¥100,000 ││
│ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────┤
│ 各店铺数据                          │
│ ┌────────────────────────────────┐  │
│ │ 朝阳店  收入: ¥60K  支出: ¥40K│  │
│ │ 海淀店  收入: ¥50K  支出: ¥35K│  │
│ │ 浦东店  收入: ¥40K  支出: ¥25K│  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

**实现**:
```typescript
// app/stores/overview/page.tsx
export default async function StoresOverviewPage() {
  const stores = await getActiveStores()

  // 简单查询，不用复杂汇总表
  const summaries = await Promise.all(
    stores.map(async store => {
      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('store_id', store.id)
        .gte('date', firstDayOfMonth)
        .lte('date', lastDayOfMonth)

      return {
        store,
        income: sum(data.filter(t => t.type === 'income')),
        expense: sum(data.filter(t => t.type === 'expense'))
      }
    })
  )

  return <OverviewUI summaries={summaries} />
}
```

---

## 🗂️ 文件清单（需要创建/修改）

### 新增文件（6个）

```
components/
  └─ simple-store-selector.tsx        # 店铺选择器

app/
  └─ stores/
      ├─ page.tsx                     # 店铺管理列表
      ├─ new/
      │   └─ page.tsx                 # 新增店铺
      ├─ [id]/
      │   └─ edit/
      │       └─ page.tsx             # 编辑店铺
      └─ overview/
          └─ page.tsx                 # 多店汇总

lib/
  └─ api/
      └─ stores.ts                    # 店铺 API

lib/
  └─ utils/
      └─ store-selection.ts           # 店铺选择工具
```

### 修改文件（最小改动）

```
app/
  └─ layout.tsx                       # 添加店铺选择器

app/
  ├─ dashboard/page.tsx               # 增加店铺过滤
  ├─ transactions/page.tsx            # 增加店铺过滤和列
  ├─ income/page.tsx                  # 增加店铺过滤
  └─ expense/page.tsx                 # 增加店铺过滤

components/
  ├─ voice-entry-interface.tsx        # 增加店铺选择
  └─ sidebar.tsx                      # 增加"店铺管理"菜单项
```

**改动量统计**:
- 新增文件: 6 个
- 修改文件: 7 个
- 每个文件改动: 平均 10-20 行

---

## ⚡ 实施步骤（2周完成）

### Week 1: 基础功能

**Day 1-2: 店铺管理**
- [ ] 创建 `lib/api/stores.ts`
- [ ] 实现 CRUD 功能
- [ ] 创建店铺管理页面 `/stores`
- [ ] 新增/编辑店铺表单

**Day 3-4: 店铺选择器**
- [ ] 创建 `SimpleStoreSelector` 组件
- [ ] 集成到 `app/layout.tsx`
- [ ] 实现店铺切换逻辑（URL + localStorage）
- [ ] 测试切换功能

**Day 5: 交易关联店铺**
- [ ] 修改交易录入表单（增加店铺选择）
- [ ] 修改 `createTransaction` API（验证店铺）
- [ ] 测试交易创建

### Week 2: 数据展示和优化

**Day 1-2: 现有页面适配**
- [ ] 修改 Dashboard 查询（店铺过滤）
- [ ] 修改 Transactions 页面（店铺列+筛选）
- [ ] 修改 Income/Expense 页面（店铺过滤）
- [ ] 测试各页面数据正确性

**Day 3-4: 多店汇总**
- [ ] 创建 `/stores/overview` 页面
- [ ] 实现简单汇总逻辑
- [ ] 添加店铺数据卡片
- [ ] 测试汇总准确性

**Day 5: 测试和优化**
- [ ] 整体功能测试
- [ ] 修复 bug
- [ ] 性能优化
- [ ] 准备上线

---

## 📋 详细实施 Checklist

### 数据库准备
- [ ] 检查 `stores` 表是否有 `code` 和 `status` 字段
- [ ] 检查 `transactions` 表是否有 `store_id` 字段
- [ ] 创建测试店铺数据（3-5个）

### 店铺管理功能
- [ ] `getStores()` - 获取店铺列表
- [ ] `getStore(id)` - 获取店铺详情
- [ ] `createStore(data)` - 创建店铺
- [ ] `updateStore(id, data)` - 更新店铺
- [ ] `deleteStore(id)` - 软删除店铺
- [ ] 店铺列表页面 UI
- [ ] 新增店铺表单
- [ ] 编辑店铺表单
- [ ] 店铺状态切换

### 店铺选择器
- [ ] SimpleStoreSelector 组件
- [ ] 集成到导航栏
- [ ] URL 参数处理
- [ ] localStorage 持久化
- [ ] 页面刷新逻辑

### 交易关联
- [ ] 交易表单增加店铺选择
- [ ] 验证店铺必填
- [ ] 交易列表增加店铺列（条件显示）
- [ ] 交易列表增加店铺筛选
- [ ] 语音录入支持店铺选择

### 现有页面适配
- [ ] Dashboard 店铺过滤
- [ ] Transactions 店铺过滤和显示
- [ ] Income 店铺过滤
- [ ] Expense 店铺过滤
- [ ] 报表页面提示（暂不支持多店汇总）

### 多店汇总
- [ ] 汇总页面基础布局
- [ ] 汇总数据查询逻辑
- [ ] 店铺数据卡片组件
- [ ] 总计数据卡片

### 测试
- [ ] 创建店铺测试
- [ ] 编辑店铺测试
- [ ] 切换店铺测试
- [ ] 录入交易（不同店铺）测试
- [ ] 查看交易（按店铺过滤）测试
- [ ] 汇总数据准确性测试
- [ ] 边界情况测试（无店铺、单店铺）

---

## 💾 数据迁移策略

### 处理现有数据

```typescript
// scripts/migrate-existing-transactions.ts
// 可选：为旧交易分配默认店铺

export async function migrateOldTransactions() {
  // 1. 获取或创建默认店铺
  const { data: defaultStore } = await supabase
    .from('stores')
    .select('id')
    .eq('code', 'DEFAULT')
    .single()

  let defaultStoreId = defaultStore?.id

  if (!defaultStoreId) {
    // 创建默认店铺
    const { data } = await supabase
      .from('stores')
      .insert({
        company_id: companyId,
        name: '默认店铺',
        code: 'DEFAULT',
        status: 'active'
      })
      .select()
      .single()

    defaultStoreId = data.id
  }

  // 2. 更新所有 store_id 为 NULL 的交易
  await supabase
    .from('transactions')
    .update({ store_id: defaultStoreId })
    .is('store_id', null)

  console.log('旧数据迁移完成')
}
```

**策略选择**:
- **选项 A**: 创建"默认店铺"，旧数据归入
- **选项 B**: 旧数据保持 `store_id = NULL`，显示为"未分配"
- **推荐**: 选项 B（更灵活，用户自己决定）

---

## 🎨 UI/UX 细节

### 1. 无店铺时的引导

```typescript
// app/dashboard/page.tsx
if (stores.length === 0) {
  return (
    <EmptyState
      icon={Building2}
      title="还没有店铺"
      description="开始创建您的第一家店铺"
      action={
        <Button onClick={() => router.push('/stores/new')}>
          创建店铺
        </Button>
      }
    />
  )
}
```

### 2. 单店铺自动选择

```typescript
// components/simple-store-selector.tsx
useEffect(() => {
  if (stores.length === 1 && !currentStoreId) {
    // 只有一家店，自动选择
    setSelectedStore(stores[0].id)
  }
}, [stores])
```

### 3. 交易列表条件显示店铺列

```typescript
// 只有多店铺用户才显示店铺列
const columns = [
  { header: '日期', accessor: 'date' },
  { header: '类型', accessor: 'type' },
  { header: '分类', accessor: 'category' },
  stores.length > 1 && { header: '店铺', accessor: 'store_name' },
  { header: '金额', accessor: 'amount' },
].filter(Boolean)
```

### 4. 友好提示

```typescript
// 当查看特定店铺时显示提示
{selectedStoreId && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertDescription>
      当前显示 <strong>{currentStore.name}</strong> 的数据。
      <Button variant="link" onClick={() => router.push('/stores/overview')}>
        查看所有店铺
      </Button>
    </AlertDescription>
  </Alert>
)}
```

---

## 📊 成功指标

### BETA 版验收标准

- [ ] 可以创建至少 3 家店铺
- [ ] 可以在店铺之间切换
- [ ] 录入交易时可以选择店铺
- [ ] 切换店铺后数据正确过滤
- [ ] 汇总页面显示所有店铺数据
- [ ] 性能：切换店铺 <2 秒
- [ ] 无 bug 阻碍核心流程

### 用户反馈收集点

1. **店铺管理**
   - 创建流程是否顺畅？
   - 还需要哪些字段？

2. **店铺切换**
   - 位置是否方便？
   - 切换是否符合预期？

3. **数据查看**
   - 单店数据是否准确？
   - 汇总数据是否有用？

4. **优先级反馈**
   - 最需要的下一个功能？
   - 店铺对比 vs 权限管理？

---

## 🚀 BETA 之后的路线图

### V1.0 正式版（根据反馈决定）

**可能的功能**:
1. 店铺对比图表
2. 区域汇总分析
3. 权限管理（店长权限）
4. 高级报表（多店现金流、利润表）
5. 批量操作
6. 数据导出

### 决策依据

- 用户最常用的功能
- 用户反馈最多的需求
- 付费意愿最强的功能

---

## 💡 关键决策说明

### 为什么不用 Context？
- ✅ URL + localStorage 更简单
- ✅ 可分享链接（带店铺参数）
- ✅ 刷新页面状态保持
- ✅ 实现快（1-2 天 vs 3-5 天）

### 为什么不做汇总表？
- ✅ BETA 阶段数据量小，实时查询够快
- ✅ 减少复杂度，降低 bug 风险
- ✅ 等有性能问题再优化（可能不需要）

### 为什么不做权限管理？
- ✅ BETA 阶段大多是老板自己用
- ✅ 权限系统复杂，开发周期长
- ✅ 先验证多店需求，再做精细权限

### 为什么不做复杂对比？
- ✅ 简单汇总已能解决 80% 需求
- ✅ 复杂图表开发成本高
- ✅ 等用户明确需要哪些对比维度

---

## 📝 总结

### BETA 版方案核心

```
极简功能 = 店铺管理 + 店铺切换 + 交易关联 + 简单汇总
极简实现 = URL参数 + 最小改动 + 无新表
极简目标 = 2周完成 + 验证需求 + 收集反馈
```

### 价值主张

对于用户：
- ✅ 可以管理多个店铺了
- ✅ 可以分别查看每个店铺数据
- ✅ 可以看到所有店铺整体情况

对于开发：
- ✅ 最小改动（7个文件）
- ✅ 最快上线（2周）
- ✅ 最低风险（无复杂逻辑）

### 下一步

**准备好开始实施了吗？**

建议从 **Day 1: 店铺管理** 开始：
1. 创建店铺 API
2. 创建店铺管理页面
3. 测试 CRUD 功能

🚀
