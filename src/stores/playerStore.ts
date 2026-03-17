/**
 * 播放器状态管理 Store
 * 
 * 管理播放器状态，包括当前播放项、播放会话、播放状态等
 */

import { create } from 'zustand'
import type { MediaItem } from '@/types/emby'
import type { PlayMethod } from '@/types/player'

/**
 * 播放器状态接口
 */
interface PlayerState {
  // 状态
  /** 当前播放的媒体项 */
  currentItem: MediaItem | null
  /** 播放会话 ID */
  playSessionId: string | null
  /** 播放方法 */
  playMethod: PlayMethod | null
  /** 是否正在播放 */
  isPlaying: boolean
  /** 是否暂停 */
  isPaused: boolean
  /** 当前播放位置（ticks） */
  positionTicks: number
  /** 音量级别（0-100） */
  volumeLevel: number
  /** 是否静音 */
  isMuted: boolean

  // 操作
  setCurrentItem: (
    item: MediaItem,
    playSessionId: string,
    playMethod: PlayMethod
  ) => void
  updatePlaybackState: (state: Partial<PlaybackStateUpdate>) => void
  clearPlayback: () => void
}

/**
 * 播放状态更新参数
 */
interface PlaybackStateUpdate {
  isPlaying: boolean
  isPaused: boolean
  positionTicks: number
  volumeLevel: number
  isMuted: boolean
}

/**
 * 创建播放器状态 Store
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  // 初始状态
  currentItem: null,
  playSessionId: null,
  playMethod: null,
  isPlaying: false,
  isPaused: false,
  positionTicks: 0,
  volumeLevel: 100,
  isMuted: false,

  /**
   * 设置当前播放项
   * 
   * @param item - 媒体项
   * @param playSessionId - 播放会话 ID
   * @param playMethod - 播放方法
   */
  setCurrentItem: (item: MediaItem, playSessionId: string, playMethod: PlayMethod) => {
    set({
      currentItem: item,
      playSessionId,
      playMethod,
      isPlaying: true,
      isPaused: false,
      positionTicks: 0,
    })
  },

  /**
   * 更新播放状态（部分更新）
   * 
   * @param state - 要更新的状态（部分）
   */
  updatePlaybackState: (state: Partial<PlaybackStateUpdate>) => {
    set((current) => ({
      ...current,
      ...state,
    }))
  },

  /**
   * 清除播放状态
   */
  clearPlayback: () => {
    set({
      currentItem: null,
      playSessionId: null,
      playMethod: null,
      isPlaying: false,
      isPaused: false,
      positionTicks: 0,
      volumeLevel: 100,
      isMuted: false,
    })
  },
}))

/**
 * 选择器：获取当前播放项
 */
export const selectCurrentItem = (state: PlayerState) => state.currentItem

/**
 * 选择器：获取播放会话 ID
 */
export const selectPlaySessionId = (state: PlayerState) => state.playSessionId

/**
 * 选择器：获取播放方法
 */
export const selectPlayMethod = (state: PlayerState) => state.playMethod

/**
 * 选择器：获取是否正在播放
 */
export const selectIsPlaying = (state: PlayerState) => state.isPlaying

/**
 * 选择器：获取是否暂停
 */
export const selectIsPaused = (state: PlayerState) => state.isPaused

/**
 * 选择器：获取播放位置
 */
export const selectPositionTicks = (state: PlayerState) => state.positionTicks

/**
 * 选择器：获取音量级别
 */
export const selectVolumeLevel = (state: PlayerState) => state.volumeLevel

/**
 * 选择器：获取是否静音
 */
export const selectIsMuted = (state: PlayerState) => state.isMuted
