# DateRangePicker 组件使用文档

## 📦 组件说明

通用的日期范围选择器组件，用于统一管理所有需要日期范围筛选的页面。

## ✨ 核心功能

1. **自定义日期选择** - 手动输入起止日期
2. **快捷按钮** - 本月、本年、全部
3. **自动验证**:
   - 起始日期 >= 最小日期（期初余额日期）
   - 起始日期 <= 结束日期
   - 结束日期 <= 最大日期（默认今天）
4. **响应式布局** - 适配移动端和桌面端

## 🎯 基础用法

### 1. 简单使用（组件方式）

```tsx
import { useState } from 'react'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { getFirstDayOfMonth, getToday } from '@/lib/utils/date'

function MyComponent() {
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getToday())

  return (
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onDateChange={(start, end) => {
        setStartDate(start)
        setEndDate(end)
        // 这里可以触发数据刷新
      }}
    />
  )
}
```

### 2. 使用自定义 Hook（推荐）

```tsx
import { DateRangePicker, useDateRange } from '@/components/ui/date-range-picker'
import { getFirstDayOfMonth, getToday } from '@/lib/utils/date'

function MyComponent({ initialBalanceDate }: { initialBalanceDate?: string }) {
  const { startDate, endDate, setDateRange } = useDateRange({
    defaultStart: getFirstDayOfMonth(),
    defaultEnd: getToday(),
    minDate: initialBalanceDate,
  })

  // 使用 startDate 和 endDate 进行数据筛选
  const filteredData = data.filter(item =>
    item.date >= startDate && item.date <= endDate
  )

  return (
    <div>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={setDateRange}
        minDate={initialBalanceDate}
      />

      {/* 你的内容 */}
      <div>{/* 显示 filteredData */}</div>
    </div>
  )
}
```

## 🎨 Props 参数

```typescript
type DateRangePickerProps = {
  startDate: string           // 起始日期 (YYYY-MM-DD)
  endDate: string             // 结束日期 (YYYY-MM-DD)
  onDateChange: (startDate: string, endDate: string) => void  // 日期改变回调
  minDate?: string            // 最小日期限制（例如期初余额日期）
  maxDate?: string            // 最大日期限制（默认今天）
  className?: string          // 自定义样式类
  buttonSize?: 'default' | 'sm' | 'lg'  // 按钮尺寸
  align?: 'start' | 'center' | 'end'    // Popover 对齐方式
}
```

## 💡 实际应用示例

### 示例 1: 在现金流量表中使用

**替换前** (cash-flow-statement.tsx):
```tsx
// 73-147 行的复杂日期处理逻辑
const [localStartDate, setLocalStartDate] = useState(startDate)
const [localEndDate, setLocalEndDate] = useState(endDate)

const setToThisMonth = () => { /* ... 30+ 行代码 */ }
const setToThisYear = () => { /* ... */ }
const setToAllTime = () => { /* ... */ }
const handleStartDateChange = (newStart: string) => { /* ... */ }
const handleEndDateChange = (newEnd: string) => { /* ... */ }

// 在 JSX 中手写 Popover 和 Input
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      日期范围 <ChevronDown />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-72" align="end">
    {/* 50+ 行 JSX */}
  </PopoverContent>
</Popover>
```

**替换后**:
```tsx
import { DateRangePicker } from '@/components/ui/date-range-picker'

<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={onDateChange}
  minDate={initialBalanceDate}
/>
```

**节省代码**: ~100 行 → 6 行

---

### 示例 2: 在活动明细页面中使用

**替换前** (activity-detail-content.tsx):
```tsx
// 复杂的状态管理和验证逻辑
const [startDate, setStartDate] = useState(initialStartDate || defaultStartDate)
const [endDate, setEndDate] = useState(initialEndDate || defaultEndDate)

const formatDateRange = (start: string, end: string) => { /* ... */ }
const setToThisMonth = () => { /* ... */ }
const setToThisYear = () => { /* ... */ }
const setToAllTime = () => { /* ... */ }
const handleStartDateChange = (newStart: string) => { /* ... */ }
const handleEndDateChange = (newEnd: string) => { /* ... */ }

// JSX 中的 Popover
<Popover>
  {/* ... */}
</Popover>
```

**替换后**:
```tsx
import { DateRangePicker, useDateRange } from '@/components/ui/date-range-picker'

function ActivityDetailContent({ initialStartDate, initialEndDate }) {
  const { startDate, endDate, setDateRange } = useDateRange({
    defaultStart: initialStartDate || getFirstDayOfMonth(),
    defaultEnd: initialEndDate || getToday(),
  })

  // 使用 startDate 和 endDate 进行过滤
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t =>
      t.date >= startDate && t.date <= endDate
    )
  }, [allTransactions, startDate, endDate])

  return (
    <div>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={setDateRange}
      />
      {/* 其他内容 */}
    </div>
  )
}
```

---

### 示例 3: 在利润表中使用

```tsx
import { DateRangePicker, useDateRange } from '@/components/ui/date-range-picker'

export default function ProfitLossPage({ initialBalanceDate }) {
  const { startDate, endDate, setDateRange } = useDateRange({
    defaultStart: getFirstDayOfMonth(),
    defaultEnd: getToday(),
    minDate: initialBalanceDate,
  })

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1>利润表</h1>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={setDateRange}
          minDate={initialBalanceDate}
          align="end"
        />
      </div>
      {/* 利润表内容 */}
    </div>
  )
}
```

## 🔧 自定义配置

### 自定义按钮尺寸和样式

```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={setDateRange}
  buttonSize="lg"
  className="bg-primary text-primary-foreground"
/>
```

### 自定义对齐方式

```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={setDateRange}
  align="start"  // 左对齐
/>
```

### 限制最大日期（例如只能选择过去的日期）

```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={setDateRange}
  maxDate={getToday()}  // 不能选择未来日期
/>
```

## 📊 迁移指南

### 第一步：找到需要替换的代码

搜索关键词:
- `日期范围`
- `setToThisMonth`
- `handleStartDateChange`
- `Popover` + `日期`

### 第二步：替换状态管理

**旧代码**:
```tsx
const [startDate, setStartDate] = useState(initialStartDate || defaultStartDate)
const [endDate, setEndDate] = useState(initialEndDate || defaultEndDate)
```

**新代码**:
```tsx
const { startDate, endDate, setDateRange } = useDateRange({
  defaultStart: initialStartDate || getFirstDayOfMonth(),
  defaultEnd: initialEndDate || getToday(),
  minDate: initialBalanceDate,
})
```

### 第三步：替换 JSX

**旧代码**:
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      日期范围 <ChevronDown />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    {/* 大量 Input 和 Button */}
  </PopoverContent>
</Popover>
```

**新代码**:
```tsx
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={setDateRange}
  minDate={initialBalanceDate}
/>
```

### 第四步：删除冗余代码

删除以下函数（组件已封装）:
- `formatDateRange`
- `setToThisMonth`
- `setToThisYear`
- `setToAllTime`
- `handleStartDateChange`
- `handleEndDateChange`

删除 useState:
- `const [localStartDate, setLocalStartDate] = useState(...)`
- `const [localEndDate, setLocalEndDate] = useState(...)`

## ✅ 优势总结

1. **代码减少 90%** - 从 100+ 行减少到 6 行
2. **一致的 UX** - 所有页面使用相同的日期选择体验
3. **统一的验证逻辑** - 自动处理日期边界验证
4. **易于维护** - 只需修改一个组件即可影响所有页面
5. **类型安全** - 完整的 TypeScript 类型定义
6. **高度可配置** - 支持自定义样式、尺寸、对齐方式

## 🎯 适用场景

所有需要日期范围筛选的页面:
- ✅ 现金流量表
- ✅ 利润表
- ✅ 活动明细页面
- ✅ 交易记录列表
- ✅ 汇总报表
- ✅ 数据导出功能

## 📝 注意事项

1. **minDate 优先级最高** - 即使用户输入更早的日期，也会自动调整到 minDate
2. **onDateChange 在失去焦点时触发** - 避免频繁的数据刷新
3. **快捷按钮会自动验证** - 确保选择的日期范围合法
4. **maxDate 默认为今天** - 防止选择未来日期

## 🔗 相关文件

- 组件源码: `components/ui/date-range-picker.tsx`
- 日期工具: `lib/utils/date.ts`
- 使用示例文档: `components/ui/date-range-picker.example.md`
