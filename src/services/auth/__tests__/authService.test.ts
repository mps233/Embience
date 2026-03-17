/**
 * 认证服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../authService'
import type { EmbyApiClient } from '@/services/api/embyClient'
import type { PublicUser, AuthSession, User } from '@/types/emby'
import { useAuthStore } from '@/stores/authStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthService', () => {
  let authService: AuthService
  let mockApiClient: EmbyApiClient

  beforeEach(() => {
    // 清空 localStorage 和 store
    localStorageMock.clear()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      serverUrl: null,
      isAuthenticated: false,
    })

    // 创建 mock API 客户端
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      setAccessToken: vi.fn(),
      getDeviceInfo: vi.fn(() => ({
        client: 'Emby Web',
        device: 'Chrome',
        deviceId: 'test-device-id',
        version: '1.0.0',
      })),
      baseURL: 'http://localhost:8096',
    } as any

    authService = new AuthService(mockApiClient)
  })

  describe('getPublicUsers', () => {
    it('应该成功获取公开用户列表', async () => {
      // Mock API 返回的原始数据（使用 Emby API 的大写字段名）
      const mockApiResponse = [
        {
          Id: 'user1',
          Name: 'User 1',
          ServerId: 'server123',
          HasPassword: true,
          HasConfiguredPassword: true,
        },
        {
          Id: 'user2',
          Name: 'User 2',
          ServerId: 'server123',
          HasPassword: false,
          HasConfiguredPassword: false,
        },
      ]

      // 期望的转换后数据（小写字段名）
      const expectedUsers: PublicUser[] = [
        {
          id: 'user1',
          name: 'User 1',
          serverId: 'server123',
          hasPassword: true,
          hasConfiguredPassword: true,
        },
        {
          id: 'user2',
          name: 'User 2',
          serverId: 'server123',
          hasPassword: false,
          hasConfiguredPassword: false,
        },
      ]

      vi.mocked(mockApiClient.get).mockResolvedValue(mockApiResponse)

      const users = await authService.getPublicUsers()

      expect(users).toEqual(expectedUsers)
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/Users/Public',
        undefined,
        { skipAuth: true }
      )
    })

    it('获取用户列表失败时应该抛出友好错误', async () => {
      vi.mocked(mockApiClient.get).mockRejectedValue(new Error('Network error'))

      await expect(authService.getPublicUsers()).rejects.toThrow(
        '无法获取用户列表，请检查服务器连接'
      )
    })
  })

  describe('authenticateByName', () => {
    it('应该成功认证用户并存储会话信息', async () => {
      const mockUser: User = {
        id: 'user123',
        name: 'Test User',
        serverId: 'server123',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      }

      // Mock API 响应（使用 Emby API 的 PascalCase 格式）
      const mockApiResponse = {
        User: {
          Id: 'user123',
          Name: 'Test User',
          ServerId: 'server123',
          HasPassword: true,
          HasConfiguredPassword: true,
          Configuration: {} as any,
          Policy: {} as any,
        },
        AccessToken: 'test-token-123',
        ServerId: 'server123',
        SessionInfo: {} as any,
      }

      vi.mocked(mockApiClient.post).mockResolvedValue(mockApiResponse)

      const session = await authService.authenticateByName({
        username: 'testuser',
        password: 'testpass',
      })

      // 验证返回的会话信息（已转换为 camelCase）
      expect(session).toEqual({
        user: mockUser,
        accessToken: 'test-token-123',
        serverId: 'server123',
        sessionInfo: {} as any,
      })

      // 验证 API 调用
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/Users/AuthenticateByName',
        {
          Username: 'testuser',
          Pw: 'testpass',
        },
        { skipAuth: true }
      )

      // 验证访问令牌已设置
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('test-token-123')

      // 验证 store 已更新
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('test-token-123')
    })

    it('认证失败时应该抛出友好错误（凭据无效）', async () => {
      vi.mocked(mockApiClient.post).mockRejectedValue(
        new Error('401 Unauthorized')
      )

      await expect(
        authService.authenticateByName({
          username: 'wronguser',
          password: 'wrongpass',
        })
      ).rejects.toThrow('用户名或密码错误，请重试')
    })

    it('网络错误时应该抛出通用错误', async () => {
      vi.mocked(mockApiClient.post).mockRejectedValue(new Error('Network error'))

      await expect(
        authService.authenticateByName({
          username: 'testuser',
          password: 'testpass',
        })
      ).rejects.toThrow('登录失败，请稍后重试')
    })

    it('响应数据不完整时应该抛出错误', async () => {
      vi.mocked(mockApiClient.post).mockResolvedValue({
        user: null,
        accessToken: null,
      })

      await expect(
        authService.authenticateByName({
          username: 'testuser',
          password: 'testpass',
        })
      ).rejects.toThrow('认证响应数据不完整')
    })
  })

  describe('logout', () => {
    it('应该成功登出并清除本地凭据', async () => {
      // 先设置认证状态
      const mockSession: AuthSession = {
        user: {
          id: 'user123',
          name: 'Test User',
          serverId: 'server123',
          hasPassword: true,
          hasConfiguredPassword: true,
          configuration: {} as any,
          policy: {} as any,
        },
        accessToken: 'test-token',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      vi.mocked(mockApiClient.post).mockResolvedValue(undefined)

      await authService.logout()

      // 验证 API 调用
      expect(mockApiClient.post).toHaveBeenCalledWith('/Sessions/Logout')

      // 验证访问令牌已清除
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith(null)

      // 验证 store 已清除
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
    })

    it('服务器登出失败时仍应清除本地凭据', async () => {
      // 先设置认证状态
      const mockSession: AuthSession = {
        user: {
          id: 'user123',
          name: 'Test User',
          serverId: 'server123',
          hasPassword: true,
          hasConfiguredPassword: true,
          configuration: {} as any,
          policy: {} as any,
        },
        accessToken: 'test-token',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      vi.mocked(mockApiClient.post).mockRejectedValue(new Error('Server error'))

      // 不应该抛出错误
      await expect(authService.logout()).resolves.toBeUndefined()

      // 验证本地凭据已清除
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.accessToken).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('未认证时应该返回 false', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })

    it('已认证时应该返回 true', () => {
      const mockSession: AuthSession = {
        user: {
          id: 'user123',
          name: 'Test User',
          serverId: 'server123',
          hasPassword: true,
          hasConfiguredPassword: true,
          configuration: {} as any,
          policy: {} as any,
        },
        accessToken: 'test-token',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      expect(authService.isAuthenticated()).toBe(true)
    })
  })

  describe('initializeFromStorage', () => {
    it('应该从 localStorage 恢复认证状态', () => {
      const mockUser: User = {
        id: 'user123',
        name: 'Test User',
        serverId: 'server123',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      }

      // 先通过 setAuth 设置认证状态（这会正确地存储到 localStorage）
      const mockSession: AuthSession = {
        user: mockUser,
        accessToken: 'test-token',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      // 验证 localStorage 中确实有数据
      expect(localStorage.getItem('emby_auth_token')).toBeTruthy()

      // 清空 store 状态（模拟应用重启）
      useAuthStore.setState({
        user: null,
        accessToken: null,
        serverUrl: null,
        isAuthenticated: false,
      })

      // 重置 mock 函数的调用记录
      ;(mockApiClient.setAccessToken as any).mockClear()

      // 从 localStorage 恢复
      authService.initializeFromStorage()

      // 验证 store 已恢复
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.accessToken).toBe('test-token')

      // 验证访问令牌已设置到 API 客户端
      expect(mockApiClient.setAccessToken).toHaveBeenCalledWith('test-token')
    })

    it('localStorage 为空时不应设置访问令牌', () => {
      authService.initializeFromStorage()

      expect(mockApiClient.setAccessToken).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('未认证时应该返回 null', () => {
      expect(authService.getCurrentUser()).toBeNull()
    })

    it('已认证时应该返回当前用户', () => {
      const mockUser: User = {
        id: 'user123',
        name: 'Test User',
        serverId: 'server123',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      }

      const mockSession: AuthSession = {
        user: mockUser,
        accessToken: 'test-token',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      expect(authService.getCurrentUser()).toEqual(mockUser)
    })
  })

  describe('getAccessToken', () => {
    it('未认证时应该返回 null', () => {
      expect(authService.getAccessToken()).toBeNull()
    })

    it('已认证时应该返回访问令牌', () => {
      const mockSession: AuthSession = {
        user: {
          id: 'user123',
          name: 'Test User',
          serverId: 'server123',
          hasPassword: true,
          hasConfiguredPassword: true,
          configuration: {} as any,
          policy: {} as any,
        },
        accessToken: 'test-token-123',
        serverId: 'server123',
        sessionInfo: {} as any,
      }

      useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

      expect(authService.getAccessToken()).toBe('test-token-123')
    })
  })

  describe('getDeviceInfo', () => {
    it('应该返回设备信息', () => {
      const deviceInfo = authService.getDeviceInfo()

      expect(deviceInfo).toEqual({
        client: 'Emby Web',
        device: 'Chrome',
        deviceId: 'test-device-id',
        version: '1.0.0',
      })
    })
  })
})
