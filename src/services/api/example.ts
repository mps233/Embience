/**
 * EmbyApiClient 使用示例
 * 这个文件展示了如何使用 API 客户端
 */

import { createEmbyClient } from './embyClient'
import type { PublicUser, AuthSession } from '@/types/emby'

/**
 * 示例：验证服务器连接
 */
export async function testServerConnection(serverUrl: string): Promise<boolean> {
  try {
    const client = createEmbyClient({ serverUrl })
    
    // 调用 System/Info 端点验证连接
    await client.get('/System/Info', {}, { skipAuth: true })
    
    console.log('✓ 服务器连接成功')
    return true
  } catch (error) {
    console.error('✗ 服务器连接失败:', error)
    return false
  }
}

/**
 * 示例：获取公开用户列表
 */
export async function getPublicUsers(serverUrl: string): Promise<PublicUser[]> {
  try {
    const client = createEmbyClient({ serverUrl })
    
    const users = await client.get<PublicUser[]>('/Users/Public', {}, { skipAuth: true })
    
    console.log(`✓ 获取到 ${users.length} 个公开用户`)
    return users
  } catch (error) {
    console.error('✗ 获取公开用户失败:', error)
    throw error
  }
}

/**
 * 示例：用户认证
 */
export async function authenticateUser(
  serverUrl: string,
  username: string,
  password: string
): Promise<AuthSession> {
  try {
    const client = createEmbyClient({ serverUrl })
    
    const authResult = await client.post<AuthSession>('/Users/AuthenticateByName', {
      Username: username,
      Pw: password,
    })
    
    console.log('✓ 用户认证成功')
    console.log('  用户名:', authResult.user.name)
    console.log('  用户 ID:', authResult.user.id)
    console.log('  访问令牌:', authResult.accessToken.substring(0, 20) + '...')
    
    return authResult
  } catch (error) {
    console.error('✗ 用户认证失败:', error)
    throw error
  }
}

/**
 * 示例：获取媒体库视图
 */
export async function getMediaViews(
  serverUrl: string,
  accessToken: string,
  userId: string
): Promise<any[]> {
  try {
    const client = createEmbyClient({ serverUrl, accessToken })
    
    const views = await client.get<{ Items: any[] }>(`/Users/${userId}/Views`)
    
    console.log(`✓ 获取到 ${views.Items?.length || 0} 个媒体库视图`)
    return views.Items || []
  } catch (error) {
    console.error('✗ 获取媒体库视图失败:', error)
    throw error
  }
}

/**
 * 示例：测试设备信息持久化
 */
export function testDeviceInfoPersistence(): void {
  console.log('\n测试设备信息持久化...')
  
  // 创建第一个客户端
  const client1 = createEmbyClient({ serverUrl: 'http://localhost:8096' })
  const deviceInfo1 = client1.getDeviceInfo()
  console.log('第一个客户端的设备 ID:', deviceInfo1.deviceId)
  
  // 创建第二个客户端
  const client2 = createEmbyClient({ serverUrl: 'http://localhost:8096' })
  const deviceInfo2 = client2.getDeviceInfo()
  console.log('第二个客户端的设备 ID:', deviceInfo2.deviceId)
  
  // 验证设备 ID 是否相同
  if (deviceInfo1.deviceId === deviceInfo2.deviceId) {
    console.log('✓ 设备信息持久化成功')
  } else {
    console.log('✗ 设备信息持久化失败')
  }
}

/**
 * 示例：测试令牌管理
 */
export function testTokenManagement(): void {
  console.log('\n测试令牌管理...')
  
  const client = createEmbyClient({ serverUrl: 'http://localhost:8096' })
  
  // 初始状态
  console.log('初始令牌:', client.getAccessToken())
  
  // 设置令牌
  client.setAccessToken('test-token-123')
  console.log('设置后的令牌:', client.getAccessToken())
  
  // 清除令牌
  client.setAccessToken(null)
  console.log('清除后的令牌:', client.getAccessToken())
  
  console.log('✓ 令牌管理测试完成')
}

/**
 * 运行所有示例（仅用于开发测试）
 */
export async function runAllExamples(): Promise<void> {
  console.log('=== EmbyApiClient 功能演示 ===\n')
  
  // 测试设备信息持久化
  testDeviceInfoPersistence()
  
  // 测试令牌管理
  testTokenManagement()
  
  console.log('\n=== 演示完成 ===')
  console.log('\n注意：要测试实际的 API 调用，请确保：')
  console.log('1. Emby Server 正在运行')
  console.log('2. 服务器 URL 配置正确')
  console.log('3. 网络连接正常')
}
