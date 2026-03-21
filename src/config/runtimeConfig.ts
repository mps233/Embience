interface RuntimeConfigShape {
  VITE_EMBY_SERVER_URL?: string
  VITE_DANMAKU_API_URL?: string
  VITE_APP_VERSION?: string
  VITE_APP_NAME?: string
  VITE_CLIENT_NAME?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfigShape
  }
}

function getRuntimeValue(key: keyof RuntimeConfigShape): string | undefined {
  const runtimeValue = window.__APP_CONFIG__?.[key]?.trim();

  if (runtimeValue) {
    return runtimeValue
  }

  const buildValue = import.meta.env[key]?.trim()
  return buildValue || undefined
}

export const runtimeConfig = {
  embyServerUrl: getRuntimeValue('VITE_EMBY_SERVER_URL') || '',
  danmakuApiUrl: getRuntimeValue('VITE_DANMAKU_API_URL') || 'https://api.dandanplay.net',
  appVersion: getRuntimeValue('VITE_APP_VERSION') || '1.0.0',
  appName: getRuntimeValue('VITE_APP_NAME') || 'Embience',
  clientName: getRuntimeValue('VITE_CLIENT_NAME') || 'Embience Web',
}
