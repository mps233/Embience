/**
 * MediaCard 组件视觉测试页面
 * 
 * 用于开发时预览组件的各种状态
 */

import MediaCard from './MediaCard'
import type { MediaItem } from '@/types/emby'

/**
 * 创建测试用的媒体项
 */
function createMockItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    name: '测试电影',
    serverId: 'test-server',
    id: 'test-id',
    type: 'Movie',
    mediaType: 'Video',
    isFolder: false,
    productionYear: 2023,
    communityRating: 8.5,
    runTimeTicks: 72000000000,
    imageTags: {
      Primary: 'test-tag',
    },
    userData: {
      playbackPositionTicks: 0,
      playCount: 0,
      isFavorite: false,
      played: false,
    },
    ...overrides,
  }
}

/**
 * MediaCard 视觉测试页面
 */
export default function MediaCardStories() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* 标题 */}
        <div>
          <h1 className="text-3xl font-bold">MediaCard 组件预览</h1>
          <p className="mt-2 text-muted-foreground">
            展示 MediaCard 组件在不同状态下的外观
          </p>
        </div>

        {/* 基础电影卡片 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">基础电影卡片</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard item={createMockItem({ name: '盗梦空间' })} />
            <MediaCard item={createMockItem({ name: '肖申克的救赎' })} />
            <MediaCard item={createMockItem({ name: '阿甘正传' })} />
          </div>
        </section>

        {/* 收藏的电影 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">收藏的电影</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '星际穿越',
                userData: {
                  playbackPositionTicks: 0,
                  playCount: 2,
                  isFavorite: true,
                  played: false,
                },
              })}
            />
          </div>
        </section>

        {/* 有播放进度的电影 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">有播放进度的电影</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '黑客帝国',
                userData: {
                  playbackPositionTicks: 36000000000, // 50%
                  playCount: 1,
                  isFavorite: false,
                  played: false,
                },
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '指环王',
                userData: {
                  playbackPositionTicks: 14400000000, // 20%
                  playCount: 1,
                  isFavorite: false,
                  played: false,
                },
              })}
            />
          </div>
        </section>

        {/* 已观看的电影 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">已观看的电影</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '教父',
                userData: {
                  playbackPositionTicks: 0,
                  playCount: 3,
                  isFavorite: false,
                  played: true,
                },
              })}
            />
          </div>
        </section>

        {/* 剧集卡片 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">剧集卡片</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '冬天来了',
                type: 'Episode',
                seriesName: '权力的游戏',
                parentIndexNumber: 1,
                indexNumber: 1,
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '国王大道',
                type: 'Episode',
                seriesName: '权力的游戏',
                parentIndexNumber: 1,
                indexNumber: 2,
              })}
            />
          </div>
        </section>

        {/* 音乐卡片 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">音乐卡片</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: 'Bohemian Rhapsody',
                type: 'Audio',
                artists: ['Queen'],
                album: 'A Night at the Opera',
                runTimeTicks: 3540000000,
              })}
            />
            <MediaCard
              item={createMockItem({
                name: 'Imagine',
                type: 'Audio',
                artists: ['John Lennon'],
                album: 'Imagine',
                runTimeTicks: 1830000000,
              })}
            />
          </div>
        </section>

        {/* 无图片的卡片 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">无图片的卡片</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '无海报电影',
                imageTags: undefined,
              })}
            />
          </div>
        </section>

        {/* 不同评分 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">不同评分</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '高分电影',
                communityRating: 9.5,
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '中等评分',
                communityRating: 7.0,
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '低分电影',
                communityRating: 5.5,
              })}
            />
          </div>
        </section>

        {/* 不同时长 */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">不同时长</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <MediaCard
              item={createMockItem({
                name: '短片',
                runTimeTicks: 9000000000, // 15 分钟
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '标准长度',
                runTimeTicks: 72000000000, // 2 小时
              })}
            />
            <MediaCard
              item={createMockItem({
                name: '长片',
                runTimeTicks: 108000000000, // 3 小时
              })}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
