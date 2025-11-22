# 现金流活动功能实施指南

## 📋 概述

本指南记录了为交易记录添加现金流活动分类（经营/投资/筹资）功能的完整实施过程。

---

## ✅ 已完成的工作

### 1. 数据库层（Backend）

#### ✅ 迁移文件
- 文件：`/supabase/migrations/005_add_cash_flow_activity.sql`
- 内容：
  - 添加 `cash_flow_activity` 字段到 `transactions` 表
  - 创建自动映射函数 `get_cash_flow_activity()`
  - 创建触发器自动填充新记录
  - 为已有记录填充数据
  - 添加索引优化查询

#### ✅ 应用层迁移脚本
- 文件：`/scripts/migrate-activity-data.ts`
- 用途：如果SQL触发器不工作，可以用此脚本手动迁移数据

### 2. API层

#### ✅ 自动填充功能
- 文件：`/lib/api/transactions.ts`
- 修改：
  ```typescript
  // 导入映射配置
  import { getCategoryMapping } from '@/lib/cash-flow-config'

  // 在 createTransaction 中自动填充
  const mapping = getCategoryMapping(validated.type, validated.category)
  const cash_flow_activity = mapping?.activity || 'operating'
  ```

#### ✅ 支持更新
- 文件：`/app/api/transactions/[id]/route.ts`
- 修改：支持在PATCH请求中更新 `cash_flow_activity`

### 3. 前端组件（Partial）

#### ✅ 类型定义
- 文件：`/components/transactions-table-enhanced.tsx`
- 添加：`cash_flow_activity?: 'operating' | 'investing' | 'financing' | null`

#### ✅ Activity Badge 组件
- 文件：`/components/activity-badge.tsx`
- 功能：显示不同颜色的活动标签

#### ✅ 过滤逻辑
- 添加：`selectedActivity` 状态
- 添加：activity 过滤条件

#### ✅ 编辑功能
- 修改：`handleEdit` - 添加 activity 字段到表单
- 修改：`handleSubmitEdit` - 提交时包含 activity

---

## 🚧 需要完成的UI修改

由于 `transactions-table-enhanced.tsx` 文件过大（600+行），以下UI部分需要手动添加：

### 1. 添加 Activity 筛选器

在筛选器部分（约第320行）添加：

```tsx
{/* 现金流活动筛选 */}
<Select value={selectedActivity} onValueChange={setSelectedActivity}>
  <SelectTrigger className="w-32">
    <SelectValue placeholder="活动类型" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">全部活动</SelectItem>
    <SelectItem value="operating">经营活动</SelectItem>
    <SelectItem value="investing">投资活动</SelectItem>
    <SelectItem value="financing">筹资活动</SelectItem>
  </SelectContent>
</Select>
```

### 2. 表格添加 Activity 列

在 TableHeader 部分添加（约第468行）：

```tsx
<TableHead>现金流活动</TableHead>
```

在 TableRow 部分添加（约第500行）：

```tsx
import { ActivityBadge } from '@/components/activity-badge'

// 在表格行中
<TableCell>
  <ActivityBadge activity={transaction.cash_flow_activity} />
</TableCell>
```

### 3. 编辑对话框添加 Activity 选择器

在编辑Dialog中（约第550-600行之间）添加：

```tsx
<div className="space-y-2">
  <Label htmlFor="cash_flow_activity">现金流活动</Label>
  <Select
    value={editForm.cash_flow_activity}
    onValueChange={(value) => setEditForm({ ...editForm, cash_flow_activity: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder="选择活动类型" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="operating">经营活动</SelectItem>
      <SelectItem value="investing">投资活动</SelectItem>
      <SelectItem value="financing">筹资活动</SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    默认根据分类自动分配，可手动调整
  </p>
</div>
```

### 4. 在 voice-entry-interface.tsx 添加提示

在交易确认界面显示将要分配的活动类型：

```tsx
import { getCategoryMapping, activityNames } from '@/lib/cash-flow-config'

// 在显示交易信息时
const mapping = getCategoryMapping(transaction.type, transaction.category)
const activity = mapping?.activity || 'operating'

<div className="text-sm text-muted-foreground">
  将归类到：{activityNames[activity]}
</div>
```

### 5. 在现金流量表添加查看明细功能

文件：`/components/cash-flow-statement.tsx`

在每个活动卡片添加"查看明细"按钮：

```tsx
import Link from 'next/link'

// 在 ActivitySection 组件中
<Link href={`/${type}?activity=${activity}`}>
  <Button variant="ghost" size="sm">
    查看明细 →
  </Button>
</Link>
```

---

## 🔧 执行步骤

### 步骤1：执行数据库迁移（必须）

#### 方式A：Supabase Dashboard（推荐）

1. 登录 https://app.supabase.com
2. 选择您的项目
3. 进入 **SQL Editor**
4. 点击 **New Query**
5. 复制 `/supabase/migrations/005_add_cash_flow_activity.sql` 的全部内容
6. 粘贴并点击 **Run**
7. 查看执行结果，应该看到统计信息

#### 方式B：命令行（需要Supabase CLI）

```bash
# 如果安装了 Supabase CLI
supabase db push

# 或者使用 psql（如果有数据库直接访问权限）
psql YOUR_DATABASE_URL < supabase/migrations/005_add_cash_flow_activity.sql
```

#### 方式C：应用层迁移（备用）

如果SQL无法直接执行，使用应用层脚本：

```bash
npx tsx scripts/migrate-activity-data.ts
```

### 步骤2：验证迁移

在Supabase Dashboard的SQL Editor中执行：

```sql
-- 检查字段是否存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'cash_flow_activity';

-- 检查数据分布
SELECT
  cash_flow_activity,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM transactions
GROUP BY cash_flow_activity;
```

### 步骤3：完成UI修改

按照上面"需要完成的UI修改"部分，手动添加：
1. Activity 筛选器
2. 表格 Activity 列
3. 编辑对话框 Activity 选择器
4. Voice Entry 提示
5. 现金流量表查看明细

### 步骤4：测试功能

1. **测试新增记录**
   - 进入"新增记录"页面
   - 添加一条收入记录（如"房费收入"）
   - 检查是否自动分配到"经营活动"

2. **测试编辑功能**
   - 进入收入或支出明细页面
   - 编辑一条记录
   - 尝试修改现金流活动类型
   - 保存并验证更新

3. **测试筛选功能**
   - 使用新增的"活动类型"筛选器
   - 分别选择经营/投资/筹资活动
   - 验证筛选结果正确

4. **测试现金流量表**
   - 进入现金流量表页面
   - 验证数据是否正确分类
   - 尝试点击"查看明细"（如果已实现）

---

## 📊 数据分类规则

### 经营活动（Operating）
**收入：**
- 房费收入
- 押金收入
- 额外服务
- 其他收入

**支出：**
- 水电费
- 维修费
- 清洁费
- 采购费
- 人工费
- 租金
- 营销费
- 其他支出

### 投资活动（Investing）
**收入：**
- 资产处置收入

**支出：**
- 固定资产购置
- 设备升级
- 装修改造
- 系统软件

### 筹资活动（Financing）
**收入：**
- 银行贷款
- 股东投资

**支出：**
- 偿还贷款
- 支付利息
- 股东分红

---

## 🐛 常见问题

### Q1: 迁移后现有数据没有activity？
**A:** 执行以下SQL手动更新：
```sql
UPDATE transactions
SET cash_flow_activity = get_cash_flow_activity(type, category)
WHERE cash_flow_activity IS NULL;
```

### Q2: 新增记录activity还是空？
**A:** 检查触发器是否创建成功：
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_name = 'set_transaction_activity';
```

### Q3: 编辑时无法修改activity？
**A:** 确认：
1. `/app/api/transactions/[id]/route.ts` 已修改
2. 前端editForm包含cash_flow_activity字段
3. handleSubmitEdit提交时包含该字段

### Q4: 某些分类没有映射到activity？
**A:** 检查 `/lib/cash-flow-config.ts` 中的映射配置，添加缺失的分类。

---

## 🎨 UI效果预览

### 交易表格
```
┌────────┬────────┬──────┬──────────────┬────────┐
│ 日期   │ 分类   │ 金额  │ 现金流活动    │ 操作   │
├────────┼────────┼──────┼──────────────┼────────┤
│ 11-15  │房费收入│ 800  │ [经营活动]   │编辑删除│
│ 11-14  │银行贷款│ 5000 │ [筹资活动]   │编辑删除│
│ 11-13  │装修改造│ 2000 │ [投资活动]   │编辑删除│
└────────┴────────┴──────┴──────────────┴────────┘
```

### 编辑对话框
```
┌─────────────────────────────────────┐
│ 编辑交易记录                         │
├─────────────────────────────────────┤
│ 分类：房费收入 ▼                     │
│ 金额：800                           │
│ 日期：2025-11-15                    │
│ 现金流活动：经营活动 ▼               │
│   ├─ 经营活动（默认）                │
│   ├─ 投资活动                       │
│   └─ 筹资活动                       │
│                                     │
│ 默认根据分类自动分配，可手动调整      │
│                                     │
│ [取消]  [保存]                      │
└─────────────────────────────────────┘
```

---

## 📝 配置文件位置

- **现金流配置**：`/lib/cash-flow-config.ts`
- **迁移文件**：`/supabase/migrations/005_add_cash_flow_activity.sql`
- **迁移脚本**：`/scripts/migrate-activity-data.ts`
- **API文件**：
  - `/lib/api/transactions.ts`
  - `/app/api/transactions/[id]/route.ts`
- **UI组件**：
  - `/components/transactions-table-enhanced.tsx`
  - `/components/activity-badge.tsx`
  - `/components/cash-flow-statement.tsx`
  - `/components/voice-entry-interface.tsx`

---

## ✨ 总结

### 已实现功能：
- ✅ 数据库字段和触发器
- ✅ 自动映射和填充
- ✅ API支持创建和更新
- ✅ 类型定义和配置
- ✅ 过滤逻辑
- ✅ Activity Badge组件

### 待完成功能：
- ⏳ UI筛选器显示
- ⏳ 表格列显示
- ⏳ 编辑对话框选择器
- ⏳ Voice Entry提示
- ⏳ 现金流量表查看明细

### 下一步：
1. 执行数据库迁移（最重要！）
2. 测试自动填充功能
3. 逐步完成UI修改
4. 全面测试所有功能

---

**最后更新：** 2025-11-17
**实施状态：** 后端完成 ✅ | 前端部分完成 ⏳
