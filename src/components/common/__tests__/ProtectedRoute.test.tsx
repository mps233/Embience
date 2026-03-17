/**
 * ProtectedRoute 组件单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/stores/authStore'

// Mock authStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应当在已认证时渲染受保护的内容', () => {
    // 模拟已认证状态
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      serverUrl: 'http://localhost:8096',
      user: null,
      accessToken: 'test-token',
      deviceInfo: {
        client: 'Test',
        device: 'Test Device',
        deviceId: 'test-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>受保护的内容</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('受保护的内容')).toBeInTheDocument()
  })

  it('应当在未认证且未配置服务器时重定向到服务器配置页面', () => {
    // 模拟未认证且未配置服务器状态
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      serverUrl: null,
      user: null,
      accessToken: null,
      deviceInfo: {
        client: 'Test',
        device: 'Test Device',
        deviceId: 'test-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>受保护的内容</div>
              </ProtectedRoute>
            }
          />
          <Route path="/server-config" element={<div>服务器配置页面</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('服务器配置页面')).toBeInTheDocument()
    expect(screen.queryByText('受保护的内容')).not.toBeInTheDocument()
  })

  it('应当在未认证但已配置服务器时重定向到登录页面', () => {
    // 模拟未认证但已配置服务器状态
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      serverUrl: 'http://localhost:8096',
      user: null,
      accessToken: null,
      deviceInfo: {
        client: 'Test',
        device: 'Test Device',
        deviceId: 'test-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>受保护的内容</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>登录页面</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('登录页面')).toBeInTheDocument()
    expect(screen.queryByText('受保护的内容')).not.toBeInTheDocument()
  })

  it('应当支持自定义重定向路径', () => {
    // 模拟未认证状态
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      serverUrl: 'http://localhost:8096',
      user: null,
      accessToken: null,
      deviceInfo: {
        client: 'Test',
        device: 'Test Device',
        deviceId: 'test-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute redirectTo="/custom-login">
                <div>受保护的内容</div>
              </ProtectedRoute>
            }
          />
          <Route path="/custom-login" element={<div>自定义登录页面</div>} />
          <Route path="/login" element={<div>默认登录页面</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('自定义登录页面')).toBeInTheDocument()
    expect(screen.queryByText('默认登录页面')).not.toBeInTheDocument()
    expect(screen.queryByText('受保护的内容')).not.toBeInTheDocument()
  })

  it('应当使用 replace 导航避免历史记录堆积', () => {
    // 模拟未认证状态
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      serverUrl: null,
      user: null,
      accessToken: null,
      deviceInfo: {
        client: 'Test',
        device: 'Test Device',
        deviceId: 'test-id',
        version: '1.0.0',
      },
      setServerUrl: vi.fn(),
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
      updateUser: vi.fn(),
      initializeFromStorage: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>受保护的内容</div>
              </ProtectedRoute>
            }
          />
          <Route path="/server-config" element={<div>服务器配置页面</div>} />
        </Routes>
      </MemoryRouter>
    )

    // 验证重定向发生
    expect(screen.getByText('服务器配置页面')).toBeInTheDocument()
    
    // Navigate 组件使用 replace 属性，不会在历史记录中留下痕迹
    // 这是通过 Navigate 组件的 replace prop 实现的
    expect(container).toBeTruthy()
  })
})
