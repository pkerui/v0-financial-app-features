-- 添加交易性质字段到交易记录表
-- 创建日期: 2025-11-25
-- 用途：在 transactions 表中添加 transaction_nature 字段，支持快速查询和过滤

-- ============================================
-- 1. 添加 transaction_nature 字段到 transactions 表
-- ============================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transaction_nature VARCHAR(20)
CHECK (transaction_nature IN ('operating', 'non_operating'));

-- ============================================
-- 2. 添加字段注释
-- ============================================

COMMENT ON COLUMN transactions.transaction_nature IS '交易性质：operating（营业内）、non_operating（营业外），从 transaction_categories 同步';

-- ============================================
-- 3. 从关联的 transaction_categories 复制现有数据
-- ============================================

UPDATE transactions t
SET transaction_nature = tc.transaction_nature
FROM transaction_categories tc
WHERE t.category_id = tc.id
  AND t.transaction_nature IS NULL
  AND tc.transaction_nature IS NOT NULL;

-- ============================================
-- 4. 为没有 category_id 的旧记录设置默认值
-- ============================================

UPDATE transactions
SET transaction_nature = 'operating'
WHERE transaction_nature IS NULL;

-- ============================================
-- 5. 创建索引以优化查询性能
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_nature
ON transactions(transaction_nature);

CREATE INDEX IF NOT EXISTS idx_transactions_nature_company
ON transactions(company_id, transaction_nature);
