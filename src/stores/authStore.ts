/**
 * 认证状态管理 Store
 * 
 * 管理用户认证状态、访问令牌、服务器配置和设备信息
 * 使用 localStorage 持久化认证状态
 */

import { create } from 'zustand'
import type { User, AuthSession, DeviceInfo } from '@/types/emby'
import { getStorageItem, setStorageItem, removeStorageItem } from '@/utils/storage'
import { STORAGE_KEYS, APP_VERSION, CLIENT_NAME } from '@/utils/constants'
import { v4 as uuidv4 } from 'uuid'

/**
 * 认证状态接口
 */
interface AuthState {
  // 状态
  user: User | null
  accessToken: string | null
  serverUrl: string | null
  deviceInfo: DeviceInfo
  isAuthenticated: boolean

  // 操作
  setServerUrl: (url: string) => void
  setAuth: (session: AuthSession, serverUrl: string) => void
  clearAuth: () => void
  updateUser: (user: User) => void
  initializeFromStorage: () => void
}

/**
 * 生成或获取设备信息
 */
function getOrCreateDeviceInfo(): DeviceInfo {
  // 尝试从 localStorage 获取已存在的设备信息
  const stored = getStorageItem<DeviceInfo>(STORAGE_KEYS.DEVICE_INFO)
  
  if (stored && stored.deviceId) {
    return stored
  }

  // 生成新的设备信息
  const deviceInfo: DeviceInfo = {
    client: CLIENT_NAME,
    device: getBrowserName(),
    deviceId: uuidv4(),
    version: APP_VERSION,
  }

  // 持久化设备信息
  setStorageItem(STORAGE_KEYS.DEVICE_INFO, deviceInfo)
  
  return deviceInfo
}

/**
 * 获取浏览器名称
 */
function getBrowserName(): string {
  const userAgent = navigator.userAgent
  
  if (userAgent.includes('Firefox')) {
    return 'Firefox'
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome'
  } else if (userAgent.includes('Safari')) {
    return 'Safari'
  } else if (userAgent.includes('Edge')) {
    return 'Edge'
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera'
  }
  
  return 'Unknown Browser'
}

/**
 * 创建认证状态 Store
 */
export const useAuthStore = create<AuthState>((set) => {
  // 在 store 创建时立即从 localStorage 加载数据
  const storedUser = getStorageItem<User>(STORAGE_KEYS.USER_INFO)
  const storedAccessToken = getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN)
  const storedServerUrl = getStorageItem<string>(STORAGE_KEYS.SERVER_URL)
  const isAuthenticated = !!(storedUser && storedAccessToken && storedServerUrl)

  return {
    // 初始状态 - 从 localStorage 恢复
    user: storedUser,
    accessToken: storedAccessToken,
    serverUrl: storedServerUrl,
    deviceInfo: getOrCreateDeviceInfo(),
    isAuthenticated,

    /**
     * 设置服务器 URL
     * 
     * @param url - 服务器 URL
     */
    setServerUrl: (url: string) => {
    // 持久化到 localStorage
    setStorageItem(STORAGE_KEYS.SERVER_URL, url)

    // 更新状态
    set({ serverUrl: url })
  },

  /**
   * 设置认证信息
   * 
   * @param session - 认证会话信息
   * @param serverUrl - 服务器 URL
   */
  setAuth: (session: AuthSession, serverUrl: string) => {
    const { user, accessToken } = session

    // 持久化到 localStorage
    setStorageItem(STORAGE_KEYS.USER_INFO, user)
    setStorageItem(STORAGE_KEYS.AUTH_TOKEN, accessToken)
    setStorageItem(STORAGE_KEYS.SERVER_URL, serverUrl)

    // 更新状态
    set({
      user,
      accessToken,
      serverUrl,
      isAuthenticated: true,
    })
  },

  /**
   * 清除认证信息（登出）
   */
  clearAuth: () => {
    // 从 localStorage 移除认证信息
    removeStorageItem(STORAGE_KEYS.USER_INFO)
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN)
    removeStorageItem(STORAGE_KEYS.SERVER_URL)

    // 重置状态
    set({
      user: null,
      accessToken: null,
      serverUrl: null,
      isAuthenticated: false,
    })
  },

  /**
   * 更新用户信息
   * 
   * @param user - 更新后的用户信息
   */
  updateUser: (user: User) => {
    // 持久化到 localStorage
    setStorageItem(STORAGE_KEYS.USER_INFO, user)

    // 更新状态
    set({ user })
  },

  /**
   * 从 localStorage 初始化认证状态
   * 应在应用启动时调用
   */
  initializeFromStorage: () => {
    const user = getStorageItem<User>(STORAGE_KEYS.USER_INFO)
    const accessToken = getStorageItem<string>(STORAGE_KEYS.AUTH_TOKEN)
    const serverUrl = getStorageItem<string>(STORAGE_KEYS.SERVER_URL)

    // 只有当所有必需信息都存在时才认为已认证
    const isAuthenticated = !!(user && accessToken && serverUrl)

    set({
      user,
      accessToken,
      serverUrl,
      isAuthenticated,
    })
  },
}
})

/**
 * 选择器：获取认证状态
 */
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated

/**
 * 选择器：获取当前用户
 */
export const selectUser = (state: AuthState) => state.user

/**
 * 选择器：获取访问令牌
 */
export const selectAccessToken = (state: AuthState) => state.accessToken

/**
 * 选择器：获取服务器 URL
 */
export const selectServerUrl = (state: AuthState) => state.serverUrl

/**
 * 选择器：获取设备信息
 */
export const selectDeviceInfo = (state: AuthState) => state.deviceInfo
