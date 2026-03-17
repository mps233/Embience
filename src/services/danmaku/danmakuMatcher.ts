/**
 * 弹幕匹配服务
 * 
 * 根据视频标题、剧集信息、年份等智能匹配弹幕内容
 */

import type { MediaItem } from '@/types/emby'
import type { DanmakuAnimeResult, DanmakuEpisodeResult } from '@/types/danmaku'
import type { DanmakuApiClient } from '@/services/api/danmakuClient'

/**
 * 弹幕匹配结果
 */
export interface DanmakuMatchResult {
  /** 剧集 ID（用于获取弹幕） */
  episodeId: string
  /** 动画标题 */
  animeTitle: string
  /** 剧集标题 */
  episodeTitle: string
}

/**
 * 弹幕匹配器类
 */
export class DanmakuMatcher {
  private apiClient: DanmakuApiClient

  constructor(apiClient: DanmakuApiClient) {
    this.apiClient = apiClient
  }

  /**
   * 为媒体项匹配弹幕
   * 
   * @param mediaItem - 媒体项
   * @returns 匹配的弹幕结果，如果没有匹配则返回 null
   */
  async matchDanmaku(mediaItem: MediaItem): Promise<DanmakuMatchResult | null> {
    try {
      // 只为视频类型的媒体项匹配弹幕
      if (mediaItem.mediaType !== 'Video') {
        return null
      }

      // 构建搜索关键词
      const searchKeywords = this.buildSearchKeywords(mediaItem)
      
      if (!searchKeywords.anime) {
        console.warn('无法构建搜索关键词:', mediaItem)
        return null
      }

      // 第一步：搜索动画
      console.log('搜索动画:', searchKeywords.anime)
      let animeResults = await this.apiClient.searchAnime(searchKeywords.anime)

      // 如果没有找到结果，尝试移除年份再搜索一次（降级搜索）
      if (!animeResults || animeResults.length === 0) {
        const keywordWithoutYear = this.cleanKeyword(searchKeywords.anime, true)
        if (keywordWithoutYear !== searchKeywords.anime && keywordWithoutYear.length > 0) {
          console.log('未找到结果，尝试移除年份后搜索:', keywordWithoutYear)
          animeResults = await this.apiClient.searchAnime(keywordWithoutYear)
        }
      }

      if (!animeResults || animeResults.length === 0) {
        console.log('未找到匹配的动画:', searchKeywords.anime)
        return null
      }

      // 选择最佳匹配的动画
      const bestAnime = this.selectBestAnimeMatch(animeResults, mediaItem)
      if (!bestAnime) {
        console.log('未找到合适的动画匹配')
        return null
      }

      console.log('找到匹配的动画:', bestAnime)

      // 第二步：获取动画详情（包含剧集列表）
      console.log('获取动画详情:', bestAnime.animeId)
      const bangumiDetail = await this.apiClient.getBangumi(bestAnime.animeId)

      if (!bangumiDetail || !bangumiDetail.episodes || bangumiDetail.episodes.length === 0) {
        console.log('该动画没有剧集信息，使用动画 ID 作为剧集 ID')
        return {
          episodeId: bestAnime.animeId,
          animeTitle: bestAnime.animeTitle,
          episodeTitle: bestAnime.animeTitle,
        }
      }

      console.log(`找到 ${bangumiDetail.episodes.length} 个剧集`)

      // 第三步：如果是剧集，根据集数匹配
      if (searchKeywords.episode && mediaItem.indexNumber !== undefined) {
        console.log('匹配集数:', mediaItem.indexNumber)
        const matchedEpisode = this.selectBestEpisodeMatch(
          bangumiDetail.episodes,
          mediaItem.indexNumber
        )

        if (matchedEpisode) {
          console.log('找到匹配的剧集:', matchedEpisode)
          return {
            episodeId: matchedEpisode.episodeId,
            animeTitle: bestAnime.animeTitle,
            episodeTitle: matchedEpisode.episodeTitle,
          }
        }

        console.log('未找到匹配的集数，使用第一集')
      }

      // 如果是电影或者没有找到具体集数，使用第一集
      const firstEpisode = bangumiDetail.episodes[0]
      return {
        episodeId: firstEpisode.episodeId,
        animeTitle: bestAnime.animeTitle,
        episodeTitle: firstEpisode.episodeTitle,
      }
    } catch (error) {
      console.error('匹配弹幕失败:', error)
      return null
    }
  }

  /**
   * 构建搜索关键词
   * 
   * @param mediaItem - 媒体项
   * @returns 搜索关键词
   */
  private buildSearchKeywords(mediaItem: MediaItem): {
    anime: string
    episode?: string
  } {
    let anime = ''
    let episode: string | undefined

    // 根据媒体类型构建关键词
    if (mediaItem.type === 'Episode') {
      // 剧集：使用剧集名称和集数
      anime = mediaItem.seriesName || mediaItem.name
      
      if (mediaItem.indexNumber !== undefined) {
        episode = `第${mediaItem.indexNumber}集`
      }
    } else if (mediaItem.type === 'Movie') {
      // 电影：使用电影名称
      anime = mediaItem.name
      
      // 如果有年份，添加到搜索关键词
      if (mediaItem.productionYear) {
        anime = `${anime} ${mediaItem.productionYear}`
      }
    } else if (mediaItem.type === 'Series') {
      // 电视剧：使用剧集名称
      anime = mediaItem.name
    } else {
      // 其他类型：使用名称
      anime = mediaItem.name
    }

    // 清理关键词（移除特殊字符，但保留年份用于降级搜索）
    anime = this.cleanKeyword(anime, false)
    if (episode) {
      episode = this.cleanKeyword(episode, false)
    }

    return { anime, episode }
  }

  /**
   * 清理搜索关键词
   * 
   * @param keyword - 原始关键词
   * @param removeYear - 是否移除年份（默认 false）
   * @returns 清理后的关键词
   */
  private cleanKeyword(keyword: string, removeYear: boolean = false): string {
    let cleaned = keyword
      .trim()
      // 移除括号内的内容（通常是版本信息）
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
    
    // 根据参数决定是否移除年份
    if (removeYear) {
      cleaned = cleaned.replace(/\b(19|20)\d{2}\b/g, '')
    }
    
    return cleaned
      // 移除多余的空格
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 从搜索结果中选择最佳匹配的动画
   * 
   * @param results - 搜索结果列表
   * @param mediaItem - 媒体项
   * @returns 最佳匹配结果
   */
  private selectBestAnimeMatch(
    results: DanmakuAnimeResult[],
    mediaItem: MediaItem
  ): DanmakuAnimeResult | null {
    if (results.length === 0) {
      return null
    }

    // 如果只有一个结果，直接返回
    if (results.length === 1) {
      return results[0]
    }

    // 计算每个结果的匹配分数
    const scored = results.map((result) => ({
      result,
      score: this.calculateAnimeMatchScore(result, mediaItem),
    }))

    // 按分数排序
    scored.sort((a, b) => b.score - a.score)

    // 返回分数最高的结果
    return scored[0].score > 0 ? scored[0].result : null
  }

  /**
   * 从剧集列表中选择最佳匹配的剧集
   * 
   * @param episodes - 剧集列表
   * @param episodeNumber - 集数
   * @returns 最佳匹配的剧集
   */
  private selectBestEpisodeMatch(
    episodes: DanmakuEpisodeResult[],
    episodeNumber: number
  ): DanmakuEpisodeResult | null {
    // 查找集数匹配的剧集
    const matched = episodes.find((ep) => {
      // 尝试从 episodeTitle 中提取集数
      const match = ep.episodeTitle.match(/第?(\d+)[集话話]/)
      if (match) {
        const epNum = parseInt(match[1], 10)
        return epNum === episodeNumber
      }
      return false
    })

    return matched || null
  }

  /**
   * 计算动画匹配分数
   * 
   * @param result - 搜索结果
   * @param mediaItem - 媒体项
   * @returns 匹配分数（越高越好）
   */
  private calculateAnimeMatchScore(
    result: DanmakuAnimeResult,
    mediaItem: MediaItem
  ): number {
    let score = 0

    // 清理标题用于比较（移除年份和特殊字符）
    const itemName = this.cleanKeyword(mediaItem.seriesName || mediaItem.name, true)
    const resultTitle = this.cleanKeyword(result.animeTitle, true)

    // 完全匹配（最高优先级）
    if (itemName === resultTitle) {
      score += 100
    }
    // 包含匹配
    else if (result.animeTitle.includes(itemName) || itemName.includes(resultTitle)) {
      score += 50
    }
    // 部分匹配（计算相似度）
    else {
      const similarity = this.calculateStringSimilarity(itemName, resultTitle)
      score += similarity * 30
    }

    // 年份匹配加分（如果有）
    if (mediaItem.productionYear) {
      const year = mediaItem.productionYear.toString()
      if (result.animeTitle.includes(year)) {
        score += 20
      }
    }

    // 类型匹配加分
    if (mediaItem.type === 'Movie' && result.typeDescription.includes('电影')) {
      score += 10
    } else if (mediaItem.type === 'Episode' && result.typeDescription.includes('动漫')) {
      score += 10
    }

    return score
  }

  /**
   * 计算字符串相似度（简单的 Levenshtein 距离）
   * 
   * @param str1 - 字符串 1
   * @param str2 - 字符串 2
   * @returns 相似度（0-1）
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) {
      return 1.0
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * 计算 Levenshtein 距离
   * 
   * @param str1 - 字符串 1
   * @param str2 - 字符串 2
   * @returns 编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j] + 1      // 删除
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}

/**
 * 创建弹幕匹配器实例
 * 
 * @param apiClient - 弹幕 API 客户端
 * @returns 弹幕匹配器实例
 */
export function createDanmakuMatcher(apiClient: DanmakuApiClient): DanmakuMatcher {
  return new DanmakuMatcher(apiClient)
}
