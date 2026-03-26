/**
 * 应用常量配置
 */

import { runtimeConfig } from '@/config/runtimeConfig'
import { getStorageItem } from '@/utils/storage'

// 应用信息
export const APP_NAME = runtimeConfig.appName
export const APP_VERSION = runtimeConfig.appVersion
export const CLIENT_NAME = runtimeConfig.clientName

// API 配置
export const DEFAULT_EMBY_SERVER_URL = runtimeConfig.embyServerUrl
export const DANMAKU_API_URL = runtimeConfig.danmakuApiUrl

export function getDanmakuApiUrl(): string {
  return getStorageItem<string>(STORAGE_KEYS.DANMAKU_SERVER_URL) || DANMAKU_API_URL
}

// 缓存时间配置（毫秒）
export const CACHE_TIME = {
  MEDIA_LIST: 5 * 60 * 1000, // 5 分钟
  MEDIA_DETAIL: 10 * 60 * 1000, // 10 分钟
  USER_INFO: 30 * 60 * 1000, // 30 分钟
  DANMAKU: 10 * 60 * 1000, // 10 分钟
}

// 播放进度报告间隔（毫秒）
export const PROGRESS_REPORT_INTERVAL = 10 * 1000 // 10 秒

// 搜索防抖延迟（毫秒）
export const SEARCH_DEBOUNCE_DELAY = 300

// 虚拟滚动阈值
export const VIRTUAL_SCROLL_THRESHOLD = 50

// 弹幕配置
export const DANMAKU_CONFIG = {
  MAX_COUNT: 50, // 同时显示的最大弹幕数量
  DEFAULT_OPACITY: 80, // 默认透明度 (0-100)
  DEFAULT_SPEED: 'normal' as const, // 默认滚动速度
  DEFAULT_FONT_SIZE: 'medium' as const, // 默认字体大小
  DEFAULT_DISPLAY_AREA: 'full' as const, // 默认显示区域
}

// 响应式断点（像素）
export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1280,
}

// 网格列数配置
export const GRID_COLUMNS = {
  MOBILE: 1, // < 480px
  TABLET_SMALL: 2, // 480px - 768px
  TABLET: 4, // 768px - 1280px
  DESKTOP: 6, // > 1280px
}

// API 重试配置
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // 指数退避：1s, 2s, 4s
}

// 本地存储键名
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'emby_auth_token',
  USER_INFO: 'emby_user_info',
  SERVER_URL: 'emby_server_url',
  SERVER_TYPE: 'media_server_type',
  DANMAKU_SERVER_URL: 'danmaku_server_url',
  DEVICE_INFO: 'emby_device_info',
  THEME: 'emby_theme',
  FILTER_PREFERENCES: 'emby_filter_preferences',
  SORT_PREFERENCES: 'emby_sort_preferences',
}
