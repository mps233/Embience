import { useState, useEffect } from 'react'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, X } from 'lucide-react'
import Header from '../components/layout/Header'
import MediaGrid from '../components/media/MediaGrid'
import { useAuthStore } from '../stores/authStore'
import { createEmbyClient } from '../services/api/embyClient'
import { createMediaService } from '../services/media/mediaService'

/**
 * 搜索页面组件
 * 提供媒体内容搜索功能和流派浏览功能
 */
export default function Search() {
  const { user, serverUrl, accessToken } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<'all' | 'Movie' | 'Series' | 'Audio'>('all')

  // 创建服务实例
  const apiClient = createEmbyClient({
    serverUrl: serverUrl || '',
    accessToken: accessToken || undefined,
  })
  const mediaService = createMediaService(apiClient)

  // 防抖处理搜索词
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // 获取所有流派
  const { data: genres } = useQuery({
    queryKey: ['genres', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      try {
        const response = await apiClient.get<{ Items: any[] }>(`/Genres`, {
          UserId: user.id,
          Recursive: true,
        })
        return response.Items?.map((item: any) => item.Name) || []
      } catch (error) {
        console.error('获取流派失败:', error)
        return []
      }
    },
    enabled: !!user?.id,
  })

  // 智能匹配流派：当搜索词匹配到流派名称时，自动使用流派搜索
  const matchedGenres = genres?.filter((g: string) => 
    g.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
    debouncedSearchTerm.toLowerCase().includes(g.toLowerCase())
  ) || []

  // 关键词搜索
  const { data: keywordResults, isLoading: isKeywordLoading } = useQuery({
    queryKey: ['keywordSearch', user?.id, debouncedSearchTerm, selectedType],
    queryFn: async () => {
      if (!user?.id || !debouncedSearchTerm.trim()) return []
      
      const params: any = {
        searchTerm: debouncedSearchTerm,
        recursive: true,
        fields: ['PrimaryImageAspectRatio', 'BasicSyncInfo', 'Genres'],
        limit: 100,
        excludeItemTypes: ['Episode'],
      }

      if (selectedType !== 'all') {
        params.includeItemTypes = [selectedType]
        delete params.excludeItemTypes
      } else {
        params.includeItemTypes = ['Movie', 'Series', 'Audio', 'MusicAlbum', 'MusicArtist']
      }

      const response = await mediaService.getItems(user.id, params)
      return response.items || []
    },
    enabled: !!user?.id && debouncedSearchTerm.trim().length > 0,
    staleTime: 0,
    gcTime: 0,
  })

  // 流派搜索（如果匹配到流派）
  const { data: genreResults, isLoading: isGenreLoading } = useQuery({
    queryKey: ['genreSearch', user?.id, matchedGenres, selectedType],
    queryFn: async () => {
      if (!user?.id || matchedGenres.length === 0) return []
      
      // 对每个匹配的流派进行搜索，然后合并结果
      const allResults = await Promise.all(
        matchedGenres.map(async (genre) => {
          const params: any = {
            genres: genre,
            recursive: true,
            fields: ['PrimaryImageAspectRatio', 'BasicSyncInfo', 'Genres'],
            limit: 100,
            excludeItemTypes: ['Episode'],
          }

          if (selectedType !== 'all') {
            params.includeItemTypes = [selectedType]
            delete params.excludeItemTypes
          } else {
            params.includeItemTypes = ['Movie', 'Series', 'Audio', 'MusicAlbum', 'MusicArtist']
          }

          const response = await mediaService.getItems(user.id, params)
          return response.items || []
        })
      )

      // 合并并去重
      const merged = allResults.flat()
      const uniqueItems = Array.from(
        new Map(merged.map(item => [item.id, item])).values()
      )
      return uniqueItems
    },
    enabled: !!user?.id && matchedGenres.length > 0,
    staleTime: 0,
    gcTime: 0,
  })

  // 合并两种搜索结果并去重
  const searchResults = React.useMemo(() => {
    const keyword = keywordResults || []
    const genre = genreResults || []
    
    // 合并两个数组
    const combined = [...keyword, ...genre]
    
    // 去重（基于 id）
    const uniqueItems = Array.from(
      new Map(combined.map(item => [item.id, item])).values()
    )
    
    return uniqueItems
  }, [keywordResults, genreResults])

  const isLoading = isKeywordLoading || isGenreLoading
  const error = null // 简化错误处理

  // 清空搜索
  const handleClearSearch = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
  }

  return (
    <div className="min-h-screen" style={{ background: '#17181A' }}>
      <Header />
      
      <div className="px-8 sm:px-12 md:px-16 lg:px-20 xl:px-32 pt-20 pb-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-semibold text-white/95 tracking-tight">
              搜索媒体
            </h1>
            {matchedGenres.length > 0 && debouncedSearchTerm && (
              <span className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400">
                流派: {matchedGenres.join(', ')}
              </span>
            )}
          </div>

          {/* 搜索输入框 */}
          <div className="relative mb-6">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索电影、电视剧、音乐..."
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl pl-12 pr-12 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  aria-label="清空搜索"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
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

        {/* 搜索结果统计 */}
        {debouncedSearchTerm && !isLoading && searchResults && (
          <p className="text-white/55 mb-6 text-sm font-medium">
            找到 {searchResults.length} 个结果
          </p>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/20"></div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg border border-red-500/20">
            搜索失败，请稍后重试
          </div>
        )}

        {/* 初始状态 - 未输入搜索词 */}
        {!debouncedSearchTerm && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            {/* 图标容器 */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
              <div className="relative bg-white/[0.06] backdrop-blur-sm rounded-full p-8 border border-white/[0.08]">
                <SearchIcon className="w-20 h-20 text-blue-500/80" />
              </div>
            </div>

            {/* 文字内容 */}
            <h2 className="text-2xl font-semibold mb-3 text-white/95 tracking-tight">
              开始搜索
            </h2>
            <p className="text-white/50 text-base max-w-md text-center leading-relaxed">
              输入关键词来搜索你想要的电影、电视剧或音乐
            </p>

            {/* 搜索建议 */}
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {['动作片', '科幻', '喜剧', '经典电影'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchTerm(tag)}
                  className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] rounded-lg text-sm text-white/70 hover:text-white/90 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 空结果状态 */}
        {debouncedSearchTerm && !isLoading && !error && searchResults?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            {/* 图标容器 */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/20 to-gray-600/20 blur-3xl rounded-full"></div>
              <div className="relative bg-white/[0.06] backdrop-blur-sm rounded-full p-8 border border-white/[0.08]">
                <svg 
                  className="w-20 h-20 text-gray-500/80" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
            </div>

            {/* 文字内容 */}
            <h2 className="text-2xl font-semibold mb-3 text-white/95 tracking-tight">
              没有找到结果
            </h2>
            <p className="text-white/50 text-base max-w-md text-center leading-relaxed">
              试试其他关键词，或者调整筛选条件
            </p>
          </div>
        )}

        {/* 搜索结果 */}
        {!isLoading && !error && searchResults && searchResults.length > 0 && (
          <MediaGrid items={searchResults} />
        )}
      </div>
    </div>
  )
}
