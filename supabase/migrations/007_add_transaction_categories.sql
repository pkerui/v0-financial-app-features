-- 交易类型管理表
-- 创建日期: 2025-11-17

-- ============================================
-- 1. 创建交易类型表
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 类型信息
  name VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  cash_flow_activity VARCHAR(20) NOT NULL CHECK (cash_flow_activity IN ('operating', 'investing', 'financing')),

  -- 标记是否为系统预设类型（系统预设类型不能删除，只能修改现金流活动关联）
  is_system BOOLEAN DEFAULT FALSE,

  -- 排序
  sort_order INTEGER DEFAULT 0,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 同一公司内，同一类型（收入/支出）下的类型名称不能重复
  UNIQUE(company_id, type, name)
);

-- ============================================
-- 2. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transaction_categories_company
  ON transaction_categories(company_id);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_type
  ON transaction_categories(company_id, type);

-- ============================================
-- 3. 启用行级安全 (RLS)
-- ============================================

ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看和编辑自己公司的类型
CREATE POLICY "Users can view their company categories"
  ON transaction_categories
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company categories"
  ON transaction_categories
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company categories"
  ON transaction_categories
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 只能删除非系统预设的类型
CREATE POLICY "Users can delete their custom categories"
  ON transaction_categories
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    AND is_system = FALSE
  );

-- ============================================
-- 4. 创建更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_transaction_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_categories_updated_at
  BEFORE UPDATE ON transaction_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_categories_updated_at();

-- ============================================
-- 5. 插入系统预设类型
-- ============================================

-- 注意：这里需要为每个公司初始化系统预设类型
-- 但由于我们不知道有哪些公司，所以这部分需要在应用层处理
-- 或者通过触发器在创建公司时自动添加

-- 创建函数：为公司初始化系统预设类型
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
  ON CONFLICT (company_id, type, name) DO NOTHING;

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
  ON CONFLICT (company_id, type, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 为现有公司初始化系统类型
-- ============================================

DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    PERFORM initialize_system_categories(company_record.id);
  END LOOP;
END $$;

-- ============================================
-- 7. 创建触发器：新公司自动初始化系统类型
-- ============================================

CREATE OR REPLACE FUNCTION auto_initialize_categories_for_new_company()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_system_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_auto_initialize_categories
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_categories_for_new_company();

-- ============================================
-- 8. 注释说明
-- ============================================

COMMENT ON TABLE transaction_categories IS '交易类型管理表 - 存储收入和支出的分类及其现金流活动关联';
COMMENT ON COLUMN transaction_categories.name IS '类型名称';
COMMENT ON COLUMN transaction_categories.type IS '类型：income（收入）或 expense（支出）';
COMMENT ON COLUMN transaction_categories.cash_flow_activity IS '现金流活动：operating（经营）、investing（投资）、financing（筹资）';
COMMENT ON COLUMN transaction_categories.is_system IS '是否为系统预设类型（系统类型不可删除）';
COMMENT ON COLUMN transaction_categories.sort_order IS '排序顺序';
