/**
 * MediaGrid 组件单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import MediaGrid from '../MediaGrid'
import type { MediaItem } from '@/types/emby'

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

global.IntersectionObserver = MockIntersectionObserver as any

// Mock react-window
vi.mock('react-window', () => ({
  Grid: ({ children, columnCount, rowCount, itemData }: any) => {
    // 简单渲染所有单元格用于测试
    const cells = []
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < columnCount; col++) {
        cells.push(
          children({
            columnIndex: col,
            rowIndex: row,
            style: {},
            data: itemData, // 传递 itemData 作为 data 参数
          })
        )
      }
    }
    return <div data-testid="virtual-grid">{cells}</div>
  },
}))

// Mock zustand store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    serverUrl: 'http://localhost:8096',
    user: { id: 'user1', name: 'Test User' },
  }),
}))

/**
 * 创建测试用媒体项
 */
function createMockItem(id: string, overrides?: Partial<MediaItem>): MediaItem {
  return {
    id,
    name: `Test Movie ${id}`,
    serverId: 'server1',
    type: 'Movie',
    isFolder: false,
    productionYear: 2023,
    communityRating: 8.5,
    runTimeTicks: 72000000000, // 2 小时
    imageTags: {
      Primary: 'tag123',
    },
    userData: {
      playbackPositionTicks: 0,
      playCount: 0,
      isFavorite: false,
      played: false,
    },
    ...overrides,
  }
}

/**
 * 渲染组件的辅助函数
 */
function renderMediaGrid(props: Partial<React.ComponentProps<typeof MediaGrid>> = {}) {
  const defaultProps = {
    items: [],
    isLoading: false,
  }

  return render(
    <BrowserRouter>
      <MediaGrid {...defaultProps} {...props} />
    </BrowserRouter>
  )
}

describe('MediaGrid', () => {
  beforeEach(() => {
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    })
  })

  describe('加载状态', () => {
    it('应当在加载时显示骨架屏', () => {
      renderMediaGrid({ isLoading: true })
      
      // 骨架屏应该有动画类
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('应当显示多个骨架屏卡片', () => {
      renderMediaGrid({ isLoading: true })
      
      // 应该显示至少 6 个骨架屏（2 行 x 3 列）
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('空状态', () => {
    it('应当在没有项目时显示空状态', () => {
      renderMediaGrid({ items: [] })
      
      expect(screen.getByText('暂无媒体内容')).toBeInTheDocument()
      expect(screen.getByText('此分类下没有找到任何媒体项')).toBeInTheDocument()
    })

    it('空状态应该包含图标', () => {
      renderMediaGrid({ items: [] })
      
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('标准网格布局', () => {
    it('应当渲染少量项目（<= 50）', () => {
      const items = Array.from({ length: 10 }, (_, i) => 
        createMockItem(`item${i}`)
      )
      
      renderMediaGrid({ items })
      
      // 应该渲染所有项目
      items.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument()
      })
    })

    it('应当使用响应式网格类', () => {
      const items = [createMockItem('1')]
      
      const { container } = renderMediaGrid({ items })
      
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('md:grid-cols-4')
      expect(grid).toHaveClass('xl:grid-cols-6')
    })

    it('应当应用自定义类名', () => {
      const items = [createMockItem('1')]
      
      const { container } = renderMediaGrid({ 
        items, 
        className: 'custom-class' 
      })
      
      const grid = container.querySelector('.custom-class')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('虚拟滚动', () => {
    it('应当对超过 50 项的列表启用虚拟滚动', () => {
      const items = Array.from({ length: 60 }, (_, i) => 
        createMockItem(`item${i}`)
      )
      
      renderMediaGrid({ items })
      
      // 应该渲染虚拟网格
      expect(screen.getByTestId('virtual-grid')).toBeInTheDocument()
    })

    it('应当对 50 项或更少使用标准网格', () => {
      const items = Array.from({ length: 50 }, (_, i) => 
        createMockItem(`item${i}`)
      )
      
      renderMediaGrid({ items })
      
      // 不应该有虚拟网格
      expect(screen.queryByTestId('virtual-grid')).not.toBeInTheDocument()
      
      // 应该有标准网格
      const grid = document.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('响应式布局', () => {
    it('应当在移动设备上使用 1 列', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375, // 移动设备宽度
      })

      const items = [createMockItem('1')]
      const { container } = renderMediaGrid({ items })
      
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
    })

    it('应当在小屏幕上使用 2 列', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 640, // sm 断点
      })

      const items = [createMockItem('1')]
      const { container } = renderMediaGrid({ items })
      
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('sm:grid-cols-2')
    })

    it('应当在中等屏幕上使用 4 列', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 768, // md 断点
      })

      const items = [createMockItem('1')]
      const { container } = renderMediaGrid({ items })
      
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('md:grid-cols-4')
    })

    it('应当在大屏幕上使用 6 列', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1536, // xl 断点
      })

      const items = [createMockItem('1')]
      const { container } = renderMediaGrid({ items })
      
      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('xl:grid-cols-6')
    })
  })

  describe('MediaCard 集成', () => {
    it('应当传递图片尺寸参数到 MediaCard', () => {
      const items = [createMockItem('1')]
      
      renderMediaGrid({ 
        items,
        imageWidth: 400,
        imageHeight: 600,
      })
      
      // MediaCard 应该被渲染
      expect(screen.getByText(items[0].name)).toBeInTheDocument()
    })

    it('应当为每个项目渲染 MediaCard', () => {
      const items = [
        createMockItem('1', { name: 'Movie 1' }),
        createMockItem('2', { name: 'Movie 2' }),
        createMockItem('3', { name: 'Movie 3' }),
      ]
      
      renderMediaGrid({ items })
      
      expect(screen.getByText('Movie 1')).toBeInTheDocument()
      expect(screen.getByText('Movie 2')).toBeInTheDocument()
      expect(screen.getByText('Movie 3')).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应当处理恰好 50 项的列表', () => {
      const items = Array.from({ length: 50 }, (_, i) => 
        createMockItem(`item${i}`)
      )
      
      renderMediaGrid({ items })
      
      // 应该使用标准网格（不是虚拟滚动）
      expect(screen.queryByTestId('virtual-grid')).not.toBeInTheDocument()
    })

    it('应当处理恰好 51 项的列表', () => {
      const items = Array.from({ length: 51 }, (_, i) => 
        createMockItem(`item${i}`)
      )
      
      renderMediaGrid({ items })
      
      // 应该使用虚拟滚动
      expect(screen.getByTestId('virtual-grid')).toBeInTheDocument()
    })

    it('应当处理单个项目', () => {
      const items = [createMockItem('1')]
      
      renderMediaGrid({ items })
      
      expect(screen.getByText(items[0].name)).toBeInTheDocument()
    })
  })
})
