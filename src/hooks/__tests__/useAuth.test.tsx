/**
 * 认证 Hooks 测试
 * 
 * 测试 useAuth 相关 hooks 的功能
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth, useAuthState, usePublicUsers, useLogin, useLogout } from '../useAuth'
import { useAuthStore } from '@/stores/authStore'
import type { AuthService } from '@/services/auth/authService'
import type { PublicUser, AuthSession } from '@/types/emby'

/**
 * 创建测试用的 QueryClient
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 测试时禁用重试
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * 创建测试用的 wrapper
 */
function createWrapper() {
  const queryClient = createTestQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/**
 * 创建模拟的 AuthService
 */
function createMockAuthService(): AuthService {
  return {
    getPublicUsers: vi.fn(),
    authenticateByName: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: vi.fn(),
    initializeFromStorage: vi.fn(),
    getCurrentUser: vi.fn(),
    getAccessToken: vi.fn(),
    getDeviceInfo: vi.fn(),
  } as unknown as AuthService
}

describe('useAuthState', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAuthStore.getState().clearAuth()
  })

  it('应当返回初始认证状态', () => {
    const { result } = renderHook(() => useAuthState())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
    expect(result.current.serverUrl).toBeNull()
    expect(result.current.deviceInfo).toBeDefined()
  })

  it('应当返回认证后的状态', () => {
    const mockSession: AuthSession = {
      user: {
        id: 'user-1',
        name: 'Test User',
        serverId: 'server-1',
        hasPassword: true,
        hasConfiguredPassword: true,
        hasConfiguredEasyPassword: false,
        enableAutoLogin: false,
        lastLoginDate: '2024-01-01T00:00:00Z',
        lastActivityDate: '2024-01-01T00:00:00Z',
        configuration: {
          audioLanguagePreference: 'zh',
          playDefaultAudioTrack: true,
          subtitleLanguagePreference: 'zh',
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
          isAdministrator: false,
          isHidden: false,
          isDisabled: false,
          enableUserPreferenceAccess: true,
          enableRemoteControlOfOtherUsers: false,
          enableSharedDeviceControl: false,
          enableRemoteAccess: true,
          enableLiveTvManagement: false,
          enableLiveTvAccess: true,
          enableMediaPlayback: true,
          enableAudioPlaybackTranscoding: true,
          enableVideoPlaybackTranscoding: true,
          enablePlaybackRemuxing: true,
          enableContentDeletion: false,
          enableContentDownloading: true,
          enableSyncTranscoding: true,
          enableMediaConversion: false,
          enabledDevices: [],
          enableAllDevices: true,
          enabledChannels: [],
          enableAllChannels: true,
          enabledFolders: [],
          enableAllFolders: true,
          invalidLoginAttemptCount: 0,
          enablePublicSharing: false,
        },
      },
      accessToken: 'test-token',
      serverId: 'server-1',
      sessionInfo: {
        id: 'session-1',
        userId: 'user-1',
        userName: 'Test User',
        client: 'Web',
        lastActivityDate: '2024-01-01T00:00:00Z',
        deviceName: 'Chrome',
        deviceId: 'device-1',
        applicationVersion: '1.0.0',
        isActive: true,
        supportsMediaControl: true,
        supportsRemoteControl: true,
        nowPlayingItem: null,
        deviceType: 'Web',
        capabilities: {
          playableMediaTypes: ['Audio', 'Video'],
          supportedCommands: [],
          supportsMediaControl: true,
          supportsContentUploading: false,
          supportsPersistentIdentifier: true,
          supportsSync: false,
        },
      },
    }

    // 设置认证状态
    useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

    const { result } = renderHook(() => useAuthState())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(mockSession.user)
    expect(result.current.accessToken).toBe('test-token')
    expect(result.current.serverUrl).toBe('http://localhost:8096')
  })
})

describe('usePublicUsers', () => {
  it('应当成功获取公开用户列表', async () => {
    const mockUsers: PublicUser[] = [
      {
        id: 'user-1',
        name: 'User 1',
        hasPassword: true,
        hasConfiguredPassword: true,
        primaryImageTag: 'tag-1',
      },
      {
        id: 'user-2',
        name: 'User 2',
        hasPassword: false,
        hasConfiguredPassword: false,
      },
    ]

    const mockAuthService = createMockAuthService()
    vi.mocked(mockAuthService.getPublicUsers).mockResolvedValue(mockUsers)

    const { result } = renderHook(() => usePublicUsers(mockAuthService), {
      wrapper: createWrapper(),
    })

    // 初始状态应该是加载中
    expect(result.current.isLoading).toBe(true)

    // 等待查询完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockUsers)
    expect(mockAuthService.getPublicUsers).toHaveBeenCalledTimes(1)
  })

  it('当 enabled 为 false 时不应当执行查询', () => {
    const mockAuthService = createMockAuthService()

    const { result } = renderHook(() => usePublicUsers(mockAuthService, false), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(mockAuthService.getPublicUsers).not.toHaveBeenCalled()
  })
})

describe('useLogin', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('应当成功登录', async () => {
    const mockSession: AuthSession = {
      user: {
        id: 'user-1',
        name: 'Test User',
        serverId: 'server-1',
        hasPassword: true,
        hasConfiguredPassword: true,
        hasConfiguredEasyPassword: false,
        enableAutoLogin: false,
        lastLoginDate: '2024-01-01T00:00:00Z',
        lastActivityDate: '2024-01-01T00:00:00Z',
        configuration: {
          audioLanguagePreference: 'zh',
          playDefaultAudioTrack: true,
          subtitleLanguagePreference: 'zh',
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
          isAdministrator: false,
          isHidden: false,
          isDisabled: false,
          enableUserPreferenceAccess: true,
          enableRemoteControlOfOtherUsers: false,
          enableSharedDeviceControl: false,
          enableRemoteAccess: true,
          enableLiveTvManagement: false,
          enableLiveTvAccess: true,
          enableMediaPlayback: true,
          enableAudioPlaybackTranscoding: true,
          enableVideoPlaybackTranscoding: true,
          enablePlaybackRemuxing: true,
          enableContentDeletion: false,
          enableContentDownloading: true,
          enableSyncTranscoding: true,
          enableMediaConversion: false,
          enabledDevices: [],
          enableAllDevices: true,
          enabledChannels: [],
          enableAllChannels: true,
          enabledFolders: [],
          enableAllFolders: true,
          invalidLoginAttemptCount: 0,
          enablePublicSharing: false,
        },
      },
      accessToken: 'test-token',
      serverId: 'server-1',
      sessionInfo: {
        id: 'session-1',
        userId: 'user-1',
        userName: 'Test User',
        client: 'Web',
        lastActivityDate: '2024-01-01T00:00:00Z',
        deviceName: 'Chrome',
        deviceId: 'device-1',
        applicationVersion: '1.0.0',
        isActive: true,
        supportsMediaControl: true,
        supportsRemoteControl: true,
        nowPlayingItem: null,
        deviceType: 'Web',
        capabilities: {
          playableMediaTypes: ['Audio', 'Video'],
          supportedCommands: [],
          supportsMediaControl: true,
          supportsContentUploading: false,
          supportsPersistentIdentifier: true,
          supportsSync: false,
        },
      },
    }

    const mockAuthService = createMockAuthService()
    vi.mocked(mockAuthService.authenticateByName).mockResolvedValue(mockSession)

    const { result } = renderHook(() => useLogin(mockAuthService), {
      wrapper: createWrapper(),
    })

    // 执行登录
    result.current.mutate({
      username: 'testuser',
      password: 'password123',
    })

    // 等待 mutation 完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockSession)
    expect(mockAuthService.authenticateByName).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    })
  })

  it('应当处理登录失败的情况', async () => {
    const mockAuthService = createMockAuthService()
    const error = new Error('用户名或密码错误')
    vi.mocked(mockAuthService.authenticateByName).mockRejectedValue(error)

    const { result } = renderHook(() => useLogin(mockAuthService), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      username: 'testuser',
      password: 'wrongpassword',
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(error)
  })
})

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('应当成功登出', async () => {
    const mockAuthService = createMockAuthService()
    vi.mocked(mockAuthService.logout).mockResolvedValue()

    const { result } = renderHook(() => useLogout(mockAuthService), {
      wrapper: createWrapper(),
    })

    // 执行登出
    result.current.mutate()

    // 等待 mutation 完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockAuthService.logout).toHaveBeenCalledTimes(1)
  })

  it('应当处理登出失败的情况', async () => {
    const mockAuthService = createMockAuthService()
    const error = new Error('网络错误')
    vi.mocked(mockAuthService.logout).mockRejectedValue(error)

    const { result } = renderHook(() => useLogout(mockAuthService), {
      wrapper: createWrapper(),
    })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(error)
  })
})

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('应当提供完整的认证功能', async () => {
    const mockUsers: PublicUser[] = [
      {
        id: 'user-1',
        name: 'User 1',
        hasPassword: true,
        hasConfiguredPassword: true,
      },
    ]

    const mockAuthService = createMockAuthService()
    vi.mocked(mockAuthService.getPublicUsers).mockResolvedValue(mockUsers)

    const { result } = renderHook(() => useAuth(mockAuthService), {
      wrapper: createWrapper(),
    })

    // 初始状态
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()

    // 等待公开用户列表加载
    await waitFor(() => {
      expect(result.current.publicUsers).toEqual(mockUsers)
    })

    // 验证提供的方法
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.refetchPublicUsers).toBe('function')
  })
})
