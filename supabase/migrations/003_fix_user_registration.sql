-- 修复用户注册流程：自动创建 company 并关联
-- 创建日期: 2025-01-17

-- 更新 handle_new_user 函数，自动为新用户创建公司
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- 为新用户创建一个公司
  INSERT INTO public.companies (name, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || ' 的民宿',
    NEW.id
  )
  RETURNING id INTO new_company_id;

  -- 创建用户配置并关联公司
  INSERT INTO public.profiles (id, company_id, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 为现有用户补充 company_id（如果有用户的 company_id 为 NULL）
DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
BEGIN
  FOR user_record IN
    SELECT p.id, p.full_name
    FROM profiles p
    WHERE p.company_id IS NULL
  LOOP
    -- 为该用户创建公司
    INSERT INTO companies (name, owner_id)
    VALUES (
      COALESCE(user_record.full_name, 'My Company'),
      user_record.id
    )
    RETURNING id INTO new_company_id;

    -- 更新用户的 company_id 和 role
    UPDATE profiles
    SET company_id = new_company_id,
        role = 'owner'
    WHERE id = user_record.id;
  END LOOP;
END $$;
