/**
 * 格式化工具函数
 */

/**
 * 将 ticks 转换为秒
 * 1 tick = 100 纳秒，1 秒 = 10,000,000 ticks
 */
export function ticksToSeconds(ticks: number): number {
  return ticks / 10000000
}

/**
 * 将秒转换为 ticks
 */
export function secondsToTicks(seconds: number): number {
  return seconds * 10000000
}

/**
 * 将 ticks 转换为时间字符串 (HH:MM:SS)
 */
export function ticksToTimeString(ticks: number): string {
  const totalSeconds = Math.floor(ticksToSeconds(ticks))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 格式化比特率
 */
export function formatBitrate(bitrate: number): string {
  if (bitrate === 0) return '0 bps'

  const k = 1000
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps']
  const i = Math.floor(Math.log(bitrate) / Math.log(k))

  return `${parseFloat((bitrate / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * 格式化相对时间（例如：2 小时前）
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 7) {
    return formatDate(dateString)
  } else if (diffDays > 0) {
    return `${diffDays} 天前`
  } else if (diffHours > 0) {
    return `${diffHours} 小时前`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} 分钟前`
  } else {
    return '刚刚'
  }
}

/**
 * 格式化评分（保留一位小数）
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

/**
 * 格式化年份范围（用于电视剧）
 */
export function formatYearRange(startYear?: number, endYear?: number): string {
  if (!startYear) return ''
  if (!endYear || endYear === startYear) return startYear.toString()
  return `${startYear} - ${endYear}`
}
