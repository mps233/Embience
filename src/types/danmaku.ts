/**
 * 弹幕相关类型定义
 */

// ==================== 弹幕数据 ====================

/**
 * 弹幕类型
 */
export type DanmakuType = 
  | 'scroll'    // 滚动弹幕
  | 'top'       // 顶部固定
  | 'bottom'    // 底部固定

/**
 * 弹幕项
 */
export interface DanmakuItem {
  /** 出现时间（秒） */
  time: number
  /** 弹幕类型 */
  type: DanmakuType
  /** 颜色（十六进制，如 #FFFFFF） */
  color: string
  /** 作者 */
  author: string
  /** 内容 */
  text: string
  /** 字体大小（可选） */
  fontSize?: number
}

/**
 * 弹幕设置
 */
export interface DanmakuSettings {
  /** 是否启用弹幕 */
  enabled: boolean
  /** 透明度（0-100） */
  opacity: number
  /** 滚动速度（1-10，数值越大越快） */
  speed: number
  /** 字体大小（像素，12-48） */
  fontSize: number
  /** 显示区域（百分比，0-100，表示从顶部开始的显示区域高度） */
  displayArea: number
  /** 最大同时显示数量 */
  maxCount: number
  /** 过滤器 */
  filters: {
    /** 屏蔽关键词 */
    keywords: string[]
    /** 屏蔽用户 */
    users: string[]
  }
}

/**
 * 弹幕搜索结果 - 动画
 */
export interface DanmakuAnimeResult {
  /** 动画 ID */
  animeId: string
  /** 动画标题 */
  animeTitle: string
  /** 类型 */
  type: string
  /** 类型描述 */
  typeDescription: string
  /** 剧集列表 */
  episodes?: DanmakuEpisodeResult[]
}

/**
 * 弹幕搜索结果 - 剧集
 */
export interface DanmakuEpisodeResult {
  /** 剧集 ID */
  episodeId: string
  /** 剧集标题 */
  episodeTitle: string
}

/**
 * 弹幕搜索结果（兼容旧代码）
 */
export interface DanmakuSearchResult {
  /** 动画 ID */
  animeId: string
  /** 动画标题 */
  animeTitle: string
  /** 剧集 ID */
  episodeId: string
  /** 剧集标题 */
  episodeTitle: string
  /** 类型 */
  type: string
  /** 类型描述 */
  typeDescription: string
}

/**
 * 弹幕 API 响应
 */
export interface DanmakuApiResponse {
  /** 弹幕列表 */
  comments: Array<{
    /** 时间（秒） */
    p: string
    /** 内容 */
    m: string
  }>
}

/**
 * 发送弹幕请求
 */
export interface PostDanmakuRequest {
  /** 剧集 ID */
  episodeId: string
  /** 时间（秒） */
  time: number
  /** 弹幕类型（1=滚动，4=底部，5=顶部） */
  type: number
  /** 颜色（十进制数字） */
  color: number
  /** 内容 */
  text: string
}
