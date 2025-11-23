/**
 * 拼音排序工具
 * 使用 Intl.Collator 进行中文拼音排序
 */

/**
 * 按拼音首字母排序字符串数组
 * @param items 要排序的对象数组
 * @param getKey 获取排序键的函数
 * @returns 排序后的数组
 */
export function sortByPinyin<T>(items: T[], getKey: (item: T) => string): T[] {
  // 使用 Intl.Collator 进行中文拼音排序
  const collator = new Intl.Collator('zh-CN', {
    usage: 'sort',
    sensitivity: 'base',
    numeric: true,
  })

  return [...items].sort((a, b) => {
    const aKey = getKey(a)
    const bKey = getKey(b)
    return collator.compare(aKey, bKey)
  })
}

/**
 * 比较两个中文字符串的拼音顺序
 * @param a 第一个字符串
 * @param b 第二个字符串
 * @returns 比较结果（-1, 0, 1）
 */
export function comparePinyin(a: string, b: string): number {
  const collator = new Intl.Collator('zh-CN', {
    usage: 'sort',
    sensitivity: 'base',
    numeric: true,
  })
  return collator.compare(a, b)
}
