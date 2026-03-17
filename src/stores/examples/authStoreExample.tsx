/**
 * Auth Store 使用示例
 * 
 * 展示如何在 React 组件中使用 authStore
 */

import React from 'react'
import { useAuthStore, selectIsAuthenticated, selectUser } from '../authStore'
import type { AuthSession } from '@/types/emby'

/**
 * 示例：登录组件
 */
export function LoginExample() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  const handleLogin = () => {
    // 模拟登录成功后的会话数据
    const mockSession: AuthSession = {
      user: {
        id: 'user123',
        name: '测试用户',
        serverId: 'server123',
        hasPassword: true,
        hasConfiguredPassword: true,
        configuration: {} as any,
        policy: {} as any,
      },
      accessToken: 'mock-token-123',
      serverId: 'server123',
      sessionInfo: {} as any,
    }

    const serverUrl = 'http://localhost:8096'

    // 设置认证信息
    setAuth(mockSession, serverUrl)
  }

  return (
    <div>
      <h2>登录示例</h2>
      <p>认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>
      <button onClick={handleLogin}>模拟登录</button>
    </div>
  )
}

/**
 * 示例：用户信息组件
 */
export function UserInfoExample() {
  const user = useAuthStore(selectUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  if (!user) {
    return <div>未登录</div>
  }

  return (
    <div>
      <h2>用户信息</h2>
      <p>用户名: {user.name}</p>
      <p>用户 ID: {user.id}</p>
      <p>服务器 ID: {user.serverId}</p>
      <button onClick={clearAuth}>登出</button>
    </div>
  )
}

/**
 * 示例：设备信息组件
 */
export function DeviceInfoExample() {
  const deviceInfo = useAuthStore((state) => state.deviceInfo)

  return (
    <div>
      <h2>设备信息</h2>
      <p>客户端: {deviceInfo.client}</p>
      <p>设备: {deviceInfo.device}</p>
      <p>设备 ID: {deviceInfo.deviceId}</p>
      <p>版本: {deviceInfo.version}</p>
    </div>
  )
}

/**
 * 示例：完整应用
 */
export function AuthStoreExampleApp() {
  // 在应用启动时初始化认证状态
  React.useEffect(() => {
    useAuthStore.getState().initializeFromStorage()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>Auth Store 使用示例</h1>
      <hr />
      <LoginExample />
      <hr />
      <UserInfoExample />
      <hr />
      <DeviceInfoExample />
    </div>
  )
}
