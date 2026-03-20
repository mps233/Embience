/**
 * 认证服务
 * 
 * 提供用户认证相关的业务逻辑，包括：
 * - 获取公开用户列表
 * - 用户登录认证
 * - 用户登出
 * - 认证状态检查
 * 
 * 需求：1.1, 1.2, 1.6
 */

import type { EmbyApiClient } from '@/services/api/embyClient'
import { authEndpoints } from '@/services/api/endpoints/auth'
import { useAuthStore } from '@/stores/authStore'
import type { PublicUser, AuthSession } from '@/types/emby'

/**
 * 登录请求参数
 */
export interface LoginCredentials {
  /** 用户名 */
  username: string
  /** 密码（明文） */
  password: string
}

/**
 * 认证服务类
 */
export class AuthService {
  private apiClient: EmbyApiClient

  constructor(apiClient: EmbyApiClient) {
    this.apiClient = apiClient
  }

  /**
   * 获取公开用户列表
   * 
   * 需求 1.1：Authentication_Manager 应当显示从 Emby_Server 检索到的公开用户列表
   * 
   * @returns 公开用户列表
   * @throws 当网络请求失败时抛出错误
   */
  async getPublicUsers(): Promise<PublicUser[]> {
    try {
      const users = await this.apiClient.get<any[]>(
        authEndpoints.getPublicUsers(),
        undefined,
        { skipAuth: true } // 获取公开用户不需要认证
      )
      
      // 转换 API 返回的大写字段名为小写（Emby API 使用 PascalCase）
      const transformedUsers = users.map(user => ({
        id: user.Id,
        name: user.Name,
        serverId: user.ServerId,
        hasPassword: user.HasPassword,
        hasConfiguredPassword: user.HasConfiguredPassword,
        primaryImageTag: user.PrimaryImageTag,
      }))
      
      return transformedUsers
    } catch (error) {
      console.error('获取公开用户列表失败:', error)
      throw new Error('无法获取用户列表，请检查服务器连接')
    }
  }

  /**
   * 用户认证（通过用户名和密码）
   * 
   * 需求 1.2：当用户选择用户名并输入密码时，Authentication_Manager 应当使用 
   * AuthenticateByName 端点向 Emby_Server 进行认证
   * 
   * 需求 1.3：当认证成功时，Authentication_Manager 应当存储访问令牌和用户 ID，
   * 用于后续 API 请求
   * 
   * 需求 1.5：Authentication_Manager 应当在所有认证请求中包含设备信息
   * （客户端类型、设备名称、设备 ID、版本）
   * 
   * @param credentials - 登录凭据（用户名和密码）
   * @returns 认证会话信息
   * @throws 当认证失败时抛出错误
   */
  async authenticateByName(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      // 调用认证端点
      const session = await this.apiClient.post<any>(
        authEndpoints.authenticateByName(),
        {
          Username: credentials.username,
          Pw: credentials.password, // Emby API 使用 Pw 字段传递明文密码
        },
        { skipAuth: true } // 登录请求不需要已有的认证信息
      )

      // 验证响应数据（Emby API 使用 PascalCase）
      if (!session.AccessToken || !session.User) {
        console.error('[AuthService] 响应数据不完整，缺少字段')
        throw new Error('认证响应数据不完整')
      }
      
      // 转换 API 响应为 camelCase 格式
      const transformedSession: AuthSession = {
        accessToken: session.AccessToken,
        serverId: session.ServerId,
        user: {
          id: session.User.Id,
          name: session.User.Name,
          serverId: session.User.ServerId,
          hasPassword: session.User.HasPassword,
          hasConfiguredPassword: session.User.HasConfiguredPassword,
          configuration: session.User.Configuration,
          policy: session.User.Policy,
        },
        sessionInfo: session.SessionInfo,
      }

      // 更新 API 客户端的访问令牌
      this.apiClient.setAccessToken(transformedSession.accessToken)

      // 获取服务器 URL（从 API 客户端配置中获取）
      const serverUrl = this.apiClient.getServerUrl()
      const serverType = this.apiClient.getServerType()

      // 存储认证信息到 Store
      const authStore = useAuthStore.getState()
      authStore.setAuth(transformedSession, serverUrl, serverType)

      return transformedSession
    } catch (error) {
      console.error('用户认证失败:', error)
      
      // 需求 1.4：当认证失败时，Authentication_Manager 应当显示错误消息，
      // 指示凭据无效
      if (error instanceof Error) {
        // 如果是认证响应数据不完整的错误，直接抛出
        if (error.message === '认证响应数据不完整') {
          throw error
        }
        // 如果是 401 错误，说明凭据无效
        if (error.message.includes('401') || error.message.includes('认证失败')) {
          throw new Error('用户名或密码错误，请重试')
        }
        // 其他错误抛出通用错误消息
        throw new Error('登录失败，请稍后重试')
      }
      
      throw new Error('登录失败，请稍后重试')
    }
  }

  /**
   * 用户登出
   * 
   * 需求 1.6：当用户登出时，Authentication_Manager 应当调用 Sessions/Logout 
   * 端点并清除存储的凭据
   * 
   * @throws 当登出请求失败时抛出错误（但仍会清除本地凭据）
   */
  async logout(): Promise<void> {
    try {
      // 调用登出端点
      await this.apiClient.post(authEndpoints.logout(), undefined, { noRetry: true })
    } catch (error) {
      // 会话已失效时，401 属于可接受状态，直接静默继续清理本地凭据
      if (!(error instanceof Error && error.message.includes('会话已过期'))) {
        // 即使服务器登出失败，也要清除本地凭据
        console.error('服务器登出失败（将继续清除本地凭据）:', error)
      }
    } finally {
      // 清除本地认证信息
      const authStore = useAuthStore.getState()
      authStore.clearAuth()

      // 清除 API 客户端的访问令牌
      this.apiClient.setAccessToken(null)
    }
  }

  /**
   * 检查用户是否已认证
   * 
   * 需求 1.7：Authentication_Manager 应当使用安全存储在浏览器刷新后保持 User_Session
   * 
   * @returns 是否已认证
   */
  isAuthenticated(): boolean {
    const authStore = useAuthStore.getState()
    return authStore.isAuthenticated
  }

  /**
   * 从本地存储初始化认证状态
   * 
   * 应在应用启动时调用，以恢复之前的认证会话
   * 
   * 需求 1.7：Authentication_Manager 应当使用安全存储在浏览器刷新后保持 User_Session
   */
  initializeFromStorage(): void {
    // 从 localStorage 初始化 store 状态
    useAuthStore.getState().initializeFromStorage()

    // 重新获取更新后的状态
    const { accessToken } = useAuthStore.getState()
    
    // 如果存在访问令牌，更新 API 客户端
    if (accessToken) {
      this.apiClient.setAccessToken(accessToken)
    }
  }

  /**
   * 获取当前用户信息
   * 
   * @returns 当前用户信息，如果未认证则返回 null
   */
  getCurrentUser() {
    const authStore = useAuthStore.getState()
    return authStore.user
  }

  /**
   * 获取当前访问令牌
   * 
   * @returns 当前访问令牌，如果未认证则返回 null
   */
  getAccessToken() {
    const authStore = useAuthStore.getState()
    return authStore.accessToken
  }

  /**
   * 获取设备信息
   * 
   * @returns 设备信息
   */
  getDeviceInfo() {
    return this.apiClient.getDeviceInfo()
  }
}

/**
 * 创建认证服务实例
 * 
 * @param apiClient - Emby API 客户端实例
 * @returns 认证服务实例
 */
export function createAuthService(apiClient: EmbyApiClient): AuthService {
  return new AuthService(apiClient)
}
