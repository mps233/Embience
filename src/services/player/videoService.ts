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

/**
 * 视频服务类
 */
export class VideoService {
  private player: Player | null = null
  private currentPlayMethod: PlayMethod | null = null
  private lastError: Error | null = null
  private serverUrl: string
  private accessToken: string

  constructor(serverUrl: string, accessToken: string) {
    this.serverUrl = serverUrl
    this.accessToken = accessToken
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

    // 生成播放会话 ID
    const playSessionId = this.generatePlaySessionId()

    // 选择播放方法并尝试初始化
    const playMethod = await this.selectAndInitializePlayMethod(
      videoElement,
      mediaItem.id,
      mediaSource,
      options,
      playSessionId
    )

    // 构建流 URL
    const streamUrl = this.buildStreamUrl(
      mediaItem.id,
      mediaSource,
      options,
      playSessionId,
      playMethod
    )

    return {
      streamUrl,
      playSessionId,
      mediaSourceId: mediaSource.id,
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
      
      console.log('测试服务器连接:', testUrl)
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-Emby-Token': this.accessToken
        },
        timeout: 5000 // 5秒超时
      } as RequestInit)
      
      if (!response.ok) {
        throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`)
      }
      
      console.log('服务器连接测试成功')
    } catch (error) {
      console.error('服务器连接测试失败:', error)
      throw new Error(`无法连接到 Emby 服务器: ${error instanceof Error ? error.message : '未知错误'}`)
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
    const availableMethods = this.getAvailablePlayMethods(mediaSource)

    if (availableMethods.length === 0) {
      throw new Error('没有可用的播放方法')
    }

    console.log(`尝试播放方法: ${availableMethods.join(', ')}`)

    // 尝试每个播放方法，直到成功
    for (const method of availableMethods) {
      try {
        console.log(`正在尝试播放方法: ${method}`)
        
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
        console.log(`✅ 播放方法 ${method} 初始化成功`)
        
        return method
      } catch (error) {
        this.lastError = error as Error
        console.warn(`❌ 播放方法 ${method} 失败:`, error)

        // 如果不是最后一个方法，继续尝试下一个
        if (method !== availableMethods[availableMethods.length - 1]) {
          console.log(`尝试下一个播放方法...`)
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
  private getAvailablePlayMethods(mediaSource: MediaSource): PlayMethod[] {
    const methods: PlayMethod[] = []

    // 对于 STRM 文件，优先使用 DirectStream 而不是 DirectPlay
    // 因为 DirectPlay 可能会导致服务器错误
    const isStrmFile = mediaSource.path?.toLowerCase().endsWith('.strm')
    
    if (isStrmFile) {
      console.log('检测到 STRM 文件，调整播放方法优先级')
      
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

    console.log('可用播放方法:', methods)
    return methods
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
    // 调试信息
    console.log('初始化播放器:', {
      streamUrl,
      playMethod: _playMethod,
      options
    })

    console.log('[播放器初始化] 准备播放流 URL:', streamUrl)
    
    // 调试：检查视频元素状态
    console.log('[DOM 检查] 视频元素状态:', {
      isConnected: videoElement.isConnected,
      parentElement: videoElement.parentElement?.tagName,
      id: videoElement.id,
      className: videoElement.className
    })
    
    // 如果已有播放器实例，先销毁
    if (this.player) {
      this.player.dispose()
    }

    // 创建 Video.js 播放器
    this.player = videojs(videoElement, {
      controls: false, // 禁用 Video.js 控制栏，使用自定义控制栏
      autoplay: false, // 禁用自动播放，等待用户交互
      preload: 'metadata', // 只预加载元数据，减少网络负载
      fluid: false,
      responsive: false,
      fill: true,
      aspectRatio: '16:9',
      html5: {
        vhs: {
          // HLS.js 配置
          overrideNative: true,
          enableLowInitialPlaylist: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: [
        {
          src: streamUrl,
          type: this.getSourceType(streamUrl, options),
        },
      ],
    })

    // 等待播放器准备就绪
    await new Promise<void>((resolve, reject) => {
      if (!this.player) {
        reject(new Error('播放器未初始化'))
        return
      }

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('播放器初始化超时'))
      }, 10000)

      this.player.ready(() => {
        clearTimeout(timeout)
        resolve()
      })

      // 监听错误
      this.player.on('error', () => {
        clearTimeout(timeout)
        const error = this.player?.error()
        console.error('Video.js 播放器错误:', {
          code: error?.code,
          message: error?.message,
          MEDIA_ERR_ABORTED: error?.code === 1,
          MEDIA_ERR_NETWORK: error?.code === 2,
          MEDIA_ERR_DECODE: error?.code === 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: error?.code === 4,
          streamUrl,
          playMethod: _playMethod
        })
        
        // 获取 video 元素的详细状态
        const videoElement = this.player?.el()?.querySelector('video')
        if (videoElement) {
          console.error('[视频错误] Video 元素状态:', {
            src: videoElement.src,
            currentSrc: videoElement.currentSrc,
            networkState: videoElement.networkState,
            readyState: videoElement.readyState,
            paused: videoElement.paused,
            ended: videoElement.ended,
            duration: videoElement.duration,
          })
        }
        
        // 如果是网络错误，尝试重新加载
        if (error?.code === 2) { // MEDIA_ERR_NETWORK
          console.log('检测到网络错误，尝试重新加载...')
          this.handleNetworkError(streamUrl)
        }
        
        reject(new Error(error?.message || '播放器错误'))
      })
    })

    // 设置初始播放位置
    if (options.startPositionTicks) {
      const startSeconds = options.startPositionTicks / 10000000
      this.player.currentTime(startSeconds)
    }

    // 不自动取消静音，等待用户交互
    console.log('播放器初始化完成，等待用户交互开始播放')
  }

  /**
   * 处理网络错误
   * 
   * @param streamUrl - 流 URL
   */
  private handleNetworkError(streamUrl: string): void {
    if (!this.player) return
    
    console.log('尝试重新加载视频流...')
    
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
    const params = new URLSearchParams()

    // 基础参数
    params.append('MediaSourceId', mediaSource.id)
    params.append('PlaySessionId', playSessionId)
    params.append('api_key', this.getApiKey())

    // 支持外部流（STRM 文件）
    params.append('EnableRedirection', 'true')
    params.append('EnableRemoteMedia', 'true')

    // 调试信息
    console.log('构建流 URL:', {
      itemId,
      mediaSourceId: mediaSource.id,
      playSessionId,
      playMethod,
      serverUrl: this.serverUrl,
      hasAccessToken: !!this.accessToken
    })

    // 根据播放方法设置参数
    if (playMethod === 'DirectPlay') {
      // DirectPlay: 直接播放原始文件
      params.append('Static', 'true')
    } else if (playMethod === 'DirectStream') {
      // DirectStream: 重新封装容器，但不转码
      params.append('Static', 'false')
      
      // 对于 STRM 文件，使用更宽松的参数
      const isStrmFile = mediaSource.path?.toLowerCase().endsWith('.strm')
      if (isStrmFile) {
        console.log('为 STRM 文件配置 DirectStream 参数')
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
    } else {
      // Transcode: 完全转码
      params.append('Static', 'false')
      
      // 转码参数
      if (options.maxStreamingBitrate) {
        params.append('MaxStreamingBitrate', options.maxStreamingBitrate.toString())
      }

      if (options.audioCodec) {
        params.append('AudioCodec', options.audioCodec)
      }

      if (options.videoCodec) {
        params.append('VideoCodec', options.videoCodec)
      }

      if (options.maxWidth) {
        params.append('MaxWidth', options.maxWidth.toString())
      }

      if (options.maxHeight) {
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
      // 转码时默认使用 HLS，因为它更好地支持 seeking
      params.append('TranscodingProtocol', 'hls')
      params.append('TranscodingContainer', 'ts')
    }

    // 添加 StartTimeTicks 参数以支持 seeking
    if (options.startPositionTicks) {
      params.append('StartTimeTicks', options.startPositionTicks.toString())
    }

    const baseUrl = this.getBaseUrl()
    const finalUrl = `${baseUrl}/Videos/${itemId}/stream?${params.toString()}`
    
    // 调试信息
    console.log('最终流 URL:', finalUrl)
    console.log('URL 参数:', Object.fromEntries(params.entries()))
    
    return finalUrl
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
    if (!this.player) {
      return []
    }

    const audioTracks = this.player.audioTracks()
    const tracks: AudioTrack[] = []

    for (let i = 0; i < audioTracks.length; i++) {
      // 使用类型断言访问轨道
      const track = (audioTracks as any)[i]
      if (track) {
        tracks.push({
          index: i,
          displayTitle: track.label || `音轨 ${i + 1}`,
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
    if (!this.player) {
      return []
    }

    const textTracks = this.player.textTracks()
    const tracks: SubtitleTrack[] = []

    for (let i = 0; i < textTracks.length; i++) {
      // 使用类型断言访问轨道
      const track = (textTracks as any)[i]
      if (track && (track.kind === 'subtitles' || track.kind === 'captions')) {
        tracks.push({
          index: i,
          displayTitle: track.label || `字幕 ${i + 1}`,
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
    if (!this.player) {
      return
    }

    const audioTracks = this.player.audioTracks()
    for (let i = 0; i < audioTracks.length; i++) {
      // 使用类型断言访问轨道
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
    if (!this.player) {
      return
    }

    const textTracks = this.player.textTracks()
    for (let i = 0; i < textTracks.length; i++) {
      // 使用类型断言访问轨道
      const track = (textTracks as any)[i]
      if (track && (track.kind === 'subtitles' || track.kind === 'captions')) {
        track.mode = i === index ? 'showing' : 'hidden'
      }
    }
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
    
    const finalUrl = `${baseUrl}/emby`
    console.log('基础 URL:', finalUrl)
    
    return finalUrl
  }
}

/**
 * 创建视频服务实例
 * 
 * @param serverUrl - 服务器 URL
 * @param accessToken - 访问令牌
 * @returns 视频服务实例
 */
export function createVideoService(serverUrl: string, accessToken: string): VideoService {
  return new VideoService(serverUrl, accessToken)
}

