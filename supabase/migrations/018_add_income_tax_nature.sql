-- 添加所得税性质到交易性质枚举
-- 创建日期: 2025-11-24
-- 用途：将所得税费用从营业外支出中独立出来，符合企业会计准则

-- ============================================
-- 1. 删除旧的 CHECK 约束
-- ============================================

-- 查找并删除现有的 CHECK 约束
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- 查找约束名称
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'transaction_categories'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%transaction_nature%';

  -- 如果找到约束，则删除
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE transaction_categories DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;
END $$;

-- ============================================
-- 2. 添加新的 CHECK 约束（包含 income_tax）
-- ============================================

ALTER TABLE transaction_categories
ADD CONSTRAINT transaction_categories_transaction_nature_check
CHECK (transaction_nature IN ('operating', 'non_operating', 'income_tax'));

-- ============================================
-- 3. 更新字段注释
-- ============================================

COMMENT ON COLUMN transaction_categories.transaction_nature IS '交易性质：operating（营业内）、non_operating（营业外）、income_tax（所得税）';

-- ============================================
-- 4. 更新所得税费用的分类为 income_tax
-- ============================================

UPDATE transaction_categories
SET transaction_nature = 'income_tax'
WHERE name = '所得税费用' AND type = 'expense';

-- ============================================
-- 5. 更新 initialize_system_categories 函数
-- ============================================

CREATE OR REPLACE FUNCTION initialize_system_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 营业内收入类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '房租收入', 'income', 'operating', 'operating', TRUE, 1),
    (p_company_id, '服务费收入', 'income', 'operating', 'operating', TRUE, 2),
    (p_company_id, '押金收入', 'income', 'financing', 'operating', TRUE, 3),
    (p_company_id, '其他收入', 'income', 'operating', 'operating', TRUE, 4)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature;

  -- 营业内支出类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '水电费', 'expense', 'operating', 'operating', TRUE, 1),
    (p_company_id, '物业费', 'expense', 'operating', 'operating', TRUE, 2),
    (p_company_id, '维修费', 'expense', 'operating', 'operating', TRUE, 3),
    (p_company_id, '清洁费', 'expense', 'operating', 'operating', TRUE, 4),
    (p_company_id, '网费', 'expense', 'operating', 'operating', TRUE, 5),
    (p_company_id, '管理费', 'expense', 'operating', 'operating', TRUE, 6),
    (p_company_id, '装修费', 'expense', 'investing', 'operating', TRUE, 7),
    (p_company_id, '押金退还', 'expense', 'financing', 'operating', TRUE, 8),
    (p_company_id, '其他支出', 'expense', 'operating', 'operating', TRUE, 9)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature;

  -- 营业外收入类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '政府补助', 'income', 'operating', 'non_operating', TRUE, 10),
    (p_company_id, '资产处置收益', 'income', 'investing', 'non_operating', TRUE, 11),
    (p_company_id, '投资收益', 'income', 'investing', 'non_operating', TRUE, 12)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature;

  -- 营业外支出类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '捐赠支出', 'expense', 'operating', 'non_operating', TRUE, 11),
    (p_company_id, '罚款支出', 'expense', 'operating', 'non_operating', TRUE, 12),
    (p_company_id, '资产处置损失', 'expense', 'investing', 'non_operating', TRUE, 13)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature;

  -- 所得税费用（独立分类）
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '所得税费用', 'expense', 'operating', 'income_tax', TRUE, 20)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 验证更新
-- ============================================

-- 显示所得税费用的当前配置
DO $$
DECLARE
  tax_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tax_count
  FROM transaction_categories
  WHERE name = '所得税费用' AND transaction_nature = 'income_tax';

  RAISE NOTICE '已更新 % 条所得税费用记录为 income_tax 性质', tax_count;
END $$;
