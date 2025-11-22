-- 民宿财务管理系统 - 初始数据库结构
-- 创建日期: 2025-01-14

-- ============================================
-- 1. 创建核心表
-- ============================================

-- 公司/组织表
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户配置表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'accountant', 'manager', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 店铺表
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  name TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'wechat', 'alipay', 'card')),
  invoice_number TEXT,
  created_by UUID REFERENCES auth.users(id),
  input_method TEXT CHECK (input_method IN ('voice', 'text', 'manual')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 创建索引
-- ============================================

-- 交易记录相关索引
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- 店铺相关索引
CREATE INDEX IF NOT EXISTS idx_stores_company ON stores(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);

-- 用户配置索引
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- 3. 创建触发器函数
-- ============================================

-- 自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自动创建用户配置
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 绑定触发器
-- ============================================

-- profiles 表触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- companies 表触发器
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- stores 表触发器
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- transactions 表触发器
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 用户注册触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. 启用 Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. 创建 RLS 策略 - profiles 表
-- ============================================

-- 用户可以查看自己的配置
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 用户可以更新自己的配置
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 同公司用户可以查看其他成员
DROP POLICY IF EXISTS "Company members can view each other" ON profiles;
CREATE POLICY "Company members can view each other"
  ON profiles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 7. 创建 RLS 策略 - companies 表
-- ============================================

-- 用户可以查看自己所属的公司
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 老板可以更新公司信息
DROP POLICY IF EXISTS "Owner can update company" ON companies;
CREATE POLICY "Owner can update company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- 8. 创建 RLS 策略 - stores 表
-- ============================================

-- 公司成员可以查看所有店铺
DROP POLICY IF EXISTS "Company members can view stores" ON stores;
CREATE POLICY "Company members can view stores"
  ON stores FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 老板和财务可以管理店铺
DROP POLICY IF EXISTS "Owner and accountant can manage stores" ON stores;
CREATE POLICY "Owner and accountant can manage stores"
  ON stores FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );

-- ============================================
-- 9. 创建 RLS 策略 - transactions 表
-- ============================================

-- 公司成员可以查看交易记录
DROP POLICY IF EXISTS "Company members can view transactions" ON transactions;
CREATE POLICY "Company members can view transactions"
  ON transactions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 所有成员都可以创建交易记录
DROP POLICY IF EXISTS "Company members can create transactions" ON transactions;
CREATE POLICY "Company members can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 创建者可以更新自己的记录
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (created_by = auth.uid());

-- 老板和财务可以删除记录
DROP POLICY IF EXISTS "Owner and accountant can delete transactions" ON transactions;
CREATE POLICY "Owner and accountant can delete transactions"
  ON transactions FOR DELETE
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );

-- ============================================
-- 10. 创建视图
-- ============================================

-- 月度汇总视图
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  company_id,
  store_id,
  DATE_TRUNC('month', date) AS month,
  type,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions
GROUP BY company_id, store_id, DATE_TRUNC('month', date), type;

-- 分类汇总视图
CREATE OR REPLACE VIEW category_summary AS
SELECT
  company_id,
  store_id,
  category,
  type,
  DATE_TRUNC('month', date) AS month,
  SUM(amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions
GROUP BY company_id, store_id, category, type, DATE_TRUNC('month', date);

-- ============================================
-- 11. 插入默认分类数据
-- ============================================

-- 收入分类
INSERT INTO categories (company_id, type, name, name_en, icon, color) VALUES
  (NULL, 'income', '房费收入', 'room_revenue', 'home', '#10B981'),
  (NULL, 'income', '押金收入', 'deposit', 'shield', '#06B6D4'),
  (NULL, 'income', '额外服务', 'extra_service', 'gift', '#8B5CF6'),
  (NULL, 'income', '其他收入', 'other_income', 'plus', '#F59E0B')
ON CONFLICT DO NOTHING;

-- 支出分类
INSERT INTO categories (company_id, type, name, name_en, icon, color) VALUES
  (NULL, 'expense', '水电费', 'utilities', 'zap', '#EF4444'),
  (NULL, 'expense', '维修费', 'maintenance', 'wrench', '#F97316'),
  (NULL, 'expense', '清洁费', 'cleaning', 'sparkles', '#14B8A6'),
  (NULL, 'expense', '采购费', 'supplies', 'shopping-cart', '#8B5CF6'),
  (NULL, 'expense', '人工费', 'labor', 'users', '#EC4899'),
  (NULL, 'expense', '其他支出', 'other_expense', 'minus', '#6B7280')
ON CONFLICT DO NOTHING;
