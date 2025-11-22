-- 财务设置表 - 用于存储期初余额等配置
-- 创建日期: 2025-11-17

-- ============================================
-- 1. 创建财务设置表
-- ============================================

CREATE TABLE IF NOT EXISTS financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 期初余额设置
  initial_cash_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  initial_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 备注说明
  notes TEXT,

  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  -- 每个公司只能有一条财务设置记录
  UNIQUE(company_id)
);

-- ============================================
-- 2. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_financial_settings_company
  ON financial_settings(company_id);

-- ============================================
-- 3. 启用行级安全 (RLS)
-- ============================================

ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

-- 策略：用户只能查看和编辑自己公司的财务设置
CREATE POLICY "Users can view their company financial settings"
  ON financial_settings
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company financial settings"
  ON financial_settings
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company financial settings"
  ON financial_settings
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

-- ============================================
-- 4. 创建更新时间触发器
-- ============================================

CREATE OR REPLACE FUNCTION update_financial_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER financial_settings_updated_at
  BEFORE UPDATE ON financial_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_settings_updated_at();

-- ============================================
-- 5. 注释说明
-- ============================================

COMMENT ON TABLE financial_settings IS '财务设置表 - 存储期初余额等财务配置';
COMMENT ON COLUMN financial_settings.initial_cash_balance IS '期初现金余额';
COMMENT ON COLUMN financial_settings.initial_balance_date IS '期初余额设定日期';
COMMENT ON COLUMN financial_settings.notes IS '备注说明';
