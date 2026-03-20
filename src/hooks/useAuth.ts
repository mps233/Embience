/**
 * 认证 Hooks
 * 
 * 封装 authStore 和 authService，使用 TanStack Query 管理认证 API 调用
 * 提供便捷的 hooks 接口供组件使用
 * 
 * 需求：1.2, 1.4
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import type { AuthService, LoginCredentials } from '@/services/auth/authService'
import type { AuthSession } from '@/types/emby'

/**
 * 认证相关的 Query Keys
 */
export const authKeys = {
  all: ['auth'] as const,
  publicUsers: () => [...authKeys.all, 'publicUsers'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
}

/**
 * 使用认证状态 Hook
 * 
 * 从 authStore 获取认证状态和操作方法
 * 
 * @returns 认证状态和操作方法
 */
export function useAuthState() {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const serverUrl = useAuthStore((state) => state.serverUrl)
  const deviceInfo = useAuthStore((state) => state.deviceInfo)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const updateUser = useAuthStore((state) => state.updateUser)

  return {
    user,
    accessToken,
    serverUrl,
    deviceInfo,
    isAuthenticated,
    clearAuth,
    updateUser,
  }
}

/**
 * 获取公开用户列表 Hook
 * 
 * 需求 1.1：Authentication_Manager 应当显示从 Emby_Server 检索到的公开用户列表
 * 
 * @param authService - 认证服务实例（可以为 null）
 * @param enabled - 是否启用查询（默认 true）
 * @returns TanStack Query 查询结果
 */
export function usePublicUsers(authService: AuthService | null, enabled = true) {
  return useQuery({
    queryKey: authKeys.publicUsers(),
    queryFn: () => {
      if (!authService) {
        throw new Error('认证服务未初始化')
      }
      return authService.getPublicUsers()
    },
    enabled: enabled && !!authService,
    staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
    retry: 2, // 失败时重试 2 次
  })
}

/**
 * 用户登录 Hook
 * 
 * 需求 1.2：当用户选择用户名并输入密码时，Authentication_Manager 应当使用 
 * AuthenticateByName 端点向 Emby_Server 进行认证
 * 
 * 需求 1.4：当认证失败时，Authentication_Manager 应当显示错误消息，
 * 指示凭据无效
 * 
 * @param authService - 认证服务实例（可以为 null）
 * @returns TanStack Query mutation 结果
 */
export function useLogin(authService: AuthService | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => {
      if (!authService) {
        throw new Error('认证服务未初始化')
      }
      return authService.authenticateByName(credentials)
    },
    onSuccess: (session: AuthSession) => {
      // 登录成功后，使当前用户查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() })
      
      // 可选：预填充用户数据到缓存
      queryClient.setQueryData(authKeys.currentUser(), session.user)
    },
    onError: (error: Error) => {
      // 错误已在 authService 中处理并转换为友好消息
      console.error('登录失败:', error.message)
    },
  })
}

/**
 * 用户登出 Hook
 * 
 * 需求 1.6：当用户登出时，Authentication_Manager 应当调用 Sessions/Logout 
 * 端点并清除存储的凭据
 * 
 * @param authService - 认证服务实例（可以为 null）
 * @returns TanStack Query mutation 结果
 */
export function useLogout(authService: AuthService | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!authService) {
        throw new Error('认证服务未初始化')
      }
      return authService.logout()
    },
    onSuccess: () => {
      // 登出成功后，清除所有认证相关的查询缓存
      queryClient.removeQueries({ queryKey: authKeys.all })
      
      // 可选：清除所有查询缓存（如果需要完全重置应用状态）
      // queryClient.clear()
    },
    onError: (error: Error) => {
      // 即使登出失败，本地凭据也已被清除（在 authService 中处理）
      console.error('登出失败:', error.message)
    },
  })
}

/**
 * 综合认证 Hook
 * 
 * 提供所有认证相关的状态和操作方法
 * 这是推荐使用的主要 hook，封装了所有认证功能
 * 
 * @param authService - 认证服务实例（可以为 null）
 * @returns 认证状态、查询结果和操作方法
 */
export function useAuth(
  authService: AuthService | null,
  options?: {
    loadPublicUsers?: boolean
  }
) {
  const loadPublicUsers = options?.loadPublicUsers ?? true
  const authState = useAuthState()
  const publicUsersQuery = usePublicUsers(authService, loadPublicUsers)
  const loginMutation = useLogin(authService)
  const logoutMutation = useLogout(authService)

  return {
    // 认证状态
    ...authState,

    // 公开用户列表查询
    publicUsers: publicUsersQuery.data ?? [],
    isLoadingPublicUsers: publicUsersQuery.isLoading,
    publicUsersError: publicUsersQuery.error,
    refetchPublicUsers: publicUsersQuery.refetch,

    // 登录操作
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    resetLoginError: loginMutation.reset,

    // 登出操作
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,
  }
}

/**
 * 使用设备信息 Hook
 * 
 * 获取当前设备信息
 * 
 * @returns 设备信息
 */
export function useDeviceInfo() {
  return useAuthStore((state) => state.deviceInfo)
}

/**
 * 使用当前用户 Hook
 * 
 * 获取当前登录用户信息
 * 
 * @returns 当前用户信息，如果未登录则返回 null
 */
export function useCurrentUser() {
  return useAuthStore((state) => state.user)
}

/**
 * 使用访问令牌 Hook
 * 
 * 获取当前访问令牌
 * 
 * @returns 访问令牌，如果未登录则返回 null
 */
export function useAccessToken() {
  return useAuthStore((state) => state.accessToken)
}

/**
 * 使用服务器 URL Hook
 * 
 * 获取当前连接的服务器 URL
 * 
 * @returns 服务器 URL，如果未设置则返回 null
 */
export function useServerUrl() {
  return useAuthStore((state) => state.serverUrl)
}
