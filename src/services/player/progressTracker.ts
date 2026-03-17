/**
 * 播放进度跟踪服务
 * 负责向 Emby 服务器报告播放状态和进度
 * 支持离线队列，在网络断开时缓存进度更新
 */

import type { EmbyApiClient } from '@/services/api/embyClient'
import type { PlaySessionInfo, PlaybackProgressReport } from '@/types/player'
import { playbackEndpoints } from '@/services/api/endpoints/playback'

/**
 * 进度跟踪器配置
 */
export interface ProgressTrackerConfig {
  /** API 客户端 */
  apiClient: EmbyApiClient
  /** 自动报告间隔（毫秒），默认 10 秒 */
  reportInterval?: number
  /** 服务器 URL（用于 sendBeacon） */
  serverUrl?: string
  /** API Token（用于 sendBeacon 认证） */
  apiToken?: string
}

/**
 * 离线队列项
 */
interface OfflineQueueItem {
  /** 端点类型 */
  endpoint: 'start' | 'progress' | 'stopped'
  /** 报告数据 */
  report: PlaybackProgressReport
  /** 时间戳 */
  timestamp: number
}

/**
 * 本地存储键
 */
const OFFLINE_QUEUE_KEY = 'emby_offline_progress_queue'

/**
 * 播放进度跟踪器
 */
export class ProgressTracker {
  private apiClient: EmbyApiClient
  private reportInterval: number
  private serverUrl: string
  private apiToken: string
  private timerId: number | null = null
  private currentSession: PlaySessionInfo | null = null
  private isTracking = false
  private isOnline = true
  private offlineQueue: OfflineQueueItem[] = []
  private lastProgressReport: PlaybackProgressReport | null = null
  private onlineHandler: (() => void) | null = null
  private offlineHandler: (() => void) | null = null
  private beforeUnloadHandler: ((event: BeforeUnloadEvent) => void) | null = null

  constructor(config: ProgressTrackerConfig) {
    this.apiClient = config.apiClient
    this.reportInterval = config.reportInterval || 10000 // 默认 10 秒
    this.serverUrl = config.serverUrl || ''
    this.apiToken = config.apiToken || ''
    
    // 初始化网络状态
    this.isOnline = navigator.onLine
    
    // 加载离线队列
    this.loadOfflineQueue()
    
    // 监听网络状态变化
    this.setupNetworkListeners()
    
    // 监听页面卸载事件
    this.setupBeforeUnloadListener()
    
    // 如果当前在线且有离线队列，尝试发送
    if (this.isOnline && this.offlineQueue.length > 0) {
      this.processOfflineQueue()
    }
  }

  /**
   * 开始跟踪会话
   * @param sessionInfo - 播放会话信息
   */
  public startTracking(sessionInfo: PlaySessionInfo): void {
    // 如果已经在跟踪，先停止
    if (this.isTracking) {
      this.stopTracking()
    }

    this.currentSession = sessionInfo
    this.isTracking = true

    // 启动定时器，每 10 秒自动报告进度
    this.timerId = window.setInterval(() => {
      // 定时器触发时不传递报告数据，由外部调用 reportPlaybackProgress
      // 这里只是一个提醒机制
    }, this.reportInterval)
  }

  /**
   * 设置网络状态监听器
   */
  private setupNetworkListeners(): void {
    this.onlineHandler = () => {
      console.log('网络已连接，处理离线队列')
      this.isOnline = true
      this.processOfflineQueue()
    }

    this.offlineHandler = () => {
      console.log('网络已断开，进度更新将被排队')
      this.isOnline = false
    }

    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
  }

  /**
   * 设置页面卸载监听器
   */
  private setupBeforeUnloadListener(): void {
    this.beforeUnloadHandler = (_event: BeforeUnloadEvent) => {
      // 如果有最后的进度报告，使用 sendBeacon 发送
      if (this.lastProgressReport && this.serverUrl) {
        this.sendBeaconProgress(this.lastProgressReport)
      }
    }

    window.addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  /**
   * 加载离线队列
   */
  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (stored) {
        this.offlineQueue = JSON.parse(stored)
        console.log(`加载了 ${this.offlineQueue.length} 个离线进度更新`)
      }
    } catch (error) {
      console.error('加载离线队列失败:', error)
      this.offlineQueue = []
    }
  }

  /**
   * 保存离线队列
   */
  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue))
    } catch (error) {
      console.error('保存离线队列失败:', error)
    }
  }

  /**
   * 添加到离线队列
   */
  private addToOfflineQueue(
    endpoint: 'start' | 'progress' | 'stopped',
    report: PlaybackProgressReport
  ): void {
    const item: OfflineQueueItem = {
      endpoint,
      report,
      timestamp: Date.now(),
    }

    this.offlineQueue.push(item)
    this.saveOfflineQueue()
    console.log(`进度更新已添加到离线队列（队列长度: ${this.offlineQueue.length}）`)
  }

  /**
   * 处理离线队列
   */
  private async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return
    }

    console.log(`开始处理离线队列（${this.offlineQueue.length} 项）`)

    // 复制队列并清空原队列
    const queue = [...this.offlineQueue]
    this.offlineQueue = []
    this.saveOfflineQueue()

    // 按时间顺序发送队列中的更新
    for (const item of queue) {
      try {
        await this.sendQueuedReport(item)
      } catch (error) {
        console.error('发送队列项失败:', error)
        // 如果发送失败，重新添加到队列
        this.offlineQueue.push(item)
      }
    }

    // 如果有失败的项，保存队列
    if (this.offlineQueue.length > 0) {
      this.saveOfflineQueue()
      console.log(`${this.offlineQueue.length} 个队列项发送失败，已重新排队`)
    } else {
      console.log('离线队列处理完成')
    }
  }

  /**
   * 发送队列中的报告
   */
  private async sendQueuedReport(item: OfflineQueueItem): Promise<void> {
    const endpoint =
      item.endpoint === 'start'
        ? playbackEndpoints.reportPlaybackStart()
        : item.endpoint === 'progress'
        ? playbackEndpoints.reportPlaybackProgress()
        : playbackEndpoints.reportPlaybackStopped()

    await this.apiClient.post(endpoint, item.report)
  }

  /**
   * 使用 sendBeacon 发送进度
   */
  private sendBeaconProgress(report: PlaybackProgressReport): void {
    if (!navigator.sendBeacon || !this.serverUrl || !this.apiToken) {
      return
    }

    try {
      // 使用 Progress 端点而不是 Stopped，避免 Emby 重置播放位置
      const endpoint = `${this.serverUrl}${playbackEndpoints.reportPlaybackProgress()}?api_key=${encodeURIComponent(this.apiToken)}`
      const data = JSON.stringify(report)
      const blob = new Blob([data], { type: 'application/json' })
      
      navigator.sendBeacon(endpoint, blob)
    } catch (error) {
      console.error('sendBeacon 发送错误:', error)
    }
  }

  /**
   * 报告播放开始
   * @param report - 播放进度报告
   */
  public async reportPlaybackStart(report: PlaybackProgressReport): Promise<void> {
    this.lastProgressReport = report

    // 如果离线，添加到队列
    if (!this.isOnline) {
      this.addToOfflineQueue('start', report)
      return
    }

    try {
      await this.apiClient.post(playbackEndpoints.reportPlaybackStart(), report)
    } catch (error) {
      console.error('报告播放开始失败:', error)
      // 如果是网络错误，添加到离线队列
      if (this.isNetworkError(error)) {
        this.addToOfflineQueue('start', report)
      }
      throw error
    }
  }

  /**
   * 报告播放进度
   * @param report - 播放进度报告
   */
  public async reportPlaybackProgress(report: PlaybackProgressReport): Promise<void> {
    this.lastProgressReport = report

    // 如果离线，添加到队列
    if (!this.isOnline) {
      this.addToOfflineQueue('progress', report)
      return
    }

    try {
      await this.apiClient.post(playbackEndpoints.reportPlaybackProgress(), report)
    } catch (error) {
      console.error('报告播放进度失败:', error)
      // 如果是网络错误，添加到离线队列
      if (this.isNetworkError(error)) {
        this.addToOfflineQueue('progress', report)
      }
      throw error
    }
  }

  /**
   * 报告播放停止
   * @param report - 播放进度报告
   */
  public async reportPlaybackStopped(report: PlaybackProgressReport): Promise<void> {
    this.lastProgressReport = report

    // 如果离线，添加到队列
    if (!this.isOnline) {
      this.addToOfflineQueue('stopped', report)
      return
    }

    try {
      await this.apiClient.post(playbackEndpoints.reportPlaybackStopped(), report)
    } catch (error) {
      console.error('报告播放停止失败:', error)
      // 如果是网络错误，添加到离线队列
      if (this.isNetworkError(error)) {
        this.addToOfflineQueue('stopped', report)
      }
      throw error
    }
  }

  /**
   * 判断是否为网络错误
   */
  private isNetworkError(error: any): boolean {
    // 检查常见的网络错误
    return (
      error instanceof TypeError ||
      error?.message?.includes('network') ||
      error?.message?.includes('fetch') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT'
    )
  }

  /**
   * 停止跟踪
   */
  public stopTracking(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId)
      this.timerId = null
    }

    this.currentSession = null
    this.isTracking = false
  }

  /**
   * 清理资源
   * 在组件卸载或不再需要跟踪器时调用
   */
  public destroy(): void {
    // 停止跟踪
    this.stopTracking()

    // 移除网络状态监听器
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler)
      this.onlineHandler = null
    }

    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler)
      this.offlineHandler = null
    }

    // 移除页面卸载监听器
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = null
    }
  }

  /**
   * 获取当前会话信息
   */
  public getCurrentSession(): PlaySessionInfo | null {
    return this.currentSession
  }

  /**
   * 是否正在跟踪
   */
  public getIsTracking(): boolean {
    return this.isTracking
  }

  /**
   * 获取报告间隔
   */
  public getReportInterval(): number {
    return this.reportInterval
  }

  /**
   * 获取当前网络状态
   */
  public getIsOnline(): boolean {
    return this.isOnline
  }

  /**
   * 获取离线队列长度
   */
  public getOfflineQueueLength(): number {
    return this.offlineQueue.length
  }

  /**
   * 手动触发离线队列处理
   */
  public async flushOfflineQueue(): Promise<void> {
    await this.processOfflineQueue()
  }

  /**
   * 清空离线队列
   */
  public clearOfflineQueue(): void {
    this.offlineQueue = []
    this.saveOfflineQueue()
  }
}

/**
 * 创建进度跟踪器实例
 */
export function createProgressTracker(config: ProgressTrackerConfig): ProgressTracker {
  return new ProgressTracker(config)
}
