# 数据库同步指南

## 概述

本文档说明如何将代码中的配置更改同步到数据库。

## 原则

**重要**: 任何影响数据结构或业务逻辑的配置更改都必须同时更新:

1. **代码层** - 配置文件 (如 `lib/cash-flow-config.ts`)
2. **数据库层** - SQL 迁移文件 (在 `supabase/migrations/`)

## 押金分类更新示例

### 问题
押金分类存在不一致:
- 数据库初始化函数: `financing` ✅
- 代码配置文件: `operating` ❌

### 解决方案

#### 1. 更新代码配置
文件: `lib/cash-flow-config.ts`

```typescript
// 收入分类映射
export const incomeCategoryMapping: Record<string, CategoryMapping> = {
  '押金收入': {
    activity: 'financing',  // 改为 financing
    direction: 'inflow',
    label: '押金收入'
  },
  // ...
}

// 支出分类映射
export const expenseCategoryMapping: Record<string, CategoryMapping> = {
  '押金退还': {
    activity: 'financing',  // 新增
    direction: 'outflow',
    label: '押金退还'
  },
  // ...
}
```

#### 2. 创建数据库迁移
文件: `supabase/migrations/015_update_deposit_classification.sql`

```sql
-- 更新现有数据
UPDATE transaction_categories
SET cash_flow_activity = 'financing'
WHERE name IN ('押金收入', '押金退还');

-- 更新初始化函数
CREATE OR REPLACE FUNCTION initialize_system_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO transaction_categories (...)
  VALUES
    (..., '押金收入', 'income', 'financing', ...)
  ON CONFLICT (company_id, type, name) DO UPDATE
  SET cash_flow_activity = EXCLUDED.cash_flow_activity;
  -- ...
END;
$$ LANGUAGE plpgsql;
```

#### 3. 应用迁移

**方法 A: 使用 Supabase CLI (推荐)**

```bash
# 连接到远程数据库
npx supabase link --project-ref yuajsprtldvxemdivdkt

# 查看待执行的迁移
npx supabase db diff

# 应用迁移
npx supabase db push
```

**方法 B: 通过 Supabase Dashboard**

1. 登录 https://app.supabase.com
2. 选择项目
3. 进入 SQL Editor
4. 复制粘贴 `015_update_deposit_classification.sql` 的内容
5. 点击 Run 执行

**方法 C: 使用 npx supabase**

```bash
# 推送所有新迁移到远程数据库
npx supabase db push
```

#### 4. 验证更新

**SQL 查询验证:**

```sql
-- 检查押金分类
SELECT
  company_id,
  name,
  type,
  cash_flow_activity,
  updated_at
FROM transaction_categories
WHERE name IN ('押金收入', '押金退还')
ORDER BY company_id, name;

-- 期望结果:
-- 押金收入 | income  | financing
-- 押金退还 | expense | financing
```

**应用层验证:**

1. 登录系统
2. 访问 `/settings` 财务设置页面
3. 检查分类管理中的押金分类:
   - 押金收入 → 筹资活动
   - 押金退还 → 筹资活动
4. 访问 `/cash-flow` 现金流量表
5. 查看包含押金的交易是否归入"筹资活动"

## 通用流程

### 何时需要数据库迁移?

✅ **需要创建迁移的情况:**
- 修改系统预设分类的 `cash_flow_activity`
- 修改系统预设分类的 `include_in_profit_loss`
- 添加新的系统预设分类
- 修改表结构 (添加/删除/修改列)
- 修改数据库函数或触发器
- 修改 RLS 策略

❌ **不需要迁移的情况:**
- 用户自定义分类 (通过 UI 管理)
- 前端显示逻辑调整
- 纯 UI 改动
- 不影响数据库的代码重构

### 标准工作流

```
1. 识别需求
   ↓
2. 评估影响范围
   - 是否影响数据库?
   - 是否影响现有数据?
   ↓
3. 同时更新
   - 代码配置文件
   - 数据库迁移文件
   ↓
4. 本地测试
   - 运行迁移
   - 验证结果
   ↓
5. 提交代码
   - 配置文件
   - 迁移文件
   - 文档更新
   ↓
6. 部署生产
   - 应用迁移
   - 验证生产数据
   ↓
7. 监控
   - 检查错误日志
   - 用户反馈
```

## 迁移文件命名规范

```
{序号}_{描述}.sql

示例:
001_initial_schema.sql
002_test_data.sql
015_update_deposit_classification.sql
```

**规则:**
- 序号: 3位数字,递增
- 描述: 小写英文,下划线分隔
- 扩展名: .sql

## 回滚策略

### 创建回滚迁移

如果需要撤销 `015_update_deposit_classification.sql`:

```sql
-- 016_rollback_deposit_classification.sql

-- 将押金改回经营活动 (仅示例,不推荐)
UPDATE transaction_categories
SET cash_flow_activity = 'operating'
WHERE name IN ('押金收入', '押金退还');
```

**注意**: 回滚可能导致数据不一致,谨慎操作!

## 最佳实践

### ✅ DO (应该做)

1. **同步更新**: 代码和数据库同时修改
2. **向前兼容**: 使用 `ON CONFLICT ... DO UPDATE`
3. **幂等性**: 迁移可重复执行而不出错
4. **验证脚本**: 包含验证 SQL 检查结果
5. **文档记录**: 说明修改原因和影响
6. **测试先行**: 本地测试后再部署生产

### ❌ DON'T (不应该做)

1. **手动修改**: 不通过 SQL 文件直接在数据库改数据
2. **跳过迁移**: 代码改了但不写迁移文件
3. **删除迁移**: 已应用的迁移文件不要删除
4. **修改历史**: 已部署的迁移不要修改
5. **忽略冲突**: 不处理数据冲突直接覆盖

## 常见场景

### 场景 1: 添加新的系统分类

```sql
-- 迁移文件
INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, is_system)
SELECT
  id as company_id,
  '新分类名称' as name,
  'income' as type,
  'operating' as cash_flow_activity,
  TRUE as is_system
FROM companies
ON CONFLICT (company_id, type, name) DO NOTHING;
```

```typescript
// 配置文件
export const incomeCategoryMapping = {
  '新分类名称': {
    activity: 'operating',
    direction: 'inflow',
    label: '新分类显示名'
  },
  // ...
}
```

### 场景 2: 修改分类的现金流活动

```sql
-- 迁移文件
UPDATE transaction_categories
SET
  cash_flow_activity = 'investing',
  updated_at = NOW()
WHERE
  name = '装修费'
  AND type = 'expense';
```

```typescript
// 配置文件
export const expenseCategoryMapping = {
  '装修费': {
    activity: 'investing',  // 从 operating 改为 investing
    direction: 'outflow',
    label: '装修改造支出'
  },
  // ...
}
```

### 场景 3: 修改是否计入利润表

```sql
-- 迁移文件
UPDATE transaction_categories
SET
  include_in_profit_loss = FALSE,
  updated_at = NOW()
WHERE
  name = '押金收入'
  AND type = 'income';
```

## 工具和资源

### Supabase CLI 常用命令

```bash
# 安装 CLI
npm install -g supabase

# 登录
npx supabase login

# 关联项目
npx supabase link --project-ref YOUR_PROJECT_REF

# 查看本地和远程差异
npx supabase db diff

# 推送本地迁移到远程
npx supabase db push

# 从远程拉取迁移到本地
npx supabase db pull

# 重置本地数据库
npx supabase db reset

# 生成 TypeScript 类型
npx supabase gen types typescript --local > types/supabase.ts
```

### SQL 编辑器

**在线 (Supabase Dashboard):**
- https://app.supabase.com → SQL Editor

**本地工具:**
- DBeaver
- TablePlus
- pgAdmin
- VSCode + PostgreSQL extension

## 检查清单

执行数据库同步前,确认以下事项:

- [ ] 已更新代码配置文件
- [ ] 已创建数据库迁移文件
- [ ] 迁移文件具有幂等性
- [ ] 包含验证和回滚说明
- [ ] 本地测试通过
- [ ] 已备份生产数据 (重要更改)
- [ ] 已通知团队成员
- [ ] 文档已更新

## 故障排查

### 问题 1: 迁移执行失败

**症状**: SQL 执行报错

**解决**:
1. 检查 SQL 语法
2. 检查数据库约束 (UNIQUE, FK等)
3. 检查 RLS 策略是否阻止
4. 查看错误日志详细信息

### 问题 2: 数据不一致

**症状**: 代码配置和数据库数据不匹配

**解决**:
1. 检查迁移是否已执行
2. 检查是否有多个公司,部分未更新
3. 手动运行更新 SQL 验证
4. 清除应用缓存,重新获取数据

### 问题 3: 新用户注册后没有系统分类

**症状**: 新公司创建后,transaction_categories 表为空

**解决**:
1. 检查 `companies_auto_initialize_categories` 触发器
2. 手动执行: `SELECT initialize_system_categories('company_id')`
3. 检查 RLS 策略

## 总结

数据库同步是确保系统一致性的关键步骤。遵循以下原则:

1. **一次修改,两处更新** (代码 + 数据库)
2. **迁移先行,部署跟进**
3. **测试充分,监控及时**
4. **文档完善,团队知晓**

正确的同步流程能避免:
- 数据不一致
- 生产环境bug
- 用户体验问题
- 紧急回滚

**记住**: 数据库是事实的唯一来源,代码配置只是回退机制!
