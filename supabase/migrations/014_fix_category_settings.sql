-- 修复类别配置
-- 创建日期: 2025-11-20
-- 用途：修复押金和营业外收支的配置

-- ============================================
-- 1. 确保押金不计入利润表
-- ============================================

UPDATE transaction_categories
SET include_in_profit_loss = false
WHERE name IN ('押金收入', '押金退还');

-- ============================================
-- 2. 更新 initialize_system_categories 函数（完整版）
-- ============================================

CREATE OR REPLACE FUNCTION initialize_system_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 营业内收入类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, include_in_profit_loss, is_system, sort_order)
  VALUES
    (p_company_id, '房租收入', 'income', 'operating', 'operating', true, TRUE, 1),
    (p_company_id, '服务费收入', 'income', 'operating', 'operating', true, TRUE, 2),
    (p_company_id, '押金收入', 'income', 'financing', 'operating', false, TRUE, 3),
    (p_company_id, '其他收入', 'income', 'operating', 'operating', true, TRUE, 4)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature,
    include_in_profit_loss = EXCLUDED.include_in_profit_loss;

  -- 营业内支出类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, include_in_profit_loss, is_system, sort_order)
  VALUES
    (p_company_id, '水电费', 'expense', 'operating', 'operating', true, TRUE, 1),
    (p_company_id, '物业费', 'expense', 'operating', 'operating', true, TRUE, 2),
    (p_company_id, '维修费', 'expense', 'operating', 'operating', true, TRUE, 3),
    (p_company_id, '清洁费', 'expense', 'operating', 'operating', true, TRUE, 4),
    (p_company_id, '网费', 'expense', 'operating', 'operating', true, TRUE, 5),
    (p_company_id, '管理费', 'expense', 'operating', 'operating', true, TRUE, 6),
    (p_company_id, '装修费', 'expense', 'investing', 'operating', true, TRUE, 7),
    (p_company_id, '押金退还', 'expense', 'financing', 'operating', false, TRUE, 8),
    (p_company_id, '其他支出', 'expense', 'operating', 'operating', true, TRUE, 9)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature,
    include_in_profit_loss = EXCLUDED.include_in_profit_loss;

  -- 营业外收入类型（计入利润表）
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, include_in_profit_loss, is_system, sort_order)
  VALUES
    (p_company_id, '政府补助', 'income', 'operating', 'non_operating', true, TRUE, 10),
    (p_company_id, '资产处置收益', 'income', 'investing', 'non_operating', true, TRUE, 11),
    (p_company_id, '投资收益', 'income', 'investing', 'non_operating', true, TRUE, 12)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature,
    include_in_profit_loss = EXCLUDED.include_in_profit_loss;

  -- 营业外支出类型（计入利润表）
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, transaction_nature, include_in_profit_loss, is_system, sort_order)
  VALUES
    (p_company_id, '所得税费用', 'expense', 'operating', 'non_operating', true, TRUE, 10),
    (p_company_id, '捐赠支出', 'expense', 'operating', 'non_operating', true, TRUE, 11),
    (p_company_id, '罚款支出', 'expense', 'operating', 'non_operating', true, TRUE, 12),
    (p_company_id, '资产处置损失', 'expense', 'investing', 'non_operating', true, TRUE, 13)
  ON CONFLICT (company_id, type, name) DO UPDATE SET
    transaction_nature = EXCLUDED.transaction_nature,
    include_in_profit_loss = EXCLUDED.include_in_profit_loss;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 重新为所有公司执行初始化（确保配置正确）
-- ============================================

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM initialize_system_categories(company_record.id);
  END LOOP;
END $$;
