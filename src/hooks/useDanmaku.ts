/**
 * 弹幕 Hook
 * 
 * 封装弹幕相关的逻辑，包括搜索、加载、发送等
 */

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { MediaItem } from '@/types/emby'
import type { DanmakuType } from '@/types/danmaku'
import { useDanmakuStore } from '@/stores/danmakuStore'
import { createDanmakuClient } from '@/services/api/danmakuClient'
import { createDanmakuMatcher } from '@/services/danmaku/danmakuMatcher'

/**
 * 弹幕 Hook 配置
 */
interface UseDanmakuOptions {
  /** 媒体项 */
  mediaItem: MediaItem
  /** 是否启用弹幕 */
  enabled?: boolean
}

/**
 * 弹幕 Hook
 */
export function useDanmaku({ mediaItem, enabled = true }: UseDanmakuOptions) {
  const { setDanmakuList, setCurrentEpisodeId } = useDanmakuStore()
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [isMatching, setIsMatching] = useState(false)
  const [manualEpisodeId, setManualEpisodeId] = useState<string | null>(null)

  // 创建弹幕 API 客户端
  const danmakuClient = createDanmakuClient({
    baseUrl: import.meta.env.VITE_DANMAKU_API_URL || 'http://localhost:9321',
  })

  // 创建弹幕匹配器
  const danmakuMatcher = createDanmakuMatcher(danmakuClient)

  // 匹配弹幕
  useEffect(() => {
    // 如果有手动选择的弹幕，优先使用手动选择的
    if (manualEpisodeId) {
      setEpisodeId(manualEpisodeId)
      setCurrentEpisodeId(manualEpisodeId)
      return
    }

    if (!enabled) return

    const matchDanmaku = async () => {
      try {
        setIsMatching(true)
        console.log('开始匹配弹幕:', mediaItem.name)

        const result = await danmakuMatcher.matchDanmaku(mediaItem)

        if (result) {
          console.log('匹配成功:', result)
          setEpisodeId(result.episodeId)
          setCurrentEpisodeId(result.episodeId)
        } else {
          console.log('未找到匹配的弹幕')
          setEpisodeId(null)
          setCurrentEpisodeId(null)
        }
      } catch (error) {
        console.error('匹配弹幕失败:', error)
        setEpisodeId(null)
        setCurrentEpisodeId(null)
      } finally {
        setIsMatching(false)
      }
    }

    matchDanmaku()

    // 清理函数 - 只在组件卸载时清理
    return () => {
      // 不清理弹幕数据，保留缓存
    }
  }, [mediaItem.id, manualEpisodeId]) // 添加 manualEpisodeId 依赖

  // 获取弹幕数据
  const {
    data: danmakuList,
    isLoading: isLoadingDanmaku,
    error: danmakuError,
  } = useQuery({
    queryKey: ['danmaku', episodeId],
    queryFn: async () => {
      if (!episodeId) return []

      console.log('获取弹幕数据:', episodeId)
      const list = await danmakuClient.getDanmaku(episodeId)
      console.log(`获取到 ${list.length} 条弹幕`)

      // 更新到 store
      setDanmakuList(list)

      return list
    },
    enabled: !!episodeId && enabled,
    staleTime: 10 * 60 * 1000, // 缓存 10 分钟
    gcTime: 10 * 60 * 1000,
  })

  // 发送弹幕
  const sendDanmakuMutation = useMutation({
    mutationFn: async ({
      text,
      color,
      type,
      time,
    }: {
      text: string
      color: string
      type: DanmakuType
      time: number
    }) => {
      if (!episodeId) {
        throw new Error('未找到弹幕剧集 ID')
      }

      // 转换类型代码：scroll=1, bottom=4, top=5
      let typeCode = 1
      if (type === 'bottom') typeCode = 4
      else if (type === 'top') typeCode = 5

      // 转换颜色：十六进制 -> 十进制
      const colorDecimal = parseInt(color.replace('#', ''), 16)

      await danmakuClient.postDanmaku({
        episodeId,
        time,
        type: typeCode,
        color: colorDecimal,
        text,
      })
    },
    onError: (error) => {
      console.error('发送弹幕失败:', error)
    },
  })

  // 手动选择弹幕
  const selectDanmaku = (newEpisodeId: string) => {
    setManualEpisodeId(newEpisodeId)
  }

  // 重置为自动匹配
  const resetToAutoMatch = () => {
    setManualEpisodeId(null)
  }

  return {
    // 状态
    episodeId,
    danmakuList: danmakuList || [],
    isMatching,
    isLoadingDanmaku,
    danmakuError,
    hasDanmaku: !!episodeId && (danmakuList?.length || 0) > 0,
    isManualSelection: !!manualEpisodeId,

    // 操作
    sendDanmaku: sendDanmakuMutation.mutateAsync,
    isSendingDanmaku: sendDanmakuMutation.isPending,
    selectDanmaku,
    resetToAutoMatch,
  }
}
