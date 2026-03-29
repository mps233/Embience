import { OPENSUBTITLES_ENABLED, OPENSUBTITLES_PROXY_URL } from '@/utils/constants'
import type {
  OpenSubtitlesSearchParams,
  OpenSubtitlesSubtitleResult,
} from '@/types/opensubtitles'

type OpenSubtitlesApiItem = {
  id?: string | number
  attributes?: Record<string, unknown>
}

type OpenSubtitlesApiResponse = {
  data?: OpenSubtitlesApiItem[]
}

function getOpenSubtitlesProxyBaseUrl(): string {
  const fallback = '/api/opensubtitles'
  const configuredValue = OPENSUBTITLES_PROXY_URL?.trim()

  if (!configuredValue) {
    return fallback
  }

  const normalizedValue = configuredValue.replace(/\/+$/, '')
  if (
    normalizedValue === '/api/v1' ||
    normalizedValue === '/api/v1/subtitles' ||
    normalizedValue.endsWith('/api/v1')
  ) {
    return fallback
  }

  try {
    const url = new URL(configuredValue, window.location.origin)

    if (
      (url.origin === window.location.origin && url.pathname === '/api/v1') ||
      url.pathname === '/api/v1/subtitles' ||
      url.hostname === 'api.opensubtitles.com'
    ) {
      return fallback
    }

    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return normalizedValue
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function normalizeSubtitleResult(item: OpenSubtitlesApiItem): OpenSubtitlesSubtitleResult {
  const attributes = item.attributes || {}
  const files = Array.isArray(attributes.files) ? attributes.files : []
  const firstFile = files[0] as Record<string, unknown> | undefined
  const featureDetails = (attributes.feature_details || {}) as Record<string, unknown>
  const uploader = (attributes.uploader || {}) as Record<string, unknown>

  const releaseName =
    (attributes.release as string | undefined) ||
    (attributes.file_name as string | undefined) ||
    (firstFile?.file_name as string | undefined) ||
    (attributes.movie_name as string | undefined) ||
    '未命名字幕'

  return {
    id: String(item.id || releaseName),
    language: (attributes.language as string | undefined) || '未知语言',
    releaseName,
    fileName:
      (attributes.file_name as string | undefined) ||
      (firstFile?.file_name as string | undefined),
    fileId: toNumber(firstFile?.file_id),
    downloadCount:
      toNumber(attributes.download_count) ||
      toNumber(attributes.new_download_count),
    hearingImpaired: Boolean(attributes.hearing_impaired),
    fps: toNumber(attributes.fps),
    rating: toNumber(attributes.ratings) || toNumber(attributes.points),
    uploader: (uploader.name as string | undefined) || (attributes.uploader_name as string | undefined),
    matchedBy: attributes.matched_by as string | undefined,
    aiTranslated: Boolean(attributes.ai_translated),
    detailUrl: attributes.url as string | undefined,
    featureTitle:
      (featureDetails.movie_name as string | undefined) ||
      (attributes.feature_title as string | undefined) ||
      (attributes.movie_name as string | undefined),
    seasonNumber: toNumber(featureDetails.season_number) || toNumber(attributes.season_number),
    episodeNumber: toNumber(featureDetails.episode_number) || toNumber(attributes.episode_number),
    year: toNumber(featureDetails.year) || toNumber(attributes.year),
  }
}

export async function searchOpenSubtitles(
  params: OpenSubtitlesSearchParams
): Promise<OpenSubtitlesSubtitleResult[]> {
  if (!OPENSUBTITLES_ENABLED) {
    throw new Error('未启用 OpenSubtitles 搜索，请先配置代理环境变量')
  }

  const query = params.query.trim()
  if (!query) {
    return []
  }

  const searchParams = new URLSearchParams()
  searchParams.set('query', query)
  searchParams.set('order_by', 'download_count')
  searchParams.set('order_direction', 'desc')

  if (params.languages.length > 0) {
    searchParams.set('languages', params.languages.join(','))
  }

  if (params.type) {
    searchParams.set('type', params.type)
  }

  if (params.seasonNumber !== undefined) {
    searchParams.set('season_number', String(params.seasonNumber))
  }

  if (params.episodeNumber !== undefined) {
    searchParams.set('episode_number', String(params.episodeNumber))
  }

  if (params.year !== undefined) {
    searchParams.set('year', String(params.year))
  }

  const proxyBaseUrl = getOpenSubtitlesProxyBaseUrl()
  const response = await fetch(`${proxyBaseUrl}/subtitles?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = (await response.json().catch(() => null)) as
    | OpenSubtitlesApiResponse
    | { message?: string }
    | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : '字幕搜索失败，请稍后重试'
    throw new Error(message)
  }

  const items =
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray(payload.data)
      ? payload.data
      : []
  return items.map(normalizeSubtitleResult)
}
