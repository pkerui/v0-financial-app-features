# 如何应用数据库迁移

## 迁移文件
`supabase/migrations/015_update_deposit_classification.sql`

## 方法 1: 通过 Supabase Dashboard (推荐,最简单)

1. 访问 https://app.supabase.com
2. 登录你的账号
3. 选择项目: `yuajsprtldvxemdivdkt`
4. 左侧菜单 → **SQL Editor**
5. 点击 **New query**
6. 复制粘贴以下 SQL 内容:

```sql
-- 更新押金分类为筹资活动
-- 创建日期: 2025-11-23

-- 1. 更新现有的押金收入分类
UPDATE transaction_categories
SET
  cash_flow_activity = 'financing',
  updated_at = NOW()
WHERE
  name = '押金收入'
  AND type = 'income'
  AND cash_flow_activity != 'financing';

-- 2. 更新现有的押金退还分类
UPDATE transaction_categories
SET
  cash_flow_activity = 'financing',
  updated_at = NOW()
WHERE
  name = '押金退还'
  AND type = 'expense'
  AND cash_flow_activity != 'financing';

-- 3. 更新初始化函数
CREATE OR REPLACE FUNCTION initialize_system_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 收入类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, is_system, sort_order)
  VALUES
    (p_company_id, '房租收入', 'income', 'operating', TRUE, 1),
    (p_company_id, '服务费收入', 'income', 'operating', TRUE, 2),
    (p_company_id, '押金收入', 'income', 'financing', TRUE, 3),
    (p_company_id, '其他收入', 'income', 'operating', TRUE, 4)
  ON CONFLICT (company_id, type, name) DO UPDATE
  SET
    cash_flow_activity = EXCLUDED.cash_flow_activity,
    updated_at = NOW();

  -- 支出类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, is_system, sort_order)
  VALUES
    (p_company_id, '水电费', 'expense', 'operating', TRUE, 1),
    (p_company_id, '物业费', 'expense', 'operating', TRUE, 2),
    (p_company_id, '维修费', 'expense', 'operating', TRUE, 3),
    (p_company_id, '清洁费', 'expense', 'operating', TRUE, 4),
    (p_company_id, '网费', 'expense', 'operating', TRUE, 5),
    (p_company_id, '管理费', 'expense', 'operating', TRUE, 6),
    (p_company_id, '装修费', 'expense', 'investing', TRUE, 7),
    (p_company_id, '押金退还', 'expense', 'financing', TRUE, 8),
    (p_company_id, '其他支出', 'expense', 'operating', TRUE, 9)
  ON CONFLICT (company_id, type, name) DO UPDATE
  SET
    cash_flow_activity = EXCLUDED.cash_flow_activity,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. 验证更新结果
SELECT
  name,
  type,
  cash_flow_activity,
  updated_at
FROM transaction_categories
WHERE name IN ('押金收入', '押金退还')
ORDER BY name;
```

7. 点击 **Run** 执行
8. 查看结果,应该显示押金分类已更新为 `financing`

## 方法 2: 使用 Supabase CLI

### 前置条件
```bash
# 安装 Supabase CLI (如果还没安装)
npm install -g supabase

# 登录 Supabase
npx supabase login

# 这会打开浏览器,授权后获取 access token
```

### 执行迁移
```bash
# 1. 关联项目
npx supabase link --project-ref yuajsprtldvxemdivdkt

# 2. 查看待执行的迁移
npx supabase db diff

# 3. 推送迁移到远程
npx supabase db push
```

## 方法 3: 使用脚本直接连接数据库

如果你有数据库连接字符串:

```bash
# 使用 psql
psql "你的数据库连接字符串" < supabase/migrations/015_update_deposit_classification.sql
```

## 验证迁移成功

### 通过 SQL 验证
在 Supabase Dashboard 的 SQL Editor 执行:

```sql
-- 检查所有公司的押金分类
SELECT
  c.name as company_name,
  tc.name as category_name,
  tc.type,
  tc.cash_flow_activity,
  tc.updated_at
FROM transaction_categories tc
JOIN companies c ON c.id = tc.company_id
WHERE tc.name IN ('押金收入', '押金退还')
ORDER BY c.name, tc.name;

-- 期望结果:
-- 所有公司的"押金收入"和"押金退还"都应该是 cash_flow_activity = 'financing'
```

### 通过应用验证

1. 访问你的应用
2. 登录账号
3. 进入 **财务设置** (`/settings`)
4. 查看 **分类管理**
5. 找到"押金收入"和"押金退还",确认它们显示为"筹资活动"
6. 访问 **现金流量表** (`/cash-flow`)
7. 如果有押金相关交易,确认它们出现在"筹资活动"部分

## 如果出现问题

### 问题 1: 迁移执行报错

检查:
- 是否有语法错误?
- 是否有权限问题?
- 数据库连接是否正常?

### 问题 2: 更新后数据没变

可能原因:
- 迁移没有真正执行
- 缓存问题 - 刷新浏览器
- RLS 策略问题 - 检查是否有访问权限

### 问题 3: 新注册用户没有押金分类

执行:
```sql
-- 为特定公司重新初始化
SELECT initialize_system_categories('你的公司UUID');
```

## 注意事项

⚠️ **重要**:
- 这个迁移是幂等的,可以多次执行而不会出错
- 使用 `ON CONFLICT ... DO UPDATE` 确保安全
- 只更新 `cash_flow_activity != 'financing'` 的记录,避免重复更新

✅ **安全**:
- 不会删除任何数据
- 只更新 `cash_flow_activity` 字段
- 保留所有其他字段值

📝 **建议**:
- 在非高峰时段执行
- 执行前备份数据 (Supabase 会自动备份)
- 执行后验证结果
