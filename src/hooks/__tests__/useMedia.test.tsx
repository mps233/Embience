/**
 * 媒体浏览 Hooks 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useMediaViews,
  useMediaItems,
  useMediaDetail,
  useLatestItems,
  useSimilarItems,
  mediaKeys,
} from '../useMedia'
import type { MediaService } from '@/services/media/mediaService'
import type {
  MediaView,
  MediaItem,
  MediaItemsResponse,
  MediaQueryParams,
  LatestItemsParams,
  SimilarItemsParams,
} from '@/types/emby'

// 创建测试用的 QueryClient
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 测试时禁用重试
        gcTime: 0, // 立即垃圾回收
      },
    },
  })
}

// 创建测试用的 Wrapper
function createWrapper() {
  const queryClient = createTestQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock 数据
const mockUserId = 'test-user-id'
const mockItemId = 'test-item-id'

const mockMediaViews: MediaView[] = [
  {
    name: '电影',
    serverId: 'server-1',
    id: 'view-1',
    collectionType: 'movies',
  },
  {
    name: '电视剧',
    serverId: 'server-1',
    id: 'view-2',
    collectionType: 'tvshows',
  },
]

const mockMediaItem: MediaItem = {
  name: '测试电影',
  serverId: 'server-1',
  id: mockItemId,
  type: 'Movie',
  isFolder: false,
  productionYear: 2023,
  communityRating: 8.5,
}

const mockMediaItemsResponse: MediaItemsResponse = {
  items: [mockMediaItem],
  totalRecordCount: 1,
  startIndex: 0,
}

const mockLatestItems: MediaItem[] = [mockMediaItem]

const mockSimilarItems: MediaItem[] = [
  {
    name: '相似电影 1',
    serverId: 'server-1',
    id: 'similar-1',
    type: 'Movie',
    isFolder: false,
    communityRating: 8.0,
  },
  {
    name: '相似电影 2',
    serverId: 'server-1',
    id: 'similar-2',
    type: 'Movie',
    isFolder: false,
    communityRating: 7.8,
  },
]

describe('useMediaViews', () => {
  let mockMediaService: MediaService

  beforeEach(() => {
    mockMediaService = {
      getViews: vi.fn().mockResolvedValue(mockMediaViews),
    } as any
  })

  it('应当成功获取媒体视图', async () => {
    const { result } = renderHook(
      () => useMediaViews(mockMediaService, mockUserId),
      { wrapper: createWrapper() }
    )

    // 初始状态
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()

    // 等待数据加载
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证结果
    expect(result.current.data).toEqual(mockMediaViews)
    expect(mockMediaService.getViews).toHaveBeenCalledWith(mockUserId)
  })

  it('当 enabled 为 false 时不应当发起请求', () => {
    const { result } = renderHook(
      () => useMediaViews(mockMediaService, mockUserId, false),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getViews).not.toHaveBeenCalled()
  })

  it('当 userId 为空时不应当发起请求', () => {
    const { result } = renderHook(
      () => useMediaViews(mockMediaService, ''),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getViews).not.toHaveBeenCalled()
  })
})

describe('useMediaItems', () => {
  let mockMediaService: MediaService

  beforeEach(() => {
    mockMediaService = {
      getItems: vi.fn().mockResolvedValue(mockMediaItemsResponse),
    } as any
  })

  it('应当成功获取媒体项列表', async () => {
    const { result } = renderHook(
      () => useMediaItems(mockMediaService, mockUserId),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockMediaItemsResponse)
    expect(mockMediaService.getItems).toHaveBeenCalledWith(mockUserId, undefined)
  })

  it('应当支持查询参数', async () => {
    const params: MediaQueryParams = {
      includeItemTypes: ['Movie'],
      sortBy: ['SortName'],
      sortOrder: 'Ascending',
      limit: 20,
    }

    const { result } = renderHook(
      () => useMediaItems(mockMediaService, mockUserId, params),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockMediaService.getItems).toHaveBeenCalledWith(mockUserId, params)
  })

  it('应当支持分页参数', async () => {
    const params: MediaQueryParams = {
      startIndex: 20,
      limit: 20,
    }

    const { result } = renderHook(
      () => useMediaItems(mockMediaService, mockUserId, params),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockMediaService.getItems).toHaveBeenCalledWith(mockUserId, params)
  })

  it('当 enabled 为 false 时不应当发起请求', () => {
    const { result } = renderHook(
      () => useMediaItems(mockMediaService, mockUserId, undefined, false),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getItems).not.toHaveBeenCalled()
  })
})

describe('useMediaDetail', () => {
  let mockMediaService: MediaService

  beforeEach(() => {
    mockMediaService = {
      getItemDetail: vi.fn().mockResolvedValue(mockMediaItem),
    } as any
  })

  it('应当成功获取媒体项详情', async () => {
    const { result } = renderHook(
      () => useMediaDetail(mockMediaService, mockUserId, mockItemId),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockMediaItem)
    expect(mockMediaService.getItemDetail).toHaveBeenCalledWith(
      mockUserId,
      mockItemId
    )
  })

  it('当 enabled 为 false 时不应当发起请求', () => {
    const { result } = renderHook(
      () => useMediaDetail(mockMediaService, mockUserId, mockItemId, false),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getItemDetail).not.toHaveBeenCalled()
  })

  it('当 itemId 为空时不应当发起请求', () => {
    const { result } = renderHook(
      () => useMediaDetail(mockMediaService, mockUserId, ''),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getItemDetail).not.toHaveBeenCalled()
  })
})

describe('useLatestItems', () => {
  let mockMediaService: MediaService

  beforeEach(() => {
    mockMediaService = {
      getLatestItems: vi.fn().mockResolvedValue(mockLatestItems),
    } as any
  })

  it('应当成功获取最新媒体项', async () => {
    const { result } = renderHook(
      () => useLatestItems(mockMediaService, mockUserId),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockLatestItems)
    expect(mockMediaService.getLatestItems).toHaveBeenCalledWith(
      mockUserId,
      undefined
    )
  })

  it('应当支持查询参数', async () => {
    const params: LatestItemsParams = {
      includeItemTypes: ['Movie'],
      limit: 10,
    }

    const { result } = renderHook(
      () => useLatestItems(mockMediaService, mockUserId, params),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockMediaService.getLatestItems).toHaveBeenCalledWith(
      mockUserId,
      params
    )
  })

  it('当 enabled 为 false 时不应当发起请求', () => {
    const { result } = renderHook(
      () => useLatestItems(mockMediaService, mockUserId, undefined, false),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getLatestItems).not.toHaveBeenCalled()
  })
})

describe('useSimilarItems', () => {
  let mockMediaService: MediaService

  beforeEach(() => {
    mockMediaService = {
      getSimilarItems: vi.fn().mockResolvedValue(mockSimilarItems),
    } as any
  })

  it('应当成功获取相似媒体项', async () => {
    const { result } = renderHook(
      () => useSimilarItems(mockMediaService, mockUserId, mockItemId),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockSimilarItems)
    expect(mockMediaService.getSimilarItems).toHaveBeenCalledWith(
      mockUserId,
      mockItemId,
      undefined
    )
  })

  it('应当支持查询参数', async () => {
    const params: SimilarItemsParams = {
      limit: 18,
      fields: ['Overview'],
    }

    const { result } = renderHook(
      () => useSimilarItems(mockMediaService, mockUserId, mockItemId, params),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockMediaService.getSimilarItems).toHaveBeenCalledWith(
      mockUserId,
      mockItemId,
      params
    )
  })

  it('当 enabled 为 false 时不应当发起请求', () => {
    const { result } = renderHook(
      () => useSimilarItems(mockMediaService, mockUserId, mockItemId, undefined, false),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getSimilarItems).not.toHaveBeenCalled()
  })

  it('当 itemId 为空时不应当发起请求', () => {
    const { result } = renderHook(
      () => useSimilarItems(mockMediaService, mockUserId, ''),
      { wrapper: createWrapper() }
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockMediaService.getSimilarItems).not.toHaveBeenCalled()
  })
})

describe('mediaKeys', () => {
  it('应当生成正确的 query keys', () => {
    expect(mediaKeys.all).toEqual(['media'])
    expect(mediaKeys.views(mockUserId)).toEqual(['media', 'views', mockUserId])
    expect(mediaKeys.items(mockUserId)).toEqual(['media', 'items', mockUserId])
    expect(mediaKeys.itemsList(mockUserId)).toEqual([
      'media',
      'items',
      mockUserId,
      'list',
      undefined,
    ])
    expect(mediaKeys.detail(mockUserId, mockItemId)).toEqual([
      'media',
      'detail',
      mockUserId,
      mockItemId,
    ])
    expect(mediaKeys.latest(mockUserId)).toEqual(['media', 'latest', mockUserId])
    expect(mediaKeys.latestList(mockUserId)).toEqual([
      'media',
      'latest',
      mockUserId,
      'list',
      undefined,
    ])
    expect(mediaKeys.similar(mockUserId, mockItemId)).toEqual([
      'media',
      'similar',
      mockUserId,
      mockItemId,
    ])
    expect(mediaKeys.similarList(mockUserId, mockItemId)).toEqual([
      'media',
      'similar',
      mockUserId,
      mockItemId,
      'list',
      undefined,
    ])
  })

  it('应当在 query keys 中包含查询参数', () => {
    const params: MediaQueryParams = {
      includeItemTypes: ['Movie'],
      limit: 20,
    }

    expect(mediaKeys.itemsList(mockUserId, params)).toEqual([
      'media',
      'items',
      mockUserId,
      'list',
      params,
    ])

    const similarParams: SimilarItemsParams = {
      limit: 18,
    }

    expect(mediaKeys.similarList(mockUserId, mockItemId, similarParams)).toEqual([
      'media',
      'similar',
      mockUserId,
      mockItemId,
      'list',
      similarParams,
    ])
  })
})
