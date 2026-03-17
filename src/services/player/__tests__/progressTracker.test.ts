/**
 * 进度跟踪服务测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProgressTracker, createProgressTracker } from '../progressTracker'
import type { EmbyApiClient } from '@/services/api/embyClient'
import type { PlaySessionInfo, PlaybackProgressReport } from '@/types/player'

// Mock API 客户端
const createMockApiClient = (): EmbyApiClient => {
  return {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  } as any
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock navigator.onLine
let onlineStatus = true
Object.defineProperty(navigator, 'onLine', {
  get: () => onlineStatus,
  configurable: true,
})

// Mock navigator.sendBeacon
const sendBeaconMock = vi.fn().mockReturnValue(true)
Object.defineProperty(navigator, 'sendBeacon', {
  value: sendBeaconMock,
  configurable: true,
})

describe('ProgressTracker', () => {
  let tracker: ProgressTracker
  let mockApiClient: EmbyApiClient

  beforeEach(() => {
    vi.useFakeTimers()
    mockApiClient = createMockApiClient()
    
    // 重置 localStorage
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    localStorageMock.clear()
    
    // 重置网络状态
    onlineStatus = true
    
    // 重置 sendBeacon mock
    sendBeaconMock.mockClear()
    
    tracker = createProgressTracker({
      apiClient: mockApiClient,
      reportInterval: 10000,
      serverUrl: 'http://localhost:8096/emby',
    })
  })

  afterEach(() => {
    tracker.destroy()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('创建实例', () => {
    it('应该成功创建进度跟踪器', () => {
      expect(tracker).toBeDefined()
      expect(tracker.getIsTracking()).toBe(false)
      expect(tracker.getCurrentSession()).toBeNull()
    })

    it('应该使用默认报告间隔', () => {
      expect(tracker.getReportInterval()).toBe(10000)
    })

    it('应该使用自定义报告间隔', () => {
      const customTracker = createProgressTracker({
        apiClient: mockApiClient,
        reportInterval: 5000,
      })
      expect(customTracker.getReportInterval()).toBe(5000)
    })
  })

  describe('startTracking', () => {
    it('应该开始跟踪会话', () => {
      const sessionInfo: PlaySessionInfo = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        playMethod: 'DirectPlay',
        audioStreamIndex: 0,
        subtitleStreamIndex: -1,
      }

      tracker.startTracking(sessionInfo)

      expect(tracker.getIsTracking()).toBe(true)
      expect(tracker.getCurrentSession()).toEqual(sessionInfo)
    })

    it('应该在已跟踪时先停止再开始新跟踪', () => {
      const session1: PlaySessionInfo = {
        itemId: 'item-1',
        mediaSourceId: 'source-1',
        playSessionId: 'session-1',
        playMethod: 'DirectPlay',
      }

      const session2: PlaySessionInfo = {
        itemId: 'item-2',
        mediaSourceId: 'source-2',
        playSessionId: 'session-2',
        playMethod: 'Transcode',
      }

      tracker.startTracking(session1)
      expect(tracker.getCurrentSession()).toEqual(session1)

      tracker.startTracking(session2)
      expect(tracker.getCurrentSession()).toEqual(session2)
      expect(tracker.getIsTracking()).toBe(true)
    })
  })

  describe('reportPlaybackStart', () => {
    it('应该成功报告播放开始', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 0,
        isPaused: false,
        isMuted: false,
        volumeLevel: 100,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackStart(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing', report)
    })

    it('应该在 API 调用失败时抛出错误', async () => {
      const error = new Error('网络错误')
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(error)

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 0,
        isPaused: false,
        isMuted: false,
        volumeLevel: 100,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await expect(tracker.reportPlaybackStart(report)).rejects.toThrow('网络错误')
    })
  })

  describe('reportPlaybackProgress', () => {
    it('应该成功报告播放进度', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000, // 5 秒
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
        eventName: 'TimeUpdate',
      }

      await tracker.reportPlaybackProgress(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing/Progress', report)
    })

    it('应该支持暂停事件', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 100000000,
        isPaused: true,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
        eventName: 'Pause',
      }

      await tracker.reportPlaybackProgress(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing/Progress', report)
    })

    it('应该支持音量变化事件', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 100000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 50,
        playMethod: 'DirectPlay',
        canSeek: true,
        eventName: 'VolumeChange',
      }

      await tracker.reportPlaybackProgress(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing/Progress', report)
    })

    it('应该在 API 调用失败时抛出错误', async () => {
      const error = new Error('服务器错误')
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(error)

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await expect(tracker.reportPlaybackProgress(report)).rejects.toThrow('服务器错误')
    })
  })

  describe('reportPlaybackStopped', () => {
    it('应该成功报告播放停止', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 200000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackStopped(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing/Stopped', report)
    })

    it('应该在 API 调用失败时抛出错误', async () => {
      const error = new Error('网络错误')
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(error)

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 200000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await expect(tracker.reportPlaybackStopped(report)).rejects.toThrow('网络错误')
    })
  })

  describe('stopTracking', () => {
    it('应该停止跟踪并清理定时器', () => {
      const sessionInfo: PlaySessionInfo = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        playMethod: 'DirectPlay',
      }

      tracker.startTracking(sessionInfo)
      expect(tracker.getIsTracking()).toBe(true)

      tracker.stopTracking()
      expect(tracker.getIsTracking()).toBe(false)
      expect(tracker.getCurrentSession()).toBeNull()
    })

    it('应该在未跟踪时安全调用', () => {
      expect(() => tracker.stopTracking()).not.toThrow()
    })
  })

  describe('定时器行为', () => {
    it('应该启动定时器', () => {
      const sessionInfo: PlaySessionInfo = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        playMethod: 'DirectPlay',
      }

      tracker.startTracking(sessionInfo)

      // 验证定时器已启动（通过检查跟踪状态）
      expect(tracker.getIsTracking()).toBe(true)
    })

    it('应该在停止跟踪时清理定时器', () => {
      const sessionInfo: PlaySessionInfo = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        playMethod: 'DirectPlay',
      }

      tracker.startTracking(sessionInfo)
      tracker.stopTracking()

      // 验证定时器已清理
      expect(tracker.getIsTracking()).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理包含所有可选字段的报告', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 100000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'Transcode',
        canSeek: true,
        eventName: 'AudioTrackChange',
        audioStreamIndex: 1,
        subtitleStreamIndex: 2,
        liveStreamId: 'live-123',
        playlistIndex: 0,
        playlistLength: 5,
        queueableMediaTypes: ['Audio', 'Video'],
      }

      await tracker.reportPlaybackProgress(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing/Progress', report)
    })

    it('应该处理最小字段的报告', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 0,
        isPaused: false,
        isMuted: false,
        volumeLevel: 100,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackStart(report)

      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Playing', report)
    })
  })

  describe('离线队列功能', () => {
    it('应该在离线时将进度更新添加到队列', async () => {
      // 模拟离线状态
      onlineStatus = false
      window.dispatchEvent(new Event('offline'))

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackProgress(report)

      // 不应该调用 API
      expect(mockApiClient.post).not.toHaveBeenCalled()

      // 队列长度应该为 1
      expect(tracker.getOfflineQueueLength()).toBe(1)
    })

    it('应该在在线时自动发送队列中的更新', async () => {
      // 先离线并添加到队列
      onlineStatus = false
      window.dispatchEvent(new Event('offline'))

      const report1: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      const report2: PlaybackProgressReport = {
        ...report1,
        positionTicks: 100000000,
      }

      await tracker.reportPlaybackProgress(report1)
      await tracker.reportPlaybackProgress(report2)

      expect(tracker.getOfflineQueueLength()).toBe(2)

      // 恢复在线
      onlineStatus = true
      window.dispatchEvent(new Event('online'))

      // 等待队列处理
      await vi.waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledTimes(2)
      })

      // 队列应该被清空
      expect(tracker.getOfflineQueueLength()).toBe(0)
    })

    it('应该在网络错误时将更新添加到队列', async () => {
      // 模拟网络错误
      vi.mocked(mockApiClient.post).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await expect(tracker.reportPlaybackProgress(report)).rejects.toThrow('Failed to fetch')

      // 应该添加到队列
      expect(tracker.getOfflineQueueLength()).toBe(1)
    })

    it('应该持久化离线队列到 localStorage', async () => {
      onlineStatus = false
      window.dispatchEvent(new Event('offline'))

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackProgress(report)

      // 检查 localStorage
      const stored = localStorage.getItem('emby_offline_progress_queue')
      expect(stored).toBeTruthy()

      const queue = JSON.parse(stored!)
      expect(queue).toHaveLength(1)
      expect(queue[0].report).toEqual(report)
    })

    it('应该在初始化时加载离线队列', () => {
      // 预先设置 localStorage
      const queueData = [
        {
          endpoint: 'progress',
          report: {
            itemId: 'item-123',
            mediaSourceId: 'source-123',
            playSessionId: 'session-123',
            positionTicks: 50000000,
            isPaused: false,
            isMuted: false,
            volumeLevel: 80,
            playMethod: 'DirectPlay',
            canSeek: true,
          },
          timestamp: Date.now(),
        },
      ]

      localStorage.setItem('emby_offline_progress_queue', JSON.stringify(queueData))

      // 设置为离线状态，避免自动处理队列
      onlineStatus = false

      // 创建新的跟踪器
      const newTracker = createProgressTracker({
        apiClient: mockApiClient,
        reportInterval: 10000,
        serverUrl: 'http://localhost:8096/emby',
      })

      expect(newTracker.getOfflineQueueLength()).toBe(1)

      newTracker.destroy()
      
      // 恢复在线状态
      onlineStatus = true
    })

    it('应该支持手动触发队列处理', async () => {
      onlineStatus = false
      window.dispatchEvent(new Event('offline'))

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackProgress(report)
      expect(tracker.getOfflineQueueLength()).toBe(1)

      // 恢复在线
      onlineStatus = true

      // 手动触发队列处理
      await tracker.flushOfflineQueue()

      expect(mockApiClient.post).toHaveBeenCalledTimes(1)
      expect(tracker.getOfflineQueueLength()).toBe(0)
    })

    it('应该支持清空离线队列', async () => {
      onlineStatus = false
      window.dispatchEvent(new Event('offline'))

      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 50000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      await tracker.reportPlaybackProgress(report)
      expect(tracker.getOfflineQueueLength()).toBe(1)

      tracker.clearOfflineQueue()
      expect(tracker.getOfflineQueueLength()).toBe(0)
    })
  })

  describe('sendBeacon 功能', () => {
    it('应该在页面卸载时使用 sendBeacon 发送最终进度', async () => {
      const report: PlaybackProgressReport = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        positionTicks: 200000000,
        isPaused: false,
        isMuted: false,
        volumeLevel: 80,
        playMethod: 'DirectPlay',
        canSeek: true,
      }

      // 报告进度（保存为最后的进度）
      await tracker.reportPlaybackProgress(report)

      // 触发 beforeunload 事件
      window.dispatchEvent(new Event('beforeunload'))

      // 应该调用 sendBeacon
      expect(sendBeaconMock).toHaveBeenCalled()
      
      // 检查调用参数
      const [url, data] = sendBeaconMock.mock.calls[0]
      expect(url).toContain('/Sessions/Playing/Stopped')
      
      // 验证发送的数据
      const blob = data as Blob
      expect(blob.type).toBe('application/json')
    })

    it('应该在没有进度报告时不调用 sendBeacon', () => {
      // 触发 beforeunload 事件（没有任何进度报告）
      window.dispatchEvent(new Event('beforeunload'))

      // 不应该调用 sendBeacon
      expect(sendBeaconMock).not.toHaveBeenCalled()
    })
  })

  describe('资源清理', () => {
    it('应该在 destroy 时移除所有事件监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      tracker.destroy()

      // 应该移除 online、offline 和 beforeunload 监听器
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    })

    it('应该在 destroy 时停止跟踪', () => {
      const sessionInfo: PlaySessionInfo = {
        itemId: 'item-123',
        mediaSourceId: 'source-123',
        playSessionId: 'session-123',
        playMethod: 'DirectPlay',
      }

      tracker.startTracking(sessionInfo)
      expect(tracker.getIsTracking()).toBe(true)

      tracker.destroy()
      expect(tracker.getIsTracking()).toBe(false)
    })
  })
})
