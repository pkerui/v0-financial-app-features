# 批量迁移日期范围选择器脚本

## 已完成迁移

✅ 1. `components/activity-detail-content.tsx` - 已迁移
✅ 2. `components/cash-flow-statement.tsx` - 已迁移
✅ 3. `components/cash-flow-summary-detail-content.tsx` - 已迁移

## 待迁移文件清单

### 高优先级

#### 3. `components/profit-loss-statement.tsx`
**需要替换的import**:
```typescript
// 删除
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'
import { getFirstDayOfMonth, getFirstDayOfYear } from '@/lib/utils/date'

// 添加
import { DateRangePicker } from '@/components/ui/date-range-picker'
```

**需要删除的状态和函数**:
- `const [localStartDate, setLocalStartDate] = useState(...)`
- `const [localEndDate, setLocalEndDate] = useState(...)`
- `const formatDateRange = (...) => {...}`
- `const setToThisMonth = () => {...}`
- `const setToThisYear = () => {...}`
- `const setToAllTime = () => {...}`
- `const handleStartDateChange = (...) => {...}`
- `const handleEndDateChange = (...) => {...}`
- `useEffect(...)` (如果有日期同步逻辑)

**需要替换的JSX**:
```tsx
<!-- 替换前 -->
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      日期范围 <ChevronDown />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-72" align="end">
    {/* ... 大量代码 ... */}
  </PopoverContent>
</Popover>

<!-- 替换后 -->
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={onDateChange}
  minDate={initialBalanceDate}
/>
```

---

#### 4. `components/profit-loss-detail-content.tsx`
同上步骤

---

#### 5. `components/cash-flow-summary-detail-content.tsx`
同上步骤

---

### 中优先级 - 页面组件

#### 6-8. 现金流量相关页面
- `app/cash-flow/ending-balance/page.tsx`
- `app/cash-flow/total-outflow/page.tsx`
- `app/cash-flow/total-inflow/page.tsx`

**特殊注意**: 这些是页面组件，可能使用 `useDateRange` Hook

```tsx
import { DateRangePicker, useDateRange } from '@/components/ui/date-range-picker'

function Page({ initialBalanceDate }) {
  const { startDate, endDate, setDateRange } = useDateRange({
    defaultStart: getFirstDayOfMonth(),
    defaultEnd: getToday(),
    minDate: initialBalanceDate,
  })

  return (
    <div>
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateChange={setDateRange}
        minDate={initialBalanceDate}
      />
    </div>
  )
}
```

---

#### 9-11. 利润表相关页面
- `app/profit-loss/all/page.tsx`
- `app/profit-loss/non-operating/page.tsx`
- `app/profit-loss/operating/page.tsx`

同上步骤

---

### 低优先级 - 辅助组件

#### 12-14. 交易表格组件
- `components/transactions-table-all.tsx`
- `components/transactions-table-enhanced.tsx`
- `components/transaction-list.tsx`

**可能的模式**:
```tsx
// 如果这些组件接收 startDate/endDate props
<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={(start, end) => {
    onDateRangeChange?.(start, end)
    // 或者调用其他回调
  }}
/>
```

---

## 快速迁移检查清单

对每个文件执行以下步骤:

### Step 1: 更新 imports
- [ ] 删除 `Input`, `Label`, `Popover*`, `ChevronDown`
- [ ] 删除 `getFirstDayOfMonth`, `getFirstDayOfYear` (如果不需要)
- [ ] 添加 `DateRangePicker` (或 `DateRangePicker, useDateRange`)

### Step 2: 删除冗余状态
- [ ] 删除 `localStartDate` / `localEndDate` state
- [ ] 删除所有日期处理函数 (set*, handle*)
- [ ] 删除日期同步 useEffect

### Step 3: 替换 JSX
- [ ] 找到 `<Popover>...</Popover>` 块
- [ ] 替换为 `<DateRangePicker ... />`
- [ ] 添加必要的 props (minDate, align, etc.)

### Step 4: 测试
- [ ] 启动开发服务器
- [ ] 测试日期选择功能
- [ ] 测试快捷按钮 (本月、本年、全部)
- [ ] 验证日期验证逻辑

---

## 迁移命令模板

### 对于组件 (接收 props)
```tsx
<DateRangePicker
  startDate={startDate}              // 从 props 接收
  endDate={endDate}                  // 从 props 接收
  onDateChange={onDateChange}        // 从 props 接收
  minDate={initialBalanceDate}       // 可选，期初余额日期
  align="end"                        // 可选，对齐方式
/>
```

### 对于页面 (自己管理状态)
```tsx
const { startDate, endDate, setDateRange } = useDateRange({
  defaultStart: initialStartDate || getFirstDayOfMonth(),
  defaultEnd: initialEndDate || getToday(),
  minDate: initialBalanceDate,
})

<DateRangePicker
  startDate={startDate}
  endDate={endDate}
  onDateChange={setDateRange}
  minDate={initialBalanceDate}
/>
```

---

## 预期成果

每个文件迁移后:
- ✅ **代码减少**: ~100 行 → ~6 行
- ✅ **一致的 UX**: 所有页面相同体验
- ✅ **统一验证**: 自动日期边界检查
- ✅ **易于维护**: 单点修改

总计节省代码: **~1300 行**

---

## 完成后验证

所有文件迁移后，执行:

```bash
# 搜索是否还有旧代码残留
grep -r "setToThisMonth" components/
grep -r "handleStartDateChange" components/
grep -r "PopoverTrigger" components/ | grep "日期"

# 应该返回 0 结果或只有 date-range-picker.tsx
```

---

## 注意事项

1. **保留业务逻辑**: 只删除日期选择相关代码，不删除业务逻辑
2. **保留样式**: 保持原有的布局和样式
3. **API 调用**: 如果有在 onDateChange 中调用 API，保留该逻辑
4. **minDate 验证**: 确保所有页面都传递 `initialBalanceDate` 给 `minDate`

---

## 参考文档

- 组件源码: `components/ui/date-range-picker.tsx`
- 使用示例: `components/ui/date-range-picker.example.md`
- 重构总结: `COMPONENT_REFACTOR_SUMMARY.md`
- 已完成示例:
  - `components/activity-detail-content.tsx`
  - `components/cash-flow-statement.tsx`
