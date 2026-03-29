type SupportedSubtitleFormat = 'vtt' | 'srt' | 'ass' | 'ssa'

function escapeVttText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function padTimeSegment(value: string, minLength: number): string {
  return value.padStart(minLength, '0')
}

function normalizeSrtTimestamp(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(
    /(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/
  )

  if (!match) {
    return trimmed
  }

  const hours = padTimeSegment(match[1] || '0', 2)
  const minutes = padTimeSegment(match[2], 2)
  const seconds = padTimeSegment(match[3], 2)
  const milliseconds = padTimeSegment((match[4] || '0').slice(0, 3), 3)

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function convertSrtToVtt(text: string): string {
  const normalizedText = normalizeLineEndings(text).trim()
  if (!normalizedText) {
    throw new Error('字幕文件内容为空')
  }

  const blocks = normalizedText.split(/\n{2,}/)
  const cues = blocks
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trimEnd())
        .filter(Boolean)

      if (lines.length === 0) {
        return ''
      }

      const timestampLineIndex = lines.findIndex((line) => line.includes('-->'))
      if (timestampLineIndex === -1) {
        return ''
      }

      const timestampLine = lines[timestampLineIndex]
      const [start, end] = timestampLine.split('-->').map((part) => normalizeSrtTimestamp(part))
      const contentLines = lines
        .slice(timestampLineIndex + 1)
        .map((line) => escapeVttText(line))

      if (!start || !end || contentLines.length === 0) {
        return ''
      }

      return `${start} --> ${end}\n${contentLines.join('\n')}`
    })
    .filter(Boolean)

  if (cues.length === 0) {
    throw new Error('无法解析 SRT 字幕内容')
  }

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

function splitAssDialogueLine(line: string, expectedFieldCount: number): string[] {
  const result: string[] = []
  let cursor = 0

  for (let fieldIndex = 0; fieldIndex < expectedFieldCount - 1; fieldIndex += 1) {
    const commaIndex = line.indexOf(',', cursor)
    if (commaIndex === -1) {
      result.push(line.slice(cursor))
      cursor = line.length
      break
    }

    result.push(line.slice(cursor, commaIndex))
    cursor = commaIndex + 1
  }

  result.push(line.slice(cursor))
  return result
}

function normalizeAssTimestamp(value: string): string {
  const match = value.trim().match(/(\d+):(\d{1,2}):(\d{1,2})[.](\d{1,2})/)
  if (!match) {
    return value.trim()
  }

  const hours = padTimeSegment(match[1], 2)
  const minutes = padTimeSegment(match[2], 2)
  const seconds = padTimeSegment(match[3], 2)
  const milliseconds = padTimeSegment(String(Number(match[4]) * 10), 3)

  return `${hours}:${minutes}:${seconds}.${milliseconds}`
}

function normalizeAssText(value: string): string {
  return escapeVttText(
    value
      .replace(/\{[^}]*\}/g, '')
      .replace(/\\N/gi, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\h/gi, ' ')
      .trim()
  )
}

function convertAssToVtt(text: string): string {
  const normalizedText = normalizeLineEndings(text)
  const lines = normalizedText.split('\n')
  const cues: string[] = []
  let inEventsSection = false
  let eventFormatFields: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (/^\[events\]$/i.test(line)) {
      inEventsSection = true
      continue
    }

    if (/^\[.*\]$/.test(line) && !/^\[events\]$/i.test(line)) {
      inEventsSection = false
      continue
    }

    if (!inEventsSection) {
      continue
    }

    if (/^format\s*:/i.test(line)) {
      const formatBody = line.replace(/^format\s*:/i, '')
      eventFormatFields = formatBody.split(',').map((field) => field.trim().toLowerCase())
      continue
    }

    if (!/^dialogue\s*:/i.test(line) || eventFormatFields.length === 0) {
      continue
    }

    const dialogueBody = line.replace(/^dialogue\s*:/i, '').trim()
    const values = splitAssDialogueLine(dialogueBody, eventFormatFields.length)
    const startIndex = eventFormatFields.indexOf('start')
    const endIndex = eventFormatFields.indexOf('end')
    const textIndex = eventFormatFields.indexOf('text')

    if (startIndex === -1 || endIndex === -1 || textIndex === -1) {
      continue
    }

    const start = normalizeAssTimestamp(values[startIndex] || '')
    const end = normalizeAssTimestamp(values[endIndex] || '')
    const content = normalizeAssText(values[textIndex] || '')

    if (!start || !end || !content) {
      continue
    }

    cues.push(`${start} --> ${end}\n${content}`)
  }

  if (cues.length === 0) {
    throw new Error('无法解析 ASS/SSA 字幕内容')
  }

  return `WEBVTT\n\n${cues.join('\n\n')}\n`
}

export function detectSubtitleFormat(fileName?: string): SupportedSubtitleFormat | null {
  const normalized = fileName?.trim().toLowerCase() || ''

  if (normalized.endsWith('.vtt')) {
    return 'vtt'
  }

  if (normalized.endsWith('.srt')) {
    return 'srt'
  }

  if (normalized.endsWith('.ass')) {
    return 'ass'
  }

  if (normalized.endsWith('.ssa')) {
    return 'ssa'
  }

  return null
}

export function convertSubtitleTextToVtt(text: string, format: SupportedSubtitleFormat): string {
  const normalizedText = normalizeLineEndings(text)

  switch (format) {
    case 'vtt':
      return normalizedText.startsWith('WEBVTT')
        ? normalizedText
        : `WEBVTT\n\n${normalizedText.trim()}\n`
    case 'srt':
      return convertSrtToVtt(normalizedText)
    case 'ass':
    case 'ssa':
      return convertAssToVtt(normalizedText)
    default:
      throw new Error('当前字幕格式暂不支持直接应用')
  }
}
