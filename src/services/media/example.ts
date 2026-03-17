/**
 * 媒体浏览服务使用示例
 * 
 * 本文件展示如何使用 MediaService 进行媒体库浏览操作
 */

import { createMediaService } from './mediaService'
import { createEmbyClient } from '@/services/api/embyClient'

/**
 * 示例：获取用户的媒体库视图
 */
async function exampleGetViews() {
  // 创建 API 客户端
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  // 创建媒体服务
  const mediaService = createMediaService(apiClient)

  try {
    // 获取顶级视图
    const views = await mediaService.getViews('user-id')
    
    console.log('媒体库分类:')
    views.forEach(view => {
      console.log(`- ${view.name} (${view.collectionType || '未分类'})`)
    })
  } catch (error) {
    console.error('获取视图失败:', error)
  }
}

/**
 * 示例：获取电影列表
 */
async function exampleGetMovies() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  try {
    // 获取所有电影，按评分排序
    const response = await mediaService.getItems('user-id', {
      recursive: true,
      includeItemTypes: ['Movie'],
      sortBy: ['CommunityRating'],
      sortOrder: 'Descending',
      limit: 20,
    })

    console.log(`找到 ${response.totalRecordCount} 部电影`)
    console.log('评分最高的电影:')
    response.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - 评分: ${item.communityRating || 'N/A'}`)
    })
  } catch (error) {
    console.error('获取电影列表失败:', error)
  }
}

/**
 * 示例：搜索媒体
 */
async function exampleSearchMedia() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  try {
    // 搜索包含关键词的媒体
    const response = await mediaService.getItems('user-id', {
      searchTerm: '复仇者联盟',
      recursive: true,
      limit: 10,
    })

    console.log(`搜索结果: ${response.totalRecordCount} 项`)
    response.items.forEach(item => {
      console.log(`- ${item.name} (${item.type})`)
    })
  } catch (error) {
    console.error('搜索失败:', error)
  }
}

/**
 * 示例：获取可恢复播放的内容
 */
async function exampleGetResumable() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  try {
    // 获取用户未看完的内容
    const response = await mediaService.getItems('user-id', {
      filters: ['IsResumable'],
      recursive: true,
      sortBy: ['DatePlayed'],
      sortOrder: 'Descending',
      limit: 20,
    })

    console.log('继续观看:')
    response.items.forEach(item => {
      const progress = item.userData?.playbackPositionTicks || 0
      const total = item.runTimeTicks || 1
      const percentage = Math.round((progress / total) * 100)
      console.log(`- ${item.name} (已观看 ${percentage}%)`)
    })
  } catch (error) {
    console.error('获取可恢复内容失败:', error)
  }
}

/**
 * 示例：获取媒体详情
 */
async function exampleGetItemDetail() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  try {
    // 获取单个媒体项的详细信息
    const item = await mediaService.getItemDetail('user-id', 'item-id')

    console.log('媒体详情:')
    console.log(`标题: ${item.name}`)
    console.log(`类型: ${item.type}`)
    console.log(`年份: ${item.productionYear || 'N/A'}`)
    console.log(`评分: ${item.communityRating || 'N/A'}`)
    console.log(`时长: ${item.runTimeTicks ? Math.round(item.runTimeTicks / 10000000 / 60) : 0} 分钟`)
    console.log(`简介: ${item.overview || '无'}`)
  } catch (error) {
    console.error('获取媒体详情失败:', error)
  }
}

/**
 * 示例：获取最新内容
 */
async function exampleGetLatest() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  try {
    // 获取最新添加的电影
    const latestMovies = await mediaService.getLatestItems('user-id', {
      includeItemTypes: ['Movie'],
      limit: 10,
    })

    console.log('最新添加的电影:')
    latestMovies.forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.name} (${movie.productionYear || 'N/A'})`)
    })
  } catch (error) {
    console.error('获取最新内容失败:', error)
  }
}

/**
 * 示例：分页获取媒体列表
 */
async function examplePagination() {
  const apiClient = createEmbyClient({
    serverUrl: 'http://localhost:8096',
    accessToken: 'your-access-token',
  })

  const mediaService = createMediaService(apiClient)

  const pageSize = 20
  let currentPage = 0

  try {
    // 获取第一页
    const response = await mediaService.getItems('user-id', {
      recursive: true,
      includeItemTypes: ['Movie'],
      sortBy: ['SortName'],
      sortOrder: 'Ascending',
      startIndex: currentPage * pageSize,
      limit: pageSize,
    })

    console.log(`第 ${currentPage + 1} 页 (共 ${Math.ceil(response.totalRecordCount / pageSize)} 页)`)
    console.log(`显示 ${response.items.length} / ${response.totalRecordCount} 项`)
    
    response.items.forEach((item, index) => {
      console.log(`${currentPage * pageSize + index + 1}. ${item.name}`)
    })
  } catch (error) {
    console.error('获取分页数据失败:', error)
  }
}

// 导出示例函数
export {
  exampleGetViews,
  exampleGetMovies,
  exampleSearchMedia,
  exampleGetResumable,
  exampleGetItemDetail,
  exampleGetLatest,
  examplePagination,
}
