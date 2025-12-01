-- 为公司添加 API 配置字段
-- 用于存储每个公司的第三方 API 密钥

-- 添加 API 配置字段到 companies 表
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS deepseek_api_key TEXT,
ADD COLUMN IF NOT EXISTS tencent_secret_id TEXT,
ADD COLUMN IF NOT EXISTS tencent_secret_key TEXT;

-- 添加字段注释
COMMENT ON COLUMN companies.deepseek_api_key IS 'DeepSeek API 密钥，用于 AI 文本解析';
COMMENT ON COLUMN companies.tencent_secret_id IS '腾讯云 SecretId，用于语音识别';
COMMENT ON COLUMN companies.tencent_secret_key IS '腾讯云 SecretKey，用于语音识别';

-- 更新 RLS 策略：只有 owner 可以查看和修改 API 配置
-- 首先创建一个函数来检查当前用户是否是公司的 owner
CREATE OR REPLACE FUNCTION is_company_owner(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND company_id = company_uuid
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注意：API 密钥字段的访问控制通过应用层实现
-- 因为 RLS 是行级别的，无法限制特定列的访问
-- 在查询时，非 owner 用户不应该能够获取这些字段的值
