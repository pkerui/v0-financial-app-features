-- Add initial_balance_date field to stores table
-- Each store can have its own initial balance date for financial tracking

-- Add initial_balance_date column
ALTER TABLE stores ADD COLUMN IF NOT EXISTS initial_balance_date DATE;

-- Add initial_balance column for store-level initial balance
ALTER TABLE stores ADD COLUMN IF NOT EXISTS initial_balance DECIMAL(12, 2) DEFAULT 0;

-- For existing stores, we'll leave the date NULL
-- The UI will prompt users to set it when needed

-- Add comment for documentation
COMMENT ON COLUMN stores.initial_balance_date IS '店铺期初余额日期 - 该店铺财务数据的起始日期';
COMMENT ON COLUMN stores.initial_balance IS '店铺期初余额金额';
