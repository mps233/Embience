/**
 * 播放器页面
 * 
 * 播放器页面，用于播放视频和音频内容
 * 左右布局：左边播放器，右边选集列表
 * 
 * 需求：4.1, 4.4
 */

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { createEmbyClient } from '@/services/api/embyClient'
import { buildAuthenticatedApiUrl } from '@/services/api/mediaServer'
import { createMediaService } from '@/services/media/mediaService'
import { useMediaDetail, useMediaItems } from '@/hooks/useMedia'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import Header from '@/components/layout/Header'
import { Star } from 'lucide-react'

/**
 * 播放器页面组件
 */
export default function Player() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, serverUrl, serverType, accessToken } = useAuthStore()
  
  // 创建服务实例
  const apiClient = createEmbyClient({
    serverUrl: serverUrl || '',
    serverType: serverType || undefined,
    accessToken: accessToken || undefined,
  })
  const mediaService = createMediaService(apiClient)
  
  // 获取媒体详情
  const { data: mediaItem, isLoading, error } = useMediaDetail(
    mediaService,
    user?.id || '',
    id || '',
    !!user?.id && !!id
  )
  
  // 如果是剧集，获取同季的所有剧集
  const { data: episodesResponse } = useMediaItems(
    mediaService,
    user?.id || '',
    {
      parentId: mediaItem?.seasonId,
      includeItemTypes: ['Episode'],
      sortBy: ['IndexNumber'],
      sortOrder: 'Ascending',
    },
    !!mediaItem?.seasonId && !!user?.id
  )

  const episodeList = episodesResponse?.items || []
  const currentEpisodeIndex = mediaItem?.type === 'Episode'
    ? episodeList.findIndex((episode) => episode.id === mediaItem.id)
    : -1
  const previousEpisode = currentEpisodeIndex > 0 ? episodeList[currentEpisodeIndex - 1] : null
  const nextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodeList.length - 1
    ? episodeList[currentEpisodeIndex + 1]
    : null
  
  // 如果是剧集，获取电视剧信息（用于显示流派等元数据）
  const { data: seriesItem } = useMediaDetail(
    mediaService,
    user?.id || '',
    mediaItem?.seriesId || '',
    !!mediaItem?.seriesId && !!user?.id && mediaItem?.type === 'Episode'
  )
  
  // 计算起始播放位置 - 默认总是恢复上次播放位置
  const startPositionTicks = mediaItem?.userData?.playbackPositionTicks || 0
  
  // 如果视频已被标记为"已播放"，取消标记以便正常保存播放进度
  useEffect(() => {
    if (mediaItem?.userData?.played && user?.id && serverUrl && accessToken) {
      fetch(
        buildAuthenticatedApiUrl(
          serverUrl,
          `/Users/${user.id}/PlayedItems/${mediaItem.id}`,
          accessToken,
          serverType || 'emby'
        ),
        {
          method: 'DELETE',
        }
      ).catch((error) => {
        console.error('取消"已播放"标记失败:', error)
      })
    }
  }, [mediaItem, user?.id, serverUrl, accessToken, serverType])
  
  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[600px] pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">加载中...</p>
          </div>
        </div>
      </div>
    )
  }
  
  // 错误状态
  if (error || !mediaItem) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[600px] pt-20">
          <div className="text-center">
            <p className="text-red-500 mb-4">加载失败</p>
            <button
              onClick={() => navigate(-1)}
              className="rounded-full bg-white/10 px-6 py-2 text-white hover:bg-white/20"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <Header />

      <div className="flex-1 flex gap-2 px-2 sm:px-2 md:px-2 lg:px-2 xl:px-2 pt-20 pb-4 justify-center items-start min-h-0">
        {/* 左侧：播放器 */}
        <div className="flex flex-col h-full items-center justify-center flex-shrink-0">
          <VideoPlayer
            key={mediaItem.id}
            mediaItem={mediaItem}
            startPositionTicks={startPositionTicks}
            onPlaybackStart={() => {}}
            onPlaybackProgress={() => {}}
            onPlaybackEnd={() => {}}
            onPlayPreviousEpisode={previousEpisode ? () => navigate(`/player/${previousEpisode.id}`) : undefined}
            onPlayNextEpisode={nextEpisode ? () => navigate(`/player/${nextEpisode.id}`) : undefined}
            canPlayPreviousEpisode={!!previousEpisode}
            canPlayNextEpisode={!!nextEpisode}
          />
        </div>
        
        {/* 右侧：简介和选集/版本 */}
        <div className="flex-1 max-w-80 flex-shrink-0 flex h-full flex-col min-h-0">
          <div 
            className="rounded-xl p-5 flex-1 backdrop-blur-xl border flex h-full flex-col min-h-0 overflow-hidden" 
            style={{ 
              backgroundColor: 'rgba(37, 38, 41, 0.95)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* 媒体标题 */}
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <h1 className="text-xl font-semibold text-white/95 tracking-tight leading-tight">
                  {mediaItem.name}
                </h1>
                {/* 社区评分 - 放在标题旁边 */}
                {((seriesItem?.communityRating && seriesItem.communityRating > 0) || 
                  (mediaItem.communityRating && mediaItem.communityRating > 0)) && (
                  <span className="flex items-center gap-1 text-sm text-amber-400 font-semibold flex-shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" strokeWidth={1.5} />
                    {(seriesItem?.communityRating || mediaItem.communityRating)?.toFixed(1)}
                  </span>
                )}
                {/* 时长 - 放在评分旁边 */}
                {mediaItem.runTimeTicks && (
                  <span className="text-sm text-white/55 font-medium flex-shrink-0">
                    · {Math.floor(mediaItem.runTimeTicks / 600000000)} 分钟
                  </span>
                )}
              </div>
              {mediaItem.type === 'Episode' && (
                <p className="text-xs text-white/55 tracking-tight font-medium">
                  {mediaItem.seriesName} · 第{mediaItem.parentIndexNumber}季 第{mediaItem.indexNumber}集
                </p>
              )}
            </div>
            
            {/* 媒体信息标签 - 剧集使用 Series 的元数据 */}
            {mediaItem.overview && (
              <div className="flex flex-wrap gap-1.5 mb-4 flex-shrink-0">
                {/* 年份 */}
                {(seriesItem?.productionYear || mediaItem.productionYear) && (
                  <span className="text-xs text-white/65 bg-white/[0.05] px-2.5 py-1 rounded-md font-medium border border-white/[0.08] shadow-sm">
                    {seriesItem?.productionYear || mediaItem.productionYear}
                  </span>
                )}
                
                {/* 媒体类型 */}
                {mediaItem.type && (
                  <span className="text-xs text-white/65 bg-white/[0.05] px-2.5 py-1 rounded-md font-medium border border-white/[0.08] shadow-sm">
                    {mediaItem.type === 'Movie' ? '电影' : 
                     mediaItem.type === 'Episode' ? '剧集' : 
                     mediaItem.type === 'Series' ? '电视剧' : 
                     mediaItem.type}
                  </span>
                )}
                
                {/* 分级 - 剧集使用 Series 的分级 */}
                {(seriesItem?.officialRating || mediaItem.officialRating) && (
                  <span className="text-xs text-white/65 bg-white/[0.05] px-2.5 py-1 rounded-md font-medium border border-white/[0.08] shadow-sm">
                    {seriesItem?.officialRating || mediaItem.officialRating}
                  </span>
                )}
                
                {/* 流派 - 剧集使用 Series 的流派 */}
                {((seriesItem?.genres && seriesItem.genres.length > 0) || 
                  (mediaItem.genres && mediaItem.genres.length > 0)) && (
                  <>
                    {(seriesItem?.genres || mediaItem.genres)?.slice(0, 3).map((genre) => (
                      <span key={genre} className="text-xs text-white/65 bg-white/[0.05] px-2.5 py-1 rounded-md font-medium border border-white/[0.08] shadow-sm">
                        {genre}
                      </span>
                    ))}
                  </>
                )}
              </div>
            )}
            
            {/* 媒体简介 */}
            {mediaItem.overview && (
              <div className="mb-4 flex-shrink-0">
                <h2 className="text-sm font-semibold text-white/85 mb-2.5 tracking-tight">简介</h2>
                
                {/* 简介文字 - 放在标签下面 */}
                <p className="text-xs text-white/60 leading-relaxed tracking-tight overflow-hidden" style={{ height: 'calc(1.5rem * 8)' }}>
                  {mediaItem.overview}
                </p>
              </div>
            )}
            
            {/* 分隔线 */}
            {mediaItem.overview && (
              <div className="border-t border-white/[0.08] mb-3.5 flex-shrink-0"></div>
            )}
            {/* 标题 */}
            <div className="mb-2.5 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-semibold text-white/85 tracking-tight">
                {mediaItem.type === 'Episode' ? '选集' : '版本'}
              </h2>
              {mediaItem.type === 'Episode' && episodesResponse?.items && (
                <span className="text-xs text-white/45 font-medium">
                  共 {episodesResponse.items.length} 集
                </span>
              )}
            </div>
            
            {/* 内容区域 - 可滚动 */}
            <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-2">
              {/* 剧集网格 */}
              {mediaItem.type === 'Episode' && episodesResponse?.items && episodesResponse.items.length > 0 ? (
                <div className="grid grid-cols-6 gap-2">
                  {episodesResponse.items.map((episode) => {
                    const isCurrentEpisode = episode.id === mediaItem.id
                    const isWatched = episode.userData?.played
                    const playProgress = episode.userData?.playbackPositionTicks && episode.runTimeTicks
                      ? (episode.userData.playbackPositionTicks / episode.runTimeTicks) * 100
                      : 0
                    const waterLevel = Math.max(
                      0,
                      Math.min(100, isWatched ? 100 : playProgress)
                    )
                    const isCompleted = isWatched || waterLevel >= 99.5
                    
                    return (
                      <button
                        key={episode.id}
                        onClick={() => {
                          if (!isCurrentEpisode) {
                            navigate(`/player/${episode.id}`)
                          }
                        }}
                        className="relative aspect-square rounded-lg transition-all duration-200 overflow-hidden group"
                        style={{
                          backgroundColor: isCurrentEpisode 
                            ? 'color-mix(in srgb, var(--theme-color) 18%, transparent)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          boxShadow: isCurrentEpisode 
                            ? `0 0 0 1.5px color-mix(in srgb, var(--theme-color) 60%, transparent), 0 4px 16px color-mix(in srgb, var(--theme-color) 30%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.15)` 
                            : '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        {waterLevel > 0 && (
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden transition-[height,opacity] duration-300"
                            style={{
                              height: `${waterLevel}%`,
                              opacity: isCurrentEpisode ? 0.95 : 0.82,
                            }}
                          >
                            <div
                              className="episode-water-fill absolute inset-0"
                              style={
                                {
                                  ['--episode-water-color' as '--episode-water-color']:
                                    'color-mix(in srgb, var(--theme-color) 15%, transparent)',
                                } as React.CSSProperties
                              }
                            >
                              {isCompleted ? (
                                <div className="episode-water-static absolute inset-0" />
                              ) : (
                                <div className="episode-water-wave-track" aria-hidden="true">
                                  <svg
                                    className="episode-water-wave"
                                    viewBox="0 0 240 120"
                                    preserveAspectRatio="none"
                                  >
                                    <path
                                      d="M0 18 C 30 8, 50 8, 80 18 S 130 28, 160 18 S 210 8, 240 18 V120 H0 Z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                  <svg
                                    className="episode-water-wave"
                                    viewBox="0 0 240 120"
                                    preserveAspectRatio="none"
                                  >
                                    <path
                                      d="M0 18 C 30 8, 50 8, 80 18 S 130 28, 160 18 S 210 8, 240 18 V120 H0 Z"
                                      fill="currentColor"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 集数 */}
                        <div className="relative z-10 flex h-full items-center justify-center">
                          <span 
                            className={`text-xs font-semibold transition-transform duration-200 ${!isCurrentEpisode && 'group-hover:scale-110'}`} 
                            style={{ 
                              color: isCurrentEpisode ? 'var(--theme-color)' : 'rgba(255, 255, 255, 0.8)' 
                            }}
                          >
                            {episode.indexNumber}
                          </span>
                        </div>
                        
                        {/* 悬停效果 */}
                        {!isCurrentEpisode && (
                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.06] transition-colors duration-200" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : mediaItem.mediaSources && mediaItem.mediaSources.length > 0 ? (
                /* 电影版本信息 - 只显示一个版本 */
                <div className="space-y-2">
                  {mediaItem.mediaSources.slice(0, 1).map((source) => {
                    const sizeGB = source.size ? (source.size / 1024 / 1024 / 1024).toFixed(2) : null
                    const videoStream = source.mediaStreams?.find(s => s.type === 'Video')
                    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : null
                    
                    return (
                      <div 
                        key={source.id} 
                        className="w-full rounded-lg p-4 border" 
                        style={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-white/85 tracking-tight">
                            当前版本
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {resolution && (
                            <div className="text-xs text-white/70 font-medium">{resolution}</div>
                          )}
                          {sizeGB && (
                            <div className="text-xs text-white/60">{sizeGB} GB</div>
                          )}
                          <div className="text-xs text-white/60">
                            {source.container?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
