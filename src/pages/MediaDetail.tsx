/**
 * 媒体详情页面
 * 
 * 显示媒体项的完整信息，包括：
 * - 元数据（标题、描述、演员、类型、导演、制作年份）
 * - 图片（主图、背景图、Logo）
 * - 媒体源信息（编解码器、比特率、分辨率）
 * - 音轨和字幕选项
 * 
 * 需求：3.1, 3.2, 3.4, 3.5
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { createEmbyClient } from '@/services/api/embyClient'
import { buildApiUrl, type MediaServerType } from '@/services/api/mediaServer'
import { createMediaService } from '@/services/media/mediaService'
import { useMediaDetail, useMediaItems, useSimilarItems } from '@/hooks/useMedia'
import Layout from '@/components/layout/Layout'
import { ArrowLeft, Star, Heart, ExternalLink, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MediaCard from '@/components/media/MediaCard'
import type { MediaStream, MediaItem } from '@/types/emby'

/**
 * 格式化运行时长（ticks 转换为可读格式）
 */
function formatRuntime(ticks?: number): string {
  if (!ticks) return '未知'
  
  const totalSeconds = Math.floor(ticks / 10000000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }
  return `${minutes} 分钟`
}

/**
 * 计算播放进度百分比
 */
function calculateProgress(positionTicks?: number, totalTicks?: number): number {
  if (!positionTicks || !totalTicks || totalTicks === 0) return 0
  return Math.round((positionTicks / totalTicks) * 100)
}

/**
 * 格式化季名称为统一格式
 * 支持多种格式：Season 01, Season 1, S01, S1, 第一季, 第1季, 季1 等
 */
function formatSeasonName(name: string, indexNumber?: number): string {
  // 如果有 indexNumber，优先使用
  if (indexNumber !== undefined && indexNumber > 0) {
    return `第${indexNumber}季`
  }
  
  // 尝试从名称中提取季数
  const patterns = [
    /Season\s*(\d+)/i,           // Season 01, Season 1
    /S(\d+)/i,                    // S01, S1
    /第(\d+)季/,                  // 第1季, 第01季
    /第([一二三四五六七八九十]+)季/, // 第一季, 第二季
    /季\s*(\d+)/,                 // 季1, 季 1
  ]
  
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      const seasonNum = match[1]
      // 处理中文数字
      const chineseNumbers: Record<string, number> = {
        '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
      }
      
      if (chineseNumbers[seasonNum]) {
        return `第${chineseNumbers[seasonNum]}季`
      }
      
      // 转换为数字并格式化
      const num = parseInt(seasonNum, 10)
      if (!isNaN(num)) {
        return `第${num}季`
      }
    }
  }
  
  // 如果无法解析，返回原名称
  return name
}

/**
 * 所有季的剧集组件（带季选择器）
 */
function SeasonsWithEpisodes({ 
  seasons, 
  mediaService, 
  userId,
  serverUrl,
  serverType,
}: { 
  seasons: MediaItem[]
  mediaService: any
  userId: string
  serverUrl: string
  serverType: MediaServerType
}) {
  const navigate = useNavigate()
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0)
  
  // 按 IndexNumber 排序季（第一季在前）
  const sortedSeasons = [...seasons].sort((a, b) => {
    const indexA = a.indexNumber ?? 999
    const indexB = b.indexNumber ?? 999
    return indexA - indexB
  })
  
  const selectedSeason = sortedSeasons[selectedSeasonIndex]
  
  // 获取当前选中季的所有剧集
  const { data: episodesData } = useMediaItems(
    mediaService,
    userId,
    {
      parentId: selectedSeason?.id,
      includeItemTypes: ['Episode'],
      sortBy: ['IndexNumber'],
      sortOrder: 'Ascending',
    },
    !!selectedSeason
  )
  
  const episodes = episodesData?.items || []
  
  return (
    <div>
      {/* 季选择器 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {sortedSeasons.map((season, index) => (
          <button
            key={season.id}
            onClick={() => setSelectedSeasonIndex(index)}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              index === selectedSeasonIndex
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {formatSeasonName(season.name, season.indexNumber)}
          </button>
        ))}
      </div>
      
      {/* 剧集网格 - 带海报（横向） */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {episodes.map((episode) => {
          const imageUrl = episode.imageTags?.Primary
            ? buildApiUrl(serverUrl, `/Items/${episode.id}/Images/Primary`, serverType, {
                MaxWidth: 600,
                MaxHeight: 338,
                Tag: episode.imageTags.Primary,
                Quality: 90,
              })
            : null
          
          return (
            <button
              key={episode.id}
              onClick={() => navigate(`/player/${episode.id}`)}
              className="group relative overflow-hidden rounded-lg bg-white/5 transition-all hover:scale-105 hover:bg-white/10"
            >
              {/* 海报图片 - 16:9 横向 */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={episode.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <span className="text-4xl text-white/20">📺</span>
                  </div>
                )}
                
                {/* 集数标签 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="text-sm font-medium text-white">
                    第 {episode.indexNumber} 集
                  </div>
                  {episode.name && (
                    <div className="mt-1 text-xs text-white/70 line-clamp-1">
                      {episode.name}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return '未知'
  
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`
  }
  
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

/**
 * 格式化比特率
 */
function formatBitrate(bitrate?: number): string {
  if (!bitrate) return '未知'
  
  const mbps = bitrate / 1000000
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} Mbps`
  }
  
  const kbps = bitrate / 1000
  return `${kbps.toFixed(0)} Kbps`
}

/**
 * 构建图片 URL
 */
function getImageUrl(
  serverUrl: string,
  serverType: MediaServerType,
  itemId: string,
  imageType: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  return buildApiUrl(serverUrl, `/Items/${itemId}/Images/${imageType}`, serverType, query)
}

/**
 * 媒体详情页面组件
 */
export default function MediaDetail() {
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
  const { data: item, isLoading, error } = useMediaDetail(
    mediaService,
    user?.id || '',
    id || '',
    !!user?.id && !!id
  )
  
  // 页面加载时滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  
  // 简介展开/收起状态
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false)
  
  // 收藏状态
  const [isFavorite, setIsFavorite] = useState(false)
  
  useEffect(() => {
    if (item?.userData) {
      setIsFavorite(item.userData.isFavorite)
    }
  }, [item])
  
  // 切换收藏状态
  const toggleFavorite = async () => {
    if (!user?.id || !item?.id) return
    
    try {
      const method = isFavorite ? 'DELETE' : 'POST'
      await apiClient.request({
        method,
        url: `/Users/${user.id}/FavoriteItems/${item.id}`,
      })
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error('切换收藏状态失败:', error)
    }
  }
  
  // 获取导演
  const directors = item?.people?.filter(p => p.type === 'Director') || []
  
  // 判断是否需要获取季或剧集
  const isSeries = item?.type === 'Series'
  const isSeason = item?.type === 'Season'
  const isEpisode = item?.type === 'Episode'
  const shouldFetchChildren = isSeries || isSeason || isEpisode
  
  // 获取季列表（如果是电视剧）
  const { data: seasonsData } = useMediaItems(
    mediaService,
    user?.id || '',
    {
      parentId: item?.id,
      includeItemTypes: ['Season'],
      sortBy: ['SortName'],
      sortOrder: 'Ascending',
    },
    shouldFetchChildren && isSeries
  )
  
  // 获取剧集列表（如果是季）
  const { data: episodesData } = useMediaItems(
    mediaService,
    user?.id || '',
    {
      parentId: item?.id,
      includeItemTypes: ['Episode'],
      sortBy: ['SortName'],
      sortOrder: 'Ascending',
    },
    shouldFetchChildren && isSeason
  )
  
  // 获取同季的所有剧集（如果当前是剧集）
  const { data: sameSeasonEpisodesData } = useMediaItems(
    mediaService,
    user?.id || '',
    {
      parentId: item?.seasonId,
      includeItemTypes: ['Episode'],
      sortBy: ['IndexNumber'],
      sortOrder: 'Ascending',
    },
    shouldFetchChildren && isEpisode && !!item?.seasonId
  )
  
  const seasons = seasonsData?.items || []
  const episodes = episodesData?.items || []
  const sameSeasonEpisodes = sameSeasonEpisodesData?.items || []
  
  // 如果是季（Season）且有剧集，自动跳转到第一集播放页面
  useEffect(() => {
    if (isSeason && episodes.length > 0) {
      const firstEpisode = episodes[0]
      navigate(`/player/${firstEpisode.id}`, { replace: true })
    }
  }, [isSeason, episodes, navigate])
  
  // 获取相似内容（需求 3.8）
  const { data: similarItems } = useSimilarItems(
    mediaService,
    user?.id || '',
    id || '',
    { limit: 18 }, // 建议 12-20 项，这里使用 18 项（3 行 × 6 列）
    !!user?.id && !!id
  )
  
  // 加载状态
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </Layout>
    )
  }
  
  // 错误状态
  if (error || !item) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-destructive mb-4">加载失败</p>
            <Button onClick={() => navigate(-1)}>返回</Button>
          </div>
        </div>
      </Layout>
    )
  }
  
  // 获取图片 URL
  const backdropUrl = item.backdropImageTags?.[0] && serverUrl
    ? getImageUrl(serverUrl, serverType || 'emby', item.id, 'Backdrop', { tag: item.backdropImageTags[0] })
    : undefined
    
  const primaryImageUrl = item.imageTags?.Primary && serverUrl
    ? getImageUrl(serverUrl, serverType || 'emby', item.id, 'Primary', { tag: item.imageTags.Primary })
    : undefined
    
  const logoUrl = item.imageTags?.Logo && serverUrl
    ? getImageUrl(serverUrl, serverType || 'emby', item.id, 'Logo', { tag: item.imageTags.Logo })
    : undefined
  
  // 获取媒体源信息
  const mediaSource = item.mediaSources?.[0]
  const videoStream = mediaSource?.mediaStreams?.find((s: MediaStream) => s.type === 'Video')
  const audioStreams = mediaSource?.mediaStreams?.filter((s: MediaStream) => s.type === 'Audio') || []
  const subtitleStreams = mediaSource?.mediaStreams?.filter((s: MediaStream) => s.type === 'Subtitle') || []
  
  return (
    <Layout>
      {/* 背景图 - 与首页保持一致 */}
      {backdropUrl && (
        <div className="absolute left-0 right-0 top-0 z-0 h-[100vh] overflow-hidden pointer-events-none">
          <div className="absolute inset-0">
            <img
              src={backdropUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
            {/* 深色渐变遮罩 - 与首页保持一致 */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7) 80%, #17181A)' }} />
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="relative z-10">
        {/* 返回按钮 - 固定在左上角 */}
        <div className="absolute left-8 top-8 z-20">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white/90 transition-all duration-200 hover:text-white hover:scale-[1.02] hover:bg-white/[0.12] active:scale-[0.98] ring-1 ring-white/[0.12] backdrop-blur-xl"
            style={{
              background: 'rgba(10, 10, 10, 0.6)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.08) inset'
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>

        {/* Hero 区域 - Apple TV 风格 */}
        <div className="container mx-auto px-8 pt-24 pb-16">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
            {/* 海报 */}
            {primaryImageUrl && (
              <div className="flex-shrink-0 lg:pt-4">
                <img
                  src={primaryImageUrl}
                  alt={item.name}
                  className="w-64 rounded-2xl shadow-2xl lg:w-80"
                />
              </div>
            )}
          
            {/* 元数据 */}
            <div className="flex-1 space-y-6">{/* 移除了 pb-4 */}
              {/* Logo 或标题 */}
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={item.name} 
                  className="h-24 w-auto max-w-md object-contain drop-shadow-2xl lg:h-32" 
                />
              ) : (
                <h1 className="text-5xl font-bold text-white drop-shadow-2xl lg:text-6xl">
                  {item.name}
                </h1>
              )}
              
              {/* 标语 */}
              {item.taglines && item.taglines.length > 0 && (
                <p className="text-lg italic text-white/60">
                  {item.taglines[0]}
                </p>
              )}
              
              {/* 基本信息 - 一行显示 */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                {item.productionYear && (
                  <span>{item.productionYear}</span>
                )}
                
                {item.officialRating && (
                  <span className="rounded border border-white/30 px-2 py-0.5">
                    {item.officialRating}
                  </span>
                )}
                
                {item.communityRating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {item.communityRating.toFixed(1)}
                  </span>
                )}
                
                {/* 工作室 */}
                {item.studios && item.studios.length > 0 && (
                  <span className="text-white/60">
                    {item.studios[0].name}
                  </span>
                )}
              </div>
              
              {/* 导演 */}
              {directors.length > 0 && (
                <div className="text-sm">
                  <span className="text-white/50">导演：</span>
                  <span className="text-white/90">{directors.map(d => d.name).join(', ')}</span>
                </div>
              )}
              
              {/* 流派标签 - Apple TV 风格胶囊 */}
              {item.genres && item.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.genres.slice(0, 4).map((genre, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-white/[0.08] px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm font-medium border border-white/[0.08] shadow-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 简介 */}
              {item.overview && (
                <div className="max-w-3xl">
                  <p className={`text-base leading-relaxed text-white/70 lg:text-lg transition-all duration-300 ${
                    isOverviewExpanded ? '' : 'line-clamp-5'
                  }`}>
                    {item.overview}
                  </p>
                  {item.overview.length > 300 && (
                    <button
                      onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                      className="mt-2 text-sm font-medium transition-colors duration-200 hover:text-white"
                      style={{ color: 'var(--theme-color)' }}
                    >
                      {isOverviewExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </div>
              )}
              
              {/* 播放按钮 - 精致风格 */}
              {(item.type === 'Movie' || item.type === 'Episode' || item.type === 'Audio') && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {item.userData?.playbackPositionTicks && item.userData.playbackPositionTicks > 0 ? (
                    <>
                      {/* 继续播放按钮 */}
                      <button
                        onClick={() => navigate(`/player/${item.id}?resume=true`)}
                        className="group relative flex items-center gap-3 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/[0.15] overflow-hidden"
                        style={{ 
                          backgroundColor: 'var(--theme-color)',
                          boxShadow: '0 8px 24px color-mix(in srgb, var(--theme-color) 30%, transparent), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                        }}
                      >
                        {/* 玻璃光泽效果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        
                        {/* 播放图标 */}
                        <svg 
                          className="w-5 h-5 relative z-10" 
                          viewBox="0 0 24 24" 
                          fill="none"
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                          }}
                        >
                          <path 
                            d="M8 5C8 3.9 9.12 3.16 10.05 3.72L19.05 9.72C19.89 10.23 19.89 11.51 19.05 12.02L10.05 18.02C9.12 18.58 8 17.84 8 16.74V5Z" 
                            fill="currentColor"
                          />
                        </svg>
                        <span className="relative z-10">继续播放 ({calculateProgress(item.userData.playbackPositionTicks, item.runTimeTicks)}%)</span>
                      </button>
                      
                      {/* 从头播放按钮 */}
                      <button
                        onClick={() => navigate(`/player/${item.id}?resume=false`)}
                        className="group relative flex items-center gap-3 rounded-xl px-8 py-3.5 text-base font-semibold text-white/90 transition-all duration-200 hover:text-white active:scale-[0.98] ring-1 ring-white/[0.12] overflow-hidden"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                        }}
                      >
                        {/* 悬停光泽效果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <span className="relative z-10">从头播放</span>
                      </button>
                    </>
                  ) : (
                    /* 普通播放按钮 */
                    <button
                      onClick={() => navigate(`/player/${item.id}?resume=false`)}
                      className="group relative flex items-center gap-3 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/[0.15] overflow-hidden"
                      style={{ 
                        backgroundColor: 'var(--theme-color)',
                        boxShadow: '0 8px 24px color-mix(in srgb, var(--theme-color) 30%, transparent), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                      }}
                    >
                      {/* 玻璃光泽效果 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      
                      {/* 播放图标 - 使用与播放器中央按钮相同的 SVG */}
                      <svg 
                        className="w-5 h-5 relative z-10" 
                        viewBox="0 0 24 24" 
                        fill="none"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                        }}
                      >
                        <path 
                          d="M8 5C8 3.9 9.12 3.16 10.05 3.72L19.05 9.72C19.89 10.23 19.89 11.51 19.05 12.02L10.05 18.02C9.12 18.58 8 17.84 8 16.74V5Z" 
                          fill="currentColor"
                        />
                      </svg>
                      <span className="relative z-10">播放</span>
                    </button>
                  )}
                  
                  {/* 收藏按钮 */}
                  <button
                    onClick={toggleFavorite}
                    className={`group relative flex items-center gap-3 rounded-xl px-6 py-3.5 text-base font-semibold transition-all duration-200 active:scale-[0.98] ring-1 overflow-hidden ${
                      isFavorite
                        ? 'text-red-400 ring-red-500/20'
                        : 'text-white/90 hover:text-white ring-white/[0.12]'
                    }`}
                    style={{
                      background: isFavorite ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      boxShadow: isFavorite 
                        ? '0 4px 16px rgba(239, 68, 68, 0.15), 0 0 0 1px rgba(239, 68, 68, 0.1) inset'
                        : '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                    }}
                  >
                    {/* 悬停光泽效果 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    
                    <Heart className={`h-5 w-5 relative z-10 ${isFavorite ? 'fill-current' : ''}`} />
                    <span className="relative z-10">{isFavorite ? '已收藏' : '收藏'}</span>
                  </button>
                  
                  {/* 预告片按钮 */}
                  {item.remoteTrailers && item.remoteTrailers.length > 0 && (
                    <button
                      onClick={() => window.open(item.remoteTrailers![0].url, '_blank')}
                      className="group relative flex items-center gap-3 rounded-xl px-6 py-3.5 text-base font-semibold text-white/90 transition-all duration-200 hover:text-white active:scale-[0.98] ring-1 ring-white/[0.12] overflow-hidden"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
                      }}
                    >
                      {/* 悬停光泽效果 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      
                      <Youtube className="h-5 w-5 relative z-10" />
                      <span className="relative z-10">预告片</span>
                    </button>
                  )}
                </div>
              )}
              
              {/* 外部链接 */}
              {item.providerIds && (item.providerIds.Imdb || item.providerIds.Tmdb) && (
                <div className="flex flex-wrap gap-3">
                  {item.providerIds.Imdb && (
                    <a
                      href={`https://www.imdb.com/title/${item.providerIds.Imdb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      IMDb
                    </a>
                  )}
                  {item.providerIds.Tmdb && (
                    <a
                      href={`https://www.themoviedb.org/${item.type === 'Movie' ? 'movie' : 'tv'}/${item.providerIds.Tmdb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      TMDB
                    </a>
                  )}
                </div>
              )}
              
              {/* 额外信息网格 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-4 text-sm lg:grid-cols-3">
                {/* 首映日期 */}
                {item.premiereDate && (
                  <div>
                    <div className="text-white/50">首映日期</div>
                    <div className="text-white/90">
                      {new Date(item.premiereDate).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                
                {/* 最后播放日期 */}
                {item.userData?.lastPlayedDate && (
                  <div>
                    <div className="text-white/50">最后播放</div>
                    <div className="text-white/90">
                      {new Date(item.userData.lastPlayedDate).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                
                {/* 音乐信息 */}
                {item.artists && item.artists.length > 0 && (
                  <div>
                    <div className="text-white/50">艺术家</div>
                    <div className="text-white/90">{item.artists.join(', ')}</div>
                  </div>
                )}
                
                {item.album && (
                  <div>
                    <div className="text-white/50">专辑</div>
                    <div className="text-white/90">{item.album}</div>
                  </div>
                )}
                
                {item.albumArtist && (
                  <div>
                    <div className="text-white/50">专辑艺术家</div>
                    <div className="text-white/90">{item.albumArtist}</div>
                  </div>
                )}
                
                {/* 电视剧信息 */}
                {item.seriesName && (
                  <div>
                    <div className="text-white/50">系列</div>
                    <div className="text-white/90">{item.seriesName}</div>
                  </div>
                )}
                
                {item.indexNumber !== undefined && item.parentIndexNumber !== undefined && (
                  <div>
                    <div className="text-white/50">集数</div>
                    <div className="text-white/90">
                      第 {item.parentIndexNumber} 季 第 {item.indexNumber} 集
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细信息区域 - 深色背景 */}
      <div className="relative pt-12" style={{ background: 'linear-gradient(to bottom, transparent, rgba(23, 24, 26, 0.8), #17181A)' }}>
          <div className="container mx-auto px-8 py-16 space-y-12">
            
            {/* 季和剧集 */}
            {shouldFetchChildren && (seasons.length > 0 || episodes.length > 0 || sameSeasonEpisodes.length > 0) && (
              <div>
                {isSeries && seasons.length > 0 && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-white">剧集</h2>
                    <SeasonsWithEpisodes 
                      seasons={seasons} 
                      mediaService={mediaService}
                      userId={user?.id || ''}
                      serverUrl={serverUrl || ''}
                      serverType={serverType || 'emby'}
                    />
                  </div>
                )}
                
                {isSeason && episodes.length > 0 && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-white">剧集</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {episodes.map((episode) => (
                        <MediaCard
                          key={episode.id}
                          item={episode}
                          imageWidth={200}
                          imageHeight={300}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {isEpisode && sameSeasonEpisodes.length > 0 && (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-white">
                      {item.seriesName && item.parentIndexNumber 
                        ? `${item.seriesName} - 第 ${item.parentIndexNumber} 季` 
                        : '剧集'}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {sameSeasonEpisodes.map((episode) => {
                        const imageUrl = episode.imageTags?.Primary && serverUrl
                          ? buildApiUrl(serverUrl, `/Items/${episode.id}/Images/Primary`, serverType || 'emby', {
                              MaxWidth: 600,
                              MaxHeight: 338,
                              Tag: episode.imageTags.Primary,
                              Quality: 90,
                            })
                          : null
                        
                        const isCurrentEpisode = episode.id === item.id
                        
                        return (
                          <button
                            key={episode.id}
                            onClick={() => navigate(`/player/${episode.id}`)}
                            className={`group relative overflow-hidden rounded-lg transition-all hover:scale-105 ${
                              isCurrentEpisode
                                ? 'ring-2 ring-white/50'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            {/* 海报图片 - 16:9 横向 */}
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={episode.name}
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                                  <span className="text-4xl text-white/20">📺</span>
                                </div>
                              )}
                              
                              {/* 集数标签 */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                <div className={`text-sm font-medium ${isCurrentEpisode ? 'text-white' : 'text-white/90'}`}>
                                  第 {episode.indexNumber} 集
                                </div>
                                {episode.name && (
                                  <div className="mt-1 text-xs text-white/70 line-clamp-1">
                                    {episode.name}
                                  </div>
                                )}
                              </div>
                              
                              {/* 当前剧集标记 */}
                              {isCurrentEpisode && (
                                <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-black">
                                  当前
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 演职人员 */}
            {item.people && item.people.length > 0 && (
              <div>
                <h2 className="mb-6 text-2xl font-bold text-white">演职人员</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-8 px-8">
                  {item.people.map((person, index) => (
                    <div key={index} className="group flex-shrink-0 cursor-pointer" style={{ width: '140px' }}>
                      <div className="relative mb-3 w-full overflow-hidden rounded-lg bg-white/5" style={{ paddingBottom: '150%' }}>
                        {person.primaryImageTag && serverUrl ? (
                          <img
                            src={buildApiUrl(serverUrl, `/Items/${person.id}/Images/Primary`, serverType || 'emby', {
                              MaxWidth: 200,
                              MaxHeight: 300,
                              Tag: person.primaryImageTag,
                              Quality: 90,
                            })}
                            alt={person.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-5xl text-white/20">
                            👤
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white/90 line-clamp-2">
                          {person.name}
                        </div>
                        {person.role && (
                          <div className="mt-1 text-xs text-white/50 line-clamp-1">
                            {person.role}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* 占位元素，确保最后一个卡片完整显示 */}
                  <div className="flex-shrink-0" style={{ width: '1px' }}></div>
                </div>
              </div>
            )}
            
            {/* 技术信息 */}
            {mediaSource && (
              (videoStream && (videoStream.codec || videoStream.width || videoStream.height)) ||
              (audioStreams.length > 0 && audioStreams.some(a => a.codec || a.channels)) ||
              (mediaSource.container && mediaSource.container !== 'strm') ||
              (mediaSource.size && mediaSource.size > 0) ||
              (mediaSource.bitrate && mediaSource.bitrate > 0)
            ) && (
              <div>
                <h2 className="mb-6 text-2xl font-bold text-white">技术信息</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* 视频信息 */}
                  {videoStream && (
                    <div className="rounded-xl border p-5 backdrop-blur-xl" style={{
                      backgroundColor: 'rgba(37, 38, 41, 0.6)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <h3 className="mb-3 text-sm font-semibold text-white/90">视频</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">编解码器</span>
                          <span className="text-white/90 font-medium">{videoStream.codec?.toUpperCase()}</span>
                        </div>
                        {videoStream.width && videoStream.height && (
                          <div className="flex justify-between">
                            <span className="text-white/60">分辨率</span>
                            <span className="text-white/90 font-medium">{videoStream.width}×{videoStream.height}</span>
                          </div>
                        )}
                        {videoStream.bitRate && (
                          <div className="flex justify-between">
                            <span className="text-white/60">比特率</span>
                            <span className="text-white/90 font-medium">{formatBitrate(videoStream.bitRate)}</span>
                          </div>
                        )}
                        {videoStream.averageFrameRate && (
                          <div className="flex justify-between">
                            <span className="text-white/60">帧率</span>
                            <span className="text-white/90 font-medium">{videoStream.averageFrameRate.toFixed(2)} fps</span>
                          </div>
                        )}
                        {videoStream.aspectRatio && (
                          <div className="flex justify-between">
                            <span className="text-white/60">宽高比</span>
                            <span className="text-white/90 font-medium">{videoStream.aspectRatio}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 音频信息 */}
                  {audioStreams.length > 0 && (
                    <div className="rounded-xl border p-5 backdrop-blur-xl" style={{
                      backgroundColor: 'rgba(37, 38, 41, 0.6)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <h3 className="mb-3 text-sm font-semibold text-white/90">音频</h3>
                      <div className="space-y-3">
                        {audioStreams.map((audio, index) => (
                          <div key={index} className="space-y-2 text-sm">
                            {audioStreams.length > 1 && (
                              <div className="text-xs text-white/50 font-medium">音轨 {index + 1}</div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-white/60">编解码器</span>
                              <span className="text-white/90 font-medium">{audio.codec?.toUpperCase()}</span>
                            </div>
                            {audio.language && (
                              <div className="flex justify-between">
                                <span className="text-white/60">语言</span>
                                <span className="text-white/90 font-medium">{audio.language}</span>
                              </div>
                            )}
                            {audio.channels && (
                              <div className="flex justify-between">
                                <span className="text-white/60">声道</span>
                                <span className="text-white/90 font-medium">{audio.channels} 声道</span>
                              </div>
                            )}
                            {audio.sampleRate && (
                              <div className="flex justify-between">
                                <span className="text-white/60">采样率</span>
                                <span className="text-white/90 font-medium">{(audio.sampleRate / 1000).toFixed(1)} kHz</span>
                              </div>
                            )}
                            {index < audioStreams.length - 1 && (
                              <div className="border-t border-white/[0.08] pt-2"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 文件信息 */}
                  {mediaSource && (
                    <div className="rounded-xl border p-5 backdrop-blur-xl" style={{
                      backgroundColor: 'rgba(37, 38, 41, 0.6)',
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                      <h3 className="mb-3 text-sm font-semibold text-white/90">文件</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">容器</span>
                          <span className="text-white/90 font-medium">{mediaSource.container?.toUpperCase()}</span>
                        </div>
                        {mediaSource.size && (
                          <div className="flex justify-between">
                            <span className="text-white/60">大小</span>
                            <span className="text-white/90 font-medium">{formatFileSize(mediaSource.size)}</span>
                          </div>
                        )}
                        {mediaSource.bitrate && (
                          <div className="flex justify-between">
                            <span className="text-white/60">总比特率</span>
                            <span className="text-white/90 font-medium">{formatBitrate(mediaSource.bitrate)}</span>
                          </div>
                        )}
                        {mediaSource.runTimeTicks && (
                          <div className="flex justify-between">
                            <span className="text-white/60">时长</span>
                            <span className="text-white/90 font-medium">{formatRuntime(mediaSource.runTimeTicks)}</span>
                          </div>
                        )}
                        {subtitleStreams.length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/60">字幕</span>
                            <span className="text-white/90 font-medium">{subtitleStreams.length} 个</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 相似内容 */}
            {similarItems && similarItems.length > 0 && (
              <div>
                <h2 className="mb-6 text-2xl font-bold text-white">相似内容</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-8 px-8">
                  {similarItems.map((similarItem) => {
                    const imageUrl = similarItem.imageTags?.Primary && serverUrl
                      ? buildApiUrl(serverUrl, `/Items/${similarItem.id}/Images/Primary`, serverType || 'emby', {
                          MaxWidth: 200,
                          MaxHeight: 300,
                          Tag: similarItem.imageTags.Primary,
                          Quality: 90,
                        })
                      : null
                    
                    return (
                      <div 
                        key={similarItem.id} 
                        className="group flex-shrink-0 cursor-pointer" 
                        style={{ width: '140px' }}
                        onClick={() => navigate(`/detail/${similarItem.id}`)}
                      >
                        <div className="relative mb-3 w-full overflow-hidden rounded-lg bg-white/5" style={{ paddingBottom: '150%' }}>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={similarItem.name}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-5xl text-white/20">
                              🎬
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white/90 line-clamp-2">
                            {similarItem.name}
                          </div>
                          {similarItem.productionYear && (
                            <div className="mt-1 text-xs text-white/50">
                              {similarItem.productionYear}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* 占位元素，确保最后一个卡片完整显示 */}
                  <div className="flex-shrink-0" style={{ width: '1px' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }
