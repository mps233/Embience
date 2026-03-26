/**
 * 视频播放服务
 * 
 * 封装 Video.js 播放器，提供视频播放控制功能
 */

import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import type Player from 'video.js/dist/types/player'
import type { MediaItem, MediaSource } from '@/types/emby'
import type { PlaybackOptions, AudioTrack, SubtitleTrack, PlayMethod } from '@/types/player'
import { createEmbyClient } from '@/services/api/embyClient'
import {
  getApiBaseUrl,
  getCompatibleTokenQueryParams,
  getTokenHeaderName,
  type MediaServerType,
} from '@/services/api/mediaServer'
import { STORAGE_KEYS } from '@/utils/constants'
import { getStorageItem } from '@/utils/storage'

type PlaybackInfoResponse = {
  MediaSources?: Array<Record<string, any>>
  PlaySessionId?: string
}

type AudioCompatibilityResult = {
  requiresServerHandling: boolean
  reason?: 'unsupportedCodec' | 'multichannel'
  codec: string
  channels: number
  channelLayout: string
  audioStreamIndex?: number
  maxAudioChannels: number
}

/**
 * 视频服务类
 */
export class VideoService {
  private player: Player | null = null
  private currentPlayMethod: PlayMethod | null = null
  private lastError: Error | null = null
  private currentMediaSource: MediaSource | null = null
  private currentAudioStreamIndex: number | undefined
  private currentSubtitleStreamIndex: number | undefined
  private serverUrl: string
  private accessToken: string
  private serverType: MediaServerType

  constructor(serverUrl: string, accessToken: string, serverType: MediaServerType = 'emby') {
    this.serverUrl = serverUrl
    this.accessToken = accessToken
    this.serverType = serverType
  }

  private logInfo(scope: string, message: string, details?: unknown): void {
    if (details !== undefined) {
      console.log(`[${scope}] ${message}`, details)
      return
    }

    console.log(`[${scope}] ${message}`)
  }

  private logWarn(scope: string, message: string, details?: unknown): void {
    if (details !== undefined) {
      console.warn(`[${scope}] ${message}`, details)
      return
    }

    console.warn(`[${scope}] ${message}`)
  }

  /**
   * 检查播放器是否已初始化
   * 
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.player !== null
  }

  /**
   * 初始化播放
   * 
   * @param videoElement - 视频元素
   * @param mediaItem - 媒体项
   * @param options - 播放选项
   * @returns 播放会话信息
   */
  async initializePlayback(
    videoElement: HTMLVideoElement,
    mediaItem: MediaItem,
    options: PlaybackOptions = {}
  ): Promise<{
    streamUrl: string
    playSessionId: string
    mediaSourceId: string
    playMethod: PlayMethod
  }> {
    // 首先测试服务器连接
    await this.testServerConnection()

    // 选择最佳媒体源
    const mediaSource = this.selectBestMediaSource(mediaItem)
    if (!mediaSource) {
      throw new Error('没有可用的媒体源')
    }

    const resolvedOptions = this.resolvePlaybackOptions(mediaSource, options)
    this.logAudioCompatibilityDecision(mediaSource, resolvedOptions)

    // 生成播放会话 ID
    const requestedPlaySessionId = this.generatePlaySessionId()

    // 参考 Emby 官方前端，先做 PlaybackInfo 协商
    const negotiatedPlayback = await this.getPlaybackInfo(
      mediaItem.id,
      mediaSource,
      resolvedOptions,
      requestedPlaySessionId
    )
    const effectiveMediaSource = negotiatedPlayback?.mediaSource || mediaSource
    const effectivePlaySessionId = negotiatedPlayback?.playSessionId || requestedPlaySessionId
    const effectiveOptions = this.resolvePlaybackOptions(effectiveMediaSource, resolvedOptions)

    this.currentMediaSource = effectiveMediaSource
    this.currentAudioStreamIndex = effectiveOptions.audioStreamIndex
    this.currentSubtitleStreamIndex = effectiveOptions.subtitleStreamIndex

    // 选择播放方法并尝试初始化
    const playMethod = await this.selectAndInitializePlayMethod(
      videoElement,
      mediaItem.id,
      effectiveMediaSource,
      effectiveOptions,
      effectivePlaySessionId
    )

    // 构建流 URL
    const streamUrl = this.buildStreamUrl(
      mediaItem.id,
      effectiveMediaSource,
      effectiveOptions,
      effectivePlaySessionId,
      playMethod
    )

    return {
      streamUrl,
      playSessionId: effectivePlaySessionId,
      mediaSourceId: effectiveMediaSource.id,
      playMethod,
    }
  }

  /**
   * 测试服务器连接
   */
  private async testServerConnection(): Promise<void> {
    try {
      const baseUrl = this.getBaseUrl()
      const testUrl = `${baseUrl}/System/Info`
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          [getTokenHeaderName(this.serverType)]: this.accessToken
        },
        timeout: 5000 // 5秒超时
      } as RequestInit)
      
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('服务器连接测试失败:', error)
      throw new Error(`无法连接到媒体服务器: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 选择播放方法并初始化播放器
   * 
   * @param videoElement - 视频元素
   * @param itemId - 媒体项 ID
   * @param mediaSource - 媒体源
   * @param options - 播放选项
   * @param playSessionId - 播放会话 ID
   * @returns 成功的播放方法
   */
  private async selectAndInitializePlayMethod(
    videoElement: HTMLVideoElement,
    itemId: string,
    mediaSource: MediaSource,
    options: PlaybackOptions,
    playSessionId: string
  ): Promise<PlayMethod> {
    // 确定可用的播放方法（按优先级排序）
    const availableMethods = this.getAvailablePlayMethodsWithOptions(mediaSource, options)

    if (availableMethods.length === 0) {
      throw new Error('没有可用的播放方法')
    }

    this.logInfo('播放协商', `尝试播放方法: ${availableMethods.join(', ')}`)

    // 尝试每个播放方法，直到成功
    for (const method of availableMethods) {
      try {
        this.logInfo('播放协商', `正在尝试播放方法: ${method}`)
        
        // 构建流 URL
        const streamUrl = this.buildStreamUrl(
          itemId,
          mediaSource,
          options,
          playSessionId,
          method
        )

        // 初始化播放器
        await this.initializePlayer(videoElement, streamUrl, options, method)

        // 成功，记录播放方法
        this.currentPlayMethod = method
        this.logInfo('播放协商', `播放方法 ${method} 初始化成功`)
        
        return method
      } catch (error) {
        this.lastError = error as Error
        this.logWarn('播放协商', `播放方法 ${method} 失败`, error)

        // 如果不是最后一个方法，继续尝试下一个
        if (method !== availableMethods[availableMethods.length - 1]) {
          this.logInfo('播放协商', '尝试下一个播放方法')
          continue
        }

        // 所有方法都失败了
        throw new Error(
          `所有播放方法都失败了。最后错误: ${(error as Error).message}`
        )
      }
    }

    throw new Error('无法初始化播放')
  }

  /**
   * 获取可用的播放方法（按优先级排序）
   * 
   * @param mediaSource - 媒体源
   * @returns 播放方法数组
   */
  private getAvailablePlayMethodsWithOptions(
    mediaSource: MediaSource,
    options: PlaybackOptions
  ): PlayMethod[] {
    const methods: PlayMethod[] = []
    const shouldForceAudioCompatiblePlayback = this.shouldForceAudioCompatiblePlayback(mediaSource, options)

    if (shouldForceAudioCompatiblePlayback) {
      if (mediaSource.supportsDirectStream) {
        methods.push('DirectStream')
      }
      if (mediaSource.supportsTranscoding) {
        methods.push('Transcode')
      }

      if (methods.length > 0) {
        this.logInfo('播放协商', '当前音轨需要服务端处理，优先避免 DirectPlay', {
          audioStreamIndex: options.audioStreamIndex,
          reason: this.analyzeAudioCompatibility(mediaSource, options).reason,
          methods,
        })
        return methods
      }
    }

    // 对于 STRM 文件，优先使用 DirectStream 而不是 DirectPlay
    // 因为 DirectPlay 可能会导致服务器错误
    const isStrmFile = mediaSource.path?.toLowerCase().endsWith('.strm')
    
    if (isStrmFile) {
      this.logInfo('播放协商', '检测到 STRM 文件，调整播放方法优先级')
      
      // 优先级 1: DirectStream（对 STRM 文件更稳定）
      if (mediaSource.supportsDirectStream) {
        methods.push('DirectStream')
      }
      
      // 优先级 2: Transcode
      if (mediaSource.supportsTranscoding) {
        methods.push('Transcode')
      }
      
      // 优先级 3: DirectPlay（最后尝试）
      if (mediaSource.supportsDirectPlay) {
        methods.push('DirectPlay')
      }
    } else {
      // 普通文件的原有优先级
      
      // 优先级 1: DirectPlay
      if (mediaSource.supportsDirectPlay) {
        methods.push('DirectPlay')
      }

      // 优先级 2: DirectStream
      if (mediaSource.supportsDirectStream) {
        methods.push('DirectStream')
      }

      // 优先级 3: Transcode
      if (mediaSource.supportsTranscoding) {
        methods.push('Transcode')
      }
    }

    this.logInfo('播放协商', '可用播放方法', methods)
    return methods
  }

  private resolvePlaybackOptions(mediaSource: MediaSource, options: PlaybackOptions): PlaybackOptions {
    const resolvedAudioStreamIndex =
      options.audioStreamIndex ??
      mediaSource.defaultAudioStreamIndex ??
      mediaSource.mediaStreams?.find((stream) => stream.type === 'Audio')?.index

    const resolvedSubtitleStreamIndex =
      options.subtitleStreamIndex ?? mediaSource.defaultSubtitleStreamIndex

    return {
      ...options,
      audioStreamIndex: resolvedAudioStreamIndex,
      subtitleStreamIndex: resolvedSubtitleStreamIndex,
    }
  }

  private getSelectedAudioStream(mediaSource: MediaSource, options: PlaybackOptions) {
    const audioStreams = mediaSource.mediaStreams?.filter((stream) => stream.type === 'Audio') || []

    if (audioStreams.length === 0) {
      return undefined
    }

    if (options.audioStreamIndex !== undefined) {
      return (
        audioStreams.find((stream) => stream.index === options.audioStreamIndex) ||
        audioStreams[0]
      )
    }

    return (
      audioStreams.find((stream) => stream.index === mediaSource.defaultAudioStreamIndex) ||
      audioStreams[0]
    )
  }

  private normalizeAudioCodec(codec?: string): string {
    return codec?.trim().toLowerCase() || ''
  }

  private shouldForceAudioCompatiblePlayback(
    mediaSource: MediaSource,
    options: PlaybackOptions
  ): boolean {
    return this.analyzeAudioCompatibility(mediaSource, options).requiresServerHandling
  }

  private analyzeAudioCompatibility(
    mediaSource: MediaSource,
    options: PlaybackOptions
  ): AudioCompatibilityResult {
    const audioStream = this.getSelectedAudioStream(mediaSource, options)
    const maxAudioChannels = options.maxAudioChannels ?? 2

    if (!audioStream) {
      return {
        requiresServerHandling: false,
        codec: '',
        channels: 0,
        channelLayout: '',
        audioStreamIndex: options.audioStreamIndex,
        maxAudioChannels,
      }
    }

    const codec = this.normalizeAudioCodec(audioStream.codec)
    const channels = audioStream.channels ?? 0
    const channelLayout = (audioStream.channelLayout || audioStream.displayTitle || '').toLowerCase()
    const unsupportedCodecs = new Set([
      'dts',
      'dca',
      'dtshd_ma',
      'dtshd_hra',
      'truehd',
      'mlp',
      'pcm',
      'pcm_s16le',
      'pcm_s24le',
      'flac',
      'alac',
      'ape',
      'vorbis',
      'wma',
      'wmav2',
      'ra',
      'cook',
    ])
    const likelyMultiChannel =
      channels > maxAudioChannels ||
      channelLayout.includes('5.1') ||
      channelLayout.includes('7.1') ||
      channelLayout.includes('atmos')

    if (unsupportedCodecs.has(codec)) {
      return {
        requiresServerHandling: true,
        reason: 'unsupportedCodec',
        codec,
        channels,
        channelLayout,
        audioStreamIndex: audioStream.index,
        maxAudioChannels,
      }
    }

    if (likelyMultiChannel) {
      return {
        requiresServerHandling: true,
        reason: 'multichannel',
        codec,
        channels,
        channelLayout: audioStream.channelLayout || audioStream.displayTitle || '',
        audioStreamIndex: audioStream.index,
        maxAudioChannels,
      }
    }

    return {
      requiresServerHandling: false,
      codec,
      channels,
      channelLayout,
      audioStreamIndex: audioStream.index,
      maxAudioChannels,
    }
  }

  private logAudioCompatibilityDecision(
    mediaSource: MediaSource,
    options: PlaybackOptions
  ): void {
    const analysis = this.analyzeAudioCompatibility(mediaSource, options)

    if (!analysis.requiresServerHandling) {
      return
    }

    if (analysis.reason === 'unsupportedCodec') {
      this.logInfo('音轨协商', '检测到浏览器不支持的音轨编码，优先使用兼容转码', analysis)
      return
    }

    this.logInfo('音轨协商', '检测到多声道音轨，优先使用音频兼容转码路径', analysis)
  }

  private getCurrentUserId(): string | undefined {
    const userInfo = getStorageItem<{ id?: string }>(STORAGE_KEYS.USER_INFO)
    return userInfo?.id
  }

  private canPlayAudioType(type: string): boolean {
    try {
      const audio = document.createElement('audio')
      return !!audio.canPlayType(type).replace(/no/i, '')
    } catch {
      return false
    }
  }

  private canPlayAudioFormat(format: string): boolean {
    switch (format) {
      case 'aac':
        return this.canPlayAudioType('audio/aac') || this.canPlayAudioType('audio/mp4; codecs="mp4a.40.2"')
      case 'mp3':
        return this.canPlayAudioType('audio/mpeg')
      case 'ac3':
        return this.canPlayAudioType('audio/mp4; codecs="ac-3"')
      case 'eac3':
        return this.canPlayAudioType('audio/mp4; codecs="ec-3"')
      case 'opus':
        return this.canPlayAudioType('audio/ogg; codecs="opus"')
      case 'flac':
        return this.canPlayAudioType('audio/flac') || this.canPlayAudioType('audio/mp4; codecs="flac"')
      case 'vorbis':
        return this.canPlayAudioType('audio/ogg; codecs="vorbis"')
      case 'wav':
        return this.canPlayAudioType('audio/wav')
      default:
        return false
    }
  }

  private getSupportedVideoAudioCodecs(): string[] {
    const codecs: string[] = []

    if (this.canPlayAudioFormat('aac')) codecs.push('aac')
    if (this.canPlayAudioFormat('mp3')) codecs.push('mp3')
    if (this.canPlayAudioFormat('ac3')) codecs.push('ac3')
    if (this.canPlayAudioFormat('eac3')) codecs.push('eac3')
    if (this.canPlayAudioFormat('opus')) codecs.push('opus')
    if (this.canPlayAudioFormat('flac')) codecs.push('flac')
    if (this.canPlayAudioFormat('vorbis')) codecs.push('vorbis')

    return codecs.length > 0 ? codecs : ['aac', 'mp3']
  }

  private buildBrowserDeviceProfile(options: PlaybackOptions): Record<string, unknown> {
    return this.serverType === 'jellyfin'
      ? this.buildJellyfinDeviceProfile(options)
      : this.buildEmbyDeviceProfile(options)
  }

  private buildEmbyDeviceProfile(options: PlaybackOptions): Record<string, unknown> {
    const supportedVideoAudioCodecs = this.getSupportedVideoAudioCodecs()
    const maxAudioChannels = options.maxAudioChannels ?? 2
    const maxStreamingBitrate = options.maxStreamingBitrate ?? 140000000
    const hlsVideoAudioCodecs = supportedVideoAudioCodecs.filter((codec) =>
      ['aac', 'mp3', 'ac3', 'eac3', 'opus'].includes(codec)
    )
    const streamingVideoAudioCodecs = hlsVideoAudioCodecs.length > 0 ? hlsVideoAudioCodecs : ['aac', 'mp3']

    return {
      Name: 'embience-web',
      MaxStreamingBitrate: maxStreamingBitrate,
      MaxStaticBitrate: maxStreamingBitrate,
      MusicStreamingTranscodingBitrate: 192000,
      DirectPlayProfiles: [
        {
          Container: 'mp4,m4v',
          Type: 'Video',
          VideoCodec: 'h264,hevc,av1',
          AudioCodec: supportedVideoAudioCodecs.join(','),
        },
        {
          Container: 'mkv',
          Type: 'Video',
          VideoCodec: 'h264,hevc,av1,vp9',
          AudioCodec: supportedVideoAudioCodecs.join(','),
        },
        {
          Container: 'mp3,aac,m4a,flac,opus,ogg,oga,wav,webma',
          Type: 'Audio',
        },
      ],
      TranscodingProfiles: [
        {
          Container: 'aac',
          Type: 'Audio',
          Context: 'Streaming',
          Protocol: 'hls',
          AudioCodec: 'aac',
          MaxAudioChannels: maxAudioChannels.toString(),
          MinSegments: '1',
          BreakOnNonKeyFrames: true,
        },
        {
          Container: 'aac',
          Type: 'Audio',
          Context: 'Streaming',
          Protocol: 'http',
          AudioCodec: 'aac',
          MaxAudioChannels: maxAudioChannels.toString(),
        },
        {
          Container: 'mp3',
          Type: 'Audio',
          Context: 'Streaming',
          Protocol: 'http',
          AudioCodec: 'mp3',
          MaxAudioChannels: maxAudioChannels.toString(),
        },
        {
          Container: 'ts',
          Type: 'Video',
          Context: 'Streaming',
          Protocol: 'hls',
          AudioCodec: streamingVideoAudioCodecs.join(','),
          VideoCodec: 'h264',
          MaxAudioChannels: maxAudioChannels.toString(),
          MinSegments: '1',
          BreakOnNonKeyFrames: true,
          ManifestSubtitles: 'vtt',
        },
        {
          Container: 'mp4',
          Type: 'Video',
          Context: 'Static',
          Protocol: 'http',
          AudioCodec: supportedVideoAudioCodecs.join(','),
          VideoCodec: 'h264',
        },
      ],
      SubtitleProfiles: [
        {
          Format: 'vtt',
          Method: 'Hls',
        },
        {
          Format: 'vtt',
          Method: 'External',
          AllowChunkedResponse: true,
        },
        {
          Format: 'srt',
          Method: 'External',
        },
        {
          Format: 'ass',
          Method: 'External',
        },
        {
          Format: 'ssa',
          Method: 'External',
        },
      ],
      ResponseProfiles: [
        {
          Type: 'Video',
          Container: 'm4v',
          MimeType: 'video/mp4',
        },
      ],
      CodecProfiles: [
        {
          Type: 'VideoAudio',
          Codec: 'aac',
          Conditions: [
            {
              Condition: 'Equals',
              Property: 'IsSecondaryAudio',
              Value: 'false',
              IsRequired: false,
            },
            {
              Condition: 'LessThanEqual',
              Property: 'AudioChannels',
              Value: maxAudioChannels.toString(),
              IsRequired: true,
            },
          ],
        },
      ],
    }
  }

  private buildJellyfinDeviceProfile(options: PlaybackOptions): Record<string, unknown> {
    const supportedVideoAudioCodecs = this.getSupportedVideoAudioCodecs()
    const maxAudioChannels = options.maxAudioChannels ?? 2
    const maxStreamingBitrate = options.maxStreamingBitrate ?? 140000000

    return {
      Name: 'embience-web',
      MaxStreamingBitrate: maxStreamingBitrate,
      MaxStaticBitrate: maxStreamingBitrate,
      MusicStreamingTranscodingBitrate: 192000,
      DirectPlayProfiles: [
        {
          Container: 'mp4,m4v',
          Type: 'Video',
          VideoCodec: 'h264,hevc,av1',
          AudioCodec: supportedVideoAudioCodecs.join(','),
        },
        {
          Container: 'mkv',
          Type: 'Video',
          VideoCodec: 'h264,hevc,av1,vp9',
          AudioCodec: supportedVideoAudioCodecs.join(','),
        },
        {
          Container: 'mp3,aac,m4a,flac,opus,ogg,oga,wav,webma',
          Type: 'Audio',
        },
      ],
      TranscodingProfiles: [
        {
          Container: 'ts',
          Type: 'Video',
          Context: 'Streaming',
          Protocol: 'hls',
          AudioCodec: 'aac,mp3',
          VideoCodec: 'h264',
          MaxAudioChannels: maxAudioChannels.toString(),
          MinSegments: '1',
          BreakOnNonKeyFrames: true,
        },
        {
          Container: 'mp4',
          Type: 'Video',
          Context: 'Streaming',
          Protocol: 'http',
          AudioCodec: 'aac',
          VideoCodec: 'h264',
          MaxAudioChannels: maxAudioChannels.toString(),
        },
        {
          Container: 'aac',
          Type: 'Audio',
          Context: 'Streaming',
          Protocol: 'http',
          AudioCodec: 'aac',
          MaxAudioChannels: maxAudioChannels.toString(),
        },
      ],
      SubtitleProfiles: [
        {
          Format: 'vtt',
          Method: 'External',
        },
        {
          Format: 'srt',
          Method: 'External',
        },
        {
          Format: 'ass',
          Method: 'External',
        },
        {
          Format: 'ssa',
          Method: 'External',
        },
      ],
      ResponseProfiles: [
        {
          Type: 'Video',
          Container: 'm4v',
          MimeType: 'video/mp4',
        },
      ],
    }
  }

  private transformPlaybackInfoMediaSource(source: Record<string, any>): MediaSource {
    const requiredHttpHeaders = source.RequiredHttpHeaders
    const normalizedRequiredHttpHeaders =
      requiredHttpHeaders && typeof requiredHttpHeaders === 'object'
        ? Object.fromEntries(
            Object.entries(requiredHttpHeaders).map(([key, value]) => [key, String(value)])
          )
        : undefined

    return {
      id: source.Id,
      path: source.Path || '',
      protocol: source.Protocol || 'Http',
      container: source.Container || '',
      size: source.Size || 0,
      bitrate: source.Bitrate || 0,
      runTimeTicks: source.RunTimeTicks || 0,
      supportsDirectPlay: !!source.SupportsDirectPlay,
      supportsDirectStream: !!source.SupportsDirectStream,
      supportsTranscoding: !!source.SupportsTranscoding,
      defaultAudioStreamIndex: source.DefaultAudioStreamIndex,
      defaultSubtitleStreamIndex: source.DefaultSubtitleStreamIndex,
      streamUrl: source.StreamUrl,
      directStreamUrl: source.DirectStreamUrl,
      transcodingUrl: source.TranscodingUrl,
      liveStreamId: source.LiveStreamId,
      requiredHttpHeaders: normalizedRequiredHttpHeaders,
      mediaStreams: (source.MediaStreams || []).map((stream: Record<string, any>) => ({
        codec: stream.Codec || '',
        language: stream.Language,
        displayTitle: stream.DisplayTitle || '',
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
      })),
    }
  }

  private async getPlaybackInfo(
    itemId: string,
    mediaSource: MediaSource,
    options: PlaybackOptions,
    playSessionId: string
  ): Promise<{ mediaSource: MediaSource; playSessionId: string } | null> {
    const userId = this.getCurrentUserId()

    if (!userId) {
      return null
    }

    const shouldForceAudioCompatiblePlayback = this.shouldForceAudioCompatiblePlayback(
      mediaSource,
      options
    )
    const requestBody: Record<string, unknown> = {
      UserId: userId,
      StartTimeTicks: options.startPositionTicks || 0,
      IsPlayback: true,
      AutoOpenLiveStream: true,
      MediaSourceId: mediaSource.id,
      DeviceProfile: this.buildBrowserDeviceProfile(options),
      CurrentPlaySessionId: playSessionId,
    }

    if (options.audioStreamIndex !== undefined) {
      requestBody.AudioStreamIndex = options.audioStreamIndex
    }

    if (options.subtitleStreamIndex !== undefined) {
      requestBody.SubtitleStreamIndex = options.subtitleStreamIndex
    }

    if (options.maxStreamingBitrate) {
      requestBody.MaxStreamingBitrate = options.maxStreamingBitrate
    }

    if (shouldForceAudioCompatiblePlayback) {
      requestBody.EnableDirectPlay = false
      requestBody.EnableDirectStream = true
      requestBody.AllowVideoStreamCopy = true
      requestBody.AllowAudioStreamCopy = false
    }

    try {
      const apiClient = createEmbyClient({
        serverUrl: this.serverUrl,
        accessToken: this.accessToken,
        serverType: this.serverType,
      })
      const response = await apiClient.post<PlaybackInfoResponse>(
        `/Items/${itemId}/PlaybackInfo`,
        requestBody,
        { noRetry: true }
      )
      const negotiatedSource = response.MediaSources?.[0]

      if (!negotiatedSource) {
        return null
      }

      const transformedSource = this.transformPlaybackInfoMediaSource(negotiatedSource)
      this.logInfo('PlaybackInfo', '协商成功', {
        playSessionId: response.PlaySessionId,
        supportsDirectPlay: transformedSource.supportsDirectPlay,
        supportsDirectStream: transformedSource.supportsDirectStream,
        supportsTranscoding: transformedSource.supportsTranscoding,
        defaultAudioStreamIndex: transformedSource.defaultAudioStreamIndex,
        streamUrl: transformedSource.streamUrl,
        directStreamUrl: transformedSource.directStreamUrl,
        transcodingUrl: transformedSource.transcodingUrl,
      })

      return {
        mediaSource: transformedSource,
        playSessionId: response.PlaySessionId || playSessionId,
      }
    } catch (error) {
      this.logWarn('PlaybackInfo', '协商失败，回退到本地播放策略', error)
      return null
    }
  }

  /**
   * 获取当前播放方法
   * 
   * @returns 当前播放方法
   */
  getCurrentPlayMethod(): PlayMethod | null {
    return this.currentPlayMethod
  }

  /**
   * 获取最后的错误
   * 
   * @returns 最后的错误
   */
  getLastError(): Error | null {
    return this.lastError
  }

  /**
   * 初始化 Video.js 播放器
   * 
   * @param videoElement - 视频元素
   * @param streamUrl - 流 URL
   * @param options - 播放选项
   * @param _playMethod - 播放方法（保留用于日志记录）
   */
  private async initializePlayer(
    videoElement: HTMLVideoElement,
    streamUrl: string,
    options: PlaybackOptions,
    _playMethod: PlayMethod
  ): Promise<void> {
    const source = {
      src: streamUrl,
      type: this.getSourceType(streamUrl, options),
    }

    this.logInfo('播放器初始化', '准备初始化播放器', {
      playMethod: _playMethod,
      sourceType: source.type,
      startPositionTicks: options.startPositionTicks ?? 0,
      streamUrl,
    })

    if (!this.player) {
      this.player = videojs(videoElement, {
        controls: false,
        autoplay: false,
        preload: 'metadata',
        fluid: false,
        responsive: false,
        fill: true,
        aspectRatio: '16:9',
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        sources: [source],
      })

      await new Promise<void>((resolve, reject) => {
        if (!this.player) {
          reject(new Error('播放器未初始化'))
          return
        }

        const timeout = setTimeout(() => {
          reject(new Error('播放器初始化超时'))
        }, 10000)

        this.player.ready(() => {
          clearTimeout(timeout)
          resolve()
        })
      })
    } else {
      this.player.pause()
      this.player.src(source)
      this.player.load()
    }

    await new Promise<void>((resolve, reject) => {
      if (!this.player) {
        reject(new Error('播放器未初始化'))
        return
      }

      const player = this.player
      if (player.readyState() >= 1) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('播放器初始化超时'))
      }, 10000)

      const cleanup = () => {
        clearTimeout(timeout)
        player.off('loadedmetadata', handleLoadedMetadata)
        player.off('canplay', handleCanPlay)
        player.off('error', handleError)
      }

      const handleLoadedMetadata = () => {
        cleanup()
        resolve()
      }

      const handleCanPlay = () => {
        cleanup()
        resolve()
      }

      const handleError = () => {
        const error = player.error()
        cleanup()
        console.error('Video.js 播放器错误:', {
          code: error?.code,
          message: error?.message,
          MEDIA_ERR_ABORTED: error?.code === 1,
          MEDIA_ERR_NETWORK: error?.code === 2,
          MEDIA_ERR_DECODE: error?.code === 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: error?.code === 4,
          streamUrl,
          playMethod: _playMethod,
        })

        const currentVideoElement = player.el()?.querySelector('video')
        if (currentVideoElement) {
          console.error('[视频错误] Video 元素状态:', {
            src: currentVideoElement.src,
            currentSrc: currentVideoElement.currentSrc,
            networkState: currentVideoElement.networkState,
            readyState: currentVideoElement.readyState,
            paused: currentVideoElement.paused,
            ended: currentVideoElement.ended,
            duration: currentVideoElement.duration,
          })
        }

        if (error?.code === 2) {
          console.log('检测到网络错误，尝试重新加载...')
          this.handleNetworkError(streamUrl)
        }

        reject(new Error(error?.message || '播放器错误'))
      }

      player.on('loadedmetadata', handleLoadedMetadata)
      player.on('canplay', handleCanPlay)
      player.on('error', handleError)
    })

    // 设置初始播放位置
    if (options.startPositionTicks) {
      const startSeconds = options.startPositionTicks / 10000000
      this.player.currentTime(startSeconds)
    }

    // 不自动取消静音，等待用户交互
    this.logInfo('播放器初始化', '播放器初始化完成，等待用户交互开始播放')
  }

  /**
   * 处理网络错误
   * 
   * @param streamUrl - 流 URL
   */
  private handleNetworkError(streamUrl: string): void {
    if (!this.player) return
    
    this.logInfo('播放器', '尝试重新加载视频流')
    
    // 重新加载视频源
    setTimeout(() => {
      if (this.player) {
        this.player.src({
          src: streamUrl,
          type: this.getSourceType(streamUrl, {})
        })
        this.player.load()
      }
    }, 1000) // 等待 1 秒后重试
  }

  /**
   * 选择最佳媒体源
   * 
   * @param mediaItem - 媒体项
   * @returns 媒体源
   */
  private selectBestMediaSource(mediaItem: MediaItem): MediaSource | null {
    if (!mediaItem.mediaSources || mediaItem.mediaSources.length === 0) {
      return null
    }

    // 优先选择支持直接播放的媒体源
    const directPlaySource = mediaItem.mediaSources.find(
      (source) => source.supportsDirectPlay
    )
    if (directPlaySource) {
      return directPlaySource
    }

    // 其次选择支持直接流式传输的媒体源
    const directStreamSource = mediaItem.mediaSources.find(
      (source) => source.supportsDirectStream
    )
    if (directStreamSource) {
      return directStreamSource
    }

    // 最后选择支持转码的媒体源
    const transcodeSource = mediaItem.mediaSources.find(
      (source) => source.supportsTranscoding
    )
    if (transcodeSource) {
      return transcodeSource
    }

    // 如果都不支持，返回第一个媒体源
    return mediaItem.mediaSources[0]
  }

  /**
   * 构建流 URL
   * 
   * @param itemId - 媒体项 ID
   * @param mediaSource - 媒体源
   * @param options - 播放选项
   * @param playSessionId - 播放会话 ID
   * @param playMethod - 播放方法
   * @returns 流 URL
   */
  private buildStreamUrl(
    itemId: string,
    mediaSource: MediaSource,
    options: PlaybackOptions,
    playSessionId: string,
    playMethod: PlayMethod
  ): string {
    const negotiatedUrl = this.buildNegotiatedPlaybackUrl(mediaSource, playMethod)
    if (negotiatedUrl) {
      this.logInfo('播放流', '使用 PlaybackInfo 返回的协商 URL', negotiatedUrl)
      return negotiatedUrl
    }

    const params = new URLSearchParams()
    const tokenParams = getCompatibleTokenQueryParams(this.getApiKey())
    const shouldForceAudioCompatiblePlayback = this.shouldForceAudioCompatiblePlayback(
      mediaSource,
      options
    )

    // 基础参数
    params.append('MediaSourceId', mediaSource.id)
    params.append('PlaySessionId', playSessionId)
    params.append('api_key', tokenParams.api_key)
    params.append('ApiKey', tokenParams.ApiKey)

    // 支持外部流（STRM 文件）
    params.append('EnableRedirection', 'true')
    params.append('EnableRemoteMedia', 'true')

    // 根据播放方法设置参数
    if (playMethod === 'DirectPlay') {
      // DirectPlay: 直接播放原始文件
      params.append('Static', 'true')
    } else if (playMethod === 'DirectStream') {
      // DirectStream: 重新封装容器，但不转码
      params.append('Static', 'false')

      if (shouldForceAudioCompatiblePlayback) {
        params.append('AllowVideoStreamCopy', 'true')
        params.append('AllowAudioStreamCopy', 'false')
        params.append('AudioCodec', options.audioCodec || 'aac')
        if (options.maxAudioChannels) {
          params.append('MaxAudioChannels', options.maxAudioChannels.toString())
        }
      } else {
        // 对于 STRM 文件，使用更宽松的参数
        const isStrmFile = mediaSource.path?.toLowerCase().endsWith('.strm')
        if (isStrmFile) {
          this.logInfo('播放流', '为 STRM 文件配置 DirectStream 参数')
          // 不强制指定编解码器，让 Emby 自动选择
          params.append('Container', 'mp4,mkv,webm') // 支持多种容器格式
        } else {
          // 保持原始编解码器
          if (mediaSource.mediaStreams) {
            const videoStream = mediaSource.mediaStreams.find(s => s.type === 'Video')
            const audioStream = mediaSource.mediaStreams.find(s => s.type === 'Audio')

            if (videoStream?.codec) {
              params.append('VideoCodec', videoStream.codec)
            }
            if (audioStream?.codec) {
              params.append('AudioCodec', audioStream.codec)
            }
          }
        }
      }
    } else {
      // Transcode: 完全转码
      params.append('Static', 'false')

      if (shouldForceAudioCompatiblePlayback) {
        params.append('AllowVideoStreamCopy', 'true')
        params.append('AllowAudioStreamCopy', 'false')
      }
      
      // 转码参数
      if (options.maxStreamingBitrate) {
        params.append('MaxStreamingBitrate', options.maxStreamingBitrate.toString())
      }

      if (options.audioCodec) {
        params.append('AudioCodec', options.audioCodec)
      }

      if (options.videoCodec && !shouldForceAudioCompatiblePlayback) {
        params.append('VideoCodec', options.videoCodec)
      }

      if (options.maxWidth && !shouldForceAudioCompatiblePlayback) {
        params.append('MaxWidth', options.maxWidth.toString())
      }

      if (options.maxHeight && !shouldForceAudioCompatiblePlayback) {
        params.append('MaxHeight', options.maxHeight.toString())
      }

      if (options.maxAudioChannels) {
        params.append('MaxAudioChannels', options.maxAudioChannels.toString())
      }

      if (options.audioSampleRate) {
        params.append('AudioSampleRate', options.audioSampleRate.toString())
      }
    }

    // 音轨索引
    if (options.audioStreamIndex !== undefined) {
      params.append('AudioStreamIndex', options.audioStreamIndex.toString())
    }

    // 字幕索引
    if (options.subtitleStreamIndex !== undefined) {
      params.append('SubtitleStreamIndex', options.subtitleStreamIndex.toString())
    }

    // 转码协议
    if (options.transcodingProtocol === 'hls') {
      params.append('TranscodingProtocol', 'hls')
      if (options.transcodingContainer) {
        params.append('TranscodingContainer', options.transcodingContainer)
      }
    } else if (playMethod === 'Transcode') {
      if (shouldForceAudioCompatiblePlayback) {
        params.append('TranscodingProtocol', 'progressive')
        params.append('TranscodingContainer', 'mp4')
      } else {
        // 转码时默认使用 HLS，因为它更好地支持 seeking
        params.append('TranscodingProtocol', 'hls')
        params.append('TranscodingContainer', 'ts')
      }
    }

    // 添加 StartTimeTicks 参数以支持 seeking
    if (options.startPositionTicks) {
      params.append('StartTimeTicks', options.startPositionTicks.toString())
    }

    const baseUrl = this.getBaseUrl()
    const finalUrl = `${baseUrl}/Videos/${itemId}/stream?${params.toString()}`
    
    this.logInfo('播放流', '构建回退流 URL', finalUrl)
    
    return finalUrl
  }

  private buildNegotiatedPlaybackUrl(
    mediaSource: MediaSource,
    playMethod: PlayMethod
  ): string | null {
    const rawUrl =
      playMethod === 'Transcode'
        ? mediaSource.transcodingUrl
        : playMethod === 'DirectStream'
          ? mediaSource.directStreamUrl || mediaSource.transcodingUrl
          : mediaSource.streamUrl

    if (!rawUrl) {
      return null
    }

    const tokenParams = getCompatibleTokenQueryParams(this.getApiKey())
    const baseUrl = this.getBaseUrl()
    const url = new URL(rawUrl, `${baseUrl}/`)

    if (!url.searchParams.has('api_key')) {
      url.searchParams.set('api_key', tokenParams.api_key)
    }

    if (!url.searchParams.has('ApiKey')) {
      url.searchParams.set('ApiKey', tokenParams.ApiKey)
    }

    return url.toString()
  }

  /**
   * 获取源类型
   * 
   * @param streamUrl - 流 URL
   * @param options - 播放选项
   * @returns MIME 类型
   */
  private getSourceType(streamUrl: string, options: PlaybackOptions): string {
    if (options.transcodingProtocol === 'hls' || streamUrl.includes('.m3u8')) {
      return 'application/x-mpegURL'
    }
    return 'video/mp4'
  }

  /**
   * 播放
   */
  play(): void {
    if (this.player) {
      // 确保取消静音
      this.player.muted(false)
      this.player.volume(1.0)
      
      // 开始播放
      const playPromise = this.player.play()
      
      // 处理播放 Promise（现代浏览器返回 Promise）
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch((error) => {
          console.error('播放失败:', error)
          // 如果是因为用户交互问题，保持静音播放
          if (error.name === 'NotAllowedError') {
            console.log('尝试静音播放...')
            this.player?.muted(true)
            this.player?.play()
          }
        })
      }
    }
  }

  /**
   * 暂停
   */
  pause(): void {
    if (this.player) {
      this.player.pause()
    }
  }

  /**
   * 停止并清理资源
   */
  stop(): void {
    if (this.player) {
      this.player.pause()
      this.player.currentTime(0)
    }
  }

  /**
   * 跳转到指定位置
   * 
   * @param positionTicks - 位置（ticks）
   */
  seek(positionTicks: number): void {
    if (this.player) {
      const seconds = positionTicks / 10000000
      
      // 检查视频是否可以 seek
      const duration = this.player.duration()
      if (!duration || duration === Infinity || isNaN(duration)) {
        console.warn('视频时长未知，无法 seek')
        return
      }
      
      // 确保 seek 位置在有效范围内
      const clampedSeconds = Math.max(0, Math.min(seconds, duration))
      
      try {
        this.player.currentTime(clampedSeconds)
      } catch (error) {
        console.error('Seek 失败:', error)
        // 如果 seek 失败，尝试重新加载视频
        this.handleSeekError(clampedSeconds)
      }
    }
  }

  /**
   * 处理 seek 错误
   * 
   * @param targetTime - 目标时间（秒）
   */
  private handleSeekError(targetTime: number): void {
    if (!this.player) return
    
    console.warn('尝试通过重新加载来恢复播放...')
    
    // 保存当前状态
    const wasPaused = this.player.paused()
    const currentSrc = this.player.currentSrc()
    
    // 重新加载视频
    this.player.src(currentSrc)
    this.player.load()
    
    // 等待视频加载完成后跳转
    this.player.one('loadedmetadata', () => {
      if (this.player) {
        this.player.currentTime(targetTime)
        if (!wasPaused) {
          this.player.play()
        }
      }
    })
  }

  /**
   * 设置音量
   * 
   * @param level - 音量级别（0-100）
   */
  setVolume(level: number): void {
    if (this.player) {
      const volume = Math.max(0, Math.min(100, level)) / 100
      this.player.volume(volume)
    }
  }

  /**
   * 设置静音
   * 
   * @param muted - 是否静音
   */
  setMuted(muted: boolean): void {
    if (this.player) {
      this.player.muted(muted)
    }
  }

  /**
   * 获取可用的音轨
   * 
   * @returns 音轨列表
   */
  getAudioTracks(): AudioTrack[] {
    const mediaSourceTracks =
      this.currentMediaSource?.mediaStreams
        ?.filter((stream) => stream.type === 'Audio')
        .map((stream) => ({
          index: stream.index,
          displayTitle:
            stream.displayTitle || this.buildAudioTrackTitle(stream.index, stream.language),
          language: stream.language,
          codec: stream.codec,
          channels: stream.channels,
          channelLayout: stream.channelLayout,
          sampleRate: stream.sampleRate,
        })) || []

    if (mediaSourceTracks.length > 0) {
      return mediaSourceTracks
    }

    if (!this.player) {
      return []
    }

    const audioTracks = this.player.audioTracks?.()
    if (!audioTracks) {
      return []
    }
    const tracks: AudioTrack[] = []

    for (let i = 0; i < audioTracks.length; i++) {
      const track = (audioTracks as any)[i]
      if (track) {
        tracks.push({
          index: i,
          displayTitle: track.label || this.buildAudioTrackTitle(i, track.language),
          language: track.language,
          codec: '',
        })
      }
    }

    return tracks
  }

  /**
   * 获取可用的字幕轨道
   * 
   * @returns 字幕轨道列表
   */
  getSubtitleTracks(): SubtitleTrack[] {
    const mediaSourceTracks =
      this.currentMediaSource?.mediaStreams
        ?.filter((stream) => stream.type === 'Subtitle')
        .map((stream) => ({
          index: stream.index,
          displayTitle:
            stream.displayTitle || this.buildSubtitleTrackTitle(stream.index, stream.language),
          language: stream.language,
          codec: stream.codec,
          isExternal: stream.isExternal,
          isTextSubtitleStream: stream.isTextSubtitleStream,
          supportsExternalStream: stream.supportsExternalStream,
          deliveryUrl: stream.deliveryUrl,
        })) || []

    if (mediaSourceTracks.length > 0) {
      return mediaSourceTracks
    }

    if (!this.player) {
      return []
    }

    const textTracks = this.player.textTracks?.()
    if (!textTracks) {
      return []
    }
    const tracks: SubtitleTrack[] = []

    for (let i = 0; i < textTracks.length; i++) {
      const track = (textTracks as any)[i]
      if (track && (track.kind === 'subtitles' || track.kind === 'captions')) {
        tracks.push({
          index: i,
          displayTitle: track.label || this.buildSubtitleTrackTitle(i, track.language),
          language: track.language,
          codec: '',
          isTextSubtitleStream: true,
        })
      }
    }

    return tracks
  }

  /**
   * 切换音轨
   * 
   * @param index - 音轨索引
   */
  setAudioTrack(index: number): void {
    this.currentAudioStreamIndex = index

    if (!this.player) {
      return
    }

    const audioTracks = this.player.audioTracks?.()
    if (!audioTracks) {
      return
    }

    for (let i = 0; i < audioTracks.length; i++) {
      const track = (audioTracks as any)[i]
      if (track) {
        track.enabled = i === index
      }
    }
  }

  /**
   * 切换字幕
   * 
   * @param index - 字幕索引（-1 表示关闭字幕）
   */
  setSubtitleTrack(index: number): void {
    this.currentSubtitleStreamIndex = index >= 0 ? index : undefined

    if (!this.player) {
      return
    }

    const textTracks = this.player.textTracks?.()
    if (!textTracks) {
      return
    }

    for (let i = 0; i < textTracks.length; i++) {
      const track = (textTracks as any)[i]
      if (track && (track.kind === 'subtitles' || track.kind === 'captions')) {
        track.mode = i === index ? 'showing' : 'hidden'
      }
    }
  }

  getCurrentMediaSource(): MediaSource | null {
    return this.currentMediaSource
  }

  getCurrentAudioStreamIndex(): number | undefined {
    return this.currentAudioStreamIndex
  }

  getCurrentSubtitleStreamIndex(): number | undefined {
    return this.currentSubtitleStreamIndex
  }

  private buildAudioTrackTitle(index: number, language?: string): string {
    if (language) {
      return language
    }

    return `音轨 ${index + 1}`
  }

  private buildSubtitleTrackTitle(index: number, language?: string): string {
    if (language) {
      return language
    }

    return `字幕 ${index + 1}`
  }

  /**
   * 获取当前播放位置（ticks）
   * 
   * @returns 播放位置
   */
  getCurrentPositionTicks(): number {
    if (!this.player) {
      return 0
    }
    const currentTime = this.player.currentTime()
    return Math.floor((currentTime ?? 0) * 10000000)
  }

  /**
   * 获取总时长（ticks）
   * 
   * @returns 总时长
   */
  getDurationTicks(): number {
    if (!this.player) {
      return 0
    }
    const duration = this.player.duration()
    return Math.floor((duration ?? 0) * 10000000)
  }

  /**
   * 获取当前音量
   * 
   * @returns 音量级别（0-100）
   */
  getVolume(): number {
    if (!this.player) {
      return 100
    }
    const volume = this.player.volume()
    return Math.floor((volume ?? 1.0) * 100)
  }

  /**
   * 获取是否静音
   * 
   * @returns 是否静音
   */
  isMuted(): boolean {
    if (!this.player) {
      return false
    }
    return this.player.muted() ?? false
  }

  /**
   * 获取是否暂停
   * 
   * @returns 是否暂停
   */
  isPaused(): boolean {
    if (!this.player) {
      return true
    }
    return this.player.paused()
  }

  /**
   * 获取是否正在播放
   * 
   * @returns 是否正在播放
   */
  isPlaying(): boolean {
    if (!this.player) {
      return false
    }
    return !this.player.paused() && !this.player.ended()
  }

  /**
   * 监听播放器事件
   * 
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  on(event: string, handler: () => void): void {
    if (this.player) {
      this.player.on(event, handler)
    }
  }

  /**
   * 移除事件监听
   * 
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  off(event: string, handler: () => void): void {
    if (this.player) {
      this.player.off(event, handler)
    }
  }

  /**
   * 销毁播放器实例
   */
  dispose(): void {
    if (this.player) {
      this.player.dispose()
      this.player = null
    }
    this.currentMediaSource = null
    this.currentAudioStreamIndex = undefined
    this.currentSubtitleStreamIndex = undefined
    this.currentPlayMethod = null
    this.lastError = null
  }

  /**
   * 生成播放会话 ID
   * 
   * @returns 播放会话 ID
   */
  private generatePlaySessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 获取 API 密钥
   * 
   * @returns API 密钥
   */
  private getApiKey(): string {
    return this.accessToken
  }

  /**
   * 获取基础 URL
   * 
   * @returns 基础 URL
   */
  private getBaseUrl(): string {
    if (!this.serverUrl) {
      throw new Error('服务器 URL 未设置')
    }
    
    // 确保 URL 格式正确
    let baseUrl = this.serverUrl
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      console.warn('服务器 URL 缺少协议，自动添加 http://')
      baseUrl = `http://${baseUrl}`
    }
    
    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/$/, '')

    return getApiBaseUrl(baseUrl, this.serverType)
  }
}

/**
 * 创建视频服务实例
 * 
 * @param serverUrl - 服务器 URL
 * @param accessToken - 访问令牌
 * @param serverType - 服务器类型
 * @returns 视频服务实例
 */
export function createVideoService(
  serverUrl: string,
  accessToken: string,
  serverType: MediaServerType = 'emby'
): VideoService {
  return new VideoService(serverUrl, accessToken, serverType)
}
