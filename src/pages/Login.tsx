/**
 * 登录页面
 *
 * 使用手动输入用户名和密码进行认证。
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

/**
 * 登录页面组件
 */
export default function Login() {
  const navigate = useNavigate()
  const { serverUrl, serverType } = useAuthStore()

  // 创建 API 客户端和认证服务
  const authService = useMemo(() => {
    if (!serverUrl) return null
    const apiClient = createEmbyClient({
      serverUrl,
      serverType: serverType || undefined,
    })
    return createAuthService(apiClient)
  }, [serverUrl, serverType])

  // 手动登录场景不需要拉取公开用户
  const {
    login,
    isLoggingIn,
    loginError,
    resetLoginError,
  } = useAuth(authService, { loadPublicUsers: false })

  // 本地状态
  const [username, setUsername] = useState('')
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
   * 处理登录表单提交
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetLoginError()

    if (!username.trim()) {
      return
    }

    login(
      {
        username: username.trim(),
        password,
      },
      {
        onSuccess: () => {
          navigate('/', { replace: true })
        },
      }
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
        <div className="p-6 space-y-1">
          <h2 className="text-2xl font-bold text-center">
            账号登录
          </h2>
          <p className="text-center text-muted-foreground">
            手动输入用户名和密码登录
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (loginError) {
                    resetLoginError()
                  }
                }}
                disabled={isLoggingIn}
                autoFocus
                className={loginError ? 'border-red-500' : ''}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码（如无可留空）"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (loginError) {
                    resetLoginError()
                  }
                }}
                disabled={isLoggingIn}
                className={loginError ? 'border-red-500' : ''}
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="p-3 text-sm rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-lg text-red-400">
                {loginError.message}
              </div>
            )}
          </div>

          <div className="p-6 pt-0 space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn || !username.trim()}
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
              onClick={() => navigate('/server-config')}
              disabled={isLoggingIn}
            >
              返回服务器配置
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
