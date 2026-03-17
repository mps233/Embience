/**
 * 播放相关 API 端点
 */

/**
 * 播放端点
 */
export const playbackEndpoints = {
  /**
   * 报告播放开始
   * @returns API 路径
   */
  reportPlaybackStart: () => '/Sessions/Playing',

  /**
   * 报告播放进度
   * @returns API 路径
   */
  reportPlaybackProgress: () => '/Sessions/Playing/Progress',

  /**
   * 报告播放停止
   * @returns API 路径
   */
  reportPlaybackStopped: () => '/Sessions/Playing/Stopped',

  /**
   * 获取视频流 URL
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  getVideoStreamUrl: (itemId: string) => `/Videos/${itemId}/stream`,

  /**
   * 获取音频流 URL（通用音频端点）
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  getAudioStreamUrl: (itemId: string) => `/Audio/${itemId}/universal`,

  /**
   * 获取流 URL（根据类型自动选择）
   * @param itemId - 媒体项 ID
   * @param type - 媒体类型（'video' 或 'audio'）
   * @returns API 路径
   */
  getStreamUrl: (itemId: string, type: 'video' | 'audio') =>
    type === 'video' ? `/Videos/${itemId}/stream` : `/Audio/${itemId}/universal`,
}
