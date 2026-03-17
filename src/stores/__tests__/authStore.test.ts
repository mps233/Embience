/**
 * Auth Store 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'
import type { AuthSession, User } from '@/types/emby'

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

describe('authStore', () => {
  beforeEach(() => {
    // 清空 store 和 localStorage
    localStorageMock.clear()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      serverUrl: null,
      isAuthenticated: false,
    })
  })

  it('应该初始化为未认证状态', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.serverUrl).toBeNull()
  })

  it('应该有设备信息', () => {
    const state = useAuthStore.getState()
    expect(state.deviceInfo).toBeDefined()
    expect(state.deviceInfo.deviceId).toBeTruthy()
    expect(state.deviceInfo.client).toBeTruthy()
    expect(state.deviceInfo.device).toBeTruthy()
    expect(state.deviceInfo.version).toBeTruthy()
  })

  it('setAuth 应该设置认证信息并持久化', () => {
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
      accessToken: 'token123',
      serverId: 'server123',
      sessionInfo: {} as any,
    }

    const serverUrl = 'http://localhost:8096'

    useAuthStore.getState().setAuth(mockSession, serverUrl)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('token123')
    expect(state.serverUrl).toBe(serverUrl)

    // 验证持久化
    expect(localStorage.getItem('emby_user_info')).toBeTruthy()
    expect(localStorage.getItem('emby_auth_token')).toBeTruthy()
    expect(localStorage.getItem('emby_server_url')).toBeTruthy()
  })

  it('clearAuth 应该清除认证信息', () => {
    // 先设置认证
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
      accessToken: 'token123',
      serverId: 'server123',
      sessionInfo: {} as any,
    }

    useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

    // 清除认证
    useAuthStore.getState().clearAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.serverUrl).toBeNull()

    // 验证 localStorage 已清除
    expect(localStorage.getItem('emby_user_info')).toBeNull()
    expect(localStorage.getItem('emby_auth_token')).toBeNull()
    expect(localStorage.getItem('emby_server_url')).toBeNull()
  })

  it('updateUser 应该更新用户信息', () => {
    const initialUser: User = {
      id: 'user123',
      name: 'Test User',
      serverId: 'server123',
      hasPassword: true,
      hasConfiguredPassword: true,
      configuration: {} as any,
      policy: {} as any,
    }

    const mockSession: AuthSession = {
      user: initialUser,
      accessToken: 'token123',
      serverId: 'server123',
      sessionInfo: {} as any,
    }

    useAuthStore.getState().setAuth(mockSession, 'http://localhost:8096')

    // 更新用户信息
    const updatedUser: User = {
      ...initialUser,
      name: 'Updated User',
    }

    useAuthStore.getState().updateUser(updatedUser)

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Updated User')
  })

  it('initializeFromStorage 应该从 localStorage 恢复认证状态', () => {
    const mockUser: User = {
      id: 'user123',
      name: 'Test User',
      serverId: 'server123',
      hasPassword: true,
      hasConfiguredPassword: true,
      configuration: {} as any,
      policy: {} as any,
    }

    // 模拟 localStorage 中已有数据
    localStorage.setItem('emby_user_info', JSON.stringify(mockUser))
    localStorage.setItem('emby_auth_token', JSON.stringify('token123'))
    localStorage.setItem('emby_server_url', JSON.stringify('http://localhost:8096'))

    // 初始化
    useAuthStore.getState().initializeFromStorage()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('token123')
    expect(state.serverUrl).toBe('http://localhost:8096')
  })

  it('initializeFromStorage 在数据不完整时应该保持未认证状态', () => {
    // 只设置部分数据
    localStorage.setItem('emby_auth_token', JSON.stringify('token123'))

    useAuthStore.getState().initializeFromStorage()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })
})
