/**
 * 媒体浏览服务
 * 
 * 提供媒体库浏览相关的业务逻辑，包括：
 * - 获取顶级视图（媒体库分类）
 * - 获取媒体项列表（支持查询参数）
 * - 获取单个媒体项详情
 * - 获取最新添加的项目
 * 
 * 需求：2.1, 2.2, 3.1
 */

import type { EmbyApiClient } from '@/services/api/embyClient'
import { mediaEndpoints } from '@/services/api/endpoints/media'
import type {
  MediaView,
  MediaItem,
  MediaItemsResponse,
  MediaQueryParams,
  LatestItemsParams,
  SimilarItemsParams,
} from '@/types/emby'

/**
 * 媒体浏览服务类
 */
export class MediaService {
  private apiClient: EmbyApiClient

  constructor(apiClient: EmbyApiClient) {
    this.apiClient = apiClient
  }

  /**
   * 转换 Emby API 的 MediaStream 数据（PascalCase → camelCase）
   */
  private transformMediaStream(stream: any): any {
    return {
      codec: stream.Codec,
      language: stream.Language,
      displayTitle: stream.DisplayTitle,
      index: stream.Index,
      type: stream.Type,
      width: stream.Width,
      height: stream.Height,
      aspectRatio: stream.AspectRatio,
      averageFrameRate: stream.AverageFrameRate,
      bitRate: stream.BitRate,
      channels: stream.Channels,
      channelLayout: stream.ChannelLayout,
      sampleRate: stream.SampleRate,
      isExternal: stream.IsExternal,
      isTextSubtitleStream: stream.IsTextSubtitleStream,
      supportsExternalStream: stream.SupportsExternalStream,
      deliveryUrl: stream.DeliveryUrl,
    }
  }

  /**
   * 转换 Emby API 的 MediaSource 数据（PascalCase → camelCase）
   */
  private transformMediaSource(source: any): any {
    return {
      id: source.Id,
      path: source.Path,
      protocol: source.Protocol,
      container: source.Container,
      size: source.Size,
      bitrate: source.Bitrate,
      runTimeTicks: source.RunTimeTicks,
      supportsDirectPlay: source.SupportsDirectPlay,
      supportsDirectStream: source.SupportsDirectStream,
      supportsTranscoding: source.SupportsTranscoding,
      mediaStreams: source.MediaStreams?.map((s: any) => this.transformMediaStream(s)) || [],
      defaultAudioStreamIndex: source.DefaultAudioStreamIndex,
      defaultSubtitleStreamIndex: source.DefaultSubtitleStreamIndex,
    }
  }

  /**
   * 转换 Emby API 的 MediaItem 数据（PascalCase → camelCase）
   */
  private transformMediaItem(item: any): MediaItem {
    return {
      id: item.Id,
      name: item.Name,
      serverId: item.ServerId,
      type: item.Type,
      mediaType: item.MediaType,
      isFolder: item.IsFolder,
      runTimeTicks: item.RunTimeTicks,
      premiereDate: item.PremiereDate,
      productionYear: item.ProductionYear,
      officialRating: item.OfficialRating,
      communityRating: item.CommunityRating,
      overview: item.Overview,
      taglines: item.Taglines,
      imageTags: item.ImageTags,
      backdropImageTags: item.BackdropImageTags,
      primaryImageAspectRatio: item.PrimaryImageAspectRatio,
      album: item.Album,
      albumArtist: item.AlbumArtist,
      artists: item.Artists,
      albumId: item.AlbumId,
      seriesId: item.SeriesId,
      seriesName: item.SeriesName,
      seasonId: item.SeasonId,
      indexNumber: item.IndexNumber,
      parentIndexNumber: item.ParentIndexNumber,
      genres: item.Genres,
      // 演职人员
      people: item.People?.map((p: any) => ({
        name: p.Name,
        id: p.Id,
        role: p.Role,
        type: p.Type,
        primaryImageTag: p.PrimaryImageTag,
      })),
      // 工作室
      studios: item.Studios?.map((s: any) => ({
        name: s.Name,
        id: s.Id,
      })),
      // 外部链接
      externalUrls: item.ExternalUrls?.map((u: any) => ({
        name: u.Name,
        url: u.Url,
      })),
      // 提供商 ID
      providerIds: item.ProviderIds,
      // 预告片
      remoteTrailers: item.RemoteTrailers?.map((t: any) => ({
        url: t.Url,
        name: t.Name,
      })),
      userData: item.UserData ? {
        playbackPositionTicks: item.UserData.PlaybackPositionTicks || 0,
        playCount: item.UserData.PlayCount || 0,
        isFavorite: item.UserData.IsFavorite || false,
        played: item.UserData.Played || false,
        lastPlayedDate: item.UserData.LastPlayedDate,
        key: item.UserData.Key,
      } : undefined,
      mediaSources: item.MediaSources?.map((s: any) => this.transformMediaSource(s)),
      mediaStreams: item.MediaStreams?.map((s: any) => this.transformMediaStream(s)),
    }
  }

  /**
   * 转换 Emby API 的 MediaView 数据（PascalCase → camelCase）
   */
  private transformMediaView(view: any): MediaView {
    return {
      id: view.Id,
      name: view.Name,
      serverId: view.ServerId,
      collectionType: view.CollectionType,
      imageTags: view.ImageTags,
    }
  }

  /**
   * 获取用户的顶级视图（媒体库分类）
   * 
   * 需求 2.1：Media_Browser 应当从 Emby_Server 检索并显示顶级媒体库视图
   * （例如：电影、电视剧、音乐）
   * 
   * @param userId - 用户 ID
   * @returns 顶级视图列表
   * @throws 当网络请求失败时抛出错误
   */
  async getViews(userId: string): Promise<MediaView[]> {
    try {
      const response = await this.apiClient.get<{ Items: any[] }>(
        mediaEndpoints.getViews(userId)
      )
      return (response.Items || []).map(view => this.transformMediaView(view))
    } catch (error) {
      console.error('获取媒体视图失败:', error)
      throw new Error('无法获取媒体库分类，请稍后重试')
    }
  }

  /**
   * 获取媒体项列表
   * 
   * 需求 2.2：Media_Browser 应当支持按类型（电影、剧集、音乐）过滤媒体项
   * 需求 3.1：Media_Browser 应当支持按标题、日期、评分排序媒体项
   * 
   * @param userId - 用户 ID
   * @param params - 查询参数
   * @returns 媒体项列表响应
   * @throws 当网络请求失败时抛出错误
   */
  async getItems(userId: string, params?: MediaQueryParams): Promise<MediaItemsResponse> {
    try {
      // 构建查询参数
      const queryParams = this.buildQueryParams(params)

      const response = await this.apiClient.get<any>(
        mediaEndpoints.getItems(userId),
        queryParams
      )

      return {
        items: (response.Items || []).map((item: any) => this.transformMediaItem(item)),
        totalRecordCount: response.TotalRecordCount || 0,
        startIndex: response.StartIndex || 0,
      }
    } catch (error) {
      console.error('获取媒体项列表失败:', error)
      throw new Error('无法获取媒体列表，请稍后重试')
    }
  }

  /**
   * 获取单个媒体项详情
   * 
   * @param userId - 用户 ID
   * @param itemId - 媒体项 ID
   * @returns 媒体项详情
   * @throws 当网络请求失败时抛出错误
   */
  async getItemDetail(userId: string, itemId: string): Promise<MediaItem> {
    try {
      const item = await this.apiClient.get<any>(
        mediaEndpoints.getItem(userId, itemId),
        {
          // 请求完整的媒体信息，包括媒体源、流和用户数据（播放进度）
          Fields: 'MediaSources,MediaStreams,Overview,Genres,People,Studios,ProductionYear,OfficialRating,UserData',
        }
      )
      return this.transformMediaItem(item)
    } catch (error) {
      console.error('获取媒体项详情失败:', error)
      throw new Error('无法获取媒体详情，请稍后重试')
    }
  }

  /**
   * 获取最新添加的媒体项
   * 
   * @param userId - 用户 ID
   * @param params - 查询参数
   * @returns 最新媒体项列表
   * @throws 当网络请求失败时抛出错误
   */
  async getLatestItems(userId: string, params?: LatestItemsParams): Promise<MediaItem[]> {
    try {
      // 构建查询参数
      const queryParams = this.buildLatestItemsParams(params)

      const items = await this.apiClient.get<any[]>(
        mediaEndpoints.getLatest(userId),
        queryParams
      )

      return (items || []).map(item => this.transformMediaItem(item))
    } catch (error) {
      console.error('获取最新媒体项失败:', error)
      throw new Error('无法获取最新内容，请稍后重试')
    }
  }

  /**
   * 获取相似或推荐的媒体项
   * 
   * 需求 3.8：Media_Browser 应当在媒体详情页显示相似或推荐的内容
   * 
   * @param userId - 用户 ID
   * @param itemId - 媒体项 ID
   * @param params - 查询参数
   * @returns 相似媒体项列表（如果服务器不支持或没有数据，返回空数组）
   */
  async getSimilarItems(userId: string, itemId: string, params?: SimilarItemsParams): Promise<MediaItem[]> {
    try {
      // 验证参数
      if (!userId || !itemId) {
        return []
      }

      // 构建查询参数
      const queryParams = this.buildSimilarItemsParams(userId, params)

      const response = await this.apiClient.request<{ Items: any[] }>({
        method: 'GET',
        url: mediaEndpoints.getSimilar(itemId),
        params: queryParams,
        noRetry: true, // 禁用重试，避免多次 404 错误
      })

      return (response.Items || []).map(item => this.transformMediaItem(item))
    } catch (error) {
      // 静默处理错误：服务器可能不支持 Similar API 或该媒体项没有相似内容
      // 返回空数组，不影响页面其他功能
      return []
    }
  }

  /**
   * 构建媒体查询参数
   * 
   * 将 TypeScript 类型的参数转换为 Emby API 期望的格式
   * 
   * @param params - 媒体查询参数
   * @returns API 查询参数对象
   */
  private buildQueryParams(params?: MediaQueryParams): Record<string, any> {
    const queryParams: Record<string, any> = {}

    // 默认请求 Overview、ProductionYear、CommunityRating 和 UserData 字段
    const defaultFields = ['Overview', 'ProductionYear', 'CommunityRating', 'UserData']
    
    if (!params) {
      queryParams.Fields = defaultFields.join(',')
      return queryParams
    }

    // 父 ID
    if (params.parentId) {
      queryParams.ParentId = params.parentId
    }

    // 递归搜索
    if (params.recursive !== undefined) {
      queryParams.Recursive = params.recursive
    }

    // 包含的项目类型
    if (params.includeItemTypes && params.includeItemTypes.length > 0) {
      queryParams.IncludeItemTypes = params.includeItemTypes.join(',')
    }

    // 排除的项目类型
    if (params.excludeItemTypes && params.excludeItemTypes.length > 0) {
      queryParams.ExcludeItemTypes = params.excludeItemTypes.join(',')
    }

    // 排序字段
    if (params.sortBy && params.sortBy.length > 0) {
      queryParams.SortBy = params.sortBy.join(',')
    }

    // 排序顺序
    if (params.sortOrder) {
      queryParams.SortOrder = params.sortOrder
    }

    // 分页参数
    if (params.startIndex !== undefined) {
      queryParams.StartIndex = params.startIndex
    }

    if (params.limit !== undefined) {
      queryParams.Limit = params.limit
    }

    // 过滤器
    if (params.filters && params.filters.length > 0) {
      queryParams.Filters = params.filters.join(',')
    }

    // 搜索关键词
    if (params.searchTerm) {
      queryParams.SearchTerm = params.searchTerm
    }

    // 额外字段（合并默认字段）
    const fields = params.fields ? [...defaultFields, ...params.fields] : defaultFields
    queryParams.Fields = fields.join(',')

    return queryParams
  }

  /**
   * 构建最新项目查询参数
   * 
   * @param params - 最新项目查询参数
   * @returns API 查询参数对象
   */
  private buildLatestItemsParams(params?: LatestItemsParams): Record<string, any> {
    const queryParams: Record<string, any> = {}

    // 默认请求 Overview、Genres、ProductionYear、CommunityRating 和 UserData 字段
    const defaultFields = ['Overview', 'Genres', 'ProductionYear', 'CommunityRating', 'UserData']
    
    if (!params) {
      queryParams.Fields = defaultFields.join(',')
      return queryParams
    }

    // 父 ID
    if (params.parentId) {
      queryParams.ParentId = params.parentId
    }

    // 包含的项目类型
    if (params.includeItemTypes && params.includeItemTypes.length > 0) {
      queryParams.IncludeItemTypes = params.includeItemTypes.join(',')
    }

    // 数量限制
    if (params.limit !== undefined) {
      queryParams.Limit = params.limit
    }

    // 额外字段（合并默认字段）
    const fields = params.fields ? [...defaultFields, ...params.fields] : defaultFields
    queryParams.Fields = fields.join(',')

    return queryParams
  }

  /**
   * 构建相似项目查询参数
   * 
   * @param userId - 用户 ID
   * @param params - 相似项目查询参数
   * @returns API 查询参数对象
   */
  private buildSimilarItemsParams(userId: string, params?: SimilarItemsParams): Record<string, any> {
    const queryParams: Record<string, any> = {
      UserId: userId,
    }

    if (!params) {
      return queryParams
    }

    // 数量限制
    if (params.limit !== undefined) {
      queryParams.Limit = params.limit
    }

    // 额外字段
    if (params.fields && params.fields.length > 0) {
      queryParams.Fields = params.fields.join(',')
    }

    return queryParams
  }
}

/**
 * 创建媒体浏览服务实例
 * 
 * @param apiClient - Emby API 客户端实例
 * @returns 媒体浏览服务实例
 */
export function createMediaService(apiClient: EmbyApiClient): MediaService {
  return new MediaService(apiClient)
}
