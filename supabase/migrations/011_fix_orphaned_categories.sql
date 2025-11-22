-- 修复孤立的分类数据
-- 创建日期: 2025-11-19
-- 目的：将没有正确关联到用户公司的分类数据修复

-- ============================================
-- 1. 诊断：查看所有分类及其公司关联
-- ============================================

-- 创建诊断函数
CREATE OR REPLACE FUNCTION diagnose_categories()
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  category_type VARCHAR,
  company_id UUID,
  company_exists BOOLEAN,
  has_users BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.name,
    tc.type,
    tc.company_id,
    EXISTS(SELECT 1 FROM companies c WHERE c.id = tc.company_id) as company_exists,
    EXISTS(SELECT 1 FROM profiles p WHERE p.company_id = tc.company_id) as has_users
  FROM transaction_categories tc
  ORDER BY tc.created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 修复：将所有分类关联到第一个有效的公司
-- ============================================

-- 注意：仅在确认需要修复时运行此脚本

DO $$
DECLARE
  v_first_company_id UUID;
  v_count INTEGER;
BEGIN
  -- 获取第一个有用户的公司ID
  SELECT company_id INTO v_first_company_id
  FROM profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_first_company_id IS NULL THEN
    RAISE NOTICE '没有找到有效的公司ID，跳过修复';
    RETURN;
  END IF;

  -- 将所有分类更新到第一个公司（如果你的系统只有一个公司）
  -- 注意：如果是多租户系统，请不要运行此部分！

  -- 取消下面的注释来执行修复（仅适用于单公司系统）
  /*
  UPDATE transaction_categories
  SET company_id = v_first_company_id
  WHERE company_id != v_first_company_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '已修复 % 条分类记录', v_count;
  */

  RAISE NOTICE '第一个公司ID: %', v_first_company_id;
  RAISE NOTICE '如需修复，请取消注释上面的UPDATE语句';
END $$;

-- ============================================
-- 3. 查看当前用户的公司和分类
-- ============================================

-- 创建便捷查询函数
CREATE OR REPLACE FUNCTION show_my_categories()
RETURNS TABLE (
  user_email TEXT,
  company_id UUID,
  category_count BIGINT,
  income_count BIGINT,
  expense_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.email,
    p.company_id,
    COUNT(tc.id) as category_count,
    COUNT(tc.id) FILTER (WHERE tc.type = 'income') as income_count,
    COUNT(tc.id) FILTER (WHERE tc.type = 'expense') as expense_count
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN transaction_categories tc ON tc.company_id = p.company_id
  WHERE u.id = auth.uid()
  GROUP BY u.email, p.company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 使用说明
-- ============================================

/*
使用方法：

1. 诊断问题：
   SELECT * FROM diagnose_categories();

2. 查看当前用户的分类：
   SELECT * FROM show_my_categories();

3. 如果发现分类的company_id不正确：
   a. 如果是单公司系统，取消注释上面DO块中的UPDATE语句并重新运行
   b. 如果是多公司系统，需要手动修复每个分类的company_id

4. 查看特定分类：
   SELECT * FROM transaction_categories WHERE name LIKE '%房费%';
*/
