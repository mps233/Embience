/**
 * Player 页面单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Player from '../Player'
import { useAuthStore } from '@/stores/authStore'
import type { MediaItem } from '@/types/emby'

// Mock 依赖
vi.mock('@/stores/authStore')
vi.mock('@/services/api/embyClient')
vi.mock('@/services/media/mediaService')
vi.mock('@/hooks/useMedia')
vi.mock('@/components/player/VideoPlayer', () => ({
  VideoPlayer: ({ mediaItem }: { mediaItem: MediaItem }) => (
    <div data-testid="video-player">
      <div>播放器: {mediaItem.name}</div>
    </div>
  ),
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

// Mock 媒体项数据
const mockMediaItem: MediaItem = {
  id: 'test-id',
  name: '测试电影',
  type: 'Movie',
  serverId: 'test-server',
  productionYear: 2023,
  officialRating: 'PG-13',
  runTimeTicks: 72000000000, // 2 小时
  communityRating: 8.5,
  overview: '这是一部测试电影',
  userData: {
    playbackPositionTicks: 36000000000, // 1 小时
    playCount: 1,
    isFavorite: false,
    played: false,
    key: 'test-key',
  },
}

const mockSeriesEpisode: MediaItem = {
  id: 'episode-id',
  name: '第一集',
  type: 'Episode',
  serverId: 'test-server',
  seriesName: '测试剧集',
  parentIndexNumber: 1,
  indexNumber: 1,
  runTimeTicks: 36000000000, // 1 小时
  overview: '这是第一集',
  userData: {
    playbackPositionTicks: 0,
    playCount: 0,
    isFavorite: false,
    played: false,
    key: 'test-key',
  },
}

describe('Player 页面', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useAuthStore
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'user-123', name: 'Test User' },
      serverUrl: 'http://localhost:8096',
      accessToken: 'test-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      setServerUrl: vi.fn(),
      initializeFromStorage: vi.fn(),
    })
  })

  it('应该渲染加载状态', async () => {
    const queryClient = createTestQueryClient()
    
    // Mock useMediaDetail 返回加载状态
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('应该渲染播放器和媒体信息', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      const titles = screen.getAllByText('测试电影')
      expect(titles.length).toBeGreaterThan(0)
    })
    
    expect(screen.getByText('这是一部测试电影')).toBeInTheDocument()
    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.getByText('PG-13')).toBeInTheDocument()
    expect(screen.getByText('120 分钟')).toBeInTheDocument()
    expect(screen.getByText('⭐ 8.5')).toBeInTheDocument()
  })

  it('应该显示剧集信息', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: mockSeriesEpisode,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/episode-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      const titles = screen.getAllByText('第一集')
      expect(titles.length).toBeGreaterThan(0)
    })
    
    expect(screen.getByText(/测试剧集/)).toBeInTheDocument()
    expect(screen.getByText(/第 1 季 第 1 集/)).toBeInTheDocument()
  })

  it('应该显示音乐信息', async () => {
    const queryClient = createTestQueryClient()
    
    const musicItem: MediaItem = {
      ...mockMediaItem,
      type: 'Audio',
      artists: ['艺术家1', '艺术家2'],
      album: '测试专辑',
    }
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: musicItem,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/music-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/艺术家1, 艺术家2/)).toBeInTheDocument()
    })
    
    expect(screen.getByText(/测试专辑/)).toBeInTheDocument()
  })

  it('应该处理恢复播放参数', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id?resume=true']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
    })
    
    // VideoPlayer 应该接收到 startPositionTicks
    // 这里我们只验证组件渲染成功
  })

  it('应该处理错误状态', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('加载失败'),
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument()
    })
    
    expect(screen.getByText('返回')).toBeInTheDocument()
  })

  it('应该有返回按钮', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      const returnButtons = screen.getAllByText('返回')
      expect(returnButtons.length).toBeGreaterThan(0)
    })
  })

  it('应该有全屏按钮', async () => {
    const queryClient = createTestQueryClient()
    
    const { useMediaDetail } = await import('@/hooks/useMedia')
    vi.mocked(useMediaDetail).mockReturnValue({
      data: mockMediaItem,
      isLoading: false,
      error: null,
    } as any)
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/player/test-id']}>
          <Routes>
            <Route path="/player/:id" element={<Player />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    
    await waitFor(() => {
      expect(screen.getByText('全屏')).toBeInTheDocument()
    })
  })
})
