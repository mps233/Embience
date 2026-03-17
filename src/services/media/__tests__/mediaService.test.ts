/**
 * 媒体浏览服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MediaService } from '../mediaService'
import type { EmbyApiClient } from '@/services/api/embyClient'
import type { MediaView, MediaItem, MediaItemsResponse } from '@/types/emby'

describe('MediaService', () => {
  let mediaService: MediaService
  let mockApiClient: EmbyApiClient

  beforeEach(() => {
    // 创建 mock API 客户端
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      setAccessToken: vi.fn(),
    } as any

    mediaService = new MediaService(mockApiClient)
  })

  describe('getViews', () => {
    it('应该成功获取顶级视图列表', async () => {
      // Mock 数据使用 PascalCase（Emby API 格式）
      const mockApiViews = [
        {
          Id: 'view1',
          Name: '电影',
          ServerId: 'server123',
          CollectionType: 'movies',
          ImageTags: { Primary: 'tag1' },
        },
        {
          Id: 'view2',
          Name: '电视剧',
          ServerId: 'server123',
          CollectionType: 'tvshows',
          ImageTags: { Primary: 'tag2' },
        },
      ]

      // 期望的转换后数据（camelCase）
      const expectedViews: MediaView[] = [
        {
          id: 'view1',
          name: '电影',
          serverId: 'server123',
          collectionType: 'movies',
          imageTags: { Primary: 'tag1' },
        },
        {
          id: 'view2',
          name: '电视剧',
          serverId: 'server123',
          collectionType: 'tvshows',
          imageTags: { Primary: 'tag2' },
        },
      ]

      vi.mocked(mockApiClient.get).mockResolvedValue({ Items: mockApiViews })

      const views = await mediaService.getViews('user123')

      expect(views).toEqual(expectedViews)
      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Views')
    })

    it('响应中没有 Items 时应该返回空数组', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({})

      const views = await mediaService.getViews('user123')

      expect(views).toEqual([])
    })

    it('获取视图失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(mediaService.getViews('user123')).rejects.toThrow(
        '无法获取媒体库分类，请稍后重试'
      )
    })
  })

  describe('getItems', () => {
    it('应该成功获取媒体项列表', async () => {
      // Mock 数据使用 PascalCase（Emby API 格式）
      const mockApiResponse = {
        Items: [
          {
            Id: 'item1',
            Name: '复仇者联盟',
            ServerId: 'server123',
            Type: 'Movie',
            IsFolder: false,
            CommunityRating: 8.5,
          },
          {
            Id: 'item2',
            Name: '钢铁侠',
            ServerId: 'server123',
            Type: 'Movie',
            IsFolder: false,
            CommunityRating: 8.0,
          },
        ],
        TotalRecordCount: 2,
        StartIndex: 0,
      }

      // 期望的转换后数据（camelCase）
      const expectedResponse: MediaItemsResponse = {
        items: [
          {
            id: 'item1',
            name: '复仇者联盟',
            serverId: 'server123',
            type: 'Movie',
            isFolder: false,
            communityRating: 8.5,
          } as MediaItem,
          {
            id: 'item2',
            name: '钢铁侠',
            serverId: 'server123',
            type: 'Movie',
            isFolder: false,
            communityRating: 8.0,
          } as MediaItem,
        ],
        totalRecordCount: 2,
        startIndex: 0,
      }

      vi.mocked(mockApiClient.get).mockResolvedValue(mockApiResponse)

      const response = await mediaService.getItems('user123')

      expect(response).toEqual(expectedResponse)
      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {})
    })

    it('应该正确构建查询参数', async () => {
      const mockApiResponse = {
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0,
      }

      vi.mocked(mockApiClient.get).mockResolvedValue(mockApiResponse)

      await mediaService.getItems('user123', {
        parentId: 'parent1',
        recursive: true,
        includeItemTypes: ['Movie', 'Series'],
        excludeItemTypes: ['Folder'],
        sortBy: ['CommunityRating', 'SortName'],
        sortOrder: 'Descending',
        startIndex: 20,
        limit: 10,
        filters: ['IsFavorite', 'IsResumable'],
        searchTerm: '复仇者',
        fields: ['Overview', 'MediaStreams'],
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {
        ParentId: 'parent1',
        Recursive: true,
        IncludeItemTypes: 'Movie,Series',
        ExcludeItemTypes: 'Folder',
        SortBy: 'CommunityRating,SortName',
        SortOrder: 'Descending',
        StartIndex: 20,
        Limit: 10,
        Filters: 'IsFavorite,IsResumable',
        SearchTerm: '复仇者',
        Fields: 'Overview,MediaStreams',
      })
    })

    it('响应数据不完整时应该使用默认值', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({})

      const response = await mediaService.getItems('user123')

      expect(response).toEqual({
        items: [],
        totalRecordCount: 0,
        startIndex: 0,
      })
    })

    it('获取媒体项失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(mediaService.getItems('user123')).rejects.toThrow(
        '无法获取媒体列表，请稍后重试'
      )
    })
  })

  describe('getItemDetail', () => {
    it('应该成功获取媒体项详情', async () => {
      // Mock 数据使用 PascalCase（Emby API 格式）
      const mockApiItem = {
        Id: 'item123',
        Name: '复仇者联盟',
        ServerId: 'server123',
        Type: 'Movie',
        IsFolder: false,
        Overview: '超级英雄集结',
        CommunityRating: 8.5,
        ProductionYear: 2012,
        RunTimeTicks: 14400000000,
        UserData: {
          PlaybackPositionTicks: 0,
          PlayCount: 0,
          IsFavorite: false,
          Played: false,
        },
      }

      // 期望的转换后数据（camelCase）
      const expectedItem: MediaItem = {
        id: 'item123',
        name: '复仇者联盟',
        serverId: 'server123',
        type: 'Movie',
        isFolder: false,
        overview: '超级英雄集结',
        communityRating: 8.5,
        productionYear: 2012,
        runTimeTicks: 14400000000,
        userData: {
          playbackPositionTicks: 0,
          playCount: 0,
          isFavorite: false,
          played: false,
        },
      }

      vi.mocked(mockApiClient.get).mockResolvedValue(mockApiItem)

      const item = await mediaService.getItemDetail('user123', 'item123')

      expect(item).toEqual(expectedItem)
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/Users/user123/Items/item123',
        {
          Fields: 'MediaSources,MediaStreams,Overview,Genres,People,Studios',
        }
      )
    })

    it('获取媒体详情失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Not found'))

      await expect(mediaService.getItemDetail('user123', 'item123')).rejects.toThrow(
        '无法获取媒体详情，请稍后重试'
      )
    })
  })

  describe('getLatestItems', () => {
    it('应该成功获取最新媒体项', async () => {
      // Mock 数据使用 PascalCase（Emby API 格式）
      const mockApiItems = [
        {
          Id: 'item1',
          Name: '最新电影 1',
          ServerId: 'server123',
          Type: 'Movie',
          IsFolder: false,
          ProductionYear: 2024,
        },
        {
          Id: 'item2',
          Name: '最新电影 2',
          ServerId: 'server123',
          Type: 'Movie',
          IsFolder: false,
          ProductionYear: 2024,
        },
      ]

      // 期望的转换后数据（camelCase）
      const expectedItems: MediaItem[] = [
        {
          id: 'item1',
          name: '最新电影 1',
          serverId: 'server123',
          type: 'Movie',
          isFolder: false,
          productionYear: 2024,
        } as MediaItem,
        {
          id: 'item2',
          name: '最新电影 2',
          serverId: 'server123',
          type: 'Movie',
          isFolder: false,
          productionYear: 2024,
        } as MediaItem,
      ]

      vi.mocked(mockApiClient.get).mockResolvedValue(mockApiItems)

      const items = await mediaService.getLatestItems('user123')

      expect(items).toEqual(expectedItems)
      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items/Latest', {})
    })

    it('应该正确构建最新项目查询参数', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue([])

      await mediaService.getLatestItems('user123', {
        parentId: 'parent1',
        includeItemTypes: ['Movie'],
        limit: 10,
        fields: ['Overview'],
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items/Latest', {
        ParentId: 'parent1',
        IncludeItemTypes: 'Movie',
        Limit: 10,
        Fields: 'Overview',
      })
    })

    it('响应为空时应该返回空数组', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue(null)

      const items = await mediaService.getLatestItems('user123')

      expect(items).toEqual([])
    })

    it('获取最新内容失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(mediaService.getLatestItems('user123')).rejects.toThrow(
        '无法获取最新内容，请稍后重试'
      )
    })
  })

  describe('getSimilarItems', () => {
    it('应该成功获取相似媒体项', async () => {
      // Mock 数据使用 PascalCase（Emby API 格式）
      const mockApiItems = [
        {
          Id: 'similar1',
          Name: '相似电影 1',
          ServerId: 'server123',
          Type: 'Movie',
          IsFolder: false,
          CommunityRating: 8.0,
        },
        {
          Id: 'similar2',
          Name: '相似电影 2',
          ServerId: 'server123',
          Type: 'Movie',
          IsFolder: false,
          CommunityRating: 7.8,
        },
      ]

      // 期望的转换后数据（camelCase）
      const expectedItems: MediaItem[] = [
        {
          id: 'similar1',
          name: '相似电影 1',
          serverId: 'server123',
          type: 'Movie',
          isFolder: false,
          communityRating: 8.0,
        } as MediaItem,
        {
          id: 'similar2',
          name: '相似电影 2',
          serverId: 'server123',
          type: 'Movie',
          isFolder: false,
          communityRating: 7.8,
        } as MediaItem,
      ]

      vi.mocked(mockApiClient.get).mockResolvedValue({ Items: mockApiItems })

      const items = await mediaService.getSimilarItems('user123', 'item123')

      expect(items).toEqual(expectedItems)
      expect(mockApiClient.get).toHaveBeenCalledWith('/Items/item123/Similar', {
        UserId: 'user123',
      })
    })

    it('应该正确构建相似项目查询参数', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({ Items: [] })

      await mediaService.getSimilarItems('user123', 'item123', {
        limit: 18,
        fields: ['Overview', 'MediaStreams'],
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Items/item123/Similar', {
        UserId: 'user123',
        Limit: 18,
        Fields: 'Overview,MediaStreams',
      })
    })

    it('响应中没有 Items 时应该返回空数组', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({})

      const items = await mediaService.getSimilarItems('user123', 'item123')

      expect(items).toEqual([])
    })

    it('获取相似内容失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(mediaService.getSimilarItems('user123', 'item123')).rejects.toThrow(
        '无法获取相似内容，请稍后重试'
      )
    })
  })

  describe('参数构建', () => {
    it('空参数应该返回空对象', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0,
      })

      await mediaService.getItems('user123', undefined)

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {})
    })

    it('应该正确处理布尔值参数', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0,
      })

      await mediaService.getItems('user123', {
        recursive: false,
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {
        Recursive: false,
      })
    })

    it('应该正确处理数字 0 作为参数', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0,
      })

      await mediaService.getItems('user123', {
        startIndex: 0,
        limit: 0,
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {
        StartIndex: 0,
        Limit: 0,
      })
    })

    it('应该忽略空数组参数', async () => {
      vi.mocked(mockApiClient.get).mockResolvedValue({
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0,
      })

      await mediaService.getItems('user123', {
        includeItemTypes: [],
        sortBy: [],
        filters: [],
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/Users/user123/Items', {})
    })
  })
})
