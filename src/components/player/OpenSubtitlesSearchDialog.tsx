import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import type { MediaItem } from '@/types/emby'
import type { AssrtSubtitleResult, ResolvedAssrtSubtitle } from '@/types/assrt'
import {
  resolveAssrtSubtitle,
  searchAssrtSubtitles,
} from '@/services/subtitles/assrtService'
import { ASSRT_ENABLED } from '@/utils/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OpenSubtitlesSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mediaItem: MediaItem
  subtitleLanguagePreference?: string
  onApplySubtitle?: (subtitle: ResolvedAssrtSubtitle) => Promise<void>
}

const LANGUAGE_OPTIONS = [
  { value: 'zh-cn', label: '简体中文' },
  { value: 'zh-tw', label: '繁体中文' },
  { value: 'zh-cn,zh-tw,en', label: '中文字幕优先' },
  { value: 'en', label: '英文' },
]

function getDefaultQuery(mediaItem: MediaItem): string {
  if (mediaItem.type === 'Episode') {
    return mediaItem.seriesName || mediaItem.name
  }

  return mediaItem.name
}

function getDefaultLanguage(preference?: string): string {
  const normalized = preference?.toLowerCase()

  if (!normalized) {
    return 'zh-cn'
  }

  if (normalized.includes('tw') || normalized.includes('hant')) {
    return 'zh-tw'
  }

  if (normalized.includes('en')) {
    return 'en'
  }

  return 'zh-cn'
}

function formatUploadTime(uploadTime?: string): string | null {
  if (!uploadTime) {
    return null
  }

  const parsed = new Date(uploadTime)
  if (Number.isNaN(parsed.getTime())) {
    return uploadTime
  }

  return parsed.toLocaleDateString('zh-CN')
}

function formatSearchSummary(result: AssrtSubtitleResult): string {
  const uploadTimeLabel = formatUploadTime(result.uploadTime)
  const parts = [
    result.language,
    result.subtitleType ? result.subtitleType.toUpperCase() : '',
    result.releaseSite || '',
    uploadTimeLabel ? `上传 ${uploadTimeLabel}` : '',
  ].filter(Boolean)

  return parts.join(' · ')
}

export default function OpenSubtitlesSearchDialog({
  open,
  onOpenChange,
  mediaItem,
  subtitleLanguagePreference,
  onApplySubtitle,
}: OpenSubtitlesSearchDialogProps) {
  const defaultQuery = useMemo(() => getDefaultQuery(mediaItem), [mediaItem])
  const defaultLanguage = useMemo(
    () => getDefaultLanguage(subtitleLanguagePreference),
    [subtitleLanguagePreference]
  )

  const [query, setQuery] = useState(defaultQuery)
  const [languagePreset, setLanguagePreset] = useState(defaultLanguage)
  const [results, setResults] = useState<AssrtSubtitleResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const runSearch = async (nextQuery = query, nextLanguagePreset = languagePreset) => {
    const trimmedQuery = nextQuery.trim()
    if (trimmedQuery.length < 2) {
      setResults([])
      setHasSearched(true)
      setError('请至少输入 2 个字符后再搜索')
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const subtitles = await searchAssrtSubtitles({
        query: trimmedQuery,
        languages: nextLanguagePreset.split(','),
        type: mediaItem.type === 'Episode' ? 'episode' : 'movie',
        seasonNumber: mediaItem.type === 'Episode' ? mediaItem.parentIndexNumber : undefined,
        episodeNumber: mediaItem.type === 'Episode' ? mediaItem.indexNumber : undefined,
        year: mediaItem.productionYear,
      })
      setResults(subtitles)
    } catch (searchError) {
      setResults([])
      setError(
        searchError instanceof Error ? searchError.message : 'ASSRT 搜索失败，请稍后重试'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplySubtitle = async (result: AssrtSubtitleResult) => {
    setResolvingId(result.id)
    setError(null)

    try {
      const subtitleDetail = await resolveAssrtSubtitle(result.id)

      if (subtitleDetail.files.length > 0 && onApplySubtitle) {
        await onApplySubtitle(subtitleDetail)
        onOpenChange(false)
        return
      }

      if (subtitleDetail.archiveDownloadUrl) {
        window.open(subtitleDetail.archiveDownloadUrl, '_blank', 'noopener,noreferrer')
        setError('这个字幕条目只提供压缩包，当前先回退为浏览器下载。')
        return
      }

      throw new Error('这个字幕条目没有可直接应用的字幕文件')
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : '获取 ASSRT 字幕详情失败，请稍后重试'
      )
    } finally {
      setResolvingId(null)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    setQuery(defaultQuery)
    setLanguagePreset(defaultLanguage)
    setResults([])
    setError(null)
    setHasSearched(false)
    setResolvingId(null)

    if (ASSRT_ENABLED && defaultQuery) {
      void runSearch(defaultQuery, defaultLanguage)
    }
  }, [defaultLanguage, defaultQuery, open])

  const isSearchDisabled = query.trim().length < 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-white/10 bg-[#111318]/95 p-0 text-white shadow-2xl backdrop-blur-2xl">
        <DialogHeader className="border-b border-white/10 px-6 py-5">
          <DialogTitle className="text-white">搜索 ASSRT</DialogTitle>
          <DialogDescription className="text-white/55">
            使用当前片名和语言偏好检索可用字幕，并尽量直接应用到当前播放器。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {!ASSRT_ENABLED ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50/90">
              当前环境还没有启用 ASSRT 代理。请先配置 `ASSRT_TOKEN`，并把
              `VITE_ASSRT_ENABLED` 设为 `true`。
            </div>
          ) : (
            <>
              <form
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  void runSearch()
                }}
              >
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="输入片名或剧名"
                  className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
                />

                <Select value={languagePreset} onValueChange={setLanguagePreset}>
                  <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                    <SelectValue placeholder="语言" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="submit" className="h-10" disabled={isSearchDisabled || isLoading}>
                  <Search className="h-4 w-4" />
                  搜索
                </Button>
              </form>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/55">
                当前检索条件：{defaultQuery}
                {mediaItem.type === 'Episode' && mediaItem.parentIndexNumber && mediaItem.indexNumber
                  ? ` · 第 ${mediaItem.parentIndexNumber} 季第 ${mediaItem.indexNumber} 集`
                  : ''}
                {mediaItem.productionYear ? ` · ${mediaItem.productionYear}` : ''}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/55">
                字幕服务由{' '}
                <a
                  href="https://assrt.net"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/80 underline underline-offset-4 transition hover:text-white"
                >
                  ASSRT
                </a>{' '}
                提供。
              </div>

              <div className="max-h-[55vh] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-sm text-white/55">
                    正在搜索字幕...
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((result) => {
                      const isResolving = resolvingId === result.id

                      return (
                        <div
                          key={result.id}
                          className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              <div className="text-sm font-semibold text-white/92">
                                {result.releaseName}
                              </div>
                              <div className="text-xs text-white/55">
                                {formatSearchSummary(result) || '暂无额外信息'}
                              </div>
                              {result.featureTitle && (
                                <div className="text-xs text-white/45">
                                  条目：{result.featureTitle}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 text-xs text-white/45">
                                {result.downloadCount !== undefined && (
                                  <span>下载 {result.downloadCount}</span>
                                )}
                                {result.rating !== undefined && <span>评分 {result.rating}</span>}
                                {result.uploader && <span>发布者 {result.uploader}</span>}
                                {result.fileName && (
                                  <span className="truncate">文件 {result.fileName}</span>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="secondary"
                              className="h-9 shrink-0 border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                              onClick={() => void handleApplySubtitle(result)}
                              disabled={isResolving}
                            >
                              <Download className="h-4 w-4" />
                              {isResolving ? '应用中...' : '应用字幕'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : hasSearched ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 text-center text-sm text-white/55">
                    没有找到匹配的字幕，可以换个片名关键词或语言再试试。
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
