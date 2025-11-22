# 统一日期范围选择模块使用指南

## 概述

本模块提供了一套完整的日期范围选择解决方案，包括服务器端验证、客户端导航、UI组件等。所有页面都可以通过简单调用这些共享模块来实现统一的日期范围选择功能。

**核心优势：**
- ✅ 统一的日期验证逻辑（期初余额日期检查）
- ✅ 平滑的页面导航（使用router.push，无需刷新）
- ✅ 一致的用户体验
- ✅ **修改功能时只需修改共享模块代码**

## 模块组成

### 1. 服务器端模块

**文件：** `lib/utils/date-range-server.ts`

**功能：**
- 验证日期范围
- 检查期初余额日期
- 自动调整不合法日期

**主要API：**

```typescript
// 验证日期范围
async function validateDateRange(
  requestedStartDate?: string,
  requestedEndDate?: string,
  options?: {
    defaultStartDate?: string
    defaultEndDate?: string
  }
): Promise<DateRangeValidationResult>

// 从Next.js searchParams中验证日期
async function validateDateRangeFromParams(
  searchParams: Promise<{ startDate?: string; endDate?: string }>,
  options?: { ... }
): Promise<DateRangeValidationResult>

// 格式化日期显示
function formatDateRangeDisplay(
  startDate: string,
  endDate: string,
  format?: 'simple' | 'localized'
): string
```

### 2. 客户端Hook

**文件：** `lib/hooks/use-date-range-navigation.ts`

**功能：**
- 统一的日期变化处理
- 使用router.push进行平滑导航
- 自动管理URL参数

**主要API：**

```typescript
// 日期导航Hook
function useDateRangeNavigation(
  options?: {
    basePath?: string
    preserveOtherParams?: boolean
  }
): (startDate: string, endDate: string) => void

// 获取当前URL中的日期参数
function useCurrentDateParams(
  defaultStartDate?: string,
  defaultEndDate?: string
): { startDate: string | null; endDate: string | null }
```

### 3. UI组件

**文件：** `components/ui/date-adjustment-alert.tsx`

**功能：**
- 显示日期自动调整提示
- 统一的提示样式

**主要API：**

```typescript
// 标准提示组件
<DateAdjustmentAlert
  validation={dateValidation}
  showDetails={true}
/>

// 紧凑版提示
<DateAdjustmentAlertCompact validation={dateValidation} />
```

## 使用方法

### 完整示例：创建带日期选择的页面

#### 第1步：创建服务器组件（Server Component）

**文件：** `app/my-report/page.tsx`

```typescript
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { MyReportClientWrapper } from '@/components/my-report-client-wrapper'
import { DateAdjustmentAlert } from '@/components/ui/date-adjustment-alert'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}

export default async function MyReportPage({ searchParams }: PageProps) {
  // 1. 验证日期范围
  const dateValidation = await validateDateRangeFromParams(searchParams)

  // 2. 获取数据（使用验证后的日期）
  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', dateValidation.startDate)
    .lte('date', dateValidation.endDate)

  // 3. 计算报表数据
  const reportData = calculateReport(transactions, dateValidation)

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* 页面标题 */}
      <h1>我的报表</h1>

      {/* 日期调整提示（如果发生了调整） */}
      <DateAdjustmentAlert validation={dateValidation} />

      {/* 客户端包装器（处理交互） */}
      <MyReportClientWrapper
        reportData={reportData}
        dateValidation={dateValidation}
      />
    </div>
  )
}
```

#### 第2步：创建客户端包装组件（Client Wrapper）

**文件：** `components/my-report-client-wrapper.tsx`

```typescript
'use client'

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { MyReportContent } from '@/components/my-report-content'
import type { DateRangeValidationResult } from '@/lib/utils/date-range-server'

type MyReportClientWrapperProps = {
  reportData: any // 你的报表数据类型
  dateValidation: DateRangeValidationResult
}

export function MyReportClientWrapper({
  reportData,
  dateValidation
}: MyReportClientWrapperProps) {
  // 使用统一的日期导航Hook
  const handleDateChange = useDateRangeNavigation()

  return (
    <div className="space-y-6">
      {/* 日期选择器 */}
      <div className="flex justify-between items-center">
        <h2>报表内容</h2>
        <DateRangePicker
          startDate={dateValidation.startDate}
          endDate={dateValidation.endDate}
          onDateChange={handleDateChange}
          minDate={dateValidation.initialBalanceDate}
        />
      </div>

      {/* 报表内容组件 */}
      <MyReportContent data={reportData} />
    </div>
  )
}
```

#### 第3步：创建内容展示组件（Content Component）

**文件：** `components/my-report-content.tsx`

```typescript
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type MyReportContentProps = {
  data: any // 你的数据类型
}

export function MyReportContent({ data }: MyReportContentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>报表详情</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 你的报表内容 */}
        <div>报表数据展示...</div>
      </CardContent>
    </Card>
  )
}
```

### 简化示例：最小化实现

如果你的页面比较简单，可以省略客户端包装器：

```typescript
// app/simple-report/page.tsx
import { validateDateRangeFromParams } from '@/lib/utils/date-range-server'
import { DateAdjustmentAlert } from '@/components/ui/date-adjustment-alert'
import { SimpleReportContent } from '@/components/simple-report-content'

export default async function SimpleReportPage({ searchParams }) {
  const dateValidation = await validateDateRangeFromParams(searchParams)
  const data = await fetchData(dateValidation.startDate, dateValidation.endDate)

  return (
    <div>
      <DateAdjustmentAlert validation={dateValidation} />
      <SimpleReportContent
        data={data}
        dateValidation={dateValidation}
      />
    </div>
  )
}
```

```typescript
// components/simple-report-content.tsx
'use client'

import { useDateRangeNavigation } from '@/lib/hooks/use-date-range-navigation'
import { DateRangePicker } from '@/components/ui/date-range-picker'

export function SimpleReportContent({ data, dateValidation }) {
  const handleDateChange = useDateRangeNavigation()

  return (
    <>
      <DateRangePicker
        startDate={dateValidation.startDate}
        endDate={dateValidation.endDate}
        onDateChange={handleDateChange}
        minDate={dateValidation.initialBalanceDate}
      />
      <div>{/* 内容 */}</div>
    </>
  )
}
```

## 高级用法

### 自定义默认日期

```typescript
// 使用本年而不是本月作为默认范围
import { getFirstDayOfYear, getToday } from '@/lib/utils/date'

const dateValidation = await validateDateRangeFromParams(searchParams, {
  defaultStartDate: getFirstDayOfYear(),
  defaultEndDate: getToday()
})
```

### 自定义导航路径

```typescript
// 在客户端组件中
const handleDateChange = useDateRangeNavigation({
  basePath: '/custom-path',  // 自定义路径
  preserveOtherParams: false // 不保留其他查询参数
})
```

### 使用紧凑版提示

```typescript
// 适合在工具栏或标题栏显示
<div className="flex items-center gap-4">
  <h1>报表</h1>
  <DateAdjustmentAlertCompact validation={dateValidation} />
</div>
```

### 手动格式化日期显示

```typescript
import { formatDateRangeDisplay } from '@/lib/utils/date-range-server'

// 简单格式
const simple = formatDateRangeDisplay('2025-01-01', '2025-01-31')
// => "2025-01-01 至 2025-01-31"

// 本地化格式
const localized = formatDateRangeDisplay('2025-01-01', '2025-01-31', 'localized')
// => "2025年1月1日 至 2025年1月31日"
```

## 修改功能

### 如何修改日期验证逻辑？

**只需修改一个文件：** `lib/utils/date-range-server.ts`

例如，添加最大日期范围限制：

```typescript
// 在validateDateRange函数中添加
export async function validateDateRange(...) {
  // ... 现有代码 ...

  // 新增：检查日期范围不能超过1年
  const startDate = new Date(result.startDate)
  const endDate = new Date(result.endDate)
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)

  if (daysDiff > 365) {
    result.endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    result.dateAdjusted = true
    result.adjustmentReason = '日期范围不能超过1年，已自动调整'
  }

  return result
}
```

**所有使用该模块的页面都会自动应用新的验证逻辑！**

### 如何修改导航行为？

**只需修改一个文件：** `lib/hooks/use-date-range-navigation.ts`

例如，添加导航前的确认：

```typescript
export function useDateRangeNavigation(options = {}) {
  // ... 现有代码 ...

  const handleDateChange = useCallback((newStartDate, newEndDate) => {
    // 新增：导航前确认
    if (!confirm('确定要更改日期范围吗？')) {
      return
    }

    // ... 现有导航逻辑 ...
  }, [router, searchParams, basePath, preserveOtherParams])

  return handleDateChange
}
```

### 如何修改提示样式？

**只需修改一个文件：** `components/ui/date-adjustment-alert.tsx`

例如，改成警告样式：

```typescript
export function DateAdjustmentAlert({ validation }) {
  if (!validation.dateAdjusted) return null

  return (
    // 将 bg-blue-50 改为 bg-yellow-50，其他颜色也相应调整
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="bg-yellow-500 ...">
          <Info className="h-3 w-3" />
        </div>
        <div className="text-yellow-900">
          {/* ... */}
        </div>
      </div>
    </div>
  )
}
```

## 迁移现有页面

### 迁移步骤

1. **识别现有页面的日期处理代码**
   - 查找 `useState` 管理日期的代码
   - 查找 `window.location.reload()` 的调用
   - 查找日期选择的Popover代码

2. **重构为服务器组件 + 客户端包装器**
   - 将页面改为服务器组件
   - 在顶部调用 `validateDateRangeFromParams`
   - 创建客户端包装器使用 `useDateRangeNavigation`

3. **替换UI组件**
   - 使用统一的 `DateRangePicker`
   - 添加 `DateAdjustmentAlert`

4. **测试功能**
   - 测试日期选择
   - 测试期初余额日期验证
   - 测试URL参数同步

### 迁移前后对比

**迁移前（旧代码）：**

```typescript
'use client'

export function OldPage() {
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getToday())

  const handleDateChange = (newStart, newEnd) => {
    setStartDate(newStart)
    setEndDate(newEnd)
    window.location.reload() // ❌ 完整页面刷新
  }

  // ❌ 没有期初余额验证
  // ❌ 重复的日期选择UI代码
  // ❌ 没有调整提示

  return (
    <div>
      {/* 100+ 行重复的Popover代码 */}
    </div>
  )
}
```

**迁移后（新代码）：**

```typescript
// 服务器组件
export default async function NewPage({ searchParams }) {
  const dateValidation = await validateDateRangeFromParams(searchParams)
  const data = await fetchData(dateValidation.startDate, dateValidation.endDate)

  return (
    <div>
      <DateAdjustmentAlert validation={dateValidation} />
      <NewPageWrapper data={data} dateValidation={dateValidation} />
    </div>
  )
}

// 客户端包装器
'use client'
export function NewPageWrapper({ data, dateValidation }) {
  const handleDateChange = useDateRangeNavigation()

  return (
    <>
      <DateRangePicker
        startDate={dateValidation.startDate}
        endDate={dateValidation.endDate}
        onDateChange={handleDateChange}
        minDate={dateValidation.initialBalanceDate}
      />
      <Content data={data} />
    </>
  )
}
```

**改进点：**
- ✅ 服务器端数据获取和验证
- ✅ 期初余额日期自动检查
- ✅ 平滑的页面导航（无刷新）
- ✅ 统一的UI组件（无重复代码）
- ✅ 自动显示调整提示
- ✅ 修改功能只需改共享模块

## 常见问题

### Q: 为什么要分离服务器组件和客户端组件？

A: 服务器组件可以直接访问数据库，提高性能和安全性。客户端组件处理交互。这是Next.js 13+的最佳实践。

### Q: 可以只用客户端组件吗？

A: 可以，但会失去服务器端验证的优势。建议使用推荐的架构。

### Q: 如何添加更多验证规则？

A: 只需修改 `lib/utils/date-range-server.ts` 中的 `validateDateRange` 函数，所有页面自动生效。

### Q: 可以禁用期初余额验证吗？

A: 可以，在调用时不传递 `initialBalanceDate`：

```typescript
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={handleDateChange}
  // 不传递 minDate
/>
```

## 总结

使用这套统一的日期范围选择模块，你可以：

1. **快速开发**：复制使用示例，几分钟完成新页面
2. **统一体验**：所有页面行为一致
3. **易于维护**：修改共享模块，所有页面自动更新
4. **代码精简**：消除重复代码

**记住：修改功能时，只需修改这三个共享文件！**
- `lib/utils/date-range-server.ts` - 服务器端逻辑
- `lib/hooks/use-date-range-navigation.ts` - 客户端导航
- `components/ui/date-adjustment-alert.tsx` - UI提示
