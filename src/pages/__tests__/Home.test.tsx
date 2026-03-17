/**
 * Home 组件测试
 * 
 * 测试主页组件的基本功能
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../Home'
import { useAuthStore } from '@/stores/authStore'

// Mock 依赖
vi.mock('@/stores/authStore')
vi.mock('@/services/api/embyClient', () => ({
  createEmbyClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
  })),
}))
vi.mock('@/services/media/mediaService', () => ({
  createMediaService: vi.fn(() => ({
    getViews: vi.fn(),
    getItems: vi.fn(),
    getLatestItems: vi.fn(),
  })),
}))

/**
 * 测试辅助函数：渲染组件
 */
function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Home 组件', () => {
  it('应当在未认证时显示初始化状态', () => {
    // Mock authStore 返回未认证状态
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      serverUrl: null,
      accessToken: null,
      deviceInfo: {
        client: 'TestClient',
        device: 'TestDevice',
        deviceId: 'test-device-id',
        version: '1.0.0',
      },
      isAuthenticated: false,
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('初始化中...')).toBeInTheDocument()
  })

  it('应当在已认证时渲染页面标题', () => {
    // Mock authStore 返回已认证状态
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: 'user-123',
        name: '测试用户',
        serverId: 'server-123',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      },
      serverUrl: 'http://localhost:8096',
      accessToken: 'test-token',
      deviceInfo: {
        client: 'TestClient',
        device: 'TestDevice',
        deviceId: 'test-device-id',
        version: '1.0.0',
      },
      isAuthenticated: true,
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('欢迎回来')).toBeInTheDocument()
    expect(screen.getByText(/测试用户，探索您的媒体库/)).toBeInTheDocument()
    // 使用 getAllByText 因为"媒体库"在侧边栏和主内容区都出现
    expect(screen.getAllByText('媒体库').length).toBeGreaterThan(0)
    expect(screen.getByText('最新添加')).toBeInTheDocument()
  })
})
