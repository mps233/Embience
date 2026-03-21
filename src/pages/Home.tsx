/**
 * 主页组件
 * 
 * 显示顶级视图（电影、电视剧、音乐）和最新添加的媒体项
 * 
 * 需求：2.1, 2.2
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { createEmbyClient } from '@/services/api/embyClient'
import { buildApiUrl, type MediaServerType } from '@/services/api/mediaServer'
import { createMediaService } from '@/services/media/mediaService'
import { useMediaViews, useLatestItems } from '@/hooks/useMedia'
import MediaGrid from '@/components/media/MediaGrid'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MediaView, MediaItem } from '@/types/emby'

/**
 * 主页组件
 * 
 * 需求 2.1：显示顶级媒体库视图（电影、电视剧、音乐）
 * 需求 2.2：显示最新添加的媒体项
 */
export default function Home() {
  const navigate = useNavigate()
  const { user, serverUrl, serverType, accessToken } = useAuthStore()

  // 创建媒体服务实例
  const mediaService = useMemo(() => {
    if (!serverUrl || !accessToken) return null
    const apiClient = createEmbyClient({
      serverUrl,
      serverType: serverType || undefined,
      accessToken,
    })
    return createMediaService(apiClient)
  }, [serverUrl, serverType, accessToken])

  // 获取用户 ID
  const userId = user?.id || ''

  // 获取顶级视图
  const {
    data: views = [],
  } = useMediaViews(mediaService!, userId, !!mediaService && !!userId)

  // 获取最新添加的媒体项（所有类型）
  const {
    data: latestItems = [],
  } = useLatestItems(
    mediaService!,
    userId,
    { limit: 20 },
    !!mediaService && !!userId
  )

  /**
   * 导航到媒体库页面
   */
  const handleNavigateToLibrary = useCallback((view: MediaView) => {
    // 根据 collectionType 确定路由
    const typeMap: Record<string, string> = {
      movies: 'movies',
      tvshows: 'tvshows',
      music: 'music',
    }

    const type = view.collectionType ? typeMap[view.collectionType] : 'all'
    navigate(`/library/${type}?parentId=${view.id}`)
  }, [navigate])

  // 轮播图当前索引状态（统一管理）
  const [heroIndex, setHeroIndex] = useState(0)

  // 如果服务未初始化，显示加载状态
  if (!mediaService || !userId) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-primary rounded-full mb-4" />
            <p className="text-muted-foreground">初始化中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Hero 轮播背景 - 作为整个页面的背景 */}
      {latestItems.length > 0 && (
        <HeroBackground 
          items={latestItems.slice(0, 5)} 
          serverUrl={serverUrl}
          serverType={serverType}
          currentIndex={heroIndex}
          onIndexChange={setHeroIndex}
        />
      )}

      {/* 内容区域 - 覆盖在背景之上 */}
      <div className="relative z-10">
        {/* Hero 内容区域 */}
        {latestItems.length > 0 && (
          <HeroContent 
            items={latestItems.slice(0, 5)} 
            serverUrl={serverUrl}
            serverType={serverType}
            currentIndex={heroIndex}
            onIndexChange={setHeroIndex}
          />
        )}

        {/* 深色内容区域 - 从透明渐变到深色 */}
        <div className="relative pt-20" style={{ background: 'linear-gradient(to bottom, transparent, rgba(23, 24, 26, 0.8), #17181A)' }}>
          {/* 顶级视图（媒体库分类） - 隐藏，不显示 */}
          {/* 
          <section className="px-4 sm:px-6 lg:px-8 pb-12">
            <h2 className="mb-8 text-3xl font-bold text-white">媒体库</h2>
            ...
          </section>
          */}

          {/* 按分类显示最新内容 */}
          <div>
            {views.map((view) => (
              <ViewLatestSection
                key={view.id}
                view={view}
                mediaService={mediaService}
                userId={userId}
                onViewAll={() => handleNavigateToLibrary(view)}
              />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

/**
 * 单个视图的最新内容区块
 */
interface ViewLatestSectionProps {
  view: MediaView
  mediaService: ReturnType<typeof createMediaService>
  userId: string
  onViewAll: () => void
}

const ViewLatestSection = React.memo(function ViewLatestSection({
  view,
  mediaService,
  userId,
  onViewAll,
}: ViewLatestSectionProps) {
  // 根据 collectionType 确定要查询的项目类型
  const getItemTypes = (collectionType?: string) => {
    switch (collectionType) {
      case 'movies':
        return ['Movie']
      case 'tvshows':
        return ['Episode']
      case 'music':
        return ['Audio']
      default:
        return undefined
    }
  }

  const itemTypes = getItemTypes(view.collectionType)

  // 获取该视图下的最新项目
  const {
    data: items = [],
    isLoading,
    error,
  } = useLatestItems(
    mediaService,
    userId,
    {
      parentId: view.id,
      includeItemTypes: itemTypes as any,
      limit: 16,
    },
    !!mediaService && !!userId
  )

  // 如果没有内容，不显示该区块
  if (!isLoading && !error && items.length === 0) {
    return null
  }

  return (
    <section className="px-16 sm:px-24 lg:px-64 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">{view.name} - 最新</h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-white/60 hover:text-white"
          >
            查看全部
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 错误状态 */}
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/20 p-4 text-sm text-white">
          加载失败：{error.message}
        </div>
      )}

      {/* 媒体项网格 */}
      <MediaGrid
        items={items}
        isLoading={isLoading}
        imageWidth={300}
        imageHeight={450}
        maxColumns={8}
      />
    </section>
  )
})

/**
 * Hero 背景组件 - 固定在页面顶部
 */
interface HeroBackgroundProps {
  items: MediaItem[]
  serverUrl: string | null
  serverType: MediaServerType | null
  currentIndex: number
  onIndexChange: (index: number) => void
}

function HeroBackground({ items, serverUrl, serverType, currentIndex, onIndexChange }: HeroBackgroundProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // 自动轮播
  useEffect(() => {
    if (items.length <= 1) return

    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        onIndexChange((currentIndex + 1) % items.length)
        setTimeout(() => setIsAnimating(false), 50)
      }, 400)
    }, 5000)

    return () => clearInterval(timer)
  }, [items.length, currentIndex, onIndexChange])

  if (items.length === 0) return null

  const currentItem = items[currentIndex]

  /**
   * 构建背景图片 URL
   */
  const getBackdropUrl = (item: MediaItem): string | null => {
    if (!serverUrl) return null

    if (item.backdropImageTags && item.backdropImageTags.length > 0) {
      return buildApiUrl(serverUrl, `/Items/${item.id}/Images/Backdrop/0`, serverType || 'emby', {
        MaxWidth: 1920,
        MaxHeight: 1080,
        Tag: item.backdropImageTags[0],
        Quality: 90,
      })
    }

    if (item.imageTags?.Primary) {
      return buildApiUrl(serverUrl, `/Items/${item.id}/Images/Primary`, serverType || 'emby', {
        MaxWidth: 1920,
        MaxHeight: 1080,
        Tag: item.imageTags.Primary,
        Quality: 90,
      })
    }

    return null
  }

  const backdropUrl = getBackdropUrl(currentItem)

  return (
    <div className="absolute left-0 right-0 top-0 z-0 h-[100vh] overflow-hidden pointer-events-none">
      {/* 背景图片 */}
      {backdropUrl && (
        <div className="absolute inset-0">
          <img
            src={backdropUrl}
            alt={currentItem.name}
            className={cn(
              "h-full w-full object-cover transition-all duration-700 ease-in-out",
              isAnimating ? "opacity-0 scale-105" : "opacity-100 scale-100"
            )}
            key={currentIndex}
          />
          {/* 深色渐变遮罩 - 从上到下逐渐变深，底部完全是 #17181A */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7) 80%, #17181A)' }} />
        </div>
      )}

      {/* 无背景图时的深色背景 */}
      {!backdropUrl && (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #2c2d2f, #17181A)' }} />
      )}
    </div>
  )
}

/**
 * Hero 内容组件
 */
interface HeroContentProps {
  items: MediaItem[]
  serverUrl: string | null
  serverType: MediaServerType | null
  currentIndex: number
  onIndexChange: (index: number) => void
}

function HeroContent({ items, serverUrl, serverType, currentIndex, onIndexChange }: HeroContentProps) {
  const navigate = useNavigate()

  if (items.length === 0) return null

  const currentItem = items[currentIndex]

  /**
   * 获取视图图标
   */
  const getViewIcon = (type?: string): string => {
    switch (type) {
      case 'Movie':
        return '🎬'
      case 'Episode':
      case 'Series':
        return '📺'
      case 'Audio':
      case 'MusicAlbum':
        return '🎵'
      case 'Book':
        return '📚'
      case 'Game':
        return '🎮'
      default:
        return '📁'
    }
  }

  /**
   * 获取 Logo 图片 URL
   */
  const getLogoUrl = (item: MediaItem): string | null => {
    if (!serverUrl || !item.imageTags?.Logo) {
      return null
    }

    return buildApiUrl(serverUrl, `/Items/${item.id}/Images/Logo`, serverType || 'emby', {
      MaxWidth: 600,
      MaxHeight: 200,
      Tag: item.imageTags.Logo,
      Quality: 90,
    })
  }

  const logoUrl = getLogoUrl(currentItem)

  return (
    <div className="relative h-[calc(100vh-5rem)] px-16 pb-12 pt-32 sm:px-24 lg:px-64">
      {/* 内容放在左下角 */}
      <div className="absolute bottom-12 left-16 sm:left-24 lg:left-64 max-w-2xl space-y-4">
        {/* 标题 - 优先显示 Logo，没有 Logo 时显示文字 */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={currentItem.name}
            className="max-h-32 w-auto max-w-md object-contain drop-shadow-2xl"
          />
        ) : (
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
            {currentItem.name}
          </h1>
        )}

        {/* 标签/分类 */}
        <div className="flex flex-wrap items-center gap-3">
          {currentItem.officialRating && (
            <span className="rounded border border-white/30 px-2 py-0.5 text-xs text-white/80">
              {currentItem.officialRating}
            </span>
          )}
          {currentItem.communityRating && (
            <span className="flex items-center gap-1 text-sm text-white/70">
              ⭐ {currentItem.communityRating.toFixed(1)}
            </span>
          )}
        </div>

        {/* 流派标签 */}
        {currentItem.genres && currentItem.genres.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {currentItem.genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="rounded-full bg-white/[0.08] px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm font-medium border border-white/[0.08] shadow-sm"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* 简介 */}
        {currentItem.overview && (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-white/70">
            {currentItem.overview}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              // 如果是剧集，直接进入播放页面
              if (currentItem.type === 'Episode') {
                navigate(`/player/${currentItem.id}`)
              } 
              // 其他类型（电影、电视剧、季等）都进入详情页
              else {
                navigate(`/media/${currentItem.id}`)
              }
            }}
            className="group relative flex items-center gap-2 rounded-full px-10 py-3 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--theme-color)' }}
          >
            {/* 玻璃光泽效果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            
            {/* 播放图标 */}
            <svg 
              className="w-4 h-4 relative z-10" 
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
        </div>
      </div>

      {/* 底部缩略图轮播 */}
      {items.length > 1 && (
        <div className="absolute bottom-12 right-16 sm:right-24 lg:right-64 flex gap-4">
          {items.map((item, index) => {
            const thumbUrl = item.imageTags?.Primary && serverUrl
              ? buildApiUrl(serverUrl, `/Items/${item.id}/Images/Primary`, serverType || 'emby', {
                  MaxWidth: 200,
                  MaxHeight: 300,
                  Tag: item.imageTags.Primary,
                  Quality: 90,
                })
              : null

            return (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                className={cn(
                  'relative h-32 w-20 overflow-hidden rounded-lg border-2 transition-all duration-300',
                  index === currentIndex
                    ? 'border-white scale-110'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                )}
                aria-label={`切换到 ${item.name}`}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-2xl">
                    {getViewIcon(item.type)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
