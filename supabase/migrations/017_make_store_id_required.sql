-- Make store_id required in transactions table
-- This ensures data integrity for multi-store architecture
--
-- Verified: No existing transactions have NULL store_id (count = 0)
-- Safe to add NOT NULL constraint

-- Make store_id NOT NULL
ALTER TABLE transactions
ALTER COLUMN store_id SET NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN transactions.store_id IS 'Store ID - required for all transactions in multi-store setup. Every transaction must be associated with a specific store.';
