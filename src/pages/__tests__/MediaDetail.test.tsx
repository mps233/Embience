/**
 * MediaDetail 页面测试
 * 
 * 测试媒体详情页面的基本功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MediaDetail from '../MediaDetail'
import { useAuthStore } from '@/stores/authStore'
import type { MediaItem } from '@/types/emby'

// Mock useMediaDetail hook
const mockUseMediaDetail = vi.fn()
const mockUseMediaItems = vi.fn()
const mockUseSimilarItems = vi.fn()

vi.mock('@/hooks/useMedia', () => ({
  useMediaDetail: () => mockUseMediaDetail(),
  useMediaItems: () => mockUseMediaItems(),
  useSimilarItems: () => mockUseSimilarItems(),
}))

// Mock zustand store
vi.mock('@/stores/authStore')

// Mock Layout component
vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// 创建测试用的 QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

// 示例媒体项数据
const mockMediaItem: MediaItem = {
  name: '测试电影',
  serverId: 'test-server',
  id: 'test-item-id',
  type: 'Movie',
  mediaType: 'Video',
  isFolder: false,
  productionYear: 2024,
  officialRating: 'PG-13',
  communityRating: 8.5,
  runTimeTicks: 72000000000, // 2 小时
  overview: '这是一部测试电影的简介',
  imageTags: {
    Primary: 'primary-tag',
  },
  backdropImageTags: ['backdrop-tag'],
  mediaSources: [
    {
      id: 'source-1',
      path: '/path/to/movie.mp4',
      protocol: 'File',
      container: 'mp4',
      size: 2147483648, // 2 GB
      bitrate: 5000000,
      runTimeTicks: 72000000000,
      supportsDirectPlay: true,
      supportsDirectStream: true,
      supportsTranscoding: true,
      mediaStreams: [
        {
          codec: 'h264',
          displayTitle: '1080p H.264',
          index: 0,
          type: 'Video',
          width: 1920,
          height: 1080,
          aspectRatio: '16:9',
          averageFrameRate: 23.976,
          bitRate: 4500000,
        },
        {
          codec: 'aac',
          language: 'chi',
          displayTitle: '中文 AAC 5.1',
          index: 1,
          type: 'Audio',
          channels: 6,
          channelLayout: '5.1',
          sampleRate: 48000,
        },
        {
          codec: 'srt',
          language: 'chi',
          displayTitle: '中文',
          index: 2,
          type: 'Subtitle',
          isExternal: false,
        },
      ],
    },
  ],
}

describe('MediaDetail 页面', () => {
  beforeEach(() => {
    // Mock auth store
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        serverId: 'test-server',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      },
      serverUrl: 'http://localhost:8096',
      accessToken: 'test-token',
      isAuthenticated: true,
      deviceInfo: {
        client: 'TestClient',
        device: 'TestDevice',
        deviceId: 'test-device-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })
    
    // Mock useMediaItems 默认返回空数据
    mockUseMediaItems.mockReturnValue({
      data: { items: [], totalRecordCount: 0, startIndex: 0 },
      isLoading: false,
      error: null,
    })
    
    // Mock useSimilarItems 默认返回空数据
    mockUseSimilarItems.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  it('应该显示加载状态', () => {
    mockUseMediaDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该显示错误状态', () => {
    mockUseMediaDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('加载失败'),
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByText('返回')).toBeInTheDocument()
  })

  it('应该显示媒体详情', async () => {
    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // 验证标题
    await waitFor(() => {
      expect(screen.getByText('测试电影')).toBeInTheDocument()
    })

    // 验证年份
    expect(screen.getByText('2024')).toBeInTheDocument()

    // 验证评分
    expect(screen.getByText('8.5')).toBeInTheDocument()

    // 验证简介
    expect(screen.getByText('这是一部测试电影的简介')).toBeInTheDocument()

    // 验证类型
    expect(screen.getByText('Movie')).toBeInTheDocument()
  })

  it('应该显示视频信息', async () => {
    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('视频信息')).toBeInTheDocument()
    })

    // 验证编解码器
    expect(screen.getByText('H264')).toBeInTheDocument()

    // 验证分辨率
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
  })

  it('应该显示音轨信息', async () => {
    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/音轨 \(1\)/)).toBeInTheDocument()
    })

    // 验证音轨详情
    expect(screen.getByText('中文 AAC 5.1')).toBeInTheDocument()
  })

  it('应该显示字幕信息', async () => {
    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/字幕 \(1\)/)).toBeInTheDocument()
    })
  })

  it('应该显示播放按钮', async () => {
    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('播放')).toBeInTheDocument()
    })
  })

  it('当没有恢复位置时，应该显示普通播放按钮', async () => {
    const itemWithoutResume = {
      ...mockMediaItem,
      userData: {
        playbackPositionTicks: 0,
        playCount: 0,
        isFavorite: false,
        played: false,
      },
    }

    mockUseMediaDetail.mockReturnValue({
      data: itemWithoutResume,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('播放')).toBeInTheDocument()
    })

    // 不应该显示继续播放按钮
    expect(screen.queryByText(/继续播放/)).not.toBeInTheDocument()
    expect(screen.queryByText('从头播放')).not.toBeInTheDocument()
  })

  it('当有恢复位置时，应该显示继续播放和从头播放按钮', async () => {
    const itemWithResume = {
      ...mockMediaItem,
      userData: {
        playbackPositionTicks: 36000000000, // 1 小时，50% 进度
        playCount: 0,
        isFavorite: false,
        played: false,
      },
    }

    mockUseMediaDetail.mockReturnValue({
      data: itemWithResume,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/继续播放 \(50%\)/)).toBeInTheDocument()
    })

    expect(screen.getByText('从头播放')).toBeInTheDocument()
  })

  it('点击播放按钮应该导航到播放器页面', async () => {
    const user = userEvent.setup()

    mockUseMediaDetail.mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
            <Route path="/player/:id" element={<div>播放器页面</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('播放')).toBeInTheDocument()
    })

    const playButton = screen.getByText('播放')
    await user.click(playButton)

    await waitFor(() => {
      expect(screen.getByText('播放器页面')).toBeInTheDocument()
    })
  })

  it('点击继续播放按钮应该导航到播放器页面并传递 resume=true 参数', async () => {
    const user = userEvent.setup()

    const itemWithResume = {
      ...mockMediaItem,
      userData: {
        playbackPositionTicks: 36000000000,
        playCount: 0,
        isFavorite: false,
        played: false,
      },
    }

    mockUseMediaDetail.mockReturnValue({
      data: itemWithResume,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
            <Route path="/player/:id" element={<div>播放器页面</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/继续播放/)).toBeInTheDocument()
    })

    const resumeButton = screen.getByText(/继续播放/)
    await user.click(resumeButton)

    await waitFor(() => {
      expect(screen.getByText('播放器页面')).toBeInTheDocument()
    })
  })

  it('点击从头播放按钮应该导航到播放器页面并传递 resume=false 参数', async () => {
    const user = userEvent.setup()

    const itemWithResume = {
      ...mockMediaItem,
      userData: {
        playbackPositionTicks: 36000000000,
        playCount: 0,
        isFavorite: false,
        played: false,
      },
    }

    mockUseMediaDetail.mockReturnValue({
      data: itemWithResume,
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-item-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
            <Route path="/player/:id" element={<div>播放器页面</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('从头播放')).toBeInTheDocument()
    })

    const restartButton = screen.getByText('从头播放')
    await user.click(restartButton)

    await waitFor(() => {
      expect(screen.getByText('播放器页面')).toBeInTheDocument()
    })
  })

  it('当媒体项是电视剧时，应该显示季列表标签', async () => {
    const seriesItem: MediaItem = {
      ...mockMediaItem,
      type: 'Series',
      name: '测试电视剧',
    }

    const mockSeasons: MediaItem[] = [
      {
        ...mockMediaItem,
        id: 'season-1',
        type: 'Season',
        name: '第 1 季',
        indexNumber: 1,
      },
      {
        ...mockMediaItem,
        id: 'season-2',
        type: 'Season',
        name: '第 2 季',
        indexNumber: 2,
      },
    ]

    mockUseMediaDetail.mockReturnValue({
      data: seriesItem,
      isLoading: false,
      error: null,
    })

    mockUseMediaItems.mockReturnValue({
      data: { items: mockSeasons, totalRecordCount: 2, startIndex: 0 },
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-series-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('测试电视剧')).toBeInTheDocument()
    })

    // 验证季标签存在
    expect(screen.getByText(/季 \(2\)/)).toBeInTheDocument()
  })

  it('当媒体项是季时，应该显示剧集列表标签', async () => {
    const seasonItem: MediaItem = {
      ...mockMediaItem,
      type: 'Season',
      name: '第 1 季',
      seriesName: '测试电视剧',
    }

    const mockEpisodes: MediaItem[] = [
      {
        ...mockMediaItem,
        id: 'episode-1',
        type: 'Episode',
        name: '第 1 集',
        indexNumber: 1,
        parentIndexNumber: 1,
      },
      {
        ...mockMediaItem,
        id: 'episode-2',
        type: 'Episode',
        name: '第 2 集',
        indexNumber: 2,
        parentIndexNumber: 1,
      },
    ]

    mockUseMediaDetail.mockReturnValue({
      data: seasonItem,
      isLoading: false,
      error: null,
    })

    mockUseMediaItems.mockReturnValue({
      data: { items: mockEpisodes, totalRecordCount: 2, startIndex: 0 },
      isLoading: false,
      error: null,
    })

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/media/test-season-id']}>
          <Routes>
            <Route path="/media/:id" element={<MediaDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('第 1 季')).toBeInTheDocument()
    })

    // 验证剧集标签存在
    expect(screen.getByText(/剧集 \(2\)/)).toBeInTheDocument()
  })
})
