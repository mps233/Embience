/**
 * OpenSubtitles 搜索相关类型
 */

export interface OpenSubtitlesSearchParams {
  query: string
  languages: string[]
  seasonNumber?: number
  episodeNumber?: number
  year?: number
  type?: 'movie' | 'episode'
}

export interface OpenSubtitlesSubtitleResult {
  id: string
  language: string
  releaseName: string
  fileName?: string
  fileId?: number
  downloadCount?: number
  hearingImpaired?: boolean
  fps?: number
  rating?: number
  uploader?: string
  matchedBy?: string
  aiTranslated?: boolean
  detailUrl?: string
  featureTitle?: string
  seasonNumber?: number
  episodeNumber?: number
  year?: number
}
