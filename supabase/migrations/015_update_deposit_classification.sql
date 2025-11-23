-- 更新押金分类为筹资活动
-- 创建日期: 2025-11-23
-- 说明: 将押金收入和押金退还从经营活动改为筹资活动，符合会计准则

-- ============================================
-- 1. 更新现有的押金收入分类
-- ============================================

UPDATE transaction_categories
SET
  cash_flow_activity = 'financing',
  updated_at = NOW()
WHERE
  name = '押金收入'
  AND type = 'income'
  AND cash_flow_activity != 'financing';

-- ============================================
-- 2. 更新现有的押金退还分类
-- ============================================

UPDATE transaction_categories
SET
  cash_flow_activity = 'financing',
  updated_at = NOW()
WHERE
  name = '押金退还'
  AND type = 'expense'
  AND cash_flow_activity != 'financing';

-- ============================================
-- 3. 更新 initialize_system_categories 函数
-- ============================================
-- 虽然函数已经正确设置，但为了确保一致性，我们重新定义

CREATE OR REPLACE FUNCTION initialize_system_categories(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 收入类型
  INSERT INTO transaction_categories (company_id, name, type, cash_flow_activity, is_system, sort_order)
  VALUES
    (p_company_id, '房租收入', 'income', 'operating', TRUE, 1),
    (p_company_id, '服务费收入', 'income', 'operating', TRUE, 2),
    (p_company_id, '押金收入', 'income', 'financing', TRUE, 3),  -- 筹资活动 ✅
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
    (p_company_id, '押金退还', 'expense', 'financing', TRUE, 8),  -- 筹资活动 ✅
    (p_company_id, '其他支出', 'expense', 'operating', TRUE, 9)
  ON CONFLICT (company_id, type, name) DO UPDATE
  SET
    cash_flow_activity = EXCLUDED.cash_flow_activity,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. 验证更新结果
-- ============================================

-- 显示所有押金相关分类的当前状态
DO $$
DECLARE
  deposit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deposit_count
  FROM transaction_categories
  WHERE name IN ('押金收入', '押金退还')
    AND cash_flow_activity = 'financing';

  RAISE NOTICE '已更新 % 个押金分类为筹资活动', deposit_count;
END $$;

-- ============================================
-- 5. 注释说明
-- ============================================

COMMENT ON FUNCTION initialize_system_categories IS '为公司初始化系统预设分类 - 押金类别已修正为筹资活动';
