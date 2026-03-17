/**
 * MediaCard 组件
 * 
 * 显示媒体项卡片，包括：
 * - 海报图片（使用 Emby 图片 API）
 * - 标题、年份
 * - 评分标签（左上角）
 * - 图片懒加载（Intersection Observer）
 * - 点击导航到详情页
 * 
 * 需求：2.3, 2.6, 2.8, 12.5
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import type { MediaItem } from '@/types/emby'

/**
 * MediaCard 组件属性
 */
export interface MediaCardProps {
  /** 媒体项数据 */
  item: MediaItem
  /** 自定义类名 */
  className?: string
  /** 图片宽度（用于请求合适尺寸的图片） */
  imageWidth?: number
  /** 图片高度 */
  imageHeight?: number
}

/**
 * MediaCard 组件
 * 
 * 需求 2.3：Media_Browser 应当显示媒体项元数据，包括标题、海报图片、年份、评分和时长
 * 需求 2.6：当用户点击媒体项时，Media_Browser 应当导航到该项的详情视图
 * 需求 2.8：对于所有媒体项，Media_Browser 应当显示用户特定数据，包括播放次数、收藏状态和恢复位置
 * 需求 12.5：Emby_UI_Application 应当使用 Intersection Observer 延迟加载图片
 */
export default function MediaCard({
  item,
  className,
  imageWidth = 300,
  imageHeight = 450,
}: MediaCardProps) {
  const navigate = useNavigate()
  const { serverUrl } = useAuthStore()
  
  // 图片懒加载状态
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isImageVisible, setIsImageVisible] = useState(false)
  const imageRef = useRef<HTMLDivElement>(null)

  /**
   * 需求 12.5：使用 Intersection Observer 实现图片懒加载
   */
  useEffect(() => {
    if (!imageRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsImageVisible(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.01,
      }
    )

    observer.observe(imageRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  /**
   * 构建图片 URL
   * 
   * 使用 Emby 图片 API：/Items/{Id}/Images/{Type}
   * 参数：MaxWidth, MaxHeight, Tag（用于缓存）
   */
  const getImageUrl = (): string | null => {
    if (!serverUrl || !item.imageTags?.Primary) {
      return null
    }

    const params = new URLSearchParams({
      MaxWidth: imageWidth.toString(),
      MaxHeight: imageHeight.toString(),
      Tag: item.imageTags.Primary,
      Quality: '90',
    })

    return `${serverUrl}/emby/Items/${item.id}/Images/Primary?${params.toString()}`
  }

  /**
   * 处理卡片点击
   * 
   * 需求 2.6：点击卡片导航到详情页
   * 
   * 特殊处理：
   * - Episode（剧集）：直接播放
   * - Movie（电影）：进入详情页
   * - Series（电视剧）：进入详情页选择季
   * - Season（季）：进入详情页显示剧集列表
   */
  const handleClick = () => {
    // 如果是剧集，直接进入播放页面
    if (item.type === 'Episode') {
      navigate(`/player/${item.id}`)
    } 
    // 其他类型（电影、电视剧、季等）都进入详情页
    else {
      navigate(`/media/${item.id}`)
    }
  }

  /**
   * 处理图片加载完成
   */
  const handleImageLoad = () => {
    setIsImageLoaded(true)
  }

  /**
   * 处理图片加载错误
   */
  const handleImageError = () => {
    setIsImageLoaded(true) // 即使失败也标记为已加载，显示占位符
  }

  const imageUrl = getImageUrl()

  return (
    <div
      className={cn(
        'group relative cursor-pointer transition-all duration-300 ease-out',
        'hover:scale-[1.015]',
        className
      )}
      onClick={handleClick}
    >
      {/* 海报图片区域 */}
      <div
        ref={imageRef}
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] ring-1 ring-white/[0.1] transition-all duration-300 group-hover:ring-white/[0.2] group-hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset]"
      >
        {/* 图片懒加载 */}
        {isImageVisible && imageUrl && (
          <>
            {/* 加载占位符 */}
            {!isImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.02]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent text-white/20" />
              </div>
            )}
            
            {/* 实际图片 */}
            <img
              src={imageUrl}
              alt={item.name}
              className={cn(
                'h-full w-full object-cover transition-all duration-700 ease-out',
                isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </>
        )}

        {/* 无图片占位符 */}
        {(!imageUrl || !isImageVisible) && (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.02]">
            <Play className="h-12 w-12 text-white/20" />
          </div>
        )}

        {/* 右上角评分标签 */}
        {item.communityRating && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-lg bg-black/75 px-2.5 py-1.5 backdrop-blur-xl ring-1 ring-amber-500/20 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(251,191,36,0.1)_inset] transition-all duration-300 group-hover:ring-amber-500/30 group-hover:shadow-[0_4px_16px_rgba(251,191,36,0.2)]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" />
            <span className="text-xs font-bold text-amber-400 tabular-nums tracking-tight drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">
              {item.communityRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* 悬停时显示播放按钮 */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100">
          <div 
            className="flex h-16 w-16 items-center justify-center rounded-full scale-95 transition-transform duration-300 ease-out group-hover:scale-105"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.25) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              willChange: 'transform',
            }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, color-mix(in srgb, var(--theme-color) 75%, transparent) 0%, color-mix(in srgb, var(--theme-color) 50%, transparent) 50%, transparent 100%)',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--theme-color) 20%, transparent)',
              }}
            >
              <svg 
                className="w-6 h-6" 
                viewBox="0 0 24 24" 
                fill="none"
                style={{
                  filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)) drop-shadow(0 -0.5px 0.5px rgba(255, 255, 255, 0.3)) drop-shadow(0 0.5px 0.5px rgba(255, 255, 255, 0.2))',
                }}
              >
                <path 
                  d="M8 5C8 3.9 9.12 3.16 10.05 3.72L19.05 9.72C19.89 10.23 19.89 11.51 19.05 12.02L10.05 18.02C9.12 18.58 8 17.84 8 16.74V5Z" 
                  fill="rgba(255, 255, 255, 0.85)"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 媒体信息 */}
      <div className="pt-3.5 px-1">
        {/* 标题 */}
        <h3 className="text-sm font-semibold line-clamp-2 text-white/90 leading-snug tracking-tight transition-colors duration-200 group-hover:text-white/95">
          {item.name}
        </h3>

        {/* 年份 */}
        {item.productionYear && (
          <p className="text-xs text-white/50 mt-1.5 font-medium tabular-nums tracking-wide">
            {item.productionYear}
          </p>
        )}
      </div>
    </div>
  )
}
