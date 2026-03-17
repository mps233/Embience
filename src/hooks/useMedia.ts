/**
 * 媒体浏览 Hooks
 * 
 * 封装 mediaService，使用 TanStack Query 管理媒体浏览 API 调用
 * 提供便捷的 hooks 接口供组件使用
 * 
 * 需求：2.1, 2.2, 3.1, 12.2
 */

import { useQuery } from '@tanstack/react-query'
import type { MediaService } from '@/services/media/mediaService'
import type {
  MediaQueryParams,
  LatestItemsParams,
  SimilarItemsParams,
} from '@/types/emby'

/**
 * 媒体相关的 Query Keys
 * 
 * 使用分层的 key 结构，便于缓存失效和管理
 */
export const mediaKeys = {
  all: ['media'] as const,
  views: (userId: string) => [...mediaKeys.all, 'views', userId] as const,
  items: (userId: string) => [...mediaKeys.all, 'items', userId] as const,
  itemsList: (userId: string, params?: MediaQueryParams) => 
    [...mediaKeys.items(userId), 'list', params] as const,
  detail: (userId: string, itemId: string) => 
    [...mediaKeys.all, 'detail', userId, itemId] as const,
  latest: (userId: string) => [...mediaKeys.all, 'latest', userId] as const,
  latestList: (userId: string, params?: LatestItemsParams) => 
    [...mediaKeys.latest(userId), 'list', params] as const,
  similar: (userId: string, itemId: string) => 
    [...mediaKeys.all, 'similar', userId, itemId] as const,
  similarList: (userId: string, itemId: string, params?: SimilarItemsParams) => 
    [...mediaKeys.similar(userId, itemId), 'list', params] as const,
}

/**
 * 获取用户媒体视图 Hook
 * 
 * 需求 2.1：Media_Browser 应当从 Emby_Server 检索并显示顶级媒体库视图
 * （例如：电影、电视剧、音乐）
 * 
 * 需求 12.2：Media_Browser 应当缓存媒体库视图和项目列表，
 * 缓存时间为 5 分钟
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function useMediaViews(
  mediaService: MediaService,
  userId: string,
  enabled = true
) {
  return useQuery({
    queryKey: mediaKeys.views(userId),
    queryFn: () => mediaService.getViews(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    gcTime: 10 * 60 * 1000, // 10 分钟后垃圾回收
    retry: 2, // 失败时重试 2 次
  })
}

/**
 * 获取媒体项列表 Hook
 * 
 * 需求 2.2：Media_Browser 应当支持按类型（电影、剧集、音乐）过滤媒体项
 * 需求 3.1：Media_Browser 应当支持按标题、日期、评分排序媒体项
 * 需求 12.2：Media_Browser 应当缓存媒体库视图和项目列表，
 * 缓存时间为 5 分钟
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @param params - 查询参数（支持分页、过滤、排序）
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function useMediaItems(
  mediaService: MediaService,
  userId: string,
  params?: MediaQueryParams,
  enabled = true
) {
  return useQuery({
    queryKey: mediaKeys.itemsList(userId, params),
    queryFn: () => mediaService.getItems(userId, params),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    gcTime: 10 * 60 * 1000, // 10 分钟后垃圾回收
    retry: 2, // 失败时重试 2 次
    // 保持之前的数据，避免加载时闪烁
    placeholderData: (previousData) => previousData,
  })
}

/**
 * 获取媒体项详情 Hook
 * 
 * 需求 12.2：Media_Browser 应当缓存媒体项详情，缓存时间为 10 分钟
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @param itemId - 媒体项 ID
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function useMediaDetail(
  mediaService: MediaService,
  userId: string,
  itemId: string,
  enabled = true
) {
  return useQuery({
    queryKey: mediaKeys.detail(userId, itemId),
    queryFn: () => mediaService.getItemDetail(userId, itemId),
    enabled: enabled && !!userId && !!itemId,
    staleTime: 10 * 60 * 1000, // 10 分钟内数据视为新鲜
    gcTime: 15 * 60 * 1000, // 15 分钟后垃圾回收
    retry: 2, // 失败时重试 2 次
  })
}

/**
 * 获取最新添加的媒体项 Hook
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @param params - 查询参数
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function useLatestItems(
  mediaService: MediaService,
  userId: string,
  params?: LatestItemsParams,
  enabled = true
) {
  return useQuery({
    queryKey: mediaKeys.latestList(userId, params),
    queryFn: () => mediaService.getLatestItems(userId, params),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    gcTime: 10 * 60 * 1000, // 10 分钟后垃圾回收
    retry: 2, // 失败时重试 2 次
  })
}

/**
 * 获取相似或推荐的媒体项 Hook
 * 
 * 需求 3.8：Media_Browser 应当在媒体详情页显示相似或推荐的内容
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @param itemId - 媒体项 ID
 * @param params - 查询参数
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function useSimilarItems(
  mediaService: MediaService,
  userId: string,
  itemId: string,
  params?: SimilarItemsParams,
  enabled = true
) {
  return useQuery({
    queryKey: mediaKeys.similarList(userId, itemId, params),
    queryFn: () => mediaService.getSimilarItems(userId, itemId, params),
    enabled: enabled && !!userId && !!itemId,
    staleTime: 10 * 60 * 1000, // 10 分钟内数据视为新鲜
    gcTime: 15 * 60 * 1000, // 15 分钟后垃圾回收
    retry: 0, // 不重试，避免多次 404 错误
  })
}

/**
 * 综合媒体浏览 Hook
 * 
 * 提供所有媒体浏览相关的查询方法
 * 这是推荐使用的主要 hook，封装了所有媒体浏览功能
 * 
 * @param mediaService - 媒体服务实例
 * @param userId - 用户 ID
 * @returns 媒体浏览相关的查询方法
 */
export function useMedia(mediaService: MediaService, userId: string) {
  return {
    /**
     * 获取媒体视图
     * 
     * @param enabled - 是否启用查询
     * @returns 媒体视图查询结果
     */
    useViews: (enabled = true) => useMediaViews(mediaService, userId, enabled),

    /**
     * 获取媒体项列表
     * 
     * @param params - 查询参数
     * @param enabled - 是否启用查询
     * @returns 媒体项列表查询结果
     */
    useItems: (params?: MediaQueryParams, enabled = true) => 
      useMediaItems(mediaService, userId, params, enabled),

    /**
     * 获取媒体项详情
     * 
     * @param itemId - 媒体项 ID
     * @param enabled - 是否启用查询
     * @returns 媒体项详情查询结果
     */
    useDetail: (itemId: string, enabled = true) => 
      useMediaDetail(mediaService, userId, itemId, enabled),

    /**
     * 获取最新添加的媒体项
     * 
     * @param params - 查询参数
     * @param enabled - 是否启用查询
     * @returns 最新媒体项查询结果
     */
    useLatest: (params?: LatestItemsParams, enabled = true) => 
      useLatestItems(mediaService, userId, params, enabled),

    /**
     * 获取相似或推荐的媒体项
     * 
     * @param itemId - 媒体项 ID
     * @param params - 查询参数
     * @param enabled - 是否启用查询
     * @returns 相似媒体项查询结果
     */
    useSimilar: (itemId: string, params?: SimilarItemsParams, enabled = true) => 
      useSimilarItems(mediaService, userId, itemId, params, enabled),
  }
}
