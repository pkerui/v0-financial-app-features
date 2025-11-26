-- Add missing fields to stores table for multi-store management

-- Add code column for store code/number
ALTER TABLE stores ADD COLUMN IF NOT EXISTS code TEXT;

-- Add city column for store location
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city TEXT;

-- Add province column for province location
ALTER TABLE stores ADD COLUMN IF NOT EXISTS province TEXT;

-- Add type column for store type (direct/franchise)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct'
  CHECK (type IN ('direct', 'franchise'));

-- Add manager_name column for store manager name
ALTER TABLE stores ADD COLUMN IF NOT EXISTS manager_name TEXT;

-- Add manager_phone column for store manager phone
ALTER TABLE stores ADD COLUMN IF NOT EXISTS manager_phone TEXT;

-- Add status column for store status
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'preparing', 'closed'));

-- Update existing stores to have default values if NULL
UPDATE stores SET status = 'active' WHERE status IS NULL;
UPDATE stores SET type = 'direct' WHERE type IS NULL;

-- Add unique constraint on code within company (if code is provided)
CREATE UNIQUE INDEX IF NOT EXISTS stores_company_code_unique
  ON stores(company_id, code)
  WHERE code IS NOT NULL AND code != '';

-- Add comment for documentation
COMMENT ON COLUMN stores.code IS 'Store code/number (e.g., SH001)';
COMMENT ON COLUMN stores.city IS 'City where the store is located';
COMMENT ON COLUMN stores.province IS 'Province where the store is located';
COMMENT ON COLUMN stores.type IS 'Store type: direct (直营), franchise (加盟)';
COMMENT ON COLUMN stores.manager_name IS 'Name of the store manager';
COMMENT ON COLUMN stores.manager_phone IS 'Phone number of the store manager';
COMMENT ON COLUMN stores.status IS 'Store status: active, inactive, preparing, closed';
