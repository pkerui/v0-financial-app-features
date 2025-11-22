-- 添加现金流活动字段到交易记录表
-- 创建日期: 2025-01-17

-- ============================================
-- 1. 添加字段
-- ============================================

-- 添加 cash_flow_activity 字段
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cash_flow_activity TEXT
CHECK (cash_flow_activity IN ('operating', 'investing', 'financing'));

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_transactions_activity ON transactions(cash_flow_activity);

-- ============================================
-- 2. 创建辅助函数 - 自动映射分类到活动
-- ============================================

CREATE OR REPLACE FUNCTION get_cash_flow_activity(
  p_type TEXT,
  p_category TEXT
) RETURNS TEXT AS $$
BEGIN
  -- 收入分类映射
  IF p_type = 'income' THEN
    CASE p_category
      -- 经营活动收入
      WHEN '房费收入', '押金收入', '额外服务', '其他收入' THEN
        RETURN 'operating';
      -- 投资活动收入
      WHEN '资产处置收入' THEN
        RETURN 'investing';
      -- 筹资活动收入
      WHEN '银行贷款', '股东投资' THEN
        RETURN 'financing';
      ELSE
        RETURN 'operating';  -- 默认为经营活动
    END CASE;

  -- 支出分类映射
  ELSIF p_type = 'expense' THEN
    CASE p_category
      -- 经营活动支出
      WHEN '水电费', '维修费', '清洁费', '采购费', '人工费', '租金', '营销费', '其他支出' THEN
        RETURN 'operating';
      -- 投资活动支出
      WHEN '固定资产购置', '设备升级', '装修改造', '系统软件' THEN
        RETURN 'investing';
      -- 筹资活动支出
      WHEN '偿还贷款', '支付利息', '股东分红' THEN
        RETURN 'financing';
      ELSE
        RETURN 'operating';  -- 默认为经营活动
    END CASE;
  END IF;

  -- 默认返回经营活动
  RETURN 'operating';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 3. 为已有记录填充数据
-- ============================================

-- 使用辅助函数自动填充所有现有记录
UPDATE transactions
SET cash_flow_activity = get_cash_flow_activity(type, category)
WHERE cash_flow_activity IS NULL;

-- ============================================
-- 4. 创建触发器 - 新增记录时自动填充
-- ============================================

-- 触发器函数：在插入或更新时自动设置 cash_flow_activity
CREATE OR REPLACE FUNCTION auto_set_cash_flow_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在 cash_flow_activity 为空时自动填充
  IF NEW.cash_flow_activity IS NULL THEN
    NEW.cash_flow_activity := get_cash_flow_activity(NEW.type, NEW.category);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 绑定触发器到 transactions 表
DROP TRIGGER IF EXISTS set_transaction_activity ON transactions;
CREATE TRIGGER set_transaction_activity
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_cash_flow_activity();

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON COLUMN transactions.cash_flow_activity IS '现金流活动类型：operating(经营活动)、investing(投资活动)、financing(筹资活动)';
COMMENT ON FUNCTION get_cash_flow_activity(TEXT, TEXT) IS '根据交易类型和分类自动映射到现金流活动';
COMMENT ON FUNCTION auto_set_cash_flow_activity() IS '触发器函数：新增或更新交易时自动设置现金流活动';

-- ============================================
-- 6. 验证数据
-- ============================================

-- 查看迁移结果统计
DO $$
DECLARE
  total_count INTEGER;
  operating_count INTEGER;
  investing_count INTEGER;
  financing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM transactions;
  SELECT COUNT(*) INTO operating_count FROM transactions WHERE cash_flow_activity = 'operating';
  SELECT COUNT(*) INTO investing_count FROM transactions WHERE cash_flow_activity = 'investing';
  SELECT COUNT(*) INTO financing_count FROM transactions WHERE cash_flow_activity = 'financing';

  RAISE NOTICE '========================================';
  RAISE NOTICE '现金流活动字段迁移完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '总记录数: %', total_count;
  RAISE NOTICE '经营活动: %', operating_count;
  RAISE NOTICE '投资活动: %', investing_count;
  RAISE NOTICE '筹资活动: %', financing_count;
  RAISE NOTICE '========================================';
END $$;
