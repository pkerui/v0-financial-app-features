-- 合并"房费收入"到"房租收入"
-- 创建日期: 2025-11-19
-- 目的：将"房费收入"分类的所有数据迁移到"房租收入"

-- ============================================
-- 1. 诊断：查看当前的房费/房租相关分类
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_count INTEGER;
BEGIN
  -- 获取第一个有用户的公司ID
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '没有找到有效的公司ID';
    RETURN;
  END IF;

  RAISE NOTICE '当前公司ID: %', v_company_id;

  -- 显示相关分类
  RAISE NOTICE '查找房费/房租相关分类...';

  FOR v_count IN
    SELECT 1 FROM transaction_categories
    WHERE (name LIKE '%房费%' OR name LIKE '%房租%')
    AND type = 'income'
  LOOP
    RAISE NOTICE '找到分类';
  END LOOP;
END $$;

-- ============================================
-- 2. 执行合并操作
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_source_category_id UUID;
  v_target_category_id UUID;
  v_source_name VARCHAR;
  v_target_name VARCHAR;
  v_transaction_count INTEGER;
BEGIN
  -- 获取第一个有用户的公司ID
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE NOTICE '错误：没有找到有效的公司ID';
    RETURN;
  END IF;

  -- 查找"房费收入"分类
  SELECT id, name INTO v_source_category_id, v_source_name
  FROM transaction_categories
  WHERE name = '房费收入' AND type = 'income'
  LIMIT 1;

  -- 查找或创建"房租收入"分类
  SELECT id, name INTO v_target_category_id, v_target_name
  FROM transaction_categories
  WHERE (name = '房租收入' OR name = '房租')
  AND type = 'income'
  AND company_id = v_company_id
  LIMIT 1;

  -- 如果找不到房租收入，创建它
  IF v_target_category_id IS NULL THEN
    INSERT INTO transaction_categories (
      company_id,
      name,
      type,
      cash_flow_activity,
      is_system,
      sort_order
    )
    VALUES (
      v_company_id,
      '房租收入',
      'income',
      'operating',
      TRUE,
      1
    )
    RETURNING id, name INTO v_target_category_id, v_target_name;

    RAISE NOTICE '已创建目标分类: %', v_target_name;
  END IF;

  -- 如果没有找到源分类
  IF v_source_category_id IS NULL THEN
    RAISE NOTICE '未找到"房费收入"分类，无需合并';
    RETURN;
  END IF;

  -- 如果源分类的 company_id 不正确，先修复它
  UPDATE transaction_categories
  SET company_id = v_company_id
  WHERE id = v_source_category_id
  AND company_id != v_company_id;

  -- 统计将要迁移的交易数量
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions
  WHERE category = v_source_name;

  RAISE NOTICE '准备合并:';
  RAISE NOTICE '  源分类: % (ID: %)', v_source_name, v_source_category_id;
  RAISE NOTICE '  目标分类: % (ID: %)', v_target_name, v_target_category_id;
  RAISE NOTICE '  将迁移 % 笔交易', v_transaction_count;

  -- 更新所有交易记录
  UPDATE transactions
  SET category = v_target_name
  WHERE category = v_source_name;

  GET DIAGNOSTICS v_transaction_count = ROW_COUNT;
  RAISE NOTICE '已迁移 % 笔交易记录', v_transaction_count;

  -- 删除源分类
  DELETE FROM transaction_categories
  WHERE id = v_source_category_id;

  RAISE NOTICE '已删除源分类: %', v_source_name;
  RAISE NOTICE '✓ 合并完成！';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '合并过程中出错: %', SQLERRM;
    RAISE;
END $$;

-- ============================================
-- 3. 验证合并结果
-- ============================================

DO $$
DECLARE
  v_company_id UUID;
  v_category_count INTEGER;
  v_transaction_count INTEGER;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  -- 检查是否还存在"房费收入"
  SELECT COUNT(*) INTO v_category_count
  FROM transaction_categories
  WHERE name = '房费收入' AND type = 'income';

  IF v_category_count > 0 THEN
    RAISE NOTICE '警告：仍然存在 % 个"房费收入"分类', v_category_count;
  ELSE
    RAISE NOTICE '✓ "房费收入"分类已成功删除';
  END IF;

  -- 检查"房租收入"的交易数量
  SELECT COUNT(*) INTO v_transaction_count
  FROM transactions t
  JOIN transaction_categories tc ON t.category = tc.name
  WHERE tc.name IN ('房租收入', '房租')
  AND tc.type = 'income'
  AND tc.company_id = v_company_id;

  RAISE NOTICE '✓ "房租收入"现在有 % 笔交易记录', v_transaction_count;
END $$;
