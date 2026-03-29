/**
 * VideoPlayer 组件
 * 
 * 视频播放器组件，基于原生 HTML5 video 元素
 * 提供视频播放、控制、音轨和字幕选择功能
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import './VideoPlayer.css'
import type { MediaItem } from '@/types/emby'
import type { PlaybackOptions, PlaybackProgressReport } from '@/types/player'
import type { ResolvedAssrtSubtitle } from '@/types/assrt'
import { createVideoService } from '@/services/player/videoService'
import { createProgressTracker } from '@/services/player/progressTracker'
import { createEmbyClient } from '@/services/api/embyClient'
import {
  convertSubtitleTextToVtt,
  detectSubtitleFormat,
} from '@/services/subtitles/subtitleFormatService'
import { buildAssrtFileProxyUrl } from '@/services/subtitles/assrtService'
import { usePlayerStore } from '@/stores/playerStore'
import { useAuthStore } from '@/stores/authStore'
import { useDanmakuStore } from '@/stores/danmakuStore'
import { useDanmaku } from '@/hooks/useDanmaku'
import { DanmakuCanvas, DanmakuSettings } from '@/components/danmaku'
import DanmakuSelector from '@/components/danmaku/DanmakuSelector'
import OpenSubtitlesSearchDialog from '@/components/player/OpenSubtitlesSearchDialog'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Settings,
  Languages,
  AudioLines,
  Search,
} from 'lucide-react'

// 弹幕图标组件 - 开启状态（MingCute danmaku-line）
const DanmakuIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/>
    <path d="M9 12a1 1 0 0 1 .117 1.993L9 14H4v1a1 1 0 0 0 .883.993L5 16h1.5a1.5 1.5 0 0 1 1.493 1.356L8 17.5v.5l2.133-1.6a2 2 0 0 1 1.016-.391l.184-.009H18a1 1 0 0 0 .993-.883L19 15v-3h2v3a3 3 0 0 1-2.824 2.995L18 18h-6.667L8 20.5c-.791.593-1.906.075-1.994-.879L6 19.5V18H5a3 3 0 0 1-2.995-2.824L2 15v-2a1 1 0 0 1 .883-.993L3 12zm6 0a1 1 0 0 1 .117 1.993L15 14h-2a1 1 0 0 1-.117-1.993L13 12zM7 8a1 1 0 0 1 .117 1.993L7 10H5a1 1 0 0 1-.117-1.993L5 8zm12 0l.117.007a1 1 0 0 1 0 1.986L19 10h-8a1 1 0 0 1-.117-1.993L11 8zm-1-5a3 3 0 0 1 2.995 2.824L21 6v2h-2V6a1 1 0 0 0-.883-.993L18 5H5a1 1 0 0 0-.993.883L4 6v2H2V6a3 3 0 0 1 2.824-2.995L5 3z"/>
  </svg>
)

// 弹幕图标组件 - 关闭状态（MingCute danmaku-off-line）
const DanmakuOffIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/>
    <path d="M4 14v1a1 1 0 0 0 1 1h1.5A1.5 1.5 0 0 1 8 17.5v.5l2.4-1.8l1.2 1.6L8 20.5c-.824.618-2 .03-2-1V18H5a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2zm1-6a1 1 0 0 0 0 2h2a1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2zM5 3a3 3 0 0 0-3 3v1h2V6a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v1h2V6a3 3 0 0 0-3-3zm8 13.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0m2.172-.914a2.5 2.5 0 0 0 3.241 3.241zm1.414-1.414l3.242 3.242a2.5 2.5 0 0 0-3.241-3.241"/>
  </svg>
)

/**
 * VideoPlayer 组件属性
 */
interface VideoPlayerProps {
  /** 要播放的媒体项 */
  mediaItem: MediaItem
  /** 起始播放位置（ticks） */
  startPositionTicks?: number
  /** 播放开始回调 */
  onPlaybackStart?: (sessionInfo: {
    playSessionId: string
    mediaSourceId: string
  }) => void
  /** 播放进度回调 */
  onPlaybackProgress?: (progress: {
    positionTicks: number
    isPaused: boolean
  }) => void
  /** 播放结束回调 */
  onPlaybackEnd?: () => void
  /** 上一集回调 */
  onPlayPreviousEpisode?: () => void
  /** 下一集回调 */
  onPlayNextEpisode?: () => void
  /** 是否可切换到上一集 */
  canPlayPreviousEpisode?: boolean
  /** 是否可切换到下一集 */
  canPlayNextEpisode?: boolean
}
// 字幕检测相关类型
interface DetectedSubtitle {
  index: number
  language?: string
  displayTitle: string
  isEmbedded: boolean
  isExternal: boolean
}

/**
 * 从外部字幕文件中查找字幕
 */
const findExternalSubtitles = (mediaItem: MediaItem): DetectedSubtitle[] => {
  if (!mediaItem.mediaSources || mediaItem.mediaSources.length === 0) {
    return []
  }

  const source = mediaItem.mediaSources[0]
  const externalSubtitles: DetectedSubtitle[] = []

  // 从 MediaStreams 中查找外部字幕
  const subtitleStreams = source.mediaStreams?.filter(s => s.type === 'Subtitle') || []
  
  subtitleStreams.forEach((stream, index) => {
    // 只处理外部字幕文件（通常有 path 属性且不是内封的）
    if (stream.isExternal !== false) {
      externalSubtitles.push({
        index,
        language: stream.language,
        displayTitle: stream.displayTitle || `外部字幕 ${index + 1}`,
        isEmbedded: false,
        isExternal: true
      })
    }
  })

  return externalSubtitles
}

/**
 * 从视频流中检测内封字幕
 */
const detectEmbeddedSubtitles = (videoElement: HTMLVideoElement): DetectedSubtitle[] => {
  const embeddedSubtitles: DetectedSubtitle[] = []
  
  try {
    // 检查 video 元素的 textTracks
    const textTracks = videoElement.textTracks

    if (textTracks && textTracks.length > 0) {
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i]

        if (track.kind === 'subtitles' || track.kind === 'captions') {
          embeddedSubtitles.push({
            index: i,
            language: track.language,
            displayTitle: track.label || `内封字幕 ${i + 1}`,
            isEmbedded: true,
            isExternal: false
          })
        }
      }
    }
  } catch (error) {
    console.warn('[字幕检测] 检测内封字幕时出错:', error)
  }

  return embeddedSubtitles
}
/**
 * VideoPlayer 组件
 */
export function VideoPlayer({
  mediaItem,
  startPositionTicks,
  onPlaybackStart,
  onPlaybackProgress,
  onPlaybackEnd,
  onPlayPreviousEpisode,
  onPlayNextEpisode,
  canPlayPreviousEpisode = false,
  canPlayNextEpisode = false,
}: VideoPlayerProps) {
  // 认证状态
  const { user, serverUrl, serverType, accessToken } = useAuthStore()
  
  // 视频元素引用
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // 视频服务引用（使用 serverUrl 和 accessToken 创建）
  const videoServiceRef = useRef(createVideoService(serverUrl || '', accessToken || '', serverType || 'emby'))
  
  // 进度跟踪器引用
  const progressTrackerRef = useRef<ReturnType<typeof createProgressTracker> | null>(null)
  
  // 定时器引用
  const progressTimerRef = useRef<number | null>(null)
  
  // 会话信息引用
  const sessionInfoRef = useRef<{
    playSessionId: string
    mediaSourceId: string
    playMethod: string
  } | null>(null)
  
  // 播放器状态
  const { setCurrentItem, updatePlaybackState, clearPlayback } = usePlayerStore()
  
  // 音轨和字幕索引（用于进度报告）
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0)
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(-1)
  const [subtitleDelaySeconds, setSubtitleDelaySeconds] = useState(0)
  
  // 字幕和音轨菜单显示状态
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [showAudioMenu, setShowAudioMenu] = useState(false)
  const [showSubtitleSearchDialog, setShowSubtitleSearchDialog] = useState(false)
  const subtitleMenuRef = useRef<HTMLDivElement>(null)
  const subtitleButtonRef = useRef<HTMLButtonElement>(null)
  const audioMenuRef = useRef<HTMLDivElement>(null)
  const audioButtonRef = useRef<HTMLButtonElement>(null)
  
  // 弹幕功能
  const { settings: danmakuSettings, updateSettings: updateDanmakuSettings } = useDanmakuStore()
  const [showDanmakuSelector, setShowDanmakuSelector] = useState(false)
  const danmakuSelectorButtonRef = useRef<HTMLButtonElement>(null)
  
  const {
    isMatching,
    isLoadingDanmaku,
    hasDanmaku,
    selectDanmaku,
  } = useDanmaku({
    mediaItem,
    enabled: danmakuSettings.enabled,
  })

  // 存储弹幕来源信息
  const [danmakuSource, setDanmakuSource] = useState<{
    animeTitle: string
    episodeTitle: string
  } | null>(null)
  
  // 错误状态
  const [error, setError] = useState<string | null>(null)
  const [technicalDetails, setTechnicalDetails] = useState<string | null>(null)
  
  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isDraggingProgressRef = useRef(false) // 使用 ref 确保立即生效
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimeoutRef = useRef<number | null>(null)
  const clickTimerRef = useRef<number | null>(null)
  
  // 视频加载状态 - 用于触发字幕检测
  const [videoLoaded, setVideoLoaded] = useState(false)
  
  // 宽高比状态（16:9 或 auto）- 从 localStorage 读取初始值
  const [aspectRatioMode, setAspectRatioMode] = useState<'16:9' | 'auto'>(() => {
    const saved = localStorage.getItem('videoPlayerAspectRatio')
    return (saved === '16:9' || saved === 'auto') ? saved : '16:9'
  })
  
  // 计算视频容器尺寸
  const [videoContainerSize, setVideoContainerSize] = useState({ width: 0, height: 0 })
  
  const containerRef = useRef<HTMLDivElement>(null)
  // 智能字幕检测 - 使用 useMemo 优化性能
  const availableSubtitles = useMemo(() => {
    const videoElement = videoRef.current

    if (!videoElement) {
      return findExternalSubtitles(mediaItem)
    }

    // 优先检测内封字幕（只有在视频加载后才检测）
    if (videoLoaded) {
      const embeddedSubtitles = detectEmbeddedSubtitles(videoElement)
      
      // 如果有内封字幕，优先使用
      if (embeddedSubtitles.length > 0) {
        return embeddedSubtitles
      }
    }

    // 备选：查找外部字幕文件
    return findExternalSubtitles(mediaItem)
  }, [mediaItem, videoLoaded])

  // 构建播放进度报告
  const buildProgressReport = (eventName?: PlaybackProgressReport['eventName']): PlaybackProgressReport | null => {
    const videoService = videoServiceRef.current
    const sessionInfo = sessionInfoRef.current

    if (!sessionInfo) {
      return null
    }

    return {
      itemId: mediaItem.id,
      mediaSourceId: sessionInfo.mediaSourceId,
      playSessionId: sessionInfo.playSessionId,
      positionTicks: videoService.getCurrentPositionTicks(),
      isPaused: videoService.isPaused(),
      isMuted: videoService.isMuted(),
      volumeLevel: videoService.getVolume(),
      playMethod: sessionInfo.playMethod as any,
      canSeek: true,
      audioStreamIndex: videoService.getCurrentAudioStreamIndex() ?? selectedAudioTrack,
      subtitleStreamIndex: normalizeServerSubtitleTrackIndex(
        videoService.getCurrentSubtitleStreamIndex() ?? (
          selectedSubtitleTrack >= 0 ? selectedSubtitleTrack : undefined
        )
      ),
      eventName,
    }
  }

  // 报告播放进度
  const reportProgress = async (eventName?: PlaybackProgressReport['eventName']) => {
    const progressTracker = progressTrackerRef.current
    const report = buildProgressReport(eventName)

    if (!progressTracker || !report) {
      return
    }

    try {
      await progressTracker.reportPlaybackProgress(report)
      
      // 触发进度回调
      onPlaybackProgress?.({
        positionTicks: report.positionTicks,
        isPaused: report.isPaused,
      })

      // 检查是否达到 90% 并标记为已播放
      const videoService = videoServiceRef.current
      const durationTicks = videoService.getDurationTicks()
      if (durationTicks > 0) {
        const progress = report.positionTicks / durationTicks
        if (progress >= 0.9 && !report.isPaused) {
          // 标记为已播放（通过 API）
          // 注意：这里应该调用 markAsPlayed API，但目前我们只是记录
        }
      }
    } catch (error) {
      console.error('报告播放进度失败:', error)
    }
  }

  const getBasePlaybackOptions = (
    overrides: Partial<PlaybackOptions> = {}
  ): PlaybackOptions => ({
    startPositionTicks,
    maxStreamingBitrate: 140000000,
    maxAudioChannels: 2,
    audioCodec: 'aac',
    videoCodec: 'h264',
    ...overrides,
  })

  const normalizeServerSubtitleTrackIndex = (streamIndex?: number): number | undefined => {
    if (typeof streamIndex !== 'number' || streamIndex < 0) {
      return undefined
    }

    if (videoServiceRef.current.isCustomSubtitleTrackIndex(streamIndex)) {
      return undefined
    }

    return streamIndex
  }

  const syncSelectedStreamsFromService = () => {
    const currentMediaSource = videoServiceRef.current.getCurrentMediaSource()
    const audioTracks = videoServiceRef.current.getAudioTracks()
    const subtitleTracks = videoServiceRef.current.getSubtitleTracks()

    const audioStreamIndex =
      videoServiceRef.current.getCurrentAudioStreamIndex() ??
      currentMediaSource?.defaultAudioStreamIndex ??
      audioTracks[0]?.index ??
      0
    const subtitleStreamIndex =
      videoServiceRef.current.getCurrentSubtitleStreamIndex() ??
      currentMediaSource?.defaultSubtitleStreamIndex ??
      (subtitleTracks.length > 0 ? subtitleTracks[0].index : -1)

    setSelectedAudioTrack(audioStreamIndex)
    setSelectedSubtitleTrack(
      typeof subtitleStreamIndex === 'number' ? subtitleStreamIndex : -1
    )
    setSubtitleDelaySeconds(videoServiceRef.current.getSubtitleDelay())

    return {
      audioStreamIndex,
      subtitleStreamIndex: typeof subtitleStreamIndex === 'number' ? subtitleStreamIndex : -1,
    }
  }

  const initializePlaybackSession = async (
    playbackOverrides: Partial<PlaybackOptions> = {},
    behavior: {
      resetPlayedState?: boolean
      autoResume?: boolean
      reportStart?: boolean
      announceStart?: boolean
    } = {}
  ) => {
    const videoElement = videoRef.current
    const videoService = videoServiceRef.current

    if (!videoElement) {
      throw new Error('视频元素不存在')
    }

    setError(null)
    setTechnicalDetails(null)

    if (!progressTrackerRef.current && serverUrl && accessToken) {
      const apiClient = createEmbyClient({
        serverUrl,
        serverType: serverType || undefined,
        accessToken,
      })
      progressTrackerRef.current = createProgressTracker({
        apiClient,
        reportInterval: 10000,
        serverUrl,
        serverType: serverType || 'emby',
        apiToken: accessToken,
      })
    }

    const sessionInfo = await videoService.initializePlayback(
      videoElement,
      mediaItem,
      getBasePlaybackOptions(playbackOverrides)
    )

    sessionInfoRef.current = sessionInfo
    const streamSelection = syncSelectedStreamsFromService()
    setCurrentItem(mediaItem, sessionInfo.playSessionId, sessionInfo.playMethod)

    const currentMediaSource = videoService.getCurrentMediaSource()
    if (currentMediaSource) {
      const videoStream = currentMediaSource.mediaStreams?.find((stream) => stream.type === 'Video')
      const audioStream = currentMediaSource.mediaStreams?.find((stream) => stream.type === 'Audio')

      const details = [
        `播放方法: ${sessionInfo.playMethod}`,
        videoStream ? `视频: ${videoStream.codec} ${videoStream.width}x${videoStream.height}` : '',
        audioStream ? `音频: ${audioStream.codec} ${audioStream.channels}声道` : '',
        currentMediaSource.bitrate
          ? `比特率: ${Math.round(currentMediaSource.bitrate / 1000000)}Mbps`
          : '',
      ]
        .filter(Boolean)
        .join(' | ')

      setTechnicalDetails(details)
    }

    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }

    const progressTracker = progressTrackerRef.current
    if (progressTracker && behavior.reportStart !== false) {
      if (behavior.resetPlayedState && mediaItem.userData?.played) {
        try {
          const apiClient = createEmbyClient({
            serverUrl: serverUrl || '',
            serverType: serverType || undefined,
            accessToken: accessToken || undefined,
          })
          await apiClient.delete(`/Users/${user?.id}/PlayedItems/${mediaItem.id}`)
        } catch (resetError) {
          console.error('取消"已播放"标记失败:', resetError)
        }
      }

      const startReport = buildProgressReport()
      if (startReport) {
        await progressTracker.reportPlaybackStart({
          ...startReport,
          audioStreamIndex: streamSelection.audioStreamIndex,
          subtitleStreamIndex:
            normalizeServerSubtitleTrackIndex(streamSelection.subtitleStreamIndex),
        })
        progressTimerRef.current = window.setInterval(() => {
          reportProgress('TimeUpdate')
        }, 10000)
      }
    }

    if (behavior.autoResume) {
      await videoService.play()
    }

    if (behavior.announceStart !== false) {
      onPlaybackStart?.(sessionInfo)
    }

    return sessionInfo
  }
  // 初始化播放器和事件监听
  useEffect(() => {
    videoServiceRef.current = createVideoService(
      serverUrl || '',
      accessToken || '',
      serverType || 'emby'
    )
    setSubtitleDelaySeconds(videoServiceRef.current.getSubtitleDelay())

    const videoElement = videoRef.current
    const videoService = videoServiceRef.current

    if (!videoElement) {
      return
    }

    // 定义事件处理函数 - 直接监听原生 video 元素
    const handlePlay = () => {
      setIsPlaying(true)
      updatePlaybackState({
        isPlaying: true,
        isPaused: false,
      })
      
      // 清除错误状态（视频恢复播放时）
      if (error) {
        setError(null)
        setTechnicalDetails(null)
      }
      
      // 立即报告继续播放
      reportProgress('Unpause')
    }

    const handlePause = () => {
      setIsPlaying(false)
      updatePlaybackState({
        isPlaying: false,
        isPaused: true,
      })
      
      // 暂停时只报告进度，不报告停止
      reportProgress('Pause')
    }

    const handleTimeUpdate = () => {
      const positionTicks = videoService.getCurrentPositionTicks()
      const isPaused = videoElement.paused || videoElement.ended

      // 某些浏览器在全屏切换时 play/pause 事件可能丢失，这里用 timeupdate 自愈播放状态
      setIsPlaying(!isPaused)

      // 更新本地时间状态 - 使用 ref 检查是否正在拖动
      if (!isDraggingProgressRef.current) {
        setCurrentTime(positionTicks / 10000000) // 转换为秒
        setDuration(videoService.getDurationTicks() / 10000000)
      }

      updatePlaybackState({
        positionTicks,
        isPaused,
      })

      // 注意：不在这里报告进度，由定时器处理
      // 只触发本地回调
      onPlaybackProgress?.({
        positionTicks,
        isPaused,
      })
    }

    const handleSeeked = () => {
      // 立即报告跳转
      reportProgress('TimeUpdate')
    }

    const handleVolumeChange = () => {
      const volumeLevel = videoService.getVolume()
      const muted = videoService.isMuted()

      setVolume(volumeLevel)
      setIsMuted(muted)

      updatePlaybackState({
        volumeLevel,
        isMuted: muted,
      })
      
      // 立即报告音量变化
      reportProgress('VolumeChange')
    }

    const handleEnded = async () => {
      setIsPlaying(false)
      updatePlaybackState({
        isPlaying: false,
        isPaused: true,
      })

      // 报告播放停止
      const progressTracker = progressTrackerRef.current
      const report = buildProgressReport()
      if (progressTracker && report) {
        try {
          await progressTracker.reportPlaybackStopped(report)
        } catch (error) {
          console.error('报告播放停止失败:', error)
        }
      }

      // 触发播放结束回调
      onPlaybackEnd?.()
    }

    // 视频元数据加载完成 - 触发字幕检测
    const handleLoadedMetadata = () => {
      setVideoLoaded(true)
    }

    // 视频可以播放时 - 再次触发字幕检测（确保 textTracks 已加载）
    const handleCanPlay = () => {
      // 延迟一点时间，确保 textTracks 完全加载
      setTimeout(() => {
        setVideoLoaded(prev => !prev) // 切换状态以触发 useMemo 重新计算
      }, 500)
    }

    // 视频错误处理
    const handleVideoError = () => {
      const error = videoElement.error
      if (error) {
        console.error('[视频错误] 视频元素错误:', {
          code: error.code,
          message: error.message,
          MEDIA_ERR_ABORTED: error.code === 1,
          MEDIA_ERR_NETWORK: error.code === 2,
          MEDIA_ERR_DECODE: error.code === 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: error.code === 4,
        })
        
        // 获取更多调试信息
        console.error('[视频错误] 视频状态:', {
          src: videoElement.src,
          currentSrc: videoElement.currentSrc,
          networkState: videoElement.networkState,
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          ended: videoElement.ended,
        })
        
        // 设置用户友好的错误消息
        let errorMessage = '视频播放失败'
        switch (error.code) {
          case 1:
            errorMessage = '视频加载被中止'
            break
          case 2:
            errorMessage = '网络错误，无法加载视频'
            // 对于网络错误（错误代码 2），尝试自动恢复
            console.log('[视频错误] 检测到网络错误，3秒后自动尝试恢复播放...')
            setTimeout(() => {
              if (videoElement && !videoElement.paused) {
                console.log('[视频错误] 尝试恢复播放')
                videoElement.load() // 重新加载视频
                videoElement.play().catch(err => {
                  console.error('[视频错误] 自动恢复失败:', err)
                })
              }
            }, 3000)
            break
          case 3:
            errorMessage = '视频解码失败，可能是格式不支持'
            break
          case 4:
            errorMessage = '视频源不支持或无法访问'
            break
        }
        
        setError(errorMessage)
        setTechnicalDetails(`错误代码: ${error.code} - ${error.message}`)
      }
    }

    // 先在原生 video 元素上注册事件监听器（在初始化之前）
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('seeked', handleSeeked)
    videoElement.addEventListener('volumechange', handleVolumeChange)
    videoElement.addEventListener('ended', handleEnded)
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    videoElement.addEventListener('canplay', handleCanPlay)
    videoElement.addEventListener('error', handleVideoError)

    // 初始化播放
    const initPlayback = async () => {
      try {
        console.log('[播放初始化] 开始初始化播放')
        await initializePlaybackSession({}, { resetPlayedState: true, reportStart: true, announceStart: true })
      } catch (error) {
        console.error('初始化播放失败:', error)
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        setError(`播放失败: ${errorMessage}`)
        
        // 获取最后的错误详情
        const lastError = videoService.getLastError()
        if (lastError) {
          setTechnicalDetails(`错误详情: ${lastError.message}`)
        }
      }
    }
    // 延迟初始化，给 React 时间完成 DOM 渲染
    const initTimeoutId = setTimeout(() => {
      console.log('[播放初始化] 开始初始化播放')
      initPlayback()
    }, 100)

    // 清理函数
    return () => {
      clearTimeout(initTimeoutId)
      
      // 停止定时器
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }

      // 报告播放停止
      const progressTracker = progressTrackerRef.current
      const report = buildProgressReport()
      if (progressTracker && report) {
        progressTracker.reportPlaybackStopped(report).catch((error) => {
          console.error('报告播放停止失败:', error)
        })
      }

      // 移除原生事件监听
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('seeked', handleSeeked)
      videoElement.removeEventListener('volumechange', handleVolumeChange)
      videoElement.removeEventListener('ended', handleEnded)
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.removeEventListener('canplay', handleCanPlay)
      videoElement.removeEventListener('error', handleVideoError)
      
      // 清理播放器
      videoService.dispose()
      clearPlayback()
    }
  }, [mediaItem.id, startPositionTicks, serverUrl, serverType, accessToken, user?.id])

  // 处理自定义播放按钮点击
  const handlePlayButtonClick = () => {
    const videoService = videoServiceRef.current
    if (isPlaying) {
      videoService.pause()
    } else {
      videoService.play()
    }
  }

  // 处理视频区域单击（播放/暂停）
  const handleVideoAreaClick = () => {
    // 双击触发前先缓存单击，等待是否进入双击
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      return
    }

    clickTimerRef.current = window.setTimeout(() => {
      handlePlayButtonClick()
      clickTimerRef.current = null
    }, 220)
  }

  // 处理视频区域双击（全屏/退出全屏）
  const handleVideoAreaDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    toggleFullscreen()
  }

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  // 处理进度条拖动
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    isDraggingProgressRef.current = true // 先设置 ref，阻止 handleTimeUpdate 更新
    setCurrentTime(newTime)
  }

  const handleProgressMouseDown = () => {
    isDraggingProgressRef.current = true // 立即设置 ref
  }

  const handleProgressMouseUp = () => {
    const videoElement = videoRef.current
    
    if (!videoElement) {
      isDraggingProgressRef.current = false // 重置 ref
      return
    }
    
    // 检查视频是否可以 seek
    if (!videoElement.duration || videoElement.duration === Infinity || isNaN(videoElement.duration)) {
      console.warn('视频尚未准备好，无法跳转')
      isDraggingProgressRef.current = false // 重置 ref
      return
    }
    
    try {
      // 直接设置 video 元素的 currentTime，而不是通过 videoService
      // 这样可以避免触发重新加载
      videoElement.currentTime = currentTime
      
      // 延迟重置拖动标志，确保 seek 操作完成后才允许 handleTimeUpdate 更新
      setTimeout(() => {
        isDraggingProgressRef.current = false // 重置 ref
        
        // 报告进度
        reportProgress('TimeUpdate')
      }, 150)
    } catch (error) {
      console.error('跳转失败:', error)
      setError('跳转失败，请稍后重试')
      isDraggingProgressRef.current = false // 重置 ref
    }
  }
  // 处理音量调节
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    const videoService = videoServiceRef.current
    videoService.setVolume(newVolume)
    setVolume(newVolume)
    if (newVolume > 0 && isMuted) {
      videoService.setMuted(false)
      setIsMuted(false)
    }
  }

  // 切换静音
  const toggleMute = () => {
    const videoService = videoServiceRef.current
    const newMuted = !isMuted
    videoService.setMuted(newMuted)
    setIsMuted(newMuted)
  }

  // 调整音量（键盘快捷键使用）
  const adjustVolume = (delta: number) => {
    const videoService = videoServiceRef.current
    const nextVolume = Math.max(0, Math.min(100, volume + delta))
    videoService.setVolume(nextVolume)
    setVolume(nextVolume)

    if (nextVolume > 0 && isMuted) {
      videoService.setMuted(false)
      setIsMuted(false)
    }
  }

  // 快进/快退
  const seekBySeconds = (seconds: number) => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const totalDuration =
      Number.isFinite(videoElement.duration) && videoElement.duration > 0
        ? videoElement.duration
        : duration
    if (!totalDuration || isNaN(totalDuration)) return

    const now = Number.isFinite(videoElement.currentTime) ? videoElement.currentTime : currentTime
    const newTime = Math.max(0, Math.min(now + seconds, totalDuration))

    videoElement.currentTime = newTime
    setCurrentTime(newTime)

    setTimeout(() => {
      reportProgress('TimeUpdate')
    }, 100)
  }

  const handleSkipForward = () => {
    seekBySeconds(10)
  }

  const handleSkipBackward = () => {
    seekBySeconds(-10)
  }
  // 切换全屏
  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // 切换宽高比模式（16:9 <-> auto）
  const toggleAspectRatio = () => {
    setAspectRatioMode(prev => {
      const newMode: '16:9' | 'auto' = prev === '16:9' ? 'auto' : '16:9'
      // 保存到 localStorage
      localStorage.setItem('videoPlayerAspectRatio', newMode)
      return newMode
    })
  }
  
  // 计算视频容器尺寸
  useEffect(() => {
    const calculateSize = () => {
      const container = containerRef.current
      const videoElement = videoRef.current
      if (!container) return
      
      // 获取容器的可用高度
      const containerHeight = container.clientHeight
      const controlBarHeight = 80 // 控制栏高度
      
      // 视频区域的可用高度 = 容器高度 - 控制栏高度
      const availableHeight = Math.max(containerHeight - controlBarHeight, 300)
      
      // 根据宽高比模式计算宽度
      let aspectRatio: number
      if (aspectRatioMode === 'auto' && videoElement?.videoWidth && videoElement?.videoHeight) {
        // 使用视频原始宽高比
        aspectRatio = videoElement.videoWidth / videoElement.videoHeight
      } else {
        // 默认 16:9
        aspectRatio = 16 / 9
      }
      
      const calculatedWidth = availableHeight * aspectRatio
      
      console.log('[播放器尺寸] 容器高度:', containerHeight, '可用高度:', availableHeight, '计算宽度:', calculatedWidth, '宽高比:', aspectRatioMode, '实际比例:', aspectRatio.toFixed(2))
      
      setVideoContainerSize({
        width: calculatedWidth,
        height: availableHeight
      })
    }
    
    // 延迟计算，确保 DOM 已渲染
    setTimeout(calculateSize, 100)
    // 再次延迟计算，确保布局稳定
    setTimeout(calculateSize, 500)
    window.addEventListener('resize', calculateSize)
    
    // 监听视频元数据加载完成事件（用于 auto 模式）
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.addEventListener('loadedmetadata', calculateSize)
    }
    
    return () => {
      window.removeEventListener('resize', calculateSize)
      if (videoElement) {
        videoElement.removeEventListener('loadedmetadata', calculateSize)
      }
    }
  }, [aspectRatioMode])

  // 切换音轨
  const handleAudioTrackChange = async (streamIndex: number) => {
    if (selectedAudioTrack === streamIndex) {
      setShowAudioMenu(false)
      return
    }

    const videoService = videoServiceRef.current
    const currentPositionTicks = videoService.getCurrentPositionTicks()
    const shouldResumePlayback = isPlaying

    try {
      setShowAudioMenu(false)
      await initializePlaybackSession(
        {
          startPositionTicks: currentPositionTicks,
          audioStreamIndex: streamIndex,
          subtitleStreamIndex: normalizeServerSubtitleTrackIndex(selectedSubtitleTrack),
        },
        {
          autoResume: shouldResumePlayback,
          reportStart: true,
          announceStart: false,
        }
      )
      await reportProgress('AudioTrackChange')
    } catch (error) {
      console.error('切换音轨失败:', error)
      setError('切换音轨失败，请稍后重试')
    }
  }

  // 切换字幕
  const handleSubtitleTrackChange = async (streamIndex: number) => {
    if (selectedSubtitleTrack === streamIndex) {
      setShowSubtitleMenu(false)
      return
    }

    if (streamIndex === -1 && videoServiceRef.current.isCustomSubtitleTrackIndex(selectedSubtitleTrack)) {
      videoServiceRef.current.setSubtitleTrack(-1)
      setSelectedSubtitleTrack(-1)
      setShowSubtitleMenu(false)
      await reportProgress('SubtitleTrackChange')
      return
    }

    if (videoServiceRef.current.isCustomSubtitleTrackIndex(streamIndex)) {
      videoServiceRef.current.setSubtitleTrack(streamIndex)
      setSelectedSubtitleTrack(streamIndex)
      setShowSubtitleMenu(false)
      await reportProgress('SubtitleTrackChange')
      return
    }

    const videoService = videoServiceRef.current
    const currentPositionTicks = videoService.getCurrentPositionTicks()
    const shouldResumePlayback = isPlaying

    try {
      setShowSubtitleMenu(false)
      await initializePlaybackSession(
        {
          startPositionTicks: currentPositionTicks,
          audioStreamIndex: selectedAudioTrack,
          subtitleStreamIndex: normalizeServerSubtitleTrackIndex(streamIndex),
        },
        {
          autoResume: shouldResumePlayback,
          reportStart: true,
          announceStart: false,
        }
      )
      await reportProgress('SubtitleTrackChange')
    } catch (error) {
      console.error('切换字幕失败:', error)
      setError('切换字幕失败，请稍后重试')
    }
  }

  const handleSubtitleDelayAdjust = (deltaSeconds: number) => {
    const nextDelay = videoServiceRef.current.adjustSubtitleDelay(deltaSeconds)
    setSubtitleDelaySeconds(nextDelay)
  }

  const handleSubtitleDelayReset = () => {
    const nextDelay = videoServiceRef.current.resetSubtitleDelay()
    setSubtitleDelaySeconds(nextDelay)
  }

  const decodeSubtitleBuffer = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    const encodings: Array<{ name: string; fatal?: boolean }> = [
      { name: 'utf-8', fatal: true },
      { name: 'utf-16le' },
      { name: 'gb18030' },
    ]

    for (const encoding of encodings) {
      try {
        const decoder = new TextDecoder(encoding.name, { fatal: encoding.fatal })
        const decodedText = decoder.decode(bytes)

        if (!decodedText.includes('\uFFFD')) {
          return decodedText
        }
      } catch {
        continue
      }
    }

    return new TextDecoder().decode(bytes)
  }

  const handleApplyOnlineSubtitle = async (subtitle: ResolvedAssrtSubtitle) => {
    const preferredFile = subtitle.files.find((file) =>
      ['vtt', 'srt', 'ass', 'ssa'].includes(file.format || '')
    )

    if (!preferredFile) {
      throw new Error('这个字幕条目暂时没有可直接应用的文本字幕文件')
    }

    const subtitleFormat = detectSubtitleFormat(preferredFile.fileName)
    if (!subtitleFormat) {
      throw new Error('当前字幕格式暂不支持直接应用')
    }

    // 先尝试代理 URL，如果遇到重定向则把重定向目标再次走代理
    const fetchViaProxy = async (url: string): Promise<Response> => {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'text/plain,application/octet-stream,*/*' },
      })
      // 处理重定向：把新地址再次走代理
      if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
        const location = response.headers.get('location')
        if (location) {
          const redirectProxyUrl = buildAssrtFileProxyUrl(location)
          return fetch(redirectProxyUrl, {
            method: 'GET',
            headers: { Accept: 'text/plain,application/octet-stream,*/*' },
          })
        }
      }
      return response
    }

    const response = await fetchViaProxy(preferredFile.proxiedDownloadUrl)

    if (!response.ok) {
      throw new Error(`字幕文件获取失败：${response.status}`)
    }

    const subtitleBuffer = await response.arrayBuffer()
    const subtitleText = decodeSubtitleBuffer(subtitleBuffer)
    const vttContent = convertSubtitleTextToVtt(subtitleText, subtitleFormat)
    const objectUrl = URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' }))
    const appliedTrackIndex = await videoServiceRef.current.loadCustomSubtitleTrack({
      src: objectUrl,
      objectUrl,
      label: `${subtitle.language} · ${preferredFile.fileName}`,
      language: subtitle.language,
      codec: 'vtt',
    })

    setSelectedSubtitleTrack(appliedTrackIndex)
    setSubtitleDelaySeconds(videoServiceRef.current.getSubtitleDelay())
    setError(null)
  }

  // 获取可用的音轨列表
  const getAudioTracks = () => {
    const serviceTracks = videoServiceRef.current.getAudioTracks()
    if (serviceTracks.length > 0) {
      return serviceTracks
    }

    if (!mediaItem.mediaSources || mediaItem.mediaSources.length === 0) {
      return []
    }

    const source = mediaItem.mediaSources[0]
    return source.mediaStreams?.filter((stream) => stream.type === 'Audio') || []
  }

  // 获取可用的字幕列表 - 使用智能检测的结果
  const getSubtitleTracks = () => {
    const serviceTracks = videoServiceRef.current.getSubtitleTracks()
    if (serviceTracks.length > 0) {
      return serviceTracks
    }

    return availableSubtitles
  }

  const formatAudioTrackLabel = (track: ReturnType<typeof getAudioTracks>[number], index: number) => {
    if (track.displayTitle) {
      return track.displayTitle
    }

    const parts = [track.language || `音轨 ${index + 1}`]
    if (track.codec) {
      parts.push(track.codec.toUpperCase())
    }
    if (track.channels) {
      parts.push(track.channelLayout || `${track.channels}声道`)
    }

    return parts.join(' · ')
  }

  const formatSubtitleTrackLabel = (track: ReturnType<typeof getSubtitleTracks>[number], index: number) => {
    if (track.displayTitle) {
      return track.displayTitle
    }

    const parts = [track.language || `字幕 ${index + 1}`]
    if (track.isExternal) {
      parts.push('外挂')
    } else if ('isTextSubtitleStream' in track && track.isTextSubtitleStream) {
      parts.push('文本')
    }

    return parts.join(' · ')
  }

  const subtitleTracks = getSubtitleTracks()
  const hasSubtitleTracks = subtitleTracks.length > 0
  const subtitleDelayLabel = `${subtitleDelaySeconds > 0 ? '+' : ''}${subtitleDelaySeconds.toFixed(1)}s`

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)

      // 全屏切换后同步一次真实播放状态，避免弹幕暂停状态卡住
      const videoElement = videoRef.current
      if (videoElement) {
        setIsPlaying(!videoElement.paused && !videoElement.ended)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 处理鼠标移动 - 全屏时自动隐藏/显示控制栏
  const handleMouseMove = () => {
    if (isFullscreen) {
      setShowControls(true)
      
      // 清除之前的定时器
      if (hideControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideControlsTimeoutRef.current)
      }
      
      // 3秒后自动隐藏控制栏
      hideControlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }
  }
  // 清理定时器
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideControlsTimeoutRef.current)
      }
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current)
      }
    }
  }, [])

  // 全屏状态变化时重置控制栏显示
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true)
      if (hideControlsTimeoutRef.current !== null) {
        window.clearTimeout(hideControlsTimeoutRef.current)
      }
    }
  }, [isFullscreen])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      const clickedSubtitleArea =
        !!target &&
        (subtitleMenuRef.current?.contains(target) ||
          subtitleButtonRef.current?.contains(target))
      const clickedAudioArea =
        !!target &&
        (audioMenuRef.current?.contains(target) ||
          audioButtonRef.current?.contains(target))

      if (showSubtitleMenu && !clickedSubtitleArea) {
        setShowSubtitleMenu(false)
      }

      if (showAudioMenu && !clickedAudioArea) {
        setShowAudioMenu(false)
      }
    }

    if (showSubtitleMenu || showAudioMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSubtitleMenu, showAudioMenu])

  // 切换弹幕显示
  const toggleDanmaku = () => {
    updateDanmakuSettings({ enabled: !danmakuSettings.enabled })
  }

  // 键盘快捷键
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true

      const tag = target.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditableTarget(e.target)) return

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          // 防止长按空格连续触发播放/暂停抖动
          if (e.repeat) return
          e.preventDefault()
          handlePlayButtonClick()
          return
        case 'ArrowLeft':
          e.preventDefault()
          handleSkipBackward()
          return
        case 'ArrowRight':
          e.preventDefault()
          handleSkipForward()
          return
        case 'ArrowUp':
          e.preventDefault()
          adjustVolume(5)
          return
        case 'ArrowDown':
          e.preventDefault()
          adjustVolume(-5)
          return
        case 'm':
        case 'M':
          if (e.repeat) return
          e.preventDefault()
          toggleMute()
          return
        case 'f':
        case 'F':
          if (e.repeat) return
          e.preventDefault()
          toggleFullscreen()
          return
        case 'd':
        case 'D':
          if (e.repeat) return
          e.preventDefault()
          toggleDanmaku()
          return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [volume, isMuted, currentTime, duration, danmakuSettings.enabled, isFullscreen])

  // 处理手动选择弹幕
  const handleSelectDanmaku = (episodeId: string, animeTitle: string, episodeTitle: string) => {
    console.log('手动选择弹幕:', { episodeId, animeTitle, episodeTitle })
    selectDanmaku(episodeId)
    setDanmakuSource({ animeTitle, episodeTitle })
  }

  // 获取弹幕来源显示文本
  const getDanmakuSourceText = () => {
    if (isMatching || isLoadingDanmaku) {
      return '加载中...'
    }
    if (!hasDanmaku) {
      return '点击搜索弹幕'
    }
    if (danmakuSource) {
      return `${danmakuSource.animeTitle} - ${danmakuSource.episodeTitle}`
    }
    // 自动匹配的情况，显示媒体项名称
    return mediaItem.seriesName || mediaItem.name
  }

  const windowedPlayerWidth = videoContainerSize.width > 0 ? `${videoContainerSize.width}px` : '100%'

  return (
    <div 
      ref={containerRef}
      className={`h-full flex items-center justify-center overflow-hidden relative ${
        isFullscreen ? '' : 'rounded-xl border'
      }`}
      onMouseMove={handleMouseMove}
      style={{
        background: isFullscreen
          ? '#000'
          : 'linear-gradient(135deg, rgba(37, 38, 41, 0.95) 0%, rgba(33, 34, 37, 0.95) 100%)',
        borderColor: isFullscreen ? 'transparent' : 'rgba(255, 255, 255, 0.12)',
        boxShadow: isFullscreen
          ? 'none'
          : '0 20px 60px rgba(0, 0, 0, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
        cursor: isFullscreen && !showControls ? 'none' : 'default',
        width: isFullscreen ? '100vw' : windowedPlayerWidth,
        maxWidth: '100%',
        borderRadius: isFullscreen ? '0' : undefined,
      }}
    >
      {/* 错误消息 */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-50 rounded-lg bg-red-900/90 p-4 text-white backdrop-blur-xl">
          <div className="font-medium">{error}</div>
          {technicalDetails && (
            <div className="mt-2 text-sm opacity-80">{technicalDetails}</div>
          )}
        </div>
      )}

      {/* 视频和控制栏的包装器 */}
      <div className="flex w-full min-w-0 flex-col">
      {/* 视频播放器容器 */}
      <div 
        className="relative bg-black overflow-hidden cursor-pointer flex-shrink-0 flex items-center justify-center" 
        style={{ 
          width: '100%',
          height: isFullscreen ? '100vh' : (videoContainerSize.height > 0 ? `${videoContainerSize.height}px` : 'auto'),
          borderRadius: isFullscreen ? '0' : '0.75rem 0.75rem 0 0'
        }}
        onClick={handleVideoAreaClick}
        onDoubleClick={handleVideoAreaDoubleClick}
      >
        {/* 原生视频元素 - 隐藏默认控制栏 */}
        <video
          ref={videoRef}
          className="video-js"
          playsInline
          controls={false}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isFullscreen ? 'contain' : (aspectRatioMode === 'auto' ? 'contain' : 'cover'),
            objectPosition: 'center center'
          }}
        />
        
        {/* 弹幕 Canvas - 覆盖在视频上方 */}
        {danmakuSettings.enabled && hasDanmaku && (
          <DanmakuCanvas
            key={`${aspectRatioMode}-${isFullscreen ? 'fs' : 'windowed'}`} // 全屏切换时重建弹幕层，避免状态残留
            currentTime={currentTime}
            isPaused={!isPlaying}
            videoRef={videoRef}
          />
        )}
        
        {/* 弹幕加载提示 */}
        {danmakuSettings.enabled && (isMatching || isLoadingDanmaku) && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-black/70 text-white/80 text-sm rounded-lg backdrop-blur-sm">
            正在加载弹幕...
          </div>
        )}
        
        {/* 无弹幕提示 */}
        {danmakuSettings.enabled && !isMatching && !isLoadingDanmaku && !hasDanmaku && (
          <div className="absolute top-4 right-4 px-3 py-2 bg-black/70 text-white/80 text-sm rounded-lg backdrop-blur-sm">
            暂无弹幕
          </div>
        )}
        
        {/* 中央播放按钮 - 只在暂停时显示 */}
        {!isPlaying && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePlayButtonClick()
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 z-30 hover:scale-110 active:scale-105 backdrop-blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, color-mix(in srgb, var(--theme-color) 75%, transparent) 0%, color-mix(in srgb, var(--theme-color) 50%, transparent) 50%, transparent 100%)',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--theme-color) 25%, transparent)',
              }}
            >
              <svg 
                className="w-8 h-8" 
                viewBox="0 0 24 24" 
                fill="none"
                style={{
                  filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.5)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3)) drop-shadow(0 -0.5px 0.5px rgba(255, 255, 255, 0.3)) drop-shadow(0 0.5px 0.5px rgba(255, 255, 255, 0.2))',
                }}
              >
                <path 
                  d="M8 5C8 3.9 9.12 3.16 10.05 3.72L19.05 9.72C19.89 10.23 19.89 11.51 19.05 12.02L10.05 18.02C9.12 18.58 8 17.84 8 16.74V5Z" 
                  fill="rgba(255, 255, 255, 0.9)"
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          </button>
        )}
      </div>
      {/* 统一控制栏 - 非全屏时在视频下方，全屏时覆盖在视频上方 */}
      <div 
        className={`w-full z-40 transition-all duration-300 ${
          isFullscreen 
            ? `absolute bottom-0 left-0 right-0 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}` 
            : 'border-t'
        }`}
        style={isFullscreen ? { 
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.7) 100%)',
          backdropFilter: 'blur(8px)'
        } : { 
          background: 'linear-gradient(to bottom, rgba(33, 34, 37, 0.98) 0%, rgba(37, 38, 41, 0.98) 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)'
        }}
      >
          {/* 进度条容器 - 全宽无内边距 */}
          <div className="px-4 pb-1 pt-2.5 xl:px-6 xl:pt-3">
            <div className="relative group">
              {/* 进度条背景 */}
              <div className="h-1.5 bg-white/[0.12] rounded-full overflow-visible relative">
                {/* 已播放进度 */}
                <div 
                  className="h-full rounded-full transition-all duration-200 relative overflow-visible pointer-events-none"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    background: 'color-mix(in srgb, var(--theme-color) 72%, black)',
                    boxShadow: '0 0 16px color-mix(in srgb, var(--theme-color) 28%, transparent)',
                  }}
                />
              </div>
              
              {/* 进度条滑块 - 使用原生样式的抓手 */}
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleProgressChange}
                onMouseDown={handleProgressMouseDown}
                onMouseUp={handleProgressMouseUp}
                onTouchStart={handleProgressMouseDown}
                onTouchEnd={handleProgressMouseUp}
                className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:cursor-grab
                  [&::-webkit-slider-thumb]:active:cursor-grabbing
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:duration-200
                  [&::-webkit-slider-thumb]:hover:scale-125
                  [&::-webkit-slider-thumb]:active:scale-110
                  [&::-moz-range-thumb]:appearance-none
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-white
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-grab
                  [&::-moz-range-thumb]:active:cursor-grabbing
                  [&::-moz-range-thumb]:transition-all
                  [&::-moz-range-thumb]:duration-200
                  [&::-moz-range-thumb]:hover:scale-125
                  [&::-moz-range-thumb]:active:scale-110"
                style={{ 
                  height: '24px', 
                  top: '-8px',
                  filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 0 2px rgba(255, 255, 255, 0.8))'
                }}
              />
            </div>
          </div>
          {/* 控制按钮栏 */}
          <div className="flex items-center px-4 py-2 xl:px-6 xl:py-2.5">
            <div className="flex w-full min-w-0 items-center justify-between gap-3 xl:gap-4">
              {/* 左侧控制按钮 */}
              <div className="flex min-w-0 items-center gap-2 xl:gap-3">
                {/* 上一集按钮 */}
                <button
                  onClick={onPlayPreviousEpisode}
                  disabled={!canPlayPreviousEpisode}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 xl:h-9 xl:w-9"
                  title="上一集"
                  aria-label="上一集"
                >
                  <SkipBack className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                </button>

                {/* 播放/暂停按钮 */}
                <button
                  onClick={handlePlayButtonClick}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-10 xl:w-10"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 text-white xl:h-6 xl:w-6" fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5 text-white xl:h-6 xl:w-6" fill="currentColor" />
                  )}
                </button>

                {/* 下一集按钮 */}
                <button
                  onClick={onPlayNextEpisode}
                  disabled={!canPlayNextEpisode}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100 xl:h-9 xl:w-9"
                  title="下一集"
                  aria-label="下一集"
                >
                  <SkipForward className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                </button>

                {/* 快退按钮 */}
                <button
                  onClick={handleSkipBackward}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  title="后退 10 秒"
                >
                  <RotateCcw className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                </button>

                {/* 快进按钮 */}
                <button
                  onClick={handleSkipForward}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  title="前进 10 秒"
                >
                  <RotateCw className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                </button>

                {/* 音量控制 */}
                <div className="flex items-center gap-2 group">
                  <button
                    onClick={toggleMute}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                    ) : (
                      <Volume2 className="h-4.5 w-4.5 text-white/85 xl:h-5 xl:w-5" />
                    )}
                  </button>

                  {/* 音量滑块 */}
                  <div className="flex items-center h-9 w-0 group-hover:w-24 transition-all duration-300 overflow-hidden">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer align-middle
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                      style={{
                        background: `linear-gradient(to right, 
                          color-mix(in srgb, var(--theme-color) 72%, black) 0%, 
                          color-mix(in srgb, var(--theme-color) 72%, black) ${volume}%, 
                          rgba(255, 255, 255, 0.15) ${volume}%, 
                          rgba(255, 255, 255, 0.15) 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* 时间显示 */}
                <div className="ml-1 flex-shrink-0 whitespace-nowrap text-[11px] font-medium tracking-tight tabular-nums text-white/80 xl:ml-2 xl:text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              {/* 右侧控制按钮 */}
              <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
                {/* 弹幕来源搜索框 - 弹幕关闭时禁用 */}
                <button
                  ref={danmakuSelectorButtonRef}
                  onClick={() => setShowDanmakuSelector(true)}
                  disabled={!danmakuSettings.enabled}
                  className={`flex h-8 min-w-[120px] max-w-[160px] items-center gap-2 rounded-full bg-white/[0.05] px-2.5 transition-all duration-200 hover:bg-white/[0.1] md:min-w-[140px] md:max-w-[200px] xl:h-9 xl:min-w-[180px] xl:max-w-[240px] xl:px-3 2xl:min-w-[200px] 2xl:max-w-[280px] ${
                    danmakuSettings.enabled ? 'text-white/85' : 'opacity-40 pointer-events-none'
                  }`}
                  title="点击选择弹幕来源"
                  aria-label="选择弹幕来源"
                >
                  <Search className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-xs xl:text-sm">
                    {getDanmakuSourceText()}
                  </span>
                </button>

                {/* 弹幕切换按钮 */}
                <button
                  onClick={toggleDanmaku}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  title={danmakuSettings.enabled ? '关闭弹幕' : '开启弹幕'}
                  aria-label={danmakuSettings.enabled ? '关闭弹幕' : '开启弹幕'}
                >
                  {danmakuSettings.enabled ? <DanmakuIcon /> : <DanmakuOffIcon />}
                </button>

                {/* 弹幕设置按钮 - 弹幕关闭时禁用 */}
                <div className={danmakuSettings.enabled ? '' : 'opacity-40 pointer-events-none'}>
                  <DanmakuSettings />
                </div>

                {/* 字幕切换按钮 */}
                <div className="relative">
                  <button
                    ref={subtitleButtonRef}
                    onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-95 xl:h-9 xl:w-9 ${
                      selectedSubtitleTrack >= 0 
                        ? 'bg-white/[0.2] text-white hover:bg-white/[0.25]' 
                        : 'hover:bg-white/[0.1] text-white/85'
                    }`}
                    title="字幕设置"
                    aria-label="字幕设置"
                  >
                    <Languages className="w-5 h-5" />
                  </button>

                  {/* 字幕选择菜单 */}
                  {showSubtitleMenu && (
                    <div 
                      ref={subtitleMenuRef}
                      className="absolute bottom-12 right-0 min-w-48 rounded-lg border shadow-2xl z-50"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowSubtitleMenu(false)
                            setShowSubtitleSearchDialog(true)
                          }}
                          className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.1] hover:text-white"
                        >
                          <span>搜索 ASSRT</span>
                          <Search className="h-4 w-4" />
                        </button>

                        <div
                          className="mb-2 rounded-md border px-3 py-2"
                          style={{
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                            <span>字幕延迟</span>
                            <span>{subtitleDelayLabel}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleSubtitleDelayAdjust(-0.5)}
                              disabled={!hasSubtitleTracks}
                              className="rounded-md bg-white/[0.08] px-2 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              -0.5s
                            </button>
                            <button
                              onClick={handleSubtitleDelayReset}
                              disabled={!hasSubtitleTracks}
                              className="rounded-md bg-white/[0.08] px-2 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              重置
                            </button>
                            <button
                              onClick={() => handleSubtitleDelayAdjust(0.5)}
                              disabled={!hasSubtitleTracks}
                              className="rounded-md bg-white/[0.08] px-2 py-1.5 text-xs text-white transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +0.5s
                            </button>
                          </div>
                        </div>

                        {/* 关闭字幕选项 */}
                        <button
                          onClick={() => handleSubtitleTrackChange(-1)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedSubtitleTrack === -1
                              ? 'bg-white/[0.15] text-white'
                              : 'text-white/80 hover:bg-white/[0.1] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>关闭字幕</span>
                            {selectedSubtitleTrack === -1 && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </button>

                        {/* 字幕轨道列表 */}
                        {subtitleTracks.map((track, index) => (
                          <button
                            key={track.index}
                            onClick={() => handleSubtitleTrackChange(track.index)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedSubtitleTrack === track.index
                                ? 'bg-white/[0.15] text-white'
                                : 'text-white/80 hover:bg-white/[0.1] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{formatSubtitleTrackLabel(track, index)}</span>
                              {selectedSubtitleTrack === track.index && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* 音轨切换按钮 */}
                <div className="relative">
                  <button
                    ref={audioButtonRef}
                    onClick={() => setShowAudioMenu(!showAudioMenu)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/85 transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                    title="音轨设置"
                    aria-label="音轨设置"
                  >
                    <AudioLines className="w-5 h-5" />
                  </button>

                  {/* 音轨选择菜单 */}
                  {showAudioMenu && (
                    <div 
                      ref={audioMenuRef}
                      className="absolute bottom-12 right-0 min-w-48 rounded-lg border shadow-2xl z-50"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div className="p-2">
                        {/* 音轨列表 */}
                        {getAudioTracks().map((track, index) => (
                          <button
                            key={track.index}
                            onClick={() => handleAudioTrackChange(track.index)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedAudioTrack === track.index
                                ? 'bg-white/[0.15] text-white'
                                : 'text-white/80 hover:bg-white/[0.1] hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{formatAudioTrackLabel(track, index)}</span>
                              {selectedAudioTrack === track.index && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 宽高比切换按钮 */}
                <button
                  onClick={toggleAspectRatio}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  title={`宽高比: ${aspectRatioMode === 'auto' ? '自动适配' : '16:9'}`}
                >
                  {aspectRatioMode === 'auto' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/85"
                    >
                      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/85"
                    >
                      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <path d="M7 12V9h3m7 3v3h-3"/>
                    </svg>
                  )}
                </button>

                {/* 设置按钮 */}
                <button
                  className="hidden h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:flex xl:h-9 xl:w-9"
                  title="设置"
                >
                  <Settings className="w-5 h-5 text-white/85" />
                </button>

                {/* 全屏按钮 */}
                <button
                  onClick={toggleFullscreen}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-105 hover:bg-white/[0.1] active:scale-95 xl:h-9 xl:w-9"
                  title={isFullscreen ? '退出全屏' : '全屏'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5 text-white/85" />
                  ) : (
                    <Maximize className="w-5 h-5 text-white/85" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 弹幕选择器对话框 */}
      <DanmakuSelector
        open={showDanmakuSelector}
        onClose={() => setShowDanmakuSelector(false)}
        onSelect={handleSelectDanmaku}
        defaultKeyword={mediaItem.seriesName || mediaItem.name}
        triggerRef={danmakuSelectorButtonRef}
      />

      <OpenSubtitlesSearchDialog
        open={showSubtitleSearchDialog}
        onOpenChange={setShowSubtitleSearchDialog}
        mediaItem={mediaItem}
        subtitleLanguagePreference={user?.configuration.subtitleLanguagePreference}
        onApplySubtitle={handleApplyOnlineSubtitle}
      />
    </div>
  )
}
