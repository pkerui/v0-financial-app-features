-- Migration: Add include_in_profit_loss field to transaction_categories
-- Description: Allows users to configure which categories affect profit/loss calculations
-- Date: 2025-11-18

-- 1. Add include_in_profit_loss column to transaction_categories table
ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS include_in_profit_loss BOOLEAN NOT NULL DEFAULT true;

-- 2. Add comment explaining the field
COMMENT ON COLUMN transaction_categories.include_in_profit_loss IS '是否计入利润表（押金等往来款项不应计入利润）';

-- 3. Update specific categories to not be included in profit/loss
-- These are typically balance sheet items (assets/liabilities) rather than income/expenses
UPDATE transaction_categories
SET include_in_profit_loss = false
WHERE name IN (
  '押金收入',      -- Deposit received (liability, not revenue)
  '押金退还',      -- Deposit refund (reduces liability, not expense)
  '银行贷款',      -- Bank loan (liability, not revenue)
  '偿还贷款',      -- Loan repayment (reduces liability, not expense)
  '股东投资',      -- Shareholder investment (equity, not revenue)
  '股东分红'       -- Dividend payment (equity distribution, not expense)
);

-- 4. Create index for faster queries filtering by include_in_profit_loss
CREATE INDEX IF NOT EXISTS idx_transaction_categories_include_in_profit_loss
ON transaction_categories(include_in_profit_loss);

-- 5. Verify the migration
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transaction_categories'
    AND column_name = 'include_in_profit_loss'
  ) THEN
    RAISE EXCEPTION 'Migration failed: include_in_profit_loss column not created';
  END IF;

  -- Check if default categories were updated
  IF NOT EXISTS (
    SELECT 1 FROM transaction_categories
    WHERE name = '押金收入' AND include_in_profit_loss = false
  ) THEN
    RAISE NOTICE 'Warning: Default category "押金收入" not found or not updated';
  END IF;

  RAISE NOTICE 'Migration 010 completed successfully';
END $$;
