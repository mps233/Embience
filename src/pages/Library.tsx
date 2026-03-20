/**
 * 媒体库页面
 * 
 * 显示特定媒体库分类的内容（电影、电视剧、音乐等）
 */

import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { createEmbyClient } from '@/services/api/embyClient'
import { createMediaService } from '@/services/media/mediaService'
import { useMediaItems, useMediaDetail } from '@/hooks/useMedia'
import MediaGrid from '@/components/media/MediaGrid'
import Header from '@/components/layout/Header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * 排序选项类型
 */
type SortOption = 'name' | 'year' | 'dateAdded'

/**
 * 媒体库页面组件
 */
export default function Library() {
  const { type } = useParams<{ type: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, serverUrl, serverType, accessToken } = useAuthStore()
  
  const parentId = searchParams.get('parentId')
  
  // 从 localStorage 读取保存的排序方式，如果没有则使用默认值
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('library-sort-preference')
    return (saved as SortOption) || 'dateAdded'
  })
  
  // 当排序方式改变时保存到 localStorage
  const handleSortChange = (value: SortOption) => {
    setSortBy(value)
    localStorage.setItem('library-sort-preference', value)
  }
  
  // 创建服务实例
  const apiClient = createEmbyClient({
    serverUrl: serverUrl || '',
    serverType: serverType || undefined,
    accessToken: accessToken || undefined,
  })
  const mediaService = createMediaService(apiClient)
  
  // 获取父媒体库信息（用于显示标题）
  const { data: parentItem } = useMediaDetail(
    mediaService,
    user?.id || '',
    parentId || '',
    !!parentId && !!user?.id
  )
  
  // 根据类型确定要获取的媒体类型
  const getIncludeItemTypes = (): ('Movie' | 'Series' | 'MusicAlbum')[] | undefined => {
    switch (type) {
      case 'movies':
        return ['Movie']
      case 'tvshows':
        return ['Series']
      case 'music':
        return ['MusicAlbum']
      default:
        return undefined
    }
  }
  
  // 根据排序选项获取排序参数
  const getSortParams = () => {
    switch (sortBy) {
      case 'year':
        return {
          sortBy: ['ProductionYear' as const, 'SortName' as const],
          sortOrder: 'Descending' as const,
        }
      case 'dateAdded':
        return {
          sortBy: ['DateCreated' as const],
          sortOrder: 'Descending' as const,
        }
      case 'name':
      default:
        return {
          sortBy: ['SortName' as const],
          sortOrder: 'Ascending' as const,
        }
    }
  }
  
  const sortParams = getSortParams()
  
  // 获取媒体项列表
  const { data: mediaResponse, isLoading, error } = useMediaItems(
    mediaService,
    user?.id || '',
    {
      parentId: parentId || undefined,
      includeItemTypes: getIncludeItemTypes(),
      recursive: true,
      ...sortParams,
    },
    !!user?.id
  )
  
  // 获取标题 - 优先使用父媒体库的名称
  const getTitle = () => {
    if (parentItem?.name) {
      return parentItem.name
    }
    
    switch (type) {
      case 'movies':
        return '电影'
      case 'tvshows':
        return '电视剧'
      case 'music':
        return '音乐'
      default:
        return '媒体库'
    }
  }
  
  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#17181A' }}>
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
  if (error) {
    return (
      <div className="min-h-screen" style={{ background: '#17181A' }}>
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
    <div className="min-h-screen" style={{ background: '#17181A' }}>
      <Header />
      
      <div className="px-8 sm:px-12 md:px-16 lg:px-20 xl:px-32 pt-20 pb-8">
        {/* 标题和排序 */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white/95 tracking-tight">
              {getTitle()}
            </h1>
            {mediaResponse && (
              <p className="text-white/55 mt-2 text-sm font-medium">
                共 {mediaResponse.totalRecordCount} 项
              </p>
            )}
          </div>
          
          {/* 排序选择器 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/55 font-medium">排序</span>
            <Select value={sortBy} onValueChange={(value) => handleSortChange(value as SortOption)}>
              <SelectTrigger className="w-[140px] border-white/[0.12] bg-white/[0.04] text-white/85 hover:bg-white/[0.08] focus:ring-white/20 transition-all duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/[0.12] bg-[#2c3137]/95 backdrop-blur-xl">
                <SelectItem value="name" className="text-white/85 focus:bg-white/[0.12] focus:text-white">
                  按首字母
                </SelectItem>
                <SelectItem value="year" className="text-white/85 focus:bg-white/[0.12] focus:text-white">
                  按年份
                </SelectItem>
                <SelectItem value="dateAdded" className="text-white/85 focus:bg-white/[0.12] focus:text-white">
                  最新添加
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* 媒体网格 */}
        {mediaResponse && mediaResponse.items.length > 0 ? (
          <MediaGrid items={mediaResponse.items} />
        ) : (
          <div className="text-center py-12">
            <p className="text-white/60">暂无内容</p>
          </div>
        )}
      </div>
    </div>
  )
}
