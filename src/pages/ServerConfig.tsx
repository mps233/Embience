/**
 * 服务器配置页面
 * 
 * 允许用户输入 Emby 服务器 URL 并验证连接
 * 连接成功后存储服务器 URL 并导航到登录页面
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createEmbyClient } from '@/services/api/embyClient'
import { detectMediaServer, formatServerUrl } from '@/services/api/mediaServer'
import { useAuthStore } from '@/stores/authStore'
import type { SystemInfo } from '@/types/emby'

/**
 * 验证服务器 URL 格式
 * 必须是 http:// 或 https:// 开头，包含主机名和可选端口
 */
function validateServerUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    // 只允许 http 和 https 协议
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false
    }
    // 必须有主机名
    if (!urlObj.hostname) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export default function ServerConfig() {
  const navigate = useNavigate()
  const [serverUrl, setServerUrl] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 处理表单提交
   * 验证服务器 URL 格式并测试连接
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证 URL 格式
    if (!serverUrl.trim()) {
      setError('请输入服务器地址')
      return
    }

    if (!validateServerUrl(serverUrl)) {
      setError('服务器地址格式不正确，请使用 http://hostname:port 或 https://hostname:port 格式')
      return
    }

    setIsValidating(true)

    try {
      // 格式化 URL
      const formattedUrl = formatServerUrl(serverUrl)
      const connection = await detectMediaServer(formattedUrl)

      // 创建临时 API 客户端
      const client = createEmbyClient({
        serverUrl: connection.serverUrl,
        serverType: connection.serverType,
      })

      // 尝试调用 Users/Public 端点验证连接
      // 这个端点通常是公开的，不需要认证
      try {
        const publicUsers = await client.get('/Users/Public', undefined, { skipAuth: true })
        console.log('服务器连接成功（通过 /Users/Public）:', publicUsers)
      } catch (publicError) {
        // 如果 /Users/Public 也失败，尝试 /System/Info
        console.log('/Users/Public 失败，尝试 /System/Info')
        const systemInfo = await client.get<SystemInfo>('/System/Info', undefined, { skipAuth: true })
        console.log('服务器连接成功（通过 /System/Info）:', systemInfo)
      }

      // 存储服务器 URL 到 authStore
      useAuthStore.getState().setServerUrl(connection.serverUrl, connection.serverType)

      // 导航到登录页面
      navigate('/login')
    } catch (err) {
      console.error('服务器连接失败:', err)
      
      // 根据错误类型显示不同的消息
      if (err instanceof Error) {
        if (err.message.includes('网络连接失败')) {
          setError('无法连接到服务器，请检查服务器地址和网络连接')
        } else if (err.message.includes('请求失败')) {
          setError('服务器响应异常，请确认这是一个有效的 Emby 或 Jellyfin 服务器地址')
        } else {
          setError(`连接失败: ${err.message}`)
        }
      } else {
        setError('连接失败，请检查服务器地址是否正确')
      }
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/8 backdrop-blur-2xl shadow-glass-xl dark:bg-white/5 dark:border-white/10">
        <div className="p-6 space-y-1">
          <h2 className="text-2xl font-bold text-center">
            配置媒体服务器
          </h2>
          <p className="text-center text-muted-foreground">
            请输入您的 Emby 或 Jellyfin 服务器地址以开始使用
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serverUrl">服务器地址</Label>
              <Input
                id="serverUrl"
                type="text"
                placeholder="http://192.168.1.100:8096"
                value={serverUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerUrl(e.target.value)}
                disabled={isValidating}
                className={error ? 'border-red-500' : ''}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                格式：http://hostname:port 或 https://hostname:port
              </p>
            </div>

            {error && (
              <div className="p-3 text-sm rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-lg text-red-400">
                {error}
              </div>
            )}
          </div>

          <div className="p-6 pt-0">
            <Button
              type="submit"
              className="w-full"
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <span className="mr-2">验证连接中...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                '连接服务器'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
