/**
 * 播放器相关类型定义
 */

// ==================== 播放方法 ====================

/**
 * 播放方法
 * - DirectPlay: 直接播放原始文件，无需服务器处理
 * - DirectStream: 服务器重新封装容器，但不转码音视频流
 * - Transcode: 服务器转码音视频流以适配客户端能力
 */
export type PlayMethod = 'DirectPlay' | 'DirectStream' | 'Transcode'

// ==================== 播放会话 ====================

/**
 * 播放会话信息
 */
export interface PlaySessionInfo {
  /** 媒体项 ID */
  itemId: string
  /** 媒体源 ID */
  mediaSourceId: string
  /** 播放会话 ID */
  playSessionId: string
  /** 播放方法 */
  playMethod: PlayMethod
  /** 音频流索引 */
  audioStreamIndex?: number
  /** 字幕流索引 */
  subtitleStreamIndex?: number
}

// ==================== 播放状态 ====================

/**
 * 播放状态
 */
export interface PlaybackState {
  /** 媒体项 ID */
  itemId: string
  /** 媒体源 ID */
  mediaSourceId: string
  /** 播放位置（ticks） */
  positionTicks: number
  /** 是否暂停 */
  isPaused: boolean
  /** 是否静音 */
  isMuted: boolean
  /** 音量级别（0-100） */
  volumeLevel: number
  /** 播放方法 */
  playMethod: PlayMethod
  /** 播放会话 ID */
  playSessionId: string
  /** 是否可以跳转 */
  canSeek: boolean
  /** 音频流索引 */
  audioStreamIndex?: number
  /** 字幕流索引 */
  subtitleStreamIndex?: number
}

// ==================== 进度报告 ====================

/**
 * 进度事件名称
 */
export type ProgressEventName =
  | 'TimeUpdate' // 时间更新
  | 'Pause' // 暂停
  | 'Unpause' // 继续
  | 'VolumeChange' // 音量变化
  | 'AudioTrackChange' // 音轨切换
  | 'SubtitleTrackChange' // 字幕切换
  | 'QualityChange' // 质量变化

/**
 * 播放进度报告
 */
export interface PlaybackProgressReport {
  /** 媒体项 ID */
  itemId: string
  /** 媒体源 ID */
  mediaSourceId: string
  /** 播放位置（ticks） */
  positionTicks: number
  /** 是否暂停 */
  isPaused: boolean
  /** 是否静音 */
  isMuted: boolean
  /** 音量级别（0-100） */
  volumeLevel: number
  /** 播放方法 */
  playMethod: PlayMethod
  /** 播放会话 ID */
  playSessionId: string
  /** 是否可以跳转 */
  canSeek: boolean
  /** 事件名称 */
  eventName?: ProgressEventName
  /** 音频流索引 */
  audioStreamIndex?: number
  /** 字幕流索引 */
  subtitleStreamIndex?: number
  /** 直播流 ID */
  liveStreamId?: string
  /** 播放列表索引 */
  playlistIndex?: number
  /** 播放列表长度 */
  playlistLength?: number
  /** 可排队的媒体类型 */
  queueableMediaTypes?: string[]
}

// ==================== 音轨和字幕 ====================

/**
 * 音频轨道
 */
export interface AudioTrack {
  /** 流索引 */
  index: number
  /** 显示标题 */
  displayTitle: string
  /** 语言 */
  language?: string
  /** 编解码器 */
  codec: string
  /** 声道数 */
  channels?: number
  /** 声道布局 */
  channelLayout?: string
  /** 采样率 */
  sampleRate?: number
}

/**
 * 字幕轨道
 */
export interface SubtitleTrack {
  /** 流索引 */
  index: number
  /** 显示标题 */
  displayTitle: string
  /** 语言 */
  language?: string
  /** 编解码器 */
  codec: string
  /** 是否为外部字幕 */
  isExternal?: boolean
  /** 是否为文本字幕流 */
  isTextSubtitleStream?: boolean
  /** 是否支持外部流 */
  supportsExternalStream?: boolean
  /** 交付 URL */
  deliveryUrl?: string
}

// ==================== 播放选项 ====================

/**
 * 播放选项
 */
export interface PlaybackOptions {
  /** 起始播放位置（ticks） */
  startPositionTicks?: number
  /** 音频流索引 */
  audioStreamIndex?: number
  /** 字幕流索引 */
  subtitleStreamIndex?: number
  /** 最大流式比特率 */
  maxStreamingBitrate?: number
  /** 转码协议（hls 或省略） */
  transcodingProtocol?: 'hls' | 'progressive'
  /** 转码容器 */
  transcodingContainer?: string
  /** 音频编解码器 */
  audioCodec?: string
  /** 视频编解码器 */
  videoCodec?: string
  /** 最大音频声道数 */
  maxAudioChannels?: number
  /** 音频采样率 */
  audioSampleRate?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}

// ==================== 播放队列 ====================

/**
 * 播放队列项
 */
export interface PlayQueueItem {
  /** 媒体项 ID */
  itemId: string
  /** 播放列表项 ID */
  playlistItemId: string
}

/**
 * 播放队列信息
 */
export interface PlayQueueInfo {
  /** 队列项列表 */
  items: PlayQueueItem[]
  /** 当前播放索引 */
  currentIndex: number
  /** 是否循环播放 */
  repeatMode: 'none' | 'one' | 'all'
  /** 是否随机播放 */
  shuffleMode: boolean
}
