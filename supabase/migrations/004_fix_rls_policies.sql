-- 修复 profiles 表的 RLS 策略，避免无限递归
-- 创建日期: 2025-01-17

-- 删除导致递归的策略
DROP POLICY IF EXISTS "Company members can view each other" ON profiles;

-- 重新创建策略：用户可以查看自己的 profile（简化版本，不递归）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 用户可以更新自己的 profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 新策略：同公司成员可以互相查看（使用函数避免递归）
-- 首先创建一个辅助函数来获取用户的 company_id
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT company_id FROM profiles WHERE id = user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 使用函数的策略（避免递归）
CREATE POLICY "Company members can view each other"
  ON profiles FOR SELECT
  USING (
    company_id IS NOT NULL
    AND company_id = get_user_company_id(auth.uid())
  );
