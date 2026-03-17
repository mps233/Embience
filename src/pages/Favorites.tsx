import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '../components/layout/Header'
import MediaGrid from '../components/media/MediaGrid'
import { useAuthStore } from '../stores/authStore'
import { createEmbyClient } from '../services/api/embyClient'
import { createMediaService } from '../services/media/mediaService'

/**
 * 收藏页面组件
 * 显示用户收藏的所有媒体项目
 */
export default function Favorites() {
  const { user, serverUrl, accessToken } = useAuthStore()
  const [selectedType, setSelectedType] = useState<'all' | 'Movie' | 'Series' | 'Audio'>('all')

  // 创建服务实例
  const apiClient = createEmbyClient({
    serverUrl: serverUrl || '',
    accessToken: accessToken || undefined,
  })
  const mediaService = createMediaService(apiClient)

  // 获取收藏的媒体项
  const { data: favorites, isLoading, error } = useQuery({
    queryKey: ['favorites', user?.id, selectedType],
    queryFn: async () => {
      if (!user?.id) return []
      
      const params: any = {
        filters: ['IsFavorite'],
        recursive: true,
        fields: ['PrimaryImageAspectRatio', 'BasicSyncInfo'],
        sortBy: ['DateCreated'],
        sortOrder: 'Descending',
      }

      // 根据选择的类型过滤
      if (selectedType !== 'all') {
        params.includeItemTypes = [selectedType]
      }

      const response = await mediaService.getItems(user.id, params)
      return response.items || []
    },
    enabled: !!user?.id,
  })

  return (
    <div className="min-h-screen" style={{ background: '#17181A' }}>
      <Header />
      
      <div className="px-8 sm:px-12 md:px-16 lg:px-20 xl:px-32 pt-20 pb-8">
        {/* 页面标题和筛选 */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white/95 tracking-tight">
              我的收藏
            </h1>
            <p className="text-white/55 mt-2 text-sm font-medium">
              {favorites?.length || 0} 个收藏项目
            </p>
          </div>

          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedType === 'all'
                  ? 'bg-white/[0.12] text-white ring-1 ring-white/[0.12]'
                  : 'bg-white/[0.04] text-white/85 hover:bg-white/[0.08] border border-white/[0.12]'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedType('Movie')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedType === 'Movie'
                  ? 'bg-white/[0.12] text-white ring-1 ring-white/[0.12]'
                  : 'bg-white/[0.04] text-white/85 hover:bg-white/[0.08] border border-white/[0.12]'
              }`}
            >
              电影
            </button>
            <button
              onClick={() => setSelectedType('Series')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedType === 'Series'
                  ? 'bg-white/[0.12] text-white ring-1 ring-white/[0.12]'
                  : 'bg-white/[0.04] text-white/85 hover:bg-white/[0.08] border border-white/[0.12]'
              }`}
            >
              电视剧
            </button>
            <button
              onClick={() => setSelectedType('Audio')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedType === 'Audio'
                  ? 'bg-white/[0.12] text-white ring-1 ring-white/[0.12]'
                  : 'bg-white/[0.04] text-white/85 hover:bg-white/[0.08] border border-white/[0.12]'
              }`}
            >
              音乐
            </button>
          </div>
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg border border-red-500/20">
            加载收藏失败: {error instanceof Error ? error.message : '未知错误'}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && favorites?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            {/* 图标容器 */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 blur-3xl rounded-full"></div>
              <div className="relative bg-white/[0.06] backdrop-blur-sm rounded-full p-8 border border-white/[0.08]">
                <svg 
                  className="w-20 h-20 text-yellow-500/80" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                  />
                </svg>
              </div>
            </div>

            {/* 文字内容 */}
            <h2 className="text-2xl font-semibold mb-3 text-white/95 tracking-tight">
              还没有收藏
            </h2>
            <p className="text-white/50 text-base max-w-md text-center leading-relaxed">
              在媒体详情页点击收藏按钮，将你喜欢的电影、剧集和音乐添加到这里
            </p>

            {/* 装饰性元素 */}
            <div className="mt-12 flex items-center gap-8 text-white/30">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <span className="text-sm">电影</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                </svg>
                <span className="text-sm">剧集</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
                <span className="text-sm">音乐</span>
              </div>
            </div>
          </div>
        )}

        {/* 媒体网格 */}
        {!isLoading && !error && favorites && favorites.length > 0 && (
          <MediaGrid items={favorites} />
        )}
      </div>
    </div>
  )
}
