// 用户名后缀（内部使用，用户不可见）
export const USERNAME_EMAIL_SUFFIX = '@local.homestay'

// 将用户名转换为内部邮箱格式
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}${USERNAME_EMAIL_SUFFIX}`
}

// 从内部邮箱格式提取用户名
export function emailToUsername(email: string): string {
  if (email.endsWith(USERNAME_EMAIL_SUFFIX)) {
    return email.replace(USERNAME_EMAIL_SUFFIX, '')
  }
  // 如果是真实邮箱，返回 @ 前的部分
  return email.split('@')[0]
}
