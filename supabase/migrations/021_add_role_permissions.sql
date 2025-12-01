-- 权限管理系统 - 数据库改造
-- 创建日期: 2025-11-28

-- ============================================
-- 1. 更新 profiles 表
-- ============================================

-- 添加 managed_store_ids 字段（店长/员工管理的店铺列表）
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS managed_store_ids UUID[] DEFAULT '{}';

-- 更新 role 约束（确保包含所有角色）
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('owner', 'accountant', 'manager', 'user'));

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_managed_stores
ON profiles USING GIN (managed_store_ids);

-- ============================================
-- 2. 创建邀请表
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('accountant', 'manager', 'user')),
  managed_store_ids UUID[] DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 邀请表索引
CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- 启用 RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. 邀请表 RLS 策略
-- ============================================

-- 公司管理员可以查看本公司邀请
DROP POLICY IF EXISTS "Company admins can view invitations" ON invitations;
CREATE POLICY "Company admins can view invitations"
  ON invitations FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );

-- 老板可以创建邀请
DROP POLICY IF EXISTS "Owner can create invitations" ON invitations;
CREATE POLICY "Owner can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- 老板可以删除邀请
DROP POLICY IF EXISTS "Owner can delete invitations" ON invitations;
CREATE POLICY "Owner can delete invitations"
  ON invitations FOR DELETE
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'owner'
    )
  );

-- 任何人可以通过 token 查看未过期的邀请（用于验证）
DROP POLICY IF EXISTS "Anyone can verify invitation by token" ON invitations;
CREATE POLICY "Anyone can verify invitation by token"
  ON invitations FOR SELECT
  USING (
    expires_at > NOW() AND accepted_at IS NULL
  );

-- ============================================
-- 4. 更新交易表 RLS 策略（基于店铺权限）
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Company members can view transactions" ON transactions;
DROP POLICY IF EXISTS "Company members can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Owner and accountant can delete transactions" ON transactions;

-- 新策略：查看交易（基于角色和店铺权限）
CREATE POLICY "Users can view transactions based on role"
  ON transactions FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND (
      -- owner 和 accountant 可以查看所有
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
      )
      OR
      -- manager 和 user 只能查看自己管理的店铺
      store_id = ANY (
        SELECT unnest(p.managed_store_ids) FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );

-- 新策略：创建交易（基于角色和店铺权限）
CREATE POLICY "Users can create transactions based on role"
  ON transactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND (
      -- owner 和 accountant 可以为任何店铺创建
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
      )
      OR
      -- manager 和 user 只能为自己管理的店铺创建
      store_id = ANY (
        SELECT unnest(p.managed_store_ids) FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );

-- 新策略：更新交易（owner/accountant 所有，manager 自己录入的）
CREATE POLICY "Users can update transactions based on role"
  ON transactions FOR UPDATE
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND (
      -- owner 和 accountant 可以更新所有
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
      )
      OR
      -- manager 可以更新自己录入的（在自己管理的店铺范围内）
      (
        created_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'manager'
        )
        AND store_id = ANY (
          SELECT unnest(p.managed_store_ids) FROM profiles p
          WHERE p.id = auth.uid()
        )
      )
    )
  );

-- 新策略：删除交易（owner/accountant 所有，manager 自己录入的）
CREATE POLICY "Users can delete transactions based on role"
  ON transactions FOR DELETE
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND (
      -- owner 和 accountant 可以删除所有
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
      )
      OR
      -- manager 可以删除自己录入的（在自己管理的店铺范围内）
      (
        created_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'manager'
        )
        AND store_id = ANY (
          SELECT unnest(p.managed_store_ids) FROM profiles p
          WHERE p.id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 5. 更新店铺表 RLS 策略（基于店铺权限）
-- ============================================

-- 删除旧策略
DROP POLICY IF EXISTS "Company members can view stores" ON stores;
DROP POLICY IF EXISTS "Owner and accountant can manage stores" ON stores;

-- 新策略：查看店铺（基于角色和店铺权限）
CREATE POLICY "Users can view stores based on role"
  ON stores FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid()
    )
    AND (
      -- owner 和 accountant 可以查看所有
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
      )
      OR
      -- manager 和 user 只能查看自己管理的店铺
      id = ANY (
        SELECT unnest(p.managed_store_ids) FROM profiles p
        WHERE p.id = auth.uid()
      )
    )
  );

-- 新策略：管理店铺（仅 owner 和 accountant）
CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );

-- ============================================
-- 6. 创建辅助函数
-- ============================================

-- 检查用户是否有权限访问指定店铺
CREATE OR REPLACE FUNCTION user_can_access_store(user_id UUID, target_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_stores UUID[];
BEGIN
  SELECT role, managed_store_ids INTO user_role, user_stores
  FROM profiles WHERE id = user_id;

  -- owner 和 accountant 可以访问所有店铺
  IF user_role IN ('owner', 'accountant') THEN
    RETURN TRUE;
  END IF;

  -- 其他角色检查 managed_store_ids
  RETURN target_store_id = ANY(user_stores);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户可访问的店铺ID列表
CREATE OR REPLACE FUNCTION get_user_accessible_stores(user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  user_role TEXT;
  user_company_id UUID;
  user_stores UUID[];
  all_stores UUID[];
BEGIN
  SELECT role, company_id, managed_store_ids INTO user_role, user_company_id, user_stores
  FROM profiles WHERE id = user_id;

  -- owner 和 accountant 返回公司所有店铺
  IF user_role IN ('owner', 'accountant') THEN
    SELECT ARRAY_AGG(id) INTO all_stores
    FROM stores WHERE company_id = user_company_id AND is_active = TRUE;
    RETURN COALESCE(all_stores, '{}');
  END IF;

  -- 其他角色返回 managed_store_ids
  RETURN COALESCE(user_stores, '{}');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 生成邀请 token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
