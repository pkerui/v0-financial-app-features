/**
 * 将 Date 对象转换为本地 YYYY-MM-DD 格式字符串
 * 避免时区问题
 */
export function formatDateToLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取本月第一天（本地时区）
 */
export function getFirstDayOfMonth(): string {
  const today = new Date()
  return formatDateToLocal(new Date(today.getFullYear(), today.getMonth(), 1))
}

/**
 * 获取本年第一天（本地时区）
 */
export function getFirstDayOfYear(): string {
  const today = new Date()
  return formatDateToLocal(new Date(today.getFullYear(), 0, 1))
}

/**
 * 获取本年最后一天（本地时区）
 */
export function getLastDayOfYear(): string {
  const today = new Date()
  return formatDateToLocal(new Date(today.getFullYear(), 11, 31))
}

/**
 * 获取今天（本地时区）
 */
export function getToday(): string {
  return formatDateToLocal(new Date())
}
