/**
 * 认证相关 API 端点
 */

/**
 * 认证端点
 */
export const authEndpoints = {
  /**
   * 获取公开用户列表
   * @returns API 路径
   */
  getPublicUsers: () => '/Users/Public',

  /**
   * 用户认证（通过用户名和密码）
   * @returns API 路径
   */
  authenticateByName: () => '/Users/AuthenticateByName',

  /**
   * 用户登出
   * @returns API 路径
   */
  logout: () => '/Sessions/Logout',
}
