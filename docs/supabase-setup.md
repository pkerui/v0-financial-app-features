# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并登录或注册
2. 点击 "New Project" 创建新项目
3. 填写项目信息:
   - **Name**: `financial-app` (或任意名称)
   - **Database Password**: 设置一个强密码（请妥善保存）
   - **Region**: 选择 `Northeast Asia (Tokyo)` 获得最佳速度
4. 点击 "Create new project" 并等待项目初始化（约 2 分钟）

## 2. 获取 API 凭证

1. 在项目仪表板，点击左侧的 **Settings** ⚙️
2. 选择 **API** 选项卡
3. 复制以下信息：
   - **Project URL** - 格式类似 `https://xxxxx.supabase.co`
   - **anon/public** key - 以 `eyJ` 开头的长字符串

## 3. 配置环境变量

1. 在项目根目录创建 `.env.local` 文件：
   ```bash
   cp .env.local.example .env.local
   ```

2. 编辑 `.env.local`，填入刚才复制的信息：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **重要**：`.env.local` 已在 `.gitignore` 中，不会被提交到 Git

## 4. 运行数据库迁移

### 方法 1: 使用 Supabase SQL Editor (推荐)

1. 在 Supabase 项目仪表板，点击左侧的 **SQL Editor** 📝
2. 点击 **New Query**
3. 打开本地文件 `supabase/migrations/001_initial_schema.sql`
4. 复制全部内容并粘贴到 SQL 编辑器
5. 点击 **Run** 执行 SQL
6. 等待执行完成，确认没有错误

### 方法 2: 使用 Supabase CLI (可选)

如果您已安装 Supabase CLI：

```bash
# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-id

# 运行迁移
supabase db push
```

## 5. 验证数据库设置

1. 在 Supabase 仪表板，点击 **Table Editor** 📊
2. 确认以下表已创建：
   - ✅ `companies` - 公司表
   - ✅ `profiles` - 用户配置表
   - ✅ `stores` - 店铺表
   - ✅ `transactions` - 交易记录表
   - ✅ `categories` - 分类表

3. 点击 `categories` 表，确认已有默认分类数据（收入和支出分类）

## 6. 启用邮件认证

1. 在 Supabase 仪表板，点击 **Authentication** 🔐
2. 选择 **Providers** 选项卡
3. 确保 **Email** provider 已启用
4. （可选）配置 Email Templates 自定义注册邮件

## 7. 测试配置

重启开发服务器：

```bash
npm run dev
```

访问 http://localhost:3000，如果没有看到 Supabase 相关错误，说明配置成功！

## 8. 常见问题

### Q: 数据库连接失败？
**A**: 检查 `.env.local` 文件中的 URL 和 Key 是否正确，确保没有多余的空格或引号。

### Q: RLS 策略导致无法访问数据？
**A**: 确保用户已登录，并且 `profiles` 表中有对应的记录。新用户注册时会自动创建 profile。

### Q: 如何重置数据库？
**A**: 在 Supabase 仪表板的 SQL Editor 中运行：
```sql
-- 警告：这将删除所有数据！
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```
然后重新运行迁移文件。

## 9. 下一步

- ✅ Supabase 配置完成
- ⏭️ 实现用户认证系统
- ⏭️ 创建交易记录 API
- ⏭️ 连接 Dashboard 到真实数据

---

最后更新：2025-01-14
