/**
 * 登录页面
 * 
 * 显示公开用户列表，允许用户选择并输入密码进行认证
 * 
 * 需求：1.1, 1.2, 1.3, 1.4
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { createAuthService } from '@/services/auth/authService'
import { createEmbyClient } from '@/services/api/embyClient'
import { useAuthStore } from '@/stores/authStore'
import type { PublicUser } from '@/types/emby'

/**
 * 登录页面组件
 */
export default function Login() {
  const navigate = useNavigate()
  const { serverUrl } = useAuthStore()
  
  // 创建 API 客户端和认证服务
  const authService = useMemo(() => {
    if (!serverUrl) return null
    const apiClient = createEmbyClient({ serverUrl })
    return createAuthService(apiClient)
  }, [serverUrl])

  // 使用认证 Hook
  const {
    publicUsers,
    isLoadingPublicUsers,
    publicUsersError,
    login,
    isLoggingIn,
    loginError,
    resetLoginError,
  } = useAuth(authService)

  // 本地状态
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null)
  const [password, setPassword] = useState('')

  // 如果没有配置服务器，重定向到服务器配置页面
  useEffect(() => {
    if (!serverUrl) {
      navigate('/server-config', { replace: true })
    }
  }, [serverUrl, navigate])

  // 如果认证服务未初始化
  if (!authService) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="text-white text-center">
          <p className="text-muted-foreground">初始化中...</p>
        </div>
      </div>
    )
  }

  /**
   * 处理用户选择
   */
  const handleUserSelect = (user: PublicUser) => {
    setSelectedUser(user)
    setPassword('')
    resetLoginError()
  }

  /**
   * 处理登录表单提交
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) {
      return
    }

    // 调用登录 mutation
    login(
      {
        username: selectedUser.name,
        password: password,
      },
      {
        onSuccess: () => {
          // 登录成功，导航到主页
          navigate('/', { replace: true })
        },
      }
    )
  }

  /**
   * 返回用户选择界面
   */
  const handleBackToUserSelection = () => {
    setSelectedUser(null)
    setPassword('')
    resetLoginError()
  }

  /**
   * 获取用户头像 URL
   */
  const getUserAvatarUrl = (user: PublicUser): string | null => {
    if (!user.primaryImageTag) return null
    return `${serverUrl}/emby/Users/${user.id}/Images/Primary?tag=${user.primaryImageTag}&maxWidth=200&maxHeight=200`
  }

  // 加载中状态
  if (isLoadingPublicUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
          <div className="p-6">
            <div className="text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-rainbow-pink rounded-full" role="status" aria-label="加载中">
                <span className="sr-only">加载中...</span>
              </div>
              <p className="mt-4 text-muted-foreground">正在加载用户列表...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (publicUsersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
          <div className="p-6">
            <h2 className="text-center text-red-400 text-xl font-bold mb-4">加载失败</h2>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <div className="p-3 text-sm rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-lg text-red-400">
              {publicUsersError.message}
            </div>
            <Button
              onClick={() => navigate('/server-config')}
              className="w-full"
            >
              返回服务器配置
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 用户选择界面
  if (!selectedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
          <div className="p-6 space-y-1">
            <h2 className="text-2xl font-bold text-center">
              选择用户
            </h2>
            <p className="text-center text-muted-foreground">
              请选择要登录的用户账号
            </p>
          </div>
          <div className="p-6 pt-0">
            {publicUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">没有可用的用户</p>
                <Button
                  onClick={() => navigate('/server-config')}
                  className="mt-4"
                  variant="outline"
                >
                  返回服务器配置
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {publicUsers.filter(user => user.id).map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex flex-col items-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/10 hover:border-rainbow-pink/30 hover:shadow-glass-lg transition-all focus:outline-none focus:ring-2 focus:ring-rainbow-pink/50"
                  >
                    {/* 用户头像 */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rainbow-pink/30 via-rainbow-yellow/30 to-rainbow-green/30 flex items-center justify-center mb-3 overflow-hidden border border-white/20">
                      {getUserAvatarUrl(user) ? (
                        <img
                          src={getUserAvatarUrl(user)!}
                          alt={user.name || '用户'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl font-bold">
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* 用户名 */}
                    <span className="text-sm font-medium text-center break-words w-full">
                      {user.name || '未命名用户'}
                    </span>
                    
                    {/* 密码指示器 */}
                    {user.hasPassword && (
                      <span className="text-xs text-muted-foreground mt-1">
                        🔒 需要密码
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 密码输入界面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
        <div className="p-6 space-y-1">
          <div className="flex items-center justify-center mb-4">
            {/* 用户头像 */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rainbow-pink/30 via-rainbow-yellow/30 to-rainbow-green/30 flex items-center justify-center overflow-hidden border border-white/20">
              {getUserAvatarUrl(selectedUser) ? (
                <img
                  src={getUserAvatarUrl(selectedUser)!}
                  alt={selectedUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center">
            {selectedUser.name}
          </h2>
          <p className="text-center text-muted-foreground">
            请输入密码以登录
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder={selectedUser.hasPassword ? '请输入密码' : '无需密码，直接登录'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                autoFocus
                className={loginError ? 'border-red-500' : ''}
              />
            </div>

            {/* 错误消息 */}
            {loginError && (
              <div className="p-3 text-sm rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-lg text-red-400">
                {loginError.message}
              </div>
            )}

            {/* 按钮组 */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <span className="mr-2">登录中...</span>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  '登录'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBackToUserSelection}
                disabled={isLoggingIn}
              >
                返回用户选择
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
