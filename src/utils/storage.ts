/**
 * 本地存储工具函数
 */

/**
 * 从 localStorage 获取数据
 */
export function getStorageItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null
    return JSON.parse(item) as T
  } catch (error) {
    console.error(`从 localStorage 读取 ${key} 失败:`, error)
    return null
  }
}

/**
 * 保存数据到 localStorage
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`保存 ${key} 到 localStorage 失败:`, error)
  }
}

/**
 * 从 localStorage 删除数据
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`从 localStorage 删除 ${key} 失败:`, error)
  }
}

/**
 * 清空 localStorage
 */
export function clearStorage(): void {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('清空 localStorage 失败:', error)
  }
}
