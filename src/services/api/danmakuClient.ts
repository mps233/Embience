/**
 * 弹幕 API 客户端
 * 
 * 集成 danmu_api 后端服务，提供弹幕搜索、获取和发送功能
 * 
 * API 文档：https://github.com/huangxd-/danmu_api
 */

import type {
  DanmakuAnimeResult,
  DanmakuEpisodeResult,
  DanmakuSearchResult,
  DanmakuApiResponse,
  DanmakuItem,
  PostDanmakuRequest,
} from '@/types/danmaku'

/**
 * 弹幕 API 客户端配置
 */
export interface DanmakuClientConfig {
  /** API 基础 URL */
  baseUrl: string
}

/**
 * 弹幕 API 客户端类
 */
export class DanmakuApiClient {
  private baseUrl: string

  constructor(config: DanmakuClientConfig) {
    this.baseUrl = config.baseUrl
  }

  /**
   * 搜索匹配的动画
   * 
   * @param keyword - 搜索关键词（动画名称）
   * @returns 动画搜索结果列表
   */
  async searchAnime(keyword: string): Promise<DanmakuAnimeResult[]> {
    try {
      const params = new URLSearchParams({ keyword })
      const response = await fetch(`${this.baseUrl}/api/v2/search/anime?${params}`)
      
      if (!response.ok) {
        throw new Error(`搜索动画失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.animes || []
    } catch (error) {
      console.error('搜索动画失败:', error)
      throw error
    }
  }

  /**
   * 获取动画的详细信息（包含剧集列表）
   * 
   * @param animeId - 动画 ID
   * @returns 动画详情（包含剧集列表）
   */
  async getBangumi(animeId: string): Promise<DanmakuAnimeResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/bangumi/${animeId}`)
      
      if (!response.ok) {
        throw new Error(`获取动画详情失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.bangumi) {
        return null
      }
      
      const bangumi = data.bangumi
      
      // 转换为统一格式
      const result: DanmakuAnimeResult = {
        animeId: bangumi.animeId,
        animeTitle: bangumi.animeTitle,
        type: bangumi.type,
        typeDescription: bangumi.typeDescription,
        episodes: bangumi.episodes?.map((ep: any) => ({
          episodeId: ep.episodeId.toString(),
          episodeTitle: ep.episodeTitle,
        })) || [],
      }
      
      return result
    } catch (error) {
      console.error('获取动画详情失败:', error)
      throw error
    }
  }

  /**
   * 获取弹幕数据
   * 
   * @param episodeId - 剧集 ID
   * @returns 弹幕列表
   */
  async getDanmaku(episodeId: string): Promise<DanmakuItem[]> {
    try {
      // 添加 format=json 参数
      const response = await fetch(`${this.baseUrl}/api/v2/comment/${episodeId}?format=json`)
      
      if (!response.ok) {
        throw new Error(`获取弹幕失败: ${response.status} ${response.statusText}`)
      }

      const data: DanmakuApiResponse = await response.json()
      
      // 转换 API 响应格式为内部格式
      return this.parseDanmakuResponse(data)
    } catch (error) {
      console.error('获取弹幕失败:', error)
      throw error
    }
  }

  /**
   * 发送新弹幕
   * 
   * @param request - 弹幕发送请求
   * @returns 是否发送成功
   */
  async postDanmaku(request: PostDanmakuRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`发送弹幕失败: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('发送弹幕失败:', error)
      throw error
    }
  }

  /**
   * 解析弹幕 API 响应
   * 
   * 弹幕格式：p 字段包含逗号分隔的参数
   * 格式：时间,类型,颜色,作者
   * 
   * @param response - API 响应
   * @returns 弹幕列表
   */
  private parseDanmakuResponse(response: DanmakuApiResponse): DanmakuItem[] {
    if (!response.comments || !Array.isArray(response.comments)) {
      return []
    }

    return response.comments
      .map((comment) => {
        try {
          const params = comment.p.split(',')
          const time = parseFloat(params[0])
          const typeCode = parseInt(params[1], 10)
          const colorDecimal = parseInt(params[2], 10)
          const author = params[3] || 'anonymous'

          // 转换类型代码：1=滚动，4=底部，5=顶部
          let type: DanmakuItem['type'] = 'scroll'
          if (typeCode === 4) type = 'bottom'
          else if (typeCode === 5) type = 'top'

          // 转换颜色：十进制 -> 十六进制
          const validColor = isNaN(colorDecimal) ? 0xFFFFFF : colorDecimal
          let color = `#${validColor.toString(16).padStart(6, '0')}`
          
          // 如果是白色（#ffffff），改为浅灰色以便在视频上可见
          if (color.toLowerCase() === '#ffffff') {
            color = '#f0f0f0'
          }

          const item: DanmakuItem = {
            time,
            type,
            color,
            author,
            text: comment.m,
            // fontSize 由弹幕设置控制，不在这里设置固定值
          }
          
          return item
        } catch (error) {
          console.warn('解析弹幕失败:', comment, error)
          return null
        }
      })
      .filter((item): item is DanmakuItem => item !== null)
  }
}

/**
 * 创建弹幕 API 客户端实例
 * 
 * @param config - 客户端配置
 * @returns 弹幕 API 客户端实例
 */
export function createDanmakuClient(config: DanmakuClientConfig): DanmakuApiClient {
  return new DanmakuApiClient(config)
}
