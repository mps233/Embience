/**
 * 媒体服务器适配工具
 *
 * 用于统一处理 Emby 和 Jellyfin 之间的 API 根路径、认证头和 URL 构造差异。
 */

export type MediaServerType = 'emby' | 'jellyfin'

export interface MediaServerConnection {
  serverUrl: string
  serverType: MediaServerType
}

type QueryValue = string | number | boolean | null | undefined

/**
 * 格式化服务器 URL
 */
export function formatServerUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

/**
 * 获取 API 根路径
 */
export function getApiBaseUrl(serverUrl: string, serverType: MediaServerType): string {
  const normalizedUrl = formatServerUrl(serverUrl)

  if (serverType === 'emby' && !normalizedUrl.toLowerCase().endsWith('/emby')) {
    return `${normalizedUrl}/emby`
  }

  return normalizedUrl
}

/**
 * 获取 Authorization 头前缀
 */
export function getAuthorizationScheme(serverType: MediaServerType): 'Emby' | 'MediaBrowser' {
  return serverType === 'jellyfin' ? 'MediaBrowser' : 'Emby'
}

/**
 * 获取 token 头名称
 */
export function getTokenHeaderName(serverType: MediaServerType): 'X-Emby-Token' | 'X-MediaBrowser-Token' {
  return serverType === 'jellyfin' ? 'X-MediaBrowser-Token' : 'X-Emby-Token'
}

/**
 * 获取 token 查询参数名称
 */
export function getTokenQueryParamName(serverType: MediaServerType): 'api_key' | 'ApiKey' {
  return serverType === 'jellyfin' ? 'ApiKey' : 'api_key'
}

/**
 * 获取兼容 Emby/Jellyfin 的 token 查询参数
 */
export function getCompatibleTokenQueryParams(token: string): Record<'api_key' | 'ApiKey', string> {
  return {
    api_key: token,
    ApiKey: token,
  }
}

/**
 * 构建完整 API URL
 */
export function buildApiUrl(
  serverUrl: string,
  path: string,
  serverType: MediaServerType,
  query?: Record<string, QueryValue>
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${getApiBaseUrl(serverUrl, serverType)}${normalizedPath}`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

/**
 * 构建带认证查询参数的 API URL
 */
export function buildAuthenticatedApiUrl(
  serverUrl: string,
  path: string,
  token: string,
  serverType: MediaServerType,
  query?: Record<string, QueryValue>
): string {
  return buildApiUrl(serverUrl, path, serverType, {
    ...query,
    ...getCompatibleTokenQueryParams(token),
  })
}

function inferServerTypeFromPayload(payload: unknown): MediaServerType | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const record = payload as Record<string, unknown>
  const productName = String(record.ProductName || record.productName || '')
  const serverName = String(record.ServerName || record.serverName || '')
  const combined = `${productName} ${serverName}`.toLowerCase()

  if (combined.includes('jellyfin')) {
    return 'jellyfin'
  }

  if (combined.includes('emby')) {
    return 'emby'
  }

  return null
}

/**
 * 探测媒体服务器类型
 */
export async function detectMediaServer(serverUrl: string): Promise<MediaServerConnection> {
  const normalizedUrl = formatServerUrl(serverUrl)
  const preferEmby = normalizedUrl.toLowerCase().endsWith('/emby')
  const candidates: MediaServerType[] = preferEmby ? ['emby', 'jellyfin'] : ['jellyfin', 'emby']

  for (const serverType of candidates) {
    const apiBaseUrl = getApiBaseUrl(normalizedUrl, serverType)

    const systemInfo = await probeEndpoint(`${apiBaseUrl}/System/Info`)
    if (systemInfo.ok) {
      return {
        serverUrl: normalizedUrl,
        serverType: inferServerTypeFromPayload(systemInfo.payload) || serverType,
      }
    }

    const publicUsers = await probeEndpoint(`${apiBaseUrl}/Users/Public`)
    if (publicUsers.ok) {
      return {
        serverUrl: normalizedUrl,
        serverType: inferServerTypeFromPayload(publicUsers.payload) || serverType,
      }
    }
  }

  throw new Error('无法识别服务器类型，请确认输入的是有效的 Emby 或 Jellyfin 服务器地址')
}

async function probeEndpoint(url: string): Promise<{ ok: boolean; payload?: unknown }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return { ok: false }
    }

    try {
      return {
        ok: true,
        payload: await response.json(),
      }
    } catch {
      return { ok: true }
    }
  } catch {
    return { ok: false }
  }
}
