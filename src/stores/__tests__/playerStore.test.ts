/**
 * playerStore 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { usePlayerStore } from '../playerStore'
import type { MediaItem } from '@/types/emby'
import type { PlayMethod } from '@/types/player'

describe('playerStore', () => {
  // 在每个测试前重置 store 状态
  beforeEach(() => {
    const { clearPlayback } = usePlayerStore.getState()
    clearPlayback()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = usePlayerStore.getState()

      expect(state.currentItem).toBeNull()
      expect(state.playSessionId).toBeNull()
      expect(state.playMethod).toBeNull()
      expect(state.isPlaying).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.positionTicks).toBe(0)
      expect(state.volumeLevel).toBe(100)
      expect(state.isMuted).toBe(false)
    })
  })

  describe('setCurrentItem', () => {
    it('应该设置当前播放项和相关状态', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试电影',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
        runTimeTicks: 72000000000,
      }
      const playSessionId = 'session-456'
      const playMethod: PlayMethod = 'DirectPlay'

      const { setCurrentItem } = usePlayerStore.getState()
      setCurrentItem(mockItem, playSessionId, playMethod)

      const state = usePlayerStore.getState()
      expect(state.currentItem).toEqual(mockItem)
      expect(state.playSessionId).toBe(playSessionId)
      expect(state.playMethod).toBe(playMethod)
      expect(state.isPlaying).toBe(true)
      expect(state.isPaused).toBe(false)
      expect(state.positionTicks).toBe(0)
    })

    it('应该支持不同的播放方法', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试视频',
        serverId: 'server-1',
        type: 'Episode',
        isFolder: false,
      }

      const playMethods: PlayMethod[] = ['DirectPlay', 'DirectStream', 'Transcode']

      playMethods.forEach((method) => {
        const { setCurrentItem } = usePlayerStore.getState()
        setCurrentItem(mockItem, `session-${method}`, method)

        const state = usePlayerStore.getState()
        expect(state.playMethod).toBe(method)
      })
    })
  })

  describe('updatePlaybackState', () => {
    it('应该更新播放状态（部分更新）', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      updatePlaybackState({
        isPlaying: true,
        positionTicks: 10000000,
      })

      const state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(true)
      expect(state.positionTicks).toBe(10000000)
      // 其他状态应保持不变
      expect(state.isPaused).toBe(false)
      expect(state.volumeLevel).toBe(100)
      expect(state.isMuted).toBe(false)
    })

    it('应该更新暂停状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      updatePlaybackState({ isPaused: true })

      const state = usePlayerStore.getState()
      expect(state.isPaused).toBe(true)
    })

    it('应该更新音量级别', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      updatePlaybackState({ volumeLevel: 50 })

      const state = usePlayerStore.getState()
      expect(state.volumeLevel).toBe(50)
    })

    it('应该更新静音状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      updatePlaybackState({ isMuted: true })

      const state = usePlayerStore.getState()
      expect(state.isMuted).toBe(true)
    })

    it('应该支持同时更新多个状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      updatePlaybackState({
        isPlaying: true,
        isPaused: false,
        positionTicks: 50000000,
        volumeLevel: 75,
        isMuted: false,
      })

      const state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(true)
      expect(state.isPaused).toBe(false)
      expect(state.positionTicks).toBe(50000000)
      expect(state.volumeLevel).toBe(75)
      expect(state.isMuted).toBe(false)
    })

    it('应该支持连续更新', () => {
      const { updatePlaybackState } = usePlayerStore.getState()

      // 第一次更新
      updatePlaybackState({ positionTicks: 10000000 })
      expect(usePlayerStore.getState().positionTicks).toBe(10000000)

      // 第二次更新
      updatePlaybackState({ positionTicks: 20000000 })
      expect(usePlayerStore.getState().positionTicks).toBe(20000000)

      // 第三次更新
      updatePlaybackState({ positionTicks: 30000000 })
      expect(usePlayerStore.getState().positionTicks).toBe(30000000)
    })
  })

  describe('clearPlayback', () => {
    it('应该清除所有播放状态', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试电影',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      // 先设置一些状态
      const { setCurrentItem, updatePlaybackState, clearPlayback } =
        usePlayerStore.getState()

      setCurrentItem(mockItem, 'session-123', 'DirectPlay')
      updatePlaybackState({
        positionTicks: 50000000,
        volumeLevel: 80,
        isMuted: true,
      })

      // 验证状态已设置
      let state = usePlayerStore.getState()
      expect(state.currentItem).not.toBeNull()
      expect(state.playSessionId).not.toBeNull()

      // 清除状态
      clearPlayback()

      // 验证所有状态已重置
      state = usePlayerStore.getState()
      expect(state.currentItem).toBeNull()
      expect(state.playSessionId).toBeNull()
      expect(state.playMethod).toBeNull()
      expect(state.isPlaying).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.positionTicks).toBe(0)
      expect(state.volumeLevel).toBe(100)
      expect(state.isMuted).toBe(false)
    })
  })

  describe('状态访问', () => {
    it('应该能够访问当前播放项', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试电影',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      const { setCurrentItem } = usePlayerStore.getState()
      setCurrentItem(mockItem, 'session-123', 'DirectPlay')

      const state = usePlayerStore.getState()
      expect(state.currentItem).toEqual(mockItem)
    })

    it('应该能够访问播放会话 ID', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试电影',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      const { setCurrentItem } = usePlayerStore.getState()
      setCurrentItem(mockItem, 'session-456', 'DirectPlay')

      const state = usePlayerStore.getState()
      expect(state.playSessionId).toBe('session-456')
    })

    it('应该能够访问播放方法', () => {
      const mockItem: MediaItem = {
        id: 'item-123',
        name: '测试电影',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      const { setCurrentItem } = usePlayerStore.getState()
      setCurrentItem(mockItem, 'session-123', 'Transcode')

      const state = usePlayerStore.getState()
      expect(state.playMethod).toBe('Transcode')
    })

    it('应该能够访问播放状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()
      updatePlaybackState({ isPlaying: true })

      const state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(true)
    })

    it('应该能够访问暂停状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()
      updatePlaybackState({ isPaused: true })

      const state = usePlayerStore.getState()
      expect(state.isPaused).toBe(true)
    })

    it('应该能够访问播放位置', () => {
      const { updatePlaybackState } = usePlayerStore.getState()
      updatePlaybackState({ positionTicks: 12345678 })

      const state = usePlayerStore.getState()
      expect(state.positionTicks).toBe(12345678)
    })

    it('应该能够访问音量级别', () => {
      const { updatePlaybackState } = usePlayerStore.getState()
      updatePlaybackState({ volumeLevel: 65 })

      const state = usePlayerStore.getState()
      expect(state.volumeLevel).toBe(65)
    })

    it('应该能够访问静音状态', () => {
      const { updatePlaybackState } = usePlayerStore.getState()
      updatePlaybackState({ isMuted: true })

      const state = usePlayerStore.getState()
      expect(state.isMuted).toBe(true)
    })
  })

  describe('实际使用场景', () => {
    it('应该模拟完整的播放流程', () => {
      const mockItem: MediaItem = {
        id: 'movie-001',
        name: '星际穿越',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
        runTimeTicks: 169200000000, // 2小时49分钟
      }

      const { setCurrentItem, updatePlaybackState, clearPlayback } =
        usePlayerStore.getState()

      // 1. 开始播放
      setCurrentItem(mockItem, 'play-session-001', 'DirectPlay')
      let state = usePlayerStore.getState()
      expect(state.isPlaying).toBe(true)
      expect(state.positionTicks).toBe(0)

      // 2. 播放进度更新
      updatePlaybackState({ positionTicks: 10000000000 }) // 播放到 16分40秒
      state = usePlayerStore.getState()
      expect(state.positionTicks).toBe(10000000000)

      // 3. 暂停
      updatePlaybackState({ isPaused: true })
      state = usePlayerStore.getState()
      expect(state.isPaused).toBe(true)

      // 4. 继续播放
      updatePlaybackState({ isPaused: false })
      state = usePlayerStore.getState()
      expect(state.isPaused).toBe(false)

      // 5. 调整音量
      updatePlaybackState({ volumeLevel: 60 })
      state = usePlayerStore.getState()
      expect(state.volumeLevel).toBe(60)

      // 6. 静音
      updatePlaybackState({ isMuted: true })
      state = usePlayerStore.getState()
      expect(state.isMuted).toBe(true)

      // 7. 取消静音
      updatePlaybackState({ isMuted: false })
      state = usePlayerStore.getState()
      expect(state.isMuted).toBe(false)

      // 8. 停止播放
      clearPlayback()
      state = usePlayerStore.getState()
      expect(state.currentItem).toBeNull()
      expect(state.isPlaying).toBe(false)
    })

    it('应该支持切换播放项', () => {
      const movie1: MediaItem = {
        id: 'movie-001',
        name: '电影1',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      const movie2: MediaItem = {
        id: 'movie-002',
        name: '电影2',
        serverId: 'server-1',
        type: 'Movie',
        isFolder: false,
      }

      const { setCurrentItem } = usePlayerStore.getState()

      // 播放第一部电影
      setCurrentItem(movie1, 'session-001', 'DirectPlay')
      let state = usePlayerStore.getState()
      expect(state.currentItem?.id).toBe('movie-001')
      expect(state.playSessionId).toBe('session-001')

      // 切换到第二部电影
      setCurrentItem(movie2, 'session-002', 'Transcode')
      state = usePlayerStore.getState()
      expect(state.currentItem?.id).toBe('movie-002')
      expect(state.playSessionId).toBe('session-002')
      expect(state.playMethod).toBe('Transcode')
      // 位置应该重置为 0
      expect(state.positionTicks).toBe(0)
    })
  })
})
