-- 更新类型删除策略 - 允许删除所有类型（包括系统预设类型）
-- 创建日期: 2025-11-17

-- 删除旧的删除策略
DROP POLICY IF EXISTS "Users can delete their custom categories" ON transaction_categories;

-- 创建新的删除策略 - 允许删除所有类型
CREATE POLICY "Users can delete their company categories"
  ON transaction_categories
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
