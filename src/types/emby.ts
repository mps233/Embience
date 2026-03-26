/**
 * Emby API 相关类型定义
 */

// ==================== 系统信息 ====================

/**
 * 系统信息
 */
export interface SystemInfo {
  id: string
  serverName: string
  version: string
  operatingSystem: string
  localAddress: string
}

// ==================== 设备信息 ====================

/**
 * 设备信息
 */
export interface DeviceInfo {
  /** 客户端类型 */
  client: string
  /** 设备名称 */
  device: string
  /** 设备唯一 ID */
  deviceId: string
  /** 应用版本 */
  version: string
}

// ==================== 用户和认证 ====================

/**
 * 公开用户信息
 */
export interface PublicUser {
  name: string
  serverId: string
  id: string
  hasPassword: boolean
  hasConfiguredPassword: boolean
  primaryImageTag?: string
}

/**
 * 用户配置
 */
export interface UserConfiguration {
  playDefaultAudioTrack: boolean
  subtitleLanguagePreference?: string
  displayMissingEpisodes: boolean
  groupedFolders: string[]
  subtitleMode: string
  displayCollectionsView: boolean
  enableLocalPassword: boolean
  orderedViews: string[]
  latestItemsExcludes: string[]
  myMediaExcludes: string[]
  hidePlayedInLatest: boolean
  rememberAudioSelections: boolean
  rememberSubtitleSelections: boolean
  enableNextEpisodeAutoPlay: boolean
}

/**
 * 用户策略
 */
export interface UserPolicy {
  isAdministrator: boolean
  isHidden: boolean
  isDisabled: boolean
  maxParentalRating?: number
  blockedTags: string[]
  enableUserPreferenceAccess: boolean
  accessSchedules: any[]
  blockUnratedItems: string[]
  enableRemoteControlOfOtherUsers: boolean
  enableSharedDeviceControl: boolean
  enableRemoteAccess: boolean
  enableLiveTvManagement: boolean
  enableLiveTvAccess: boolean
  enableMediaPlayback: boolean
  enableAudioPlaybackTranscoding: boolean
  enableVideoPlaybackTranscoding: boolean
  enablePlaybackRemuxing: boolean
  forceRemoteSourceTranscoding: boolean
  enableContentDeletion: boolean
  enableContentDeletionFromFolders: string[]
  enableContentDownloading: boolean
  enableSyncTranscoding: boolean
  enableMediaConversion: boolean
  enabledDevices: string[]
  enableAllDevices: boolean
  enabledChannels: string[]
  enableAllChannels: boolean
  enabledFolders: string[]
  enableAllFolders: boolean
  invalidLoginAttemptCount: number
  loginAttemptsBeforeLockout: number
  maxActiveSessions: number
  enablePublicSharing: boolean
  blockedMediaFolders: string[]
  blockedChannels: string[]
  remoteClientBitrateLimit: number
  authenticationProviderId: string
  passwordResetProviderId: string
  syncPlayAccess: string
}

/**
 * 用户信息
 */
export interface User {
  name: string
  serverId: string
  id: string
  hasPassword: boolean
  hasConfiguredPassword: boolean
  configuration: UserConfiguration
  policy: UserPolicy
}

/**
 * 客户端能力
 */
export interface ClientCapabilities {
  playableMediaTypes: string[]
  supportedCommands: string[]
  supportsMediaControl: boolean
  supportsPersistentIdentifier: boolean
  deviceProfile?: any
}

/**
 * 播放状态
 */
export interface PlayState {
  canSeek: boolean
  isPaused: boolean
  isMuted: boolean
  repeatMode: string
  positionTicks?: number
  volumeLevel?: number
}

/**
 * 会话信息
 */
export interface SessionInfo {
  playState: PlayState
  additionalUsers: any[]
  capabilities: ClientCapabilities
  remoteEndPoint: string
  playableMediaTypes: string[]
  id: string
  userId: string
  userName: string
  client: string
  lastActivityDate: string
  deviceName: string
  deviceId: string
  applicationVersion: string
  supportsRemoteControl: boolean
}

/**
 * 认证会话
 */
export interface AuthSession {
  user: User
  sessionInfo: SessionInfo
  accessToken: string
  serverId: string
}

// ==================== 媒体项 ====================

/**
 * 项目类型
 */
export type ItemType =
  | 'Movie'
  | 'Series'
  | 'Season'
  | 'Episode'
  | 'Audio'
  | 'MusicAlbum'
  | 'MusicArtist'
  | 'Folder'
  | 'BoxSet'
  | 'Playlist'

/**
 * 媒体类型
 */
export type MediaType = 'Video' | 'Audio' | 'Photo' | 'Book' | 'Game'

/**
 * 图像标签
 */
export interface ImageTags {
  Primary?: string
  Art?: string
  Backdrop?: string
  Banner?: string
  Logo?: string
  Thumb?: string
  Disc?: string
  Box?: string
}

/**
 * 用户数据
 */
export interface UserData {
  playbackPositionTicks: number
  playCount: number
  isFavorite: boolean
  played: boolean
  lastPlayedDate?: string
  key?: string
}

/**
 * 媒体流
 */
export interface MediaStream {
  codec: string
  language?: string
  displayTitle: string
  index: number
  type: 'Audio' | 'Video' | 'Subtitle'
  // 视频流属性
  width?: number
  height?: number
  aspectRatio?: string
  averageFrameRate?: number
  bitRate?: number
  // 音频流属性
  channels?: number
  channelLayout?: string
  sampleRate?: number
  // 字幕流属性
  isExternal?: boolean
  isTextSubtitleStream?: boolean
  supportsExternalStream?: boolean
  deliveryUrl?: string
}

/**
 * 媒体源
 */
export interface MediaSource {
  id: string
  path: string
  protocol: 'File' | 'Http' | 'Rtmp' | 'Rtsp'
  container: string
  size: number
  bitrate: number
  runTimeTicks: number
  supportsDirectPlay: boolean
  supportsDirectStream: boolean
  supportsTranscoding: boolean
  mediaStreams: MediaStream[]
  defaultAudioStreamIndex?: number
  defaultSubtitleStreamIndex?: number
  streamUrl?: string
  directStreamUrl?: string
  transcodingUrl?: string
  liveStreamId?: string
  requiredHttpHeaders?: Record<string, string>
}

/**
 * 人物信息
 */
export interface PersonInfo {
  name: string
  id: string
  role?: string
  type?: string
  primaryImageTag?: string
}

/**
 * 工作室信息
 */
export interface StudioInfo {
  name: string
  id: string
}

/**
 * 外部 URL 信息
 */
export interface ExternalUrl {
  name: string
  url: string
}

/**
 * 媒体项
 */
export interface MediaItem {
  name: string
  serverId: string
  id: string
  type: ItemType
  mediaType?: MediaType
  isFolder: boolean
  runTimeTicks?: number
  premiereDate?: string
  productionYear?: number
  officialRating?: string
  communityRating?: number
  overview?: string
  taglines?: string[]
  // 图像
  imageTags?: ImageTags
  backdropImageTags?: string[]
  primaryImageAspectRatio?: number
  // 音乐相关
  album?: string
  albumArtist?: string
  artists?: string[]
  albumId?: string
  // 电视剧相关
  seriesId?: string
  seriesName?: string
  seasonId?: string
  indexNumber?: number // 集数
  parentIndexNumber?: number // 季数
  // 流派/类型
  genres?: string[]
  // 演职人员
  people?: PersonInfo[]
  // 工作室
  studios?: StudioInfo[]
  // 外部链接
  externalUrls?: ExternalUrl[]
  // 提供商 ID
  providerIds?: {
    Imdb?: string
    Tmdb?: string
    TmdbCollection?: string
    Tvdb?: string
  }
  // 预告片
  remoteTrailers?: Array<{
    url: string
    name?: string
  }>
  // 用户数据
  userData?: UserData
  // 媒体源
  mediaSources?: MediaSource[]
  mediaStreams?: MediaStream[]
}

/**
 * 媒体视图
 */
export interface MediaView {
  name: string
  serverId: string
  id: string
  collectionType?: string
  imageTags?: ImageTags
}

/**
 * 媒体项列表响应
 */
export interface MediaItemsResponse {
  items: MediaItem[]
  totalRecordCount: number
  startIndex: number
}

// ==================== 查询参数 ====================

/**
 * 排序字段
 */
export type SortField =
  | 'SortName'
  | 'ProductionYear'
  | 'PremiereDate'
  | 'DateCreated'
  | 'DatePlayed'
  | 'PlayCount'
  | 'CommunityRating'
  | 'Runtime'
  | 'Album'
  | 'Artist'
  | 'Random'
  | 'IndexNumber'

/**
 * 过滤器类型
 */
export type FilterType =
  | 'IsFolder'
  | 'IsNotFolder'
  | 'IsUnplayed'
  | 'IsPlayed'
  | 'IsFavorite'
  | 'IsResumable'
  | 'Likes'
  | 'Dislikes'

/**
 * 媒体查询参数
 */
export interface MediaQueryParams {
  parentId?: string
  recursive?: boolean
  includeItemTypes?: ItemType[]
  excludeItemTypes?: ItemType[]
  sortBy?: SortField[]
  sortOrder?: 'Ascending' | 'Descending'
  startIndex?: number
  limit?: number
  filters?: FilterType[]
  searchTerm?: string
  genres?: string
  fields?: string[]
}

/**
 * 最新项目查询参数
 */
export interface LatestItemsParams {
  parentId?: string
  includeItemTypes?: ItemType[]
  limit?: number
  fields?: string[]
}

/**
 * 相似项目查询参数
 */
export interface SimilarItemsParams {
  limit?: number
  fields?: string[]
}
