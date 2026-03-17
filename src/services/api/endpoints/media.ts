/**
 * 媒体相关 API 端点
 */

/**
 * 媒体端点
 */
export const mediaEndpoints = {
  /**
   * 获取用户的顶级视图（媒体库分类）
   * @param userId - 用户 ID
   * @returns API 路径
   */
  getViews: (userId: string) => `/Users/${userId}/Views`,

  /**
   * 获取媒体项列表
   * @param userId - 用户 ID
   * @returns API 路径
   */
  getItems: (userId: string) => `/Users/${userId}/Items`,

  /**
   * 获取单个媒体项详情
   * @param userId - 用户 ID
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  getItem: (userId: string, itemId: string) => `/Users/${userId}/Items/${itemId}`,

  /**
   * 获取最新添加的媒体项
   * @param userId - 用户 ID
   * @returns API 路径
   */
  getLatest: (userId: string) => `/Users/${userId}/Items/Latest`,

  /**
   * 手动标记已观看/未观看
   * @param userId - 用户 ID
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  markPlayed: (userId: string, itemId: string) => `/Users/${userId}/PlayedItems/${itemId}`,
  
  /**
   * 取消已观看标记
   * @param userId - 用户 ID
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  markUnplayed: (userId: string, itemId: string) => `/Users/${userId}/PlayedItems/${itemId}`,
  
  /**
   * 获取相似媒体项
   * @param itemId - 媒体项 ID
   * @returns API 路径
   */
  getSimilar: (itemId: string) => `/Items/${itemId}/Similar`,
}
