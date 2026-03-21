/**
 * 弹幕选择器组件
 * 
 * 允许用户手动搜索和选择弹幕源
 */

import { useState, useRef, useEffect } from 'react'
import { Search, Loader2, ChevronRight, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createDanmakuClient } from '@/services/api/danmakuClient'
import type { DanmakuAnimeResult, DanmakuEpisodeResult } from '@/types/danmaku'
import { DANMAKU_API_URL } from '@/utils/constants'

interface DanmakuSelectorProps {
  /** 是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 选择弹幕回调 */
  onSelect: (episodeId: string, animeTitle: string, episodeTitle: string) => void
  /** 默认搜索关键词 */
  defaultKeyword?: string
  /** 触发按钮的引用（用于定位） */
  triggerRef?: React.RefObject<HTMLElement>
}

/**
 * 弹幕选择器组件
 */
export default function DanmakuSelector({
  open,
  onClose,
  onSelect,
  defaultKeyword = '',
  triggerRef,
}: DanmakuSelectorProps) {
  const [keyword, setKeyword] = useState(defaultKeyword)
  const [searchKeyword, setSearchKeyword] = useState(defaultKeyword)
  const [selectedAnime, setSelectedAnime] = useState<DanmakuAnimeResult | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ bottom: 0, right: 0 })

  // 创建弹幕 API 客户端
  const danmakuClient = createDanmakuClient({
    baseUrl: DANMAKU_API_URL,
  })

  // 计算弹出位置
  useEffect(() => {
    if (!open || !triggerRef?.current) return

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect()
      if (!triggerRect) return

      // 从触发按钮的位置向上弹出
      // bottom: 视口高度 - 按钮顶部位置 + 一点间距
      const bottomOffset = window.innerHeight - triggerRect.top + 8
      // right: 视口宽度 - 按钮右侧位置
      const rightOffset = window.innerWidth - triggerRect.right

      setPosition({
        bottom: bottomOffset,
        right: rightOffset,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [open, triggerRef])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose, triggerRef])

  // 搜索动画
  const {
    data: animeResults,
    isLoading: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: ['danmaku-search', searchKeyword],
    queryFn: () => danmakuClient.searchAnime(searchKeyword),
    enabled: searchKeyword.length > 0,
    staleTime: 5 * 60 * 1000, // 缓存 5 分钟
  })

  // 获取动画详情（剧集列表）
  const {
    data: animeDetail,
    isLoading: isLoadingDetail,
  } = useQuery({
    queryKey: ['danmaku-bangumi', selectedAnime?.animeId],
    queryFn: () => danmakuClient.getBangumi(selectedAnime!.animeId),
    enabled: !!selectedAnime,
    staleTime: 5 * 60 * 1000,
  })

  // 处理搜索
  const handleSearch = () => {
    if (keyword.trim()) {
      setSearchKeyword(keyword.trim())
      setSelectedAnime(null)
    }
  }

  // 处理选择动画
  const handleSelectAnime = (anime: DanmakuAnimeResult) => {
    setSelectedAnime(anime)
  }

  // 处理返回搜索结果
  const handleBack = () => {
    setSelectedAnime(null)
  }

  // 处理选择剧集
  const handleSelectEpisode = (episode: DanmakuEpisodeResult) => {
    if (selectedAnime) {
      onSelect(episode.episodeId, selectedAnime.animeTitle, episode.episodeTitle)
      onClose()
    }
  }

  // 处理选择动画（作为单集）
  const handleSelectAnimeAsEpisode = () => {
    if (selectedAnime) {
      onSelect(selectedAnime.animeId, selectedAnime.animeTitle, selectedAnime.animeTitle)
      onClose()
    }
  }

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          className="fixed w-[400px] max-h-[480px] rounded-2xl border flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: `${position.bottom}px`,
            right: `${position.right}px`,
            background: 'rgba(0, 0, 0, 0.75)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
        >
          {/* 头部 */}
          <div 
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            <h3 className="text-sm font-semibold text-white/95">选择弹幕源</h3>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/[0.15] transition-all duration-200 hover:scale-105 active:scale-95 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 搜索框 */}
          <div 
            className="px-4 py-3 border-b"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入动画名称搜索..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="flex-1 h-8 px-3 rounded-lg text-sm text-white placeholder:text-white/50 border transition-all duration-200 focus:outline-none focus:border-white/40 focus:bg-white/[0.08]"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}
              />
              <button
                onClick={handleSearch} 
                disabled={!keyword.trim() || isSearching}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-white/90 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-white/90" />
                )}
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {!selectedAnime ? (
              // 搜索结果列表
              <div className="space-y-2">
                {isSearching && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-white/40" />
                  </div>
                )}

                {searchError && (
                  <div className="text-center py-12 text-red-400/90">
                    搜索失败，请重试
                  </div>
                )}

                {!isSearching && !searchError && animeResults && animeResults.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    未找到匹配的动画
                  </div>
                )}

                {!isSearching && animeResults && animeResults.length > 0 && (
                  <>
                    <div className="text-xs text-white/60 mb-2 px-1">
                      找到 {animeResults.length} 个结果
                    </div>
                    {animeResults.map((anime) => (
                      <button
                        key={anime.animeId}
                        onClick={() => handleSelectAnime(anime)}
                        className="w-full p-3 rounded-xl border transition-all duration-200 text-left flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-white/95 truncate">{anime.animeTitle}</div>
                          <div className="text-xs text-white/65 mt-0.5">
                            {anime.typeDescription}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white/90 transition-colors flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </>
                )}

                {!searchKeyword && (
                  <div className="text-center py-12 text-white/40">
                    请输入关键词搜索动画
                  </div>
                )}
              </div>
            ) : (
              // 剧集列表
              <div className="space-y-2">
                {/* 返回按钮 */}
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 text-white/80 hover:text-white"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  <span className="text-xs">返回搜索结果</span>
                </button>

                {/* 动画标题 */}
                <div className="font-medium text-sm text-white/95 px-1">{selectedAnime.animeTitle}</div>

                {isLoadingDetail && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                  </div>
                )}

                {!isLoadingDetail && animeDetail && (
                  <>
                    {animeDetail.episodes && animeDetail.episodes.length > 0 ? (
                      <>
                        <div className="text-xs text-white/60 px-1">
                          共 {animeDetail.episodes.length} 集
                        </div>
                        <div className="space-y-1.5">
                          {animeDetail.episodes.map((episode) => (
                            <button
                              key={episode.episodeId}
                              onClick={() => handleSelectEpisode(episode)}
                              className="w-full p-2.5 rounded-xl border transition-all duration-200 text-left text-sm text-white/95 hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                              }}
                            >
                              {episode.episodeTitle}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div 
                          className="text-xs text-white/70 p-2.5 rounded-xl"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          该动画没有分集信息，将使用整部动画的弹幕
                        </div>
                        <button
                          onClick={handleSelectAnimeAsEpisode}
                          className="w-full py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                          style={{
                            background: 'rgba(59, 130, 246, 0.85)',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                            color: 'white',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 1)'
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.35)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.85)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.25)'
                          }}
                        >
                          使用此弹幕源
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
