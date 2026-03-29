/**
 * ASSRT 搜索相关类型
 */

export interface AssrtSearchParams {
  query: string
  languages: string[]
  seasonNumber?: number
  episodeNumber?: number
  year?: number
  type?: 'movie' | 'episode'
}

export interface AssrtSubtitleResult {
  id: string
  language: string
  releaseName: string
  fileName?: string
  downloadCount?: number
  rating?: number
  uploader?: string
  detailUrl?: string
  downloadUrl?: string
  featureTitle?: string
  subtitleType?: string
  releaseSite?: string
  uploadTime?: string
}

export interface AssrtSubtitleFile {
  fileName: string
  downloadUrl: string
  proxiedDownloadUrl: string
  format?: string
}

export interface ResolvedAssrtSubtitle {
  id: string
  language: string
  releaseName: string
  archiveFileName?: string
  archiveDownloadUrl?: string
  files: AssrtSubtitleFile[]
}
