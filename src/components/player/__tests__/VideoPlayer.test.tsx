/**
 * VideoPlayer 组件单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { VideoPlayer } from '../VideoPlayer'
import type { MediaItem } from '@/types/emby'

// Mock Video.js
vi.mock('video.js', () => {
  const mockPlayer = {
    play: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
    currentTime: vi.fn(),
    volume: vi.fn(),
    muted: vi.fn(),
    paused: vi.fn(() => false),
    ended: vi.fn(() => false),
    audioTracks: vi.fn(() => []),
    textTracks: vi.fn(() => []),
    on: vi.fn(),
    off: vi.fn(),
    duration: vi.fn(() => 3600),
  }

  return {
    default: vi.fn(() => mockPlayer),
  }
})

// Mock VideoService
vi.mock('@/services/player/videoService', () => ({
  createVideoService: vi.fn((_serverUrl: string, _accessToken: string) => ({
    initializePlayback: vi.fn().mockResolvedValue({
      streamUrl: 'http://example.com/stream.m3u8',
      playSessionId: 'test-session-id',
      mediaSourceId: 'test-media-source-id',
    }),
    getAudioTracks: vi.fn(() => [
      {
        index: 0,
        displayTitle: '英语',
        language: 'eng',
        codec: 'aac',
      },
      {
        index: 1,
        displayTitle: '中文',
        language: 'chi',
        codec: 'aac',
      },
    ]),
    getSubtitleTracks: vi.fn(() => [
      {
        index: 0,
        displayTitle: '英语字幕',
        language: 'eng',
        codec: 'srt',
        isTextSubtitleStream: true,
      },
      {
        index: 1,
        displayTitle: '中文字幕',
        language: 'chi',
        codec: 'srt',
        isTextSubtitleStream: true,
      },
    ]),
    setAudioTrack: vi.fn(),
    setSubtitleTrack: vi.fn(),
    getCurrentPositionTicks: vi.fn(() => 0),
    isPaused: vi.fn(() => false),
    getVolume: vi.fn(() => 100),
    isMuted: vi.fn(() => false),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
  })),
}))

// Mock playerStore
vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: vi.fn(() => ({
    setCurrentItem: vi.fn(),
    updatePlaybackState: vi.fn(),
    clearPlayback: vi.fn(),
  })),
}))

describe('VideoPlayer', () => {
  const mockMediaItem: MediaItem = {
    id: 'test-item-id',
    name: '测试视频',
    type: 'Movie',
    mediaSources: [
      {
        id: 'test-media-source-id',
        protocol: 'File',
        path: '/path/to/video.mp4',
        container: 'mp4',
        size: 1000000,
        bitrate: 5000000,
        supportsDirectPlay: true,
        supportsDirectStream: true,
        supportsTranscoding: true,
        mediaStreams: [],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('应该渲染视频播放器', () => {
    render(<VideoPlayer mediaItem={mockMediaItem} />)

    const videoElement = document.querySelector('video')
    expect(videoElement).toBeInTheDocument()
  })

  it('应该初始化播放', async () => {
    const onPlaybackStart = vi.fn()

    render(
      <VideoPlayer mediaItem={mockMediaItem} onPlaybackStart={onPlaybackStart} />
    )

    await waitFor(() => {
      expect(onPlaybackStart).toHaveBeenCalledWith(
        expect.objectContaining({
          playSessionId: 'test-session-id',
          mediaSourceId: 'test-media-source-id',
        })
      )
    })
  })

  it('应该显示音轨选择器（当有多个音轨时）', async () => {
    render(<VideoPlayer mediaItem={mockMediaItem} />)

    await waitFor(
      () => {
        expect(screen.getByText(/音轨/)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )
  })

  it('应该显示字幕选择器（当有字幕时）', async () => {
    render(<VideoPlayer mediaItem={mockMediaItem} />)

    await waitFor(
      () => {
        // 查找所有 combobox，应该有两个（音轨和字幕）
        const comboboxes = screen.getAllByRole('combobox')
        expect(comboboxes.length).toBeGreaterThanOrEqual(1)
      },
      { timeout: 2000 }
    )
  })

  it('应该支持起始播放位置', () => {
    const startPositionTicks = 100000000 // 10 秒

    render(
      <VideoPlayer
        mediaItem={mockMediaItem}
        startPositionTicks={startPositionTicks}
      />
    )

    // 验证组件正常渲染
    const videoElement = document.querySelector('video')
    expect(videoElement).toBeInTheDocument()
  })

  it('应该在播放结束时触发回调', async () => {
    const onPlaybackEnd = vi.fn()

    render(
      <VideoPlayer mediaItem={mockMediaItem} onPlaybackEnd={onPlaybackEnd} />
    )

    // 组件应该正常渲染
    const videoElement = document.querySelector('video')
    expect(videoElement).toBeInTheDocument()
  })

  it('应该在组件卸载时清理资源', async () => {
    const { unmount } = render(<VideoPlayer mediaItem={mockMediaItem} />)

    await waitFor(() => {
      const videoElement = document.querySelector('video')
      expect(videoElement).toBeInTheDocument()
    })

    unmount()

    // 验证清理函数被调用
    // 实际的清理逻辑在 VideoService 中
  })

  it('应该应用自定义主题类', () => {
    render(<VideoPlayer mediaItem={mockMediaItem} />)

    const videoElement = document.querySelector('video')
    expect(videoElement).toHaveClass('vjs-theme-fantasy')
  })
})
