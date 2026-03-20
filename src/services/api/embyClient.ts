/**
 * Emby API 客户端
 * 提供统一的 HTTP 请求封装，自动添加认证头和错误处理
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type { DeviceInfo } from '@/types/emby'
import { getStorageItem, setStorageItem } from '@/utils/storage'
import { STORAGE_KEYS, APP_VERSION, CLIENT_NAME, RETRY_CONFIG } from '@/utils/constants'
import {
  getApiBaseUrl,
  getAuthorizationScheme,
  getTokenHeaderName,
  type MediaServerType,
} from './mediaServer'

/**
 * API 配置
 */
export interface ApiConfig {
  /** 服务器 URL */
  serverUrl: string
  /** 服务器类型 */
  serverType?: MediaServerType
  /** 访问令牌（可选） */
  accessToken?: string
  /** 设备信息（可选，如果不提供会自动生成） */
  deviceInfo?: DeviceInfo
}

/**
 * 请求选项
 */
export interface RequestOptions extends AxiosRequestConfig {
  /** 是否跳过认证头 */
  skipAuth?: boolean
  /** 是否禁用重试 */
  noRetry?: boolean
}

/**
 * Emby API 客户端类
 */
export class EmbyApiClient {
  private axiosInstance: AxiosInstance
  private serverUrl: string
  private serverType: MediaServerType
  private accessToken: string | null = null
  private deviceInfo: DeviceInfo

  constructor(config: ApiConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '')
    this.serverType =
      config.serverType ||
      getStorageItem<MediaServerType>(STORAGE_KEYS.SERVER_TYPE) ||
      'emby'
    this.accessToken = config.accessToken || null
    this.deviceInfo = config.deviceInfo || this.generateDeviceInfo()

    // 创建 axios 实例
    this.axiosInstance = axios.create({
      baseURL: getApiBaseUrl(this.serverUrl, this.serverType),
      timeout: 30000, // 30 秒超时
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 添加请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 检查是否跳过用户令牌认证
        const shouldSkipAuth = config.headers['skipAuth'] === 'true'
        
        // 始终添加基本的 Authorization 头（设备信息）
        config.headers['Authorization'] = this.buildAuthHeader()
        
        // 只有在不跳过认证且有 token 时才添加对应服务端的 token 头
        if (!shouldSkipAuth && this.accessToken) {
          config.headers[getTokenHeaderName(this.serverType)] = this.accessToken
        }
        
        // 移除自定义标记
        delete config.headers['skipAuth']
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 添加响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return this.handleError(error)
      }
    )
  }

  /**
   * 生成或获取设备信息
   */
  private generateDeviceInfo(): DeviceInfo {
    // 尝试从本地存储获取
    const stored = getStorageItem<DeviceInfo>(STORAGE_KEYS.DEVICE_INFO)
    if (stored) {
      return stored
    }

    // 生成新的设备信息
    const deviceInfo: DeviceInfo = {
      client: CLIENT_NAME,
      device: this.getDeviceName(),
      deviceId: uuidv4(),
      version: APP_VERSION,
    }

    // 持久化存储
    setStorageItem(STORAGE_KEYS.DEVICE_INFO, deviceInfo)
    return deviceInfo
  }

  /**
   * 获取设备名称（基于浏览器信息）
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Browser'
  }

  /**
   * 构建 Authorization 请求头
   */
  private buildAuthHeader(): string {
    const { client, device, deviceId, version } = this.deviceInfo
    const userId = this.accessToken ? '' : '' // 如果需要 UserId，可以从存储中获取

    const parts = [
      `Client="${client}"`,
      `Device="${device}"`,
      `DeviceId="${deviceId}"`,
      `Version="${version}"`,
    ]

    if (userId) {
      parts.unshift(`UserId="${userId}"`)
    }

    return `${getAuthorizationScheme(this.serverType)} ${parts.join(', ')}`
  }

  /**
   * 设置访问令牌
   */
  public setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  /**
   * 获取访问令牌
   */
  public getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * 获取设备信息
   */
  public getDeviceInfo(): DeviceInfo {
    return this.deviceInfo
  }

  /**
   * 获取服务器 URL
   */
  public getServerUrl(): string {
    return this.serverUrl
  }

  /**
   * 获取服务器类型
   */
  public getServerType(): MediaServerType {
    return this.serverType
  }

  /**
   * 获取 API 根路径
   */
  public getApiBaseUrl(): string {
    return getApiBaseUrl(this.serverUrl, this.serverType)
  }

  /**
   * 更新服务器 URL
   */
  public setServerUrl(url: string, serverType?: MediaServerType): void {
    this.serverUrl = url.replace(/\/$/, '')
    if (serverType) {
      this.serverType = serverType
    }
    this.axiosInstance.defaults.baseURL = getApiBaseUrl(this.serverUrl, this.serverType)
  }

  /**
   * 错误处理
   */
  private async handleError(error: AxiosError): Promise<never> {
    // 网络错误
    if (!error.response) {
      console.error('网络错误:', error.message)
      throw new Error('网络连接失败，请检查您的网络连接')
    }

    const { status, data } = error.response
    const requestUrl = error.config?.url || ''
    const isLogoutRequest = requestUrl.includes('/Sessions/Logout')

    // 根据状态码处理
    switch (status) {
      case 401:
        // 登出接口返回 401 时通常表示会话已失效，不需要额外噪音日志
        if (!isLogoutRequest) {
          console.error('认证失败: 令牌无效或已过期')
        }
        // 清除认证信息（由调用方处理）
        throw new Error('会话已过期，请重新登录')

      case 404:
        console.error('资源未找到:', error.config?.url)
        throw new Error('请求的内容未找到')

      case 500:
      case 502:
      case 503:
        console.error('服务器错误:', status, data)
        throw new Error('服务器错误，请稍后重试')

      default:
        console.error('API 错误:', status, data)
        throw new Error(`请求失败: ${status}`)
    }
  }

  /**
   * 通用请求方法（带重试逻辑）
   */
  public async request<T>(options: RequestOptions): Promise<T> {
    const { noRetry, skipAuth, ...axiosConfig } = options
    const maxRetries = noRetry ? 0 : RETRY_CONFIG.MAX_RETRIES

    // 将 skipAuth 标记传递到 headers 中，供拦截器使用
    if (skipAuth) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        skipAuth: 'true',
      }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(axiosConfig)
        return response.data
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试或不应该重试的错误，直接抛出
        if (attempt === maxRetries || !this.shouldRetry(error as AxiosError)) {
          throw error
        }

        // 等待后重试（指数退避）
        const delay = RETRY_CONFIG.RETRY_DELAYS[attempt] || 4000
        console.log(`请求失败，${delay}ms 后重试 (${attempt + 1}/${maxRetries})...`)
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: AxiosError): boolean {
    // 网络错误应该重试
    if (!error.response) {
      return true
    }

    // 5xx 服务器错误应该重试
    const status = error.response.status
    if (status >= 500 && status < 600) {
      return true
    }

    // 其他错误不重试
    return false
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * GET 请求
   */
  public async get<T>(path: string, params?: Record<string, any>, options?: RequestOptions): Promise<T> {
    return this.request<T>({
      method: 'GET',
      url: path,
      params,
      ...options,
    })
  }

  /**
   * POST 请求
   */
  public async post<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: path,
      data,
      ...options,
    })
  }

  /**
   * DELETE 请求
   */
  public async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url: path,
      ...options,
    })
  }

  /**
   * PUT 请求
   */
  public async put<T>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url: path,
      data,
      ...options,
    })
  }
}

/**
 * 创建 API 客户端实例
 */
export function createEmbyClient(config: ApiConfig): EmbyApiClient {
  return new EmbyApiClient(config)
}
