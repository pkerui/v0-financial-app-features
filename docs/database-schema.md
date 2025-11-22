# 民宿财务管理系统 - 数据库设计

## 核心表结构

### 1. profiles (用户配置表)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'accountant', 'manager', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**说明：**
- 与 Supabase Auth 的 users 表关联
- 支持多角色：老板、财务、店长、普通用户
- company_id 关联到公司表

---

### 2. companies (公司/组织表)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**说明：**
- 支持多公司
- owner_id 是公司拥有者
- settings 存储公司配置（JSON格式）

---

### 3. stores (店铺表)
```sql
CREATE TABLE stores (
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
```

**说明：**
- 每个公司可以有多个店铺
- manager_id 是店长
- is_active 用于软删除

---

### 4. transactions (交易记录表)
```sql
CREATE TABLE transactions (
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
```

**说明：**
- type: 收入(income)或支出(expense)
- category: 分类（房费、水电费、维修费等）
- payment_method: 支付方式
- input_method: 录入方式（语音、文字、手动）
- metadata: 存储额外信息（如语音识别置信度）

---

### 5. categories (分类表)
```sql
CREATE TABLE categories (
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
```

**说明：**
- 支持自定义分类
- 区分收入和支出分类
- 可以自定义图标和颜色

---

## 索引设计

```sql
-- 交易记录相关索引
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_transactions_store ON transactions(store_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_by ON transactions(created_by);

-- 店铺相关索引
CREATE INDEX idx_stores_company ON stores(company_id);
CREATE INDEX idx_stores_active ON stores(is_active);

-- 用户配置索引
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);
```

---

## Row Level Security (RLS) 策略

### profiles 表
```sql
-- 用户可以查看自己的配置
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 用户可以更新自己的配置
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 同公司用户可以查看其他成员
CREATE POLICY "Company members can view each other"
  ON profiles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### companies 表
```sql
-- 用户可以查看自己所属的公司
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 老板可以更新公司信息
CREATE POLICY "Owner can update company"
  ON companies FOR UPDATE
  USING (owner_id = auth.uid());
```

### stores 表
```sql
-- 公司成员可以查看所有店铺
CREATE POLICY "Company members can view stores"
  ON stores FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 老板和财务可以管理店铺
CREATE POLICY "Owner and accountant can manage stores"
  ON stores FOR ALL
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );
```

### transactions 表
```sql
-- 公司成员可以查看交易记录
CREATE POLICY "Company members can view transactions"
  ON transactions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 所有成员都可以创建交易记录
CREATE POLICY "Company members can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 创建者可以更新自己的记录
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (created_by = auth.uid());

-- 老板和财务可以删除记录
CREATE POLICY "Owner and accountant can delete transactions"
  ON transactions FOR DELETE
  USING (
    company_id IN (
      SELECT p.company_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner', 'accountant')
    )
  );
```

---

## 触发器

### 自动更新 updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 自动创建用户配置
```sql
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## 默认分类数据

```sql
-- 收入分类
INSERT INTO categories (company_id, type, name, name_en, icon, color) VALUES
  (NULL, 'income', '房费收入', 'room_revenue', 'home', '#10B981'),
  (NULL, 'income', '押金收入', 'deposit', 'shield', '#06B6D4'),
  (NULL, 'income', '额外服务', 'extra_service', 'gift', '#8B5CF6'),
  (NULL, 'income', '其他收入', 'other_income', 'plus', '#F59E0B');

-- 支出分类
INSERT INTO categories (company_id, type, name, name_en, icon, color) VALUES
  (NULL, 'expense', '水电费', 'utilities', 'zap', '#EF4444'),
  (NULL, 'expense', '维修费', 'maintenance', 'wrench', '#F97316'),
  (NULL, 'expense', '清洁费', 'cleaning', 'sparkles', '#14B8A6'),
  (NULL, 'expense', '采购费', 'supplies', 'shopping-cart', '#8B5CF6'),
  (NULL, 'expense', '人工费', 'labor', 'users', '#EC4899'),
  (NULL, 'expense', '其他支出', 'other_expense', 'minus', '#6B7280');
```

---

## 视图 (Views)

### 月度汇总视图
```sql
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
```

### 分类汇总视图
```sql
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
```

---

## MVP 阶段简化

为了快速实现 MVP，可以暂时：

1. ✅ 单公司模式（不创建 companies 表）
2. ✅ 固定分类（不使用 categories 表）
3. ✅ 简化权限（只有 owner/user 两种角色）

### 简化后的核心表

**MVP 只需要：**
1. profiles - 用户配置
2. stores - 店铺
3. transactions - 交易记录

---

最后更新：2025-01-14
