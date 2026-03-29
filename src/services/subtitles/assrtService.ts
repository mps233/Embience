import { ASSRT_ENABLED, ASSRT_PROXY_URL } from '@/utils/constants'
import type {
  AssrtSearchParams,
  AssrtSubtitleResult,
  AssrtSubtitleFile,
  ResolvedAssrtSubtitle,
} from '@/types/assrt'

type AssrtApiLang = {
  desc?: string
}

type AssrtApiProducer = {
  producer?: string
  uploader?: string
}

type AssrtApiFile = {
  url?: string
  f?: string
}

type AssrtApiSubtitle = {
  id?: string | number
  native_name?: string
  videoname?: string
  filename?: string
  subtype?: string
  upload_time?: string
  vote_score?: string | number
  down_count?: string | number
  release_site?: string
  lang?: AssrtApiLang
  producer?: AssrtApiProducer
  url?: string
  filelist?: AssrtApiFile[]
  title?: string
}

type AssrtSearchResponse = {
  status?: number
  errmsg?: string
  sub?: {
    subs?: AssrtApiSubtitle[]
  }
}

type AssrtDetailResponse = {
  status?: number
  errmsg?: string
  sub?: {
    subs?: AssrtApiSubtitle[]
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

function buildAssrtProxyBaseUrl(): string {
  const fallback = '/api/assrt'
  const configuredValue = ASSRT_PROXY_URL?.trim()

  if (!configuredValue) {
    return fallback
  }

  const normalizedValue = configuredValue.replace(/\/+$/, '')

  try {
    const url = new URL(normalizedValue, window.location.origin)
    if (url.hostname === 'api.assrt.net' || url.pathname === '/v1') {
      return fallback
    }

    return `${url.origin}${url.pathname}`.replace(/\/+$/, '')
  } catch {
    return normalizedValue
  }
}

function isChineseMatch(languageDesc: string): boolean {
  return /中|简|繁|双语/.test(languageDesc)
}

function isTraditionalChineseMatch(languageDesc: string): boolean {
  return /繁/.test(languageDesc)
}

function isEnglishMatch(languageDesc: string): boolean {
  return /英|双语/.test(languageDesc)
}

function matchesLanguagePreference(languageDesc: string, languageCode: string): boolean {
  const normalizedDesc = languageDesc.trim()

  if (!normalizedDesc) {
    return true
  }

  switch (languageCode) {
    case 'zh-cn':
      return isChineseMatch(normalizedDesc)
    case 'zh-tw':
      return isTraditionalChineseMatch(normalizedDesc) || isChineseMatch(normalizedDesc)
    case 'en':
      return isEnglishMatch(normalizedDesc)
    default:
      return true
  }
}

function applyLanguagePreference(
  results: AssrtSubtitleResult[],
  languages: string[]
): AssrtSubtitleResult[] {
  if (languages.length === 0) {
    return results
  }

  const filteredResults = results.filter((result) =>
    languages.some((languageCode) => matchesLanguagePreference(result.language, languageCode))
  )

  return filteredResults.length > 0 ? filteredResults : results
}

function normalizeSubtitleResult(item: AssrtApiSubtitle): AssrtSubtitleResult {
  const firstFile = Array.isArray(item.filelist) ? item.filelist[0] : undefined
  const releaseName =
    item.videoname?.trim() ||
    item.native_name?.trim() ||
    item.title?.trim() ||
    item.filename?.trim() ||
    '未命名字幕'

  return {
    id: String(item.id || releaseName),
    language: item.lang?.desc?.trim() || '未知语言',
    releaseName,
    fileName: firstFile?.f || item.filename,
    downloadCount: toNumber(item.down_count),
    rating: toNumber(item.vote_score),
    uploader: item.producer?.uploader || item.producer?.producer,
    detailUrl: item.url,
    downloadUrl: firstFile?.url || item.url,
    featureTitle: item.native_name || item.title,
    subtitleType: item.subtype,
    releaseSite: item.release_site,
    uploadTime: item.upload_time,
  }
}

function detectAssrtSubtitleFileFormat(fileName?: string): string | undefined {
  const normalizedName = fileName?.trim().toLowerCase() || ''

  if (normalizedName.endsWith('.vtt')) {
    return 'vtt'
  }

  if (normalizedName.endsWith('.srt')) {
    return 'srt'
  }

  if (normalizedName.endsWith('.ass')) {
    return 'ass'
  }

  if (normalizedName.endsWith('.ssa')) {
    return 'ssa'
  }

  if (normalizedName.endsWith('.zip')) {
    return 'zip'
  }

  return undefined
}

function buildAssrtFileProxyUrl(fileUrl: string): string {
  const proxyBaseUrl = buildAssrtProxyBaseUrl()
  // 把完整 URL 拼到路径里，避免 nginx proxy_pass 变量模式下查询参数被重复追加
  return `${proxyBaseUrl}/file/${fileUrl}`
}

function normalizeAssrtSubtitleFile(item: AssrtApiFile): AssrtSubtitleFile | null {
  if (!item.url || !item.f) {
    return null
  }

  return {
    fileName: item.f,
    downloadUrl: item.url,
    proxiedDownloadUrl: buildAssrtFileProxyUrl(item.url),
    format: detectAssrtSubtitleFileFormat(item.f),
  }
}

function prioritizeAssrtSubtitleFiles(files: AssrtSubtitleFile[]): AssrtSubtitleFile[] {
  const order = new Map([
    ['vtt', 0],
    ['srt', 1],
    ['ass', 2],
    ['ssa', 3],
    ['zip', 99],
  ])

  return [...files].sort((left, right) => {
    const leftOrder = order.get(left.format || '') ?? 50
    const rightOrder = order.get(right.format || '') ?? 50
    return leftOrder - rightOrder
  })
}

async function fetchAssrtJson<T extends { status?: number; errmsg?: string }>(
  path: string,
  searchParams: URLSearchParams
): Promise<T> {
  const proxyBaseUrl = buildAssrtProxyBaseUrl()
  const response = await fetch(`${proxyBaseUrl}${path}?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof payload.errmsg === 'string'
        ? payload.errmsg
        : 'ASSRT 搜索失败，请稍后重试'
    throw new Error(message)
  }

  if (!payload) {
    throw new Error('ASSRT 返回了空响应')
  }

  if (payload.status && payload.status !== 0) {
    throw new Error(payload.errmsg || 'ASSRT 请求失败，请稍后重试')
  }

  return payload
}

export async function searchAssrtSubtitles(
  params: AssrtSearchParams
): Promise<AssrtSubtitleResult[]> {
  if (!ASSRT_ENABLED) {
    throw new Error('未启用 ASSRT 搜索，请先配置 ASSRT_TOKEN')
  }

  const query = params.query.trim()
  if (query.length < 2) {
    return []
  }

  const searchParams = new URLSearchParams()
  searchParams.set('q', query)
  searchParams.set('cnt', '15')
  searchParams.set('no_muxer', '1')

  const payload = await fetchAssrtJson<AssrtSearchResponse>('/sub/search', searchParams)
  const items = Array.isArray(payload.sub?.subs) ? payload.sub.subs : []
  const normalizedResults = items.map(normalizeSubtitleResult)

  return applyLanguagePreference(normalizedResults, params.languages)
}

export async function resolveAssrtSubtitleDownloadUrl(subtitleId: string): Promise<string> {
  if (!ASSRT_ENABLED) {
    throw new Error('未启用 ASSRT 搜索，请先配置 ASSRT_TOKEN')
  }

  const searchParams = new URLSearchParams()
  searchParams.set('id', subtitleId)

  const payload = await fetchAssrtJson<AssrtDetailResponse>('/sub/detail', searchParams)
  const subtitle = Array.isArray(payload.sub?.subs) ? payload.sub.subs[0] : undefined

  if (!subtitle) {
    throw new Error('没有找到对应的字幕详情')
  }

  const normalizedResult = normalizeSubtitleResult(subtitle)

  if (normalizedResult.downloadUrl) {
    return normalizedResult.downloadUrl
  }

  if (normalizedResult.detailUrl) {
    return normalizedResult.detailUrl
  }

  throw new Error('ASSRT 没有返回可用的字幕下载地址')
}

export async function resolveAssrtSubtitle(subtitleId: string): Promise<ResolvedAssrtSubtitle> {
  if (!ASSRT_ENABLED) {
    throw new Error('未启用 ASSRT 搜索，请先配置 ASSRT_TOKEN')
  }

  const searchParams = new URLSearchParams()
  searchParams.set('id', subtitleId)

  const payload = await fetchAssrtJson<AssrtDetailResponse>('/sub/detail', searchParams)
  const subtitle = Array.isArray(payload.sub?.subs) ? payload.sub.subs[0] : undefined

  if (!subtitle) {
    throw new Error('没有找到对应的字幕详情')
  }

  const normalizedResult = normalizeSubtitleResult(subtitle)
  const files = prioritizeAssrtSubtitleFiles(
    (Array.isArray(subtitle.filelist) ? subtitle.filelist : [])
      .map(normalizeAssrtSubtitleFile)
      .filter((item): item is AssrtSubtitleFile => item !== null)
  )

  return {
    id: normalizedResult.id,
    language: normalizedResult.language,
    releaseName: normalizedResult.releaseName,
    archiveFileName: subtitle.filename,
    archiveDownloadUrl: subtitle.url,
    files,
  }
}
