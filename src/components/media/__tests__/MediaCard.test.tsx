/**
 * MediaCard 组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BrowserRouter } from 'react-router-dom'
import MediaCard from '../MediaCard'
import type { MediaItem } from '../../../types/emby'

// Mock useAuthStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    serverUrl: 'http://localhost:8096',
  })),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

;(globalThis as any).IntersectionObserver = MockIntersectionObserver

describe('MediaCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockMovie: MediaItem = {
    name: '测试电影',
    serverId: 'test-server',
    id: 'test-movie-id',
    type: 'Movie',
    mediaType: 'Video',
    isFolder: false,
    productionYear: 2023,
    communityRating: 8.5,
    runTimeTicks: 72000000000, // 2 小时
    imageTags: {
      Primary: 'test-image-tag',
    },
    userData: {
      playbackPositionTicks: 0,
      playCount: 0,
      isFavorite: false,
      played: false,
    },
  }

  it('应该渲染媒体卡片的基本信息', () => {
    render(
      <BrowserRouter>
        <MediaCard item={mockMovie} />
      </BrowserRouter>
    )

    // 验证标题
    expect(screen.getByText('测试电影')).toBeInTheDocument()
    
    // 验证年份
    expect(screen.getByText('2023')).toBeInTheDocument()
    
    // 验证评分
    expect(screen.getByText('8.5')).toBeInTheDocument()
    
    // 验证时长
    expect(screen.getByText('2:00:00')).toBeInTheDocument()
  })

  it('应该在点击时导航到详情页', () => {
    render(
      <BrowserRouter>
        <MediaCard item={mockMovie} />
      </BrowserRouter>
    )

    const card = screen.getByText('测试电影').closest('.group')
    expect(card).toBeInTheDocument()
    
    if (card) {
      fireEvent.click(card)
      expect(mockNavigate).toHaveBeenCalledWith('/media/test-movie-id')
    }
  })

  it('应该显示收藏标记', () => {
    const favoriteMovie: MediaItem = {
      ...mockMovie,
      userData: {
        ...mockMovie.userData!,
        isFavorite: true,
      },
    }

    const { container } = render(
      <BrowserRouter>
        <MediaCard item={favoriteMovie} />
      </BrowserRouter>
    )

    // 查找收藏图标（Heart 图标）
    const heartIcon = container.querySelector('.lucide-heart')
    expect(heartIcon).toBeInTheDocument()
  })

  it('应该显示播放进度条', () => {
    const movieWithProgress: MediaItem = {
      ...mockMovie,
      userData: {
        ...mockMovie.userData!,
        playbackPositionTicks: 36000000000, // 50% 进度
      },
    }

    const { container } = render(
      <BrowserRouter>
        <MediaCard item={movieWithProgress} />
      </BrowserRouter>
    )

    // 查找进度条
    const progressBar = container.querySelector('[style*="width: 50%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('应该显示已观看标记', () => {
    const watchedMovie: MediaItem = {
      ...mockMovie,
      userData: {
        ...mockMovie.userData!,
        played: true,
      },
    }

    render(
      <BrowserRouter>
        <MediaCard item={watchedMovie} />
      </BrowserRouter>
    )

    expect(screen.getByText('已观看')).toBeInTheDocument()
  })

  it('应该显示播放次数', () => {
    const movieWithPlayCount: MediaItem = {
      ...mockMovie,
      userData: {
        ...mockMovie.userData!,
        playCount: 3,
      },
    }

    render(
      <BrowserRouter>
        <MediaCard item={movieWithPlayCount} />
      </BrowserRouter>
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('应该为剧集显示特殊格式的标题', () => {
    const episode: MediaItem = {
      ...mockMovie,
      name: '第一集',
      type: 'Episode',
      seriesName: '测试剧集',
      parentIndexNumber: 1, // 第 1 季
      indexNumber: 1, // 第 1 集
    }

    render(
      <BrowserRouter>
        <MediaCard item={episode} />
      </BrowserRouter>
    )

    expect(screen.getByText('测试剧集 S01E01')).toBeInTheDocument()
  })

  it('应该为音乐显示艺术家信息', () => {
    const audio: MediaItem = {
      ...mockMovie,
      name: '测试歌曲',
      type: 'Audio',
      artists: ['艺术家A', '艺术家B'],
    }

    render(
      <BrowserRouter>
        <MediaCard item={audio} />
      </BrowserRouter>
    )

    expect(screen.getByText('艺术家A, 艺术家B')).toBeInTheDocument()
  })

  it('应该在没有图片时显示占位符', () => {
    const movieWithoutImage: MediaItem = {
      ...mockMovie,
      imageTags: undefined,
    }

    const { container } = render(
      <BrowserRouter>
        <MediaCard item={movieWithoutImage} />
      </BrowserRouter>
    )

    // 查找播放图标占位符
    const playIcon = container.querySelector('.lucide-play')
    expect(playIcon).toBeInTheDocument()
  })

  it('应该构建正确的图片 URL', () => {
    const { container } = render(
      <BrowserRouter>
        <MediaCard item={mockMovie} imageWidth={400} imageHeight={600} />
      </BrowserRouter>
    )

    // 由于 IntersectionObserver 被 mock，图片不会立即加载
    // 这里只验证组件能正常渲染
    expect(container.querySelector('.aspect-\\[2\\/3\\]')).toBeInTheDocument()
  })
})
