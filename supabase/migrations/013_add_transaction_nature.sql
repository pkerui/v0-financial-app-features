-- 添加交易性质字段到交易类别表
-- 创建日期: 2025-11-20
-- 用途：区分营业内和营业外收支，支持利润表的营业利润和利润总额计算

-- ============================================
-- 1. 添加 transaction_nature 字段
-- ============================================

ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS transaction_nature VARCHAR(20) DEFAULT 'operating'
CHECK (transaction_nature IN ('operating', 'non_operating'));

-- ============================================
-- 2. 添加字段注释
-- ============================================

COMMENT ON COLUMN transaction_categories.transaction_nature IS '交易性质：operating（营业内）、non_operating（营业外）';

-- ============================================
-- 3. 更新 initialize_system_categories 函数
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
  ON CONFLICT (company_id, type, name) DO NOTHING;

  -- 营业外支出类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, is_system, sort_order)
  VALUES
    (p_company_id, '所得税费用', 'expense', 'operating', 'non_operating', TRUE, 10),
    (p_company_id, '捐赠支出', 'expense', 'operating', 'non_operating', TRUE, 11),
    (p_company_id, '罚款支出', 'expense', 'operating', 'non_operating', TRUE, 12),
    (p_company_id, '资产处置损失', 'expense', 'investing', 'non_operating', TRUE, 13)
  ON CONFLICT (company_id, type, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. 为现有公司添加营业外收支类别
-- ============================================

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM initialize_system_categories(company_record.id);
  END LOOP;
END $$;
