-- 创建测试数据
-- 注意：此文件仅用于开发测试，生产环境不要运行
-- 前提：需要先在 Supabase Authentication 中手动创建用户 test@homestay.com

-- ============================================
-- 1. 获取测试用户 ID
-- ============================================
DO $$
DECLARE
  test_user_id UUID;
  test_company_id UUID;
  test_store_id UUID;
BEGIN
  -- 获取测试用户 ID
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@homestay.com';

  -- 如果用户不存在则退出
  IF test_user_id IS NULL THEN
    RAISE NOTICE '测试用户不存在，请先创建用户';
    RETURN;
  END IF;

  -- ============================================
  -- 2. 创建测试公司
  -- ============================================

  INSERT INTO companies (id, name, owner_id, settings)
  VALUES (
    gen_random_uuid(),
    '阳光民宿管理公司',
    test_user_id,
    '{"currency": "CNY", "timezone": "Asia/Shanghai"}'::jsonb
  )
  RETURNING id INTO test_company_id;

  -- 更新用户 profile，关联到公司
  UPDATE profiles
  SET company_id = test_company_id, role = 'owner'
  WHERE id = test_user_id;

  -- ============================================
  -- 3. 创建测试店铺
  -- ============================================

  INSERT INTO stores (id, company_id, name, address, phone, manager_id, is_active)
  VALUES (
    gen_random_uuid(),
    test_company_id,
    '西湖店',
    '浙江省杭州市西湖区西湖路123号',
    '0571-12345678',
    test_user_id,
    TRUE
  )
  RETURNING id INTO test_store_id;

  -- 创建第二个店铺
  INSERT INTO stores (company_id, name, address, phone, manager_id, is_active)
  VALUES (
    test_company_id,
    '灵隐店',
    '浙江省杭州市西湖区灵隐路456号',
    '0571-87654321',
    test_user_id,
    TRUE
  );

  -- ============================================
  -- 4. 创建测试交易记录
  -- ============================================

  -- 本月收入记录
  INSERT INTO transactions (company_id, store_id, type, category, amount, description, date, payment_method, created_by, input_method)
  VALUES
    (test_company_id, test_store_id, 'income', '房费收入', 1200.00, '301房间3晚住宿费', CURRENT_DATE - INTERVAL '2 days', 'wechat', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'income', '房费收入', 980.00, '205房间2晚住宿费', CURRENT_DATE - INTERVAL '3 days', 'alipay', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'income', '押金收入', 500.00, '客房押金', CURRENT_DATE - INTERVAL '5 days', 'cash', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'income', '额外服务', 150.00, '接送机服务费', CURRENT_DATE - INTERVAL '1 day', 'wechat', test_user_id, 'text');

  -- 本月支出记录
  INSERT INTO transactions (company_id, store_id, type, category, amount, description, date, payment_method, created_by, input_method)
  VALUES
    (test_company_id, test_store_id, 'expense', '水电费', 245.00, '3月份水电费', CURRENT_DATE - INTERVAL '4 days', 'transfer', test_user_id, 'voice'),
    (test_company_id, test_store_id, 'expense', '清洁费', 65.00, '购买清洁用品', CURRENT_DATE - INTERVAL '6 days', 'cash', test_user_id, 'text'),
    (test_company_id, test_store_id, 'expense', '维修费', 380.00, '303房间空调维修', CURRENT_DATE - INTERVAL '7 days', 'transfer', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'expense', '采购费', 520.00, '采购床上用品', CURRENT_DATE - INTERVAL '8 days', 'card', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'expense', '人工费', 800.00, '保洁人员工资', CURRENT_DATE - INTERVAL '2 days', 'transfer', test_user_id, 'manual');

  -- 上月数据（用于趋势分析）
  INSERT INTO transactions (company_id, store_id, type, category, amount, description, date, payment_method, created_by, input_method)
  VALUES
    -- 上月收入
    (test_company_id, test_store_id, 'income', '房费收入', 4200.00, '上月房费汇总', CURRENT_DATE - INTERVAL '1 month', 'wechat', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'income', '押金收入', 800.00, '上月押金汇总', CURRENT_DATE - INTERVAL '1 month', 'cash', test_user_id, 'manual'),
    -- 上月支出
    (test_company_id, test_store_id, 'expense', '水电费', 320.00, '上月水电费', CURRENT_DATE - INTERVAL '1 month', 'transfer', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'expense', '清洁费', 180.00, '上月清洁费', CURRENT_DATE - INTERVAL '1 month', 'cash', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'expense', '维修费', 450.00, '上月维修费', CURRENT_DATE - INTERVAL '1 month', 'transfer', test_user_id, 'manual'),
    (test_company_id, test_store_id, 'expense', '人工费', 1600.00, '上月人工费', CURRENT_DATE - INTERVAL '1 month', 'transfer', test_user_id, 'manual');

  RAISE NOTICE '测试数据创建成功！';
  RAISE NOTICE '用户 ID: %', test_user_id;
  RAISE NOTICE '公司 ID: %', test_company_id;
  RAISE NOTICE '店铺 ID: %', test_store_id;
  RAISE NOTICE '';
  RAISE NOTICE '测试账户:';
  RAISE NOTICE '邮箱: test@homestay.com';
  RAISE NOTICE '密码: test123456';

END $$;
