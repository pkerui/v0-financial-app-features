// @ts-nocheck
/**
 * Supabase 认证模块
 * 使用 Supabase 云后端进行用户认证
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { UserRole } from '@/lib/auth/permissions';
import { usernameToEmail } from './username';

// ============================================
// 类型定义
// ============================================

export interface User {
  id: string;
  username: string | null;
  email: string | null;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  role: UserRole;
  managed_store_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Session {
  user: User;
  profile: Profile | null;
}

// Supabase 查询结果类型
type ProfileRow = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  role: UserRole;
  managed_store_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

type CompanyRow = {
  id: string;
  name: string;
  code?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// 验证模式
// ============================================

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(6, '密码至少6位'),
});

const registerOwnerSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6, '密码至少6位'),
  fullName: z.string().min(2, '姓名至少2个字符'),
  companyName: z.string().min(2, '公司名称至少2个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
});

// ============================================
// 用户登录
// ============================================

export async function signIn(
  username: string,
  password: string
): Promise<{ session: Session | null; error: string | null }> {
  try {
    // 验证输入
    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      return { session: null, error: validation.error.errors[0].message };
    }

    const supabase = await createClient();
    const email = usernameToEmail(username);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return { session: null, error: '用户名或密码错误' };
    }

    // 获取用户的 profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single() as { data: ProfileRow | null; error: any };

    return {
      session: {
        user: {
          id: data.user.id,
          username: data.user.user_metadata?.username || null,
          email: data.user.email || null,
        },
        profile: profile
          ? {
              id: profile.id,
              company_id: profile.company_id || null,
              full_name: profile.full_name || null,
              role: profile.role as UserRole,
              managed_store_ids: profile.managed_store_ids || [],
              created_at: profile.created_at,
              updated_at: profile.updated_at,
            }
          : null,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('登录异常:', error);
    return { session: null, error: error.message || '登录失败' };
  }
}

// ============================================
// 用户注册（普通用户）
// ============================================

export async function signUp(data: {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
}): Promise<{ user: User | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const internalEmail = usernameToEmail(data.username);

    const { data: authData, error } = await supabase.auth.signUp({
      email: internalEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName || data.username,
          username: data.username.toLowerCase(),
          recovery_email: data.email || null,
        },
      },
    });

    if (error || !authData.user) {
      if (error?.message.includes('already registered')) {
        return { user: null, error: '用户名已存在' };
      }
      return { user: null, error: error?.message || '注册失败' };
    }

    return {
      user: {
        id: authData.user.id,
        username: authData.user.user_metadata?.username || null,
        email: authData.user.email || null,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('注册异常:', error);
    return { user: null, error: error.message || '注册失败' };
  }
}

// ============================================
// 老板注册（系统首次使用）
// ============================================

export async function registerOwner(data: {
  username: string;
  password: string;
  fullName: string;
  companyName: string;
  email?: string;
}): Promise<{ error: string | null }> {
  try {
    // 验证输入
    const validation = registerOwnerSchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.errors[0].message };
    }

    // 检查是否已有用户
    const hasUsers = await checkSystemHasUsers();
    if (hasUsers) {
      return { error: '系统已有管理员账户，请直接登录' };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { error: '系统配置错误，请联系技术支持' };
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const internalEmail = usernameToEmail(data.username);

    // 1. 创建用户
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: internalEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        username: data.username.toLowerCase(),
        recovery_email: data.email || null,
      },
    });

    if (createError || !newUser.user) {
      console.error('创建用户失败:', createError);
      return { error: '创建用户失败: ' + (createError?.message || '未知错误') };
    }

    // 2. 创建公司
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: data.companyName })
      .select()
      .single();

    if (companyError || !company) {
      console.error('创建公司失败:', companyError);
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return { error: '创建公司失败' };
    }

    // 3. 更新 profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        company_id: (company as any).id,
        role: 'owner',
        full_name: data.fullName,
        managed_store_ids: [],
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('更新 profile 失败:', profileError);
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      await adminClient.from('companies').delete().eq('id', (company as any).id);
      return { error: '设置用户信息失败' };
    }

    return { error: null };
  } catch (error: any) {
    console.error('老板注册异常:', error);
    return { error: error.message || '注册失败' };
  }
}

// ============================================
// 退出登录
// ============================================

export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('退出登录异常:', error);
  }
}

// ============================================
// 获取当前用户
// ============================================

export async function getUser(): Promise<{ user: User | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { user: null, error: '未登录' };
    }

    return {
      user: {
        id: user.id,
        username: user.user_metadata?.username || null,
        email: user.email || null,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('获取用户异常:', error);
    return { user: null, error: error.message || '获取用户失败' };
  }
}

// ============================================
// 获取当前用户 ID
// ============================================

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ============================================
// 获取当前用户的 profile
// ============================================

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: ProfileRow | null; error: any };

  if (!profile) return null;

  return {
    id: profile.id,
    company_id: profile.company_id || null,
    full_name: profile.full_name || null,
    role: profile.role as UserRole,
    managed_store_ids: profile.managed_store_ids || [],
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

// ============================================
// 获取当前用户的公司 ID
// ============================================

export async function getCurrentCompanyId(): Promise<string | null> {
  const profile = await getCurrentProfile();
  return profile?.company_id || null;
}

// ============================================
// 检查当前用户角色
// ============================================

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentProfile();
  return profile?.role || null;
}

// ============================================
// 检查系统是否有用户
// ============================================

export async function checkSystemHasUsers(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('缺少 Supabase 配置');
    return true; // 安全起见，假设有用户
  }

  const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { count, error } = await adminClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('检查用户数量失败:', error);
    return true; // 安全起见，假设有用户
  }

  return (count ?? 0) > 0;
}

// ============================================
// 获取会话信息
// ============================================

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getCurrentProfile();

  return {
    user: {
      id: user.id,
      username: user.user_metadata?.username || null,
      email: user.email || null,
    },
    profile,
  };
}

// ============================================
// 更新密码
// ============================================

export async function updatePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: '请先登录' };
    }

    if (newPassword.length < 6) {
      return { error: '新密码至少6位' };
    }

    // 验证旧密码
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: oldPassword,
    });

    if (verifyError) {
      return { error: '当前密码错误' };
    }

    // 更新密码
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message || '更新密码失败' };
    }

    return { error: null };
  } catch (error: any) {
    console.error('更新密码异常:', error);
    return { error: error.message || '更新密码失败' };
  }
}

// ============================================
// 更新用户信息
// ============================================

export async function updateUserInfo(data: {
  fullName?: string;
  email?: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: '请先登录' };
    }

    // 更新 auth user metadata
    if (data.email !== undefined || data.fullName !== undefined) {
      const updateData: any = {};
      if (data.email !== undefined) {
        updateData.data = { ...updateData.data, recovery_email: data.email || null };
      }
      if (data.fullName !== undefined) {
        updateData.data = { ...updateData.data, full_name: data.fullName };
      }

      const { error: authError } = await supabase.auth.updateUser(updateData);
      if (authError) {
        return { error: authError.message || '更新用户信息失败' };
      }
    }

    // 更新 profile
    if (data.fullName !== undefined) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('id', user.id);

      if (profileError) {
        return { error: profileError.message || '更新用户信息失败' };
      }
    }

    return { error: null };
  } catch (error: any) {
    console.error('更新用户信息异常:', error);
    return { error: error.message || '更新用户信息失败' };
  }
}

// ============================================
// 获取公司信息
// ============================================

export interface Company {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single() as { data: CompanyRow | null; error: any };

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      code: data.code || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error('获取公司信息失败:', error);
    return null;
  }
}

// ============================================
// 检查 Supabase 连接状态
// ============================================

export async function checkConnection(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase 连接检查失败:', error);
    return false;
  }
}
