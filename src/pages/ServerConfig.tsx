/**
 * 单页接入流程
 *
 * 第一步：配置并验证媒体/弹幕服务器
 * 第二步：在同页完成账号登录
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronRight,
  LockKeyhole,
  MessageSquare,
  MoveRight,
  Server,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createEmbyClient } from '@/services/api/embyClient'
import { detectMediaServer, formatServerUrl, type MediaServerType } from '@/services/api/mediaServer'
import { createAuthService } from '@/services/auth/authService'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { DEFAULT_EMBY_SERVER_URL, DANMAKU_API_URL, STORAGE_KEYS } from '@/utils/constants'
import { getStorageItem, removeStorageItem, setStorageItem } from '@/utils/storage'

function validateServerUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false
    }
    if (!urlObj.hostname) {
      return false
    }
    return true
  } catch {
    return false
  }
}

type SetupStep = 'connect' | 'shift' | 'login'

export default function ServerConfig() {
  const navigate = useNavigate()
  const { serverUrl: storedServerUrl, serverType: storedServerType, isAuthenticated } = useAuthStore()

  const [step, setStep] = useState<SetupStep>(storedServerUrl ? 'login' : 'connect')
  const [serverUrl, setServerUrl] = useState(storedServerUrl || DEFAULT_EMBY_SERVER_URL)
  const [serverType, setServerType] = useState<MediaServerType | null>(storedServerType || null)
  const [connectedServerUrl, setConnectedServerUrl] = useState(storedServerUrl || DEFAULT_EMBY_SERVER_URL)
  const [connectedServerType, setConnectedServerType] = useState<MediaServerType | null>(storedServerType || null)
  const [danmakuServerUrl, setDanmakuServerUrl] = useState(
    getStorageItem<string>(STORAGE_KEYS.DANMAKU_SERVER_URL) || DANMAKU_API_URL
  )
  const [isValidating, setIsValidating] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const transitionTimerRef = useRef<number | null>(null)
  const hasInitializedFromStoreRef = useRef(false)
  const isStep1Locked = step !== 'connect'

  const authService = useMemo(() => {
    if (!connectedServerUrl) return null
    const apiClient = createEmbyClient({
      serverUrl: connectedServerUrl,
      serverType: connectedServerType || undefined,
    })
    return createAuthService(apiClient)
  }, [connectedServerType, connectedServerUrl])

  const { login, isLoggingIn, loginError, resetLoginError } = useAuth(authService, {
    loadPublicUsers: false,
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasInitializedFromStoreRef.current && storedServerUrl) {
      hasInitializedFromStoreRef.current = true
      setStep('login')
      setServerUrl(storedServerUrl)
      setServerType(storedServerType || null)
      setConnectedServerUrl(storedServerUrl)
      setConnectedServerType(storedServerType || null)
    }
  }, [storedServerType, storedServerUrl])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setConnectionError(null)

    if (!serverUrl.trim()) {
      setConnectionError('请输入服务器地址')
      return
    }

    if (!validateServerUrl(serverUrl)) {
      setConnectionError('服务器地址格式不正确，请使用 http://hostname:port 或 https://hostname:port 格式')
      return
    }

    if (danmakuServerUrl.trim() && !validateServerUrl(danmakuServerUrl)) {
      setConnectionError('弹幕服务器地址格式不正确，请使用 http://hostname:port 或 https://hostname:port/path 格式')
      return
    }

    setIsValidating(true)

    try {
      const formattedUrl = formatServerUrl(serverUrl)
      const formattedDanmakuUrl = danmakuServerUrl.trim()
        ? danmakuServerUrl.trim().replace(/\/$/, '')
        : ''
      const connection = await detectMediaServer(formattedUrl)

      const client = createEmbyClient({
        serverUrl: connection.serverUrl,
        serverType: connection.serverType,
      })

      const publicUsers = await client.get('/Users/Public', undefined, { skipAuth: true })
      console.log('服务器连接成功（通过 /Users/Public）:', publicUsers)

      hasInitializedFromStoreRef.current = true
      setServerUrl(connection.serverUrl)
      setServerType(connection.serverType)
      setConnectedServerUrl(connection.serverUrl)
      setConnectedServerType(connection.serverType)

      setStorageItem(STORAGE_KEYS.SERVER_URL, connection.serverUrl)
      setStorageItem(STORAGE_KEYS.SERVER_TYPE, connection.serverType)

      if (formattedDanmakuUrl) {
        setStorageItem(STORAGE_KEYS.DANMAKU_SERVER_URL, formattedDanmakuUrl)
      } else {
        removeStorageItem(STORAGE_KEYS.DANMAKU_SERVER_URL)
      }

      setStep('shift')
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current)
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setStep('login')
      }, 320)
    } catch (err) {
      console.error('服务器连接失败:', err)

      if (err instanceof Error) {
        if (err.message.includes('网络连接失败')) {
          setConnectionError('无法连接到服务器，请检查服务器地址和网络连接')
        } else if (err.message.includes('请求失败')) {
          setConnectionError('服务器响应异常，请确认这是一个有效的 Emby 或 Jellyfin 服务器地址')
        } else {
          setConnectionError(`连接失败: ${err.message}`)
        }
      } else {
        setConnectionError('连接失败，请检查服务器地址是否正确')
      }
    } finally {
      setIsValidating(false)
    }
  }

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
          navigate('/home', { replace: true })
        },
      }
    )
  }

  const handleBackToConnect = () => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current)
    }
    setStep('connect')
    resetLoginError()
  }

  return (
    <div className="relative min-h-screen overflow-y-auto bg-[#0b0d12] p-4 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.11),transparent_24%),linear-gradient(180deg,#10131a_0%,#0b0d12_48%,#090b10_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-60" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-start justify-center py-6 lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="w-full px-1 sm:px-2">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/46">
                Setup Flow
              </div>
              <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-white sm:text-[2.2rem]">
                连接并登录你的媒体空间
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/48">
                先确认服务地址，再继续完成账号登录。
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/42 lg:flex">
              <span className={step === 'connect' ? 'text-white/88' : ''}>1. 服务</span>
              <MoveRight className="h-3.5 w-3.5" />
              <span className={step === 'login' ? 'text-white/88' : ''}>2. 账号</span>
            </div>
          </div>

          <div
            className={[
              'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
              step === 'connect'
                ? 'mx-auto max-w-2xl'
                : 'lg:grid lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] lg:items-center',
            ].join(' ')}
          >
            <div
              className={[
                'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:shrink-0',
                step !== 'connect' ? 'lg:w-auto lg:max-w-none' : 'mx-auto max-w-2xl lg:w-full',
              ].join(' ')}
            >
            <section
              className={[
                'rounded-[28px] border border-white/10 bg-black/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isStep1Locked ? 'lg:opacity-80' : '',
              ].join(' ')}
            >
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                  <Server className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/34">Step 1</div>
                  <h2 className="mt-2 text-xl font-medium text-white/90">连接服务</h2>
                  <p className="mt-1 text-sm leading-6 text-white/44">
                    验证通过后，右侧会继续进入账号登录。
                  </p>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-3">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                        <Server className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="serverUrl" className="text-[15px] font-medium text-white/90">
                            媒体服务器
                          </Label>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/44">
                            必填
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-white/46">
                          Emby 或 Jellyfin 地址，用于登录、媒体浏览与播放。
                        </p>
                      </div>
                    </div>

                    <Input
                      id="serverUrl"
                      type="text"
                      placeholder="http://192.168.1.100:8096"
                      value={serverUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerUrl(e.target.value)}
                      disabled={isValidating || isStep1Locked}
                      autoFocus
                      className={`h-12 rounded-2xl border-white/8 bg-white/[0.035] px-4 text-white placeholder:text-white/26 ${connectionError ? 'border-red-500/60' : 'focus-visible:border-white/16 focus-visible:ring-white/8'}`}
                    />
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="danmakuServerUrl" className="text-[15px] font-medium text-white/90">
                            弹幕服务器
                          </Label>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/44">
                            可选
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-white/46">
                          用于番剧匹配与弹幕加载。留空时将使用默认配置。
                        </p>
                      </div>
                    </div>

                    <Input
                      id="danmakuServerUrl"
                      type="text"
                      placeholder="https://api.dandanplay.net"
                      value={danmakuServerUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDanmakuServerUrl(e.target.value)}
                      disabled={isValidating || isStep1Locked}
                      className="h-12 rounded-2xl border-white/8 bg-white/[0.035] px-4 text-white placeholder:text-white/26 focus-visible:border-white/16 focus-visible:ring-white/8"
                    />
                  </div>
                </div>

                {connectionError && (
                  <div className="rounded-2xl border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-200/88">
                    {connectionError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.07))] text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]"
                  disabled={isValidating || isStep1Locked}
                >
                  {isValidating ? (
                    <>
                      <span>验证连接中</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    <>
                      <span>继续</span>
                      <ChevronRight className="h-4.5 w-4.5" />
                    </>
                  )}
                </Button>
              </form>
            </section>
            </div>

            <div
              className={[
                'pointer-events-none hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex lg:items-center lg:justify-center',
                step === 'connect' ? 'lg:w-0 lg:opacity-0' : 'lg:w-[120px] lg:opacity-100',
              ].join(' ')}
            >
              <div
                className={[
                  'flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  step === 'connect' ? 'translate-x-2 scale-90' : 'translate-x-0 scale-100',
                ].join(' ')}
              >
                <MoveRight className="h-5 w-5" />
              </div>
            </div>

            <div
              className={[
                'overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:shrink-0',
                step === 'connect'
                  ? 'pointer-events-none max-h-0 opacity-0 translate-y-3 lg:mt-0 lg:w-0 lg:max-h-0 lg:translate-x-8'
                  : step === 'shift'
                    ? 'pointer-events-none mt-5 opacity-0 max-h-[1200px] translate-y-2 lg:mt-0 lg:w-auto lg:max-h-none lg:translate-x-4'
                    : 'mt-5 opacity-100 max-h-[1200px] translate-y-0 lg:mt-0 lg:w-auto lg:max-h-none lg:translate-x-0',
              ].join(' ')}
            >
            <section
              className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[28px] border border-white/10 bg-black/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/34">Step 2</div>
                  <h2 className="mt-1.5 text-lg font-medium text-white/90">账号登录</h2>
                  <p className="mt-1 text-sm leading-5 text-white/44">
                    连接通过后，输入用户名和密码，继续进入媒体主页。
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/34">当前连接</div>
                <div className="mt-1.5 break-all text-sm leading-5 text-white/64">{connectedServerUrl || serverUrl}</div>
                <div className="mt-1.5 text-xs text-white/34">
                  {(connectedServerType || serverType) === 'jellyfin' ? 'Jellyfin' : 'Emby'} 已准备就绪
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="mb-2.5 flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="username" className="text-[15px] font-medium text-white/90">
                        用户名
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-white/42">输入你在媒体服务器中创建的账号名。</p>
                    </div>
                  </div>

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
                    disabled={isLoggingIn || step !== 'login'}
                    autoComplete="username"
                    className={`h-11 rounded-2xl border-white/8 bg-white/[0.035] px-4 text-white placeholder:text-white/26 ${loginError ? 'border-red-500/60' : 'focus-visible:border-white/16 focus-visible:ring-white/8'}`}
                  />
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="mb-2.5 flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/76">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="password" className="text-[15px] font-medium text-white/90">
                        密码
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-white/42">如果该账号未设置密码，可以留空直接尝试登录。</p>
                    </div>
                  </div>

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
                    disabled={isLoggingIn || step !== 'login'}
                    autoComplete="current-password"
                    className={`h-11 rounded-2xl border-white/8 bg-white/[0.035] px-4 text-white placeholder:text-white/26 ${loginError ? 'border-red-500/60' : 'focus-visible:border-white/16 focus-visible:ring-white/8'}`}
                  />
                </div>

                {loginError && (
                  <div className="rounded-2xl border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-200/88">
                    {loginError.message}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.07))] text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]"
                    disabled={isLoggingIn || !username.trim() || step !== 'login'}
                  >
                    {isLoggingIn ? (
                      <>
                        <span>登录中</span>
                        <span className="animate-spin">⏳</span>
                      </>
                    ) : (
                      <>
                        <span>进入主页</span>
                        <ChevronRight className="h-4.5 w-4.5" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full rounded-2xl border-white/10 bg-white/[0.035] text-white/76 hover:bg-white/[0.06] hover:text-white"
                    onClick={handleBackToConnect}
                    disabled={isLoggingIn}
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                    返回修改服务地址
                  </Button>
                </div>
              </form>
            </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
