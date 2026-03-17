/**
 * 弹幕状态管理
 * 
 * 使用 Zustand 管理弹幕数据和设置
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DanmakuItem, DanmakuSettings } from '@/types/danmaku'

/**
 * 弹幕状态接口
 */
interface DanmakuState {
  // 弹幕数据
  danmakuList: DanmakuItem[]
  currentEpisodeId: string | null
  
  // 设置
  settings: DanmakuSettings
  
  // 操作
  setDanmakuList: (list: DanmakuItem[]) => void
  addDanmaku: (item: DanmakuItem) => void
  updateSettings: (settings: Partial<DanmakuSettings>) => void
  clearDanmaku: () => void
  setCurrentEpisodeId: (id: string | null) => void
}

/**
 * 默认弹幕设置
 */
const defaultSettings: DanmakuSettings = {
  enabled: true,
  opacity: 80,
  speed: 5, // 中等速度（1-10）
  fontSize: 26, // 中等字体大小（像素）
  displayArea: 100, // 全屏显示（0-100，表示从顶部开始的显示区域高度百分比）
  maxCount: 50,
  filters: {
    keywords: [],
    users: [],
  },
}

/**
 * 弹幕状态 Store
 */
export const useDanmakuStore = create<DanmakuState>()(
  persist(
    (set) => ({
      // 初始状态
      danmakuList: [],
      currentEpisodeId: null,
      settings: defaultSettings,

      // 设置弹幕列表
      setDanmakuList: (list) => set({ danmakuList: list }),

      // 添加单条弹幕
      addDanmaku: (item) =>
        set((state) => ({
          danmakuList: [...state.danmakuList, item].sort((a, b) => a.time - b.time),
        })),

      // 更新设置
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // 清空弹幕
      clearDanmaku: () => set({ danmakuList: [], currentEpisodeId: null }),

      // 设置当前剧集 ID
      setCurrentEpisodeId: (id) => set({ currentEpisodeId: id }),
    }),
    {
      name: 'danmaku-storage',
      // 只持久化设置，不持久化弹幕数据
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
