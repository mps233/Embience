/**
 * Header 组件测试
 * 
 * 测试 Header 组件的功能：
 * - 显示应用 Logo 和标题
 * - 显示用户信息
 * - 登出功能
 * - 移动端汉堡菜单按钮
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Header from '../Header'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/emby'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useLogout hook
vi.mock('@/hooks/useAuth', () => ({
  useLogout: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

// 创建测试用户数据
const mockUser: User = {
  name: '测试用户',
  serverId: 'test-server',
  id: 'test-user-id',
  hasPassword: true,
  hasConfiguredPassword: true,
  configuration: {
    playDefaultAudioTrack: true,
    displayMissingEpisodes: false,
    groupedFolders: [],
    subtitleMode: 'Default',
    displayCollectionsView: true,
    enableLocalPassword: false,
    orderedViews: [],
    latestItemsExcludes: [],
    myMediaExcludes: [],
    hidePlayedInLatest: true,
    rememberAudioSelections: true,
    rememberSubtitleSelections: true,
    enableNextEpisodeAutoPlay: true,
  },
  policy: {
    isAdministrator: true,
    isHidden: false,
    isDisabled: false,
    blockedTags: [],
    enableUserPreferenceAccess: true,
    accessSchedules: [],
    blockUnratedItems: [],
    enableRemoteControlOfOtherUsers: false,
    enableSharedDeviceControl: true,
    enableRemoteAccess: true,
    enableLiveTvManagement: true,
    enableLiveTvAccess: true,
    enableMediaPlayback: true,
    enableAudioPlaybackTranscoding: true,
    enableVideoPlaybackTranscoding: true,
    enablePlaybackRemuxing: true,
    forceRemoteSourceTranscoding: false,
    enableContentDeletion: false,
    enableContentDeletionFromFolders: [],
    enableContentDownloading: true,
    enableSyncTranscoding: true,
    enableMediaConversion: true,
    enabledDevices: [],
    enableAllDevices: true,
    enabledChannels: [],
    enableAllChannels: true,
    enabledFolders: [],
    enableAllFolders: true,
    invalidLoginAttemptCount: 0,
    loginAttemptsBeforeLockout: 3,
    maxActiveSessions: 0,
    enablePublicSharing: true,
    blockedMediaFolders: [],
    blockedChannels: [],
    remoteClientBitrateLimit: 0,
    authenticationProviderId: 'Emby.Server.Implementations.Library.DefaultAuthenticationProvider',
    passwordResetProviderId: 'Emby.Server.Implementations.Library.DefaultPasswordResetProvider',
    syncPlayAccess: 'CreateAndJoinGroups',
  },
}

describe('Header 组件', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // 重置 auth store
    useAuthStore.setState({
      user: null,
      accessToken: null,
      serverUrl: null,
      isAuthenticated: false,
    })
  })

  it('应该渲染应用 Logo 和标题', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    // 验证 Logo（字母 E）
    expect(screen.getByText('E')).toBeInTheDocument()
    
    // 验证标题
    expect(screen.getByText('Emby UI')).toBeInTheDocument()
  })

  it('应该在移动端显示汉堡菜单按钮', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    // 验证汉堡菜单按钮存在
    const menuButton = screen.getByLabelText('切换侧边栏')
    expect(menuButton).toBeInTheDocument()
  })

  it('未登录时应该显示登录按钮', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    // 验证登录按钮存在
    const loginButton = screen.getByRole('button', { name: /登录/i })
    expect(loginButton).toBeInTheDocument()
  })

  it('已登录时应该显示用户头像和名称', () => {
    // 设置已登录状态
    useAuthStore.setState({
      user: mockUser,
      accessToken: 'test-token',
      serverUrl: 'http://localhost:8096',
      isAuthenticated: true,
    })

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    // 验证用户菜单按钮存在
    const userMenuButton = screen.getByLabelText('用户菜单')
    expect(userMenuButton).toBeInTheDocument()

    // 验证头像 fallback 显示用户名首字母
    expect(screen.getByText('测')).toBeInTheDocument()
  })

  it('应该正确获取用户名首字母（中文）', () => {
    // 测试中文用户名
    useAuthStore.setState({
      user: { ...mockUser, name: '张三' },
      accessToken: 'test-token',
      serverUrl: 'http://localhost:8096',
      isAuthenticated: true,
    })

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    expect(screen.getByText('张')).toBeInTheDocument()
  })

  it('应该正确获取用户名首字母（英文）', () => {
    // 测试英文用户名
    useAuthStore.setState({
      user: { ...mockUser, name: 'john' },
      accessToken: 'test-token',
      serverUrl: 'http://localhost:8096',
      isAuthenticated: true,
    })

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    )

    expect(screen.getByText('J')).toBeInTheDocument()
  })
})
