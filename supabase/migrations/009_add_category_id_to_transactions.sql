-- 为 transactions 表添加 category_id 外键关联
-- 这样可以通过 JOIN 获取分类的 cash_flow_activity 信息

-- 1. 添加 category_id 字段
ALTER TABLE transactions
ADD COLUMN category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL;

-- 2. 为现有数据迁移：将 category 字符串匹配到对应的 category_id
-- 注意：这会尝试匹配同公司、同类型、同名称的分类
UPDATE transactions t
SET category_id = tc.id
FROM transaction_categories tc
WHERE t.category = tc.name
  AND t.type = tc.type
  AND t.company_id = tc.company_id
  AND t.category_id IS NULL;

-- 3. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- 4. 添加注释说明
COMMENT ON COLUMN transactions.category_id IS '关联的分类ID，可通过此字段获取分类的现金流活动类型';

-- 注意：我们保留原有的 category 字段作为备份和兼容性
-- 未来如果确认迁移成功，可以考虑删除 category 字段
-- ALTER TABLE transactions DROP COLUMN category;
