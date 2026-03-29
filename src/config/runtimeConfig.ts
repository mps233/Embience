interface RuntimeConfigShape {
  VITE_EMBY_SERVER_URL?: string
  VITE_DANMAKU_API_URL?: string
  VITE_APP_VERSION?: string
  VITE_APP_NAME?: string
  VITE_CLIENT_NAME?: string
  VITE_ASSRT_ENABLED?: string
  VITE_ASSRT_PROXY_URL?: string
  VITE_OPENSUBTITLES_ENABLED?: string
  VITE_OPENSUBTITLES_PROXY_URL?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfigShape
  }
}

function getRuntimeValue(key: keyof RuntimeConfigShape): string | undefined {
  const buildValue = import.meta.env[key]?.trim()

  // 开发环境优先使用 Vite 注入的 env，避免浏览器缓存的旧 config.js 覆盖本地调试配置。
  if (import.meta.env.DEV && buildValue) {
    return buildValue
  }

  const runtimeValue = window.__APP_CONFIG__?.[key]?.trim();

  if (runtimeValue) {
    return runtimeValue
  }

  return buildValue || undefined
}

function normalizeOpenSubtitlesProxyUrl(value?: string): string {
  const fallback = '/api/opensubtitles'

  if (!value) {
    return fallback
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return fallback
  }

  const normalizedPath = trimmedValue.replace(/\/+$/, '')

  if (
    normalizedPath === '/api/v1' ||
    normalizedPath === '/api/v1/subtitles' ||
    normalizedPath.endsWith('/api/v1')
  ) {
    return fallback
  }

  try {
    const url = new URL(trimmedValue, window.location.origin)

    if (
      url.hostname === 'api.opensubtitles.com' ||
      url.pathname === '/api/v1' ||
      url.pathname === '/api/v1/subtitles'
    ) {
      return fallback
    }

    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return normalizedPath
  }
}

function normalizeAssrtProxyUrl(value?: string): string {
  const fallback = '/api/assrt'

  if (!value) {
    return fallback
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return fallback
  }

  const normalizedPath = trimmedValue.replace(/\/+$/, '')

  try {
    const url = new URL(trimmedValue, window.location.origin)

    if (url.hostname === 'api.assrt.net' || url.pathname === '/v1') {
      return fallback
    }

    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return normalizedPath
  }
}

export const runtimeConfig = {
  embyServerUrl: getRuntimeValue('VITE_EMBY_SERVER_URL') || '',
  danmakuApiUrl: getRuntimeValue('VITE_DANMAKU_API_URL') || 'https://api.dandanplay.net',
  appVersion: getRuntimeValue('VITE_APP_VERSION') || '1.0.0',
  appName: getRuntimeValue('VITE_APP_NAME') || 'Embience',
  clientName: getRuntimeValue('VITE_CLIENT_NAME') || 'Embience Web',
  assrtEnabled: getRuntimeValue('VITE_ASSRT_ENABLED') === 'true',
  assrtProxyUrl: normalizeAssrtProxyUrl(getRuntimeValue('VITE_ASSRT_PROXY_URL')),
  openSubtitlesEnabled: getRuntimeValue('VITE_OPENSUBTITLES_ENABLED') === 'true',
  openSubtitlesProxyUrl: normalizeOpenSubtitlesProxyUrl(
    getRuntimeValue('VITE_OPENSUBTITLES_PROXY_URL')
  ),
}
