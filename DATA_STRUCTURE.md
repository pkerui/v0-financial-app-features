# 财务管理系统 - 数据结构文档

## 📊 核心数据表

### 1. **companies** (公司/组织表)
```typescript
{
  id: UUID                    // 主键
  name: string                // 公司名称
  owner_id: UUID              // 所有者ID (外键 → auth.users)
  settings: JSON              // 公司设置
  created_at: timestamp
  updated_at: timestamp
}
```

### 2. **profiles** (用户配置表)
```typescript
{
  id: UUID                    // 主键 (外键 → auth.users)
  company_id: UUID            // 所属公司 (外键 → companies)
  full_name: string           // 用户全名
  role: enum                  // 角色: 'owner' | 'accountant' | 'manager' | 'user'
  avatar_url: string          // 头像URL
  created_at: timestamp
  updated_at: timestamp
}
```

### 3. **stores** (店铺表)
```typescript
{
  id: UUID                    // 主键
  company_id: UUID            // 所属公司 (外键 → companies)
  name: string                // 店铺名称
  address: string             // 地址
  phone: string               // 电话
  manager_id: UUID            // 管理员ID (外键 → auth.users)
  is_active: boolean          // 是否启用
  created_at: timestamp
  updated_at: timestamp
}
```

### 4. **transaction_categories** (交易分类表)
```typescript
{
  id: UUID                    // 主键
  company_id: UUID            // 所属公司 (外键 → companies)
  name: string                // 分类名称
  type: enum                  // 类型: 'income' | 'expense'
  cash_flow_activity: enum    // 现金流活动: 'operating' | 'investing' | 'financing'
  transaction_nature: enum    // 交易性质: 'operating' | 'non_operating' (可选)
  include_in_profit_loss: boolean  // 是否计入利润表
  is_system: boolean          // 是否系统预设
  sort_order: number          // 排序顺序
  created_at: timestamp
  updated_at: timestamp
  created_by: UUID            // 创建者 (外键 → auth.users)
}
```

**现金流活动说明:**
- `operating`: 经营活动 (日常运营收支)
- `investing`: 投资活动 (固定资产、投资等)
- `financing`: 筹资活动 (贷款、股东投资等)

**交易性质说明:**
- `operating`: 营业性 (正常业务活动)
- `non_operating`: 非营业性 (营业外收支)

### 5. **transactions** (交易记录表) - 核心表
```typescript
{
  id: UUID                    // 主键
  company_id: UUID            // 所属公司 (外键 → companies)
  store_id: UUID              // 店铺ID (外键 → stores, 可选)
  category_id: UUID           // 分类ID (外键 → transaction_categories)
  type: enum                  // 类型: 'income' | 'expense'
  category: string            // 分类名称 (冗余字段，便于查询)
  amount: decimal(12,2)       // 金额 (必须 >= 0)
  description: string         // 交易描述
  date: date                  // 交易日期 (默认今天)
  payment_method: enum        // 支付方式: 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card'
  invoice_number: string      // 发票号码
  input_method: enum          // 录入方式: 'voice' | 'text' | 'manual'
  cash_flow_activity: enum    // 现金流活动分类 (同上)
  metadata: JSON              // 额外元数据
  created_by: UUID            // 创建者 (外键 → auth.users)
  created_at: timestamp
  updated_at: timestamp
}
```

### 6. **financial_settings** (财务设置表)
```typescript
{
  id: UUID                    // 主键
  company_id: UUID            // 所属公司 (外键 → companies)
  initial_balance: decimal    // 期初余额
  initial_balance_date: date  // 期初余额日期
  fiscal_year_start: string   // 财年开始月份 (格式: 'MM-DD')
  currency: string            // 货币代码 (默认: 'CNY')
  created_at: timestamp
  updated_at: timestamp
}
```

---

## 🔄 数据流程

### 新增交易流程
```
1. 用户输入 (语音/手动/AI解析)
   ↓
2. 前端验证
   - 金额 > 0
   - 日期 >= 期初余额日期
   - 分类匹配类型 (income/expense)
   ↓
3. API: createTransaction()
   - 验证用户登录
   - 获取 company_id
   - 查询 transaction_categories 获取 category_id 和 cash_flow_activity
   - 插入 transactions 表
   ↓
4. 重新验证页面缓存
   - /dashboard
   - /voice-entry
   - /transactions
```

### 分类管理流程
```
1. 添加/编辑分类
   ↓
2. transaction_categories 表更新
   ↓
3. 如果修改分类名称
   - 级联更新所有相关交易的 category 字段
   ↓
4. 重新验证所有财务报表页面
```

---

## 📋 TypeScript 类型定义

### Transaction 交易记录
```typescript
type Transaction = {
  id: string
  company_id: string
  store_id?: string
  category_id?: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string                // ISO 格式: 'YYYY-MM-DD'
  payment_method?: 'cash' | 'transfer' | 'wechat' | 'alipay' | 'card'
  invoice_number?: string
  input_method?: 'voice' | 'text' | 'manual'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
  metadata?: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}
```

### TransactionCategory 交易分类
```typescript
type TransactionCategory = {
  id: string
  company_id: string
  name: string
  type: 'income' | 'expense'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
  transaction_nature?: 'operating' | 'non_operating'
  include_in_profit_loss: boolean
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
```

### ParsedTransaction (语音/AI解析结果)
```typescript
type ParsedTransaction = {
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string
  confidence: 'high' | 'medium' | 'low'
  cash_flow_activity: 'operating' | 'investing' | 'financing'
}

// 前端使用的扩展类型
type TransactionWithId = ParsedTransaction & {
  id: string                  // 临时ID (提交前)
  isEditing?: boolean
  input_method: 'voice' | 'manual'
  validationErrors?: ValidationError[]
}
```

### ValidationError 验证错误
```typescript
type ValidationError = {
  field: string               // 错误字段: 'date' | 'category' | 'type' | 'amount'
  message: string             // 错误信息
}
```

---

## 🎯 核心业务规则

### 1. 日期验证
- **规则**: 交易日期必须 >= 期初余额日期
- **位置**: `lib/api/transactions.ts:66-76`, `components/voice-entry-interface.tsx:89-98`
- **错误提示**: "交易日期（YYYY-MM-DD）早于期初余额日期（YYYY-MM-DD）"

### 2. 分类验证
- **规则**: 分类必须匹配交易类型
- **示例**: "房费收入"(income) 不能标记为 expense
- **位置**: `components/voice-entry-interface.tsx:100-122`
- **错误提示**: "XXX是支出分类，但标记为收入，请修改类型"

### 3. 金额验证
- **规则**: 金额必须 > 0
- **位置**: `components/voice-entry-interface.tsx:124-130`
- **数据库约束**: `CHECK (amount >= 0)`

### 4. 现金流分类规则
**默认分类映射** (定义在 `lib/cash-flow-config.ts`):

**收入分类:**
- 房费收入 → operating (经营活动)
- 押金收入 → operating
- 其他收入 → operating

**支出分类:**
- 水电费 → operating
- 维修费 → operating
- 清洁费 → operating
- 物业费 → operating
- 人工成本 → operating
- 采购支出 → operating
- 营销费用 → operating
- 其他支出 → operating

---

## 🔒 权限控制 (RLS)

### Row Level Security 策略
所有表都启用了 RLS，用户只能访问自己公司的数据:

```sql
-- 示例: transactions 表的 SELECT 策略
CREATE POLICY "用户只能查看自己公司的交易记录"
ON transactions FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);
```

---

## 📈 数据查询视图

### monthly_summary (月度汇总视图)
```sql
SELECT
  company_id,
  DATE_TRUNC('month', date) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_amount
FROM transactions
GROUP BY company_id, DATE_TRUNC('month', date);
```

### category_summary (分类汇总视图)
```sql
SELECT
  company_id,
  DATE_TRUNC('month', date) as month,
  type,
  category,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY company_id, DATE_TRUNC('month', date), type, category;
```

---

## 🤖 AI 解析流程

### 输入 → AI → 输出
```
用户输入文本:
"今天收了房租3000，昨天买了办公用品500块"

↓ 发送到 API

POST /api/parse-transactions
{
  text: "今天收了房租3000，昨天买了办公用品500块",
  incomeCategories: [{ name: "房费收入", activity: "operating" }],
  expenseCategories: [{ name: "采购支出", activity: "operating" }]
}

↓ DeepSeek AI 解析

返回结果:
{
  transactions: [
    {
      type: "income",
      category: "房费收入",
      amount: 3000,
      description: "房租",
      date: "2025-01-22",
      confidence: "high",
      cash_flow_activity: "operating"
    },
    {
      type: "expense",
      category: "采购支出",
      amount: 500,
      description: "办公用品",
      date: "2025-01-21",
      confidence: "high",
      cash_flow_activity: "operating"
    }
  ],
  parsed: 2,
  failed: 0
}
```

---

## 📁 关键文件位置

### API 层
- `lib/api/transactions.ts` - 交易记录 CRUD
- `lib/api/transaction-categories.ts` - 分类管理
- `lib/api/financial-settings.ts` - 财务设置

### 前端组件
- `components/voice-entry-interface.tsx` - 语音/手动录入界面
- `components/activity-detail-content.tsx` - 现金流明细

### 工具函数
- `lib/utils/voice-parser.ts` - 语音解析 (已废弃，仅保留类型定义)
- `lib/cash-flow-config.ts` - 现金流分类配置
- `lib/utils/date.ts` - 日期工具函数

### 数据库迁移
- `supabase/migrations/001_initial_schema.sql` - 初始结构
- `supabase/migrations/007_add_transaction_categories.sql` - 分类表
- `supabase/migrations/010_add_include_in_profit_loss.sql` - 利润表字段

---

## 💡 性能优化建议

### 1. 索引已优化
- ✅ `transactions.company_id`
- ✅ `transactions.date DESC`
- ✅ `transactions.type`
- ✅ `transaction_categories.company_id + type`

### 2. 查询优化
- 使用视图进行汇总查询 (monthly_summary, category_summary)
- 分页查询避免全表扫描
- 使用 Supabase 的 `count` 选项获取总数

### 3. 前端优化
- 使用 `useMemo` 缓存计算结果
- `revalidatePath` 只刷新必要页面
- 按需加载分类数据

---

## 🔄 迁移历史

1. **001** - 初始表结构
2. **005** - 添加 cash_flow_activity 字段
3. **006** - 添加财务设置表
4. **007** - 添加交易分类表
5. **009** - 添加 category_id 外键
6. **010** - 添加 include_in_profit_loss 字段
7. **013** - 添加 transaction_nature 字段
8. **014** - 修复分类设置

---

## 📊 数据关系图

```
auth.users (Supabase Auth)
    ↓ 1:1
profiles (用户配置)
    ↓ N:1
companies (公司)
    ↓ 1:N
    ├── stores (店铺)
    ├── transaction_categories (分类)
    └── transactions (交易记录)
            ↓ N:1
        transaction_categories (分类)
```

---

## 🎨 UI 数据流

```
Dashboard → getTransactions() → transactions 表
   ↓
显示汇总卡片:
- 本月收入
- 本月支出
- 净收支
- 最近交易列表

Voice Entry → AI 解析 → 验证 → createTransaction()
   ↓
ParsedTransactions (临时)
   ↓ 批量保存
transactions 表
   ↓ revalidatePath
Dashboard 更新
```

---

## 📝 注意事项

1. **所有金额使用 decimal(12,2)** - 避免浮点数精度问题
2. **日期使用 ISO 格式 (YYYY-MM-DD)** - 统一格式
3. **现金流活动必须设置** - 默认 'operating'
4. **分类名称作为冗余字段** - 提高查询性能
5. **RLS 策略保护数据安全** - 公司数据隔离
6. **AI 解析需要提供分类列表** - 提高识别准确率
