/**
 * MediaGrid Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react'
import { BrowserRouter } from 'react-router-dom'
import MediaGrid from './MediaGrid'
import type { MediaItem } from '@/types/emby'

/**
 * 创建模拟媒体项
 */
function createMockItem(id: string, overrides?: Partial<MediaItem>): MediaItem {
  return {
    id,
    name: `电影 ${id}`,
    serverId: 'server1',
    type: 'Movie',
    isFolder: false,
    productionYear: 2020 + parseInt(id),
    communityRating: 7 + Math.random() * 2,
    runTimeTicks: (90 + Math.random() * 60) * 600000000, // 90-150 分钟
    imageTags: {
      Primary: `tag${id}`,
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

const meta = {
  title: 'Components/Media/MediaGrid',
  component: MediaGrid,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="min-h-screen bg-background p-8">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MediaGrid>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 默认状态 - 少量项目
 */
export const Default: Story = {
  args: {
    items: Array.from({ length: 12 }, (_, i) => createMockItem(i.toString())),
  },
}

/**
 * 加载状态
 */
export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
  },
}

/**
 * 空状态
 */
export const Empty: Story = {
  args: {
    items: [],
    isLoading: false,
  },
}

/**
 * 单个项目
 */
export const SingleItem: Story = {
  args: {
    items: [createMockItem('1')],
  },
}

/**
 * 少量项目（标准网格）
 */
export const FewItems: Story = {
  args: {
    items: Array.from({ length: 6 }, (_, i) => createMockItem(i.toString())),
  },
}

/**
 * 中等数量项目（标准网格）
 */
export const MediumItems: Story = {
  args: {
    items: Array.from({ length: 24 }, (_, i) => createMockItem(i.toString())),
  },
}

/**
 * 恰好 50 项（标准网格边界）
 */
export const Exactly50Items: Story = {
  args: {
    items: Array.from({ length: 50 }, (_, i) => createMockItem(i.toString())),
  },
}

/**
 * 大量项目（虚拟滚动）
 */
export const ManyItems: Story = {
  args: {
    items: Array.from({ length: 100 }, (_, i) => createMockItem(i.toString())),
  },
}

/**
 * 包含用户数据的项目
 */
export const WithUserData: Story = {
  args: {
    items: [
      createMockItem('1', {
        name: '已观看的电影',
        userData: {
          playbackPositionTicks: 0,
          playCount: 3,
          isFavorite: false,
          played: true,
        },
      }),
      createMockItem('2', {
        name: '收藏的电影',
        userData: {
          playbackPositionTicks: 0,
          playCount: 1,
          isFavorite: true,
          played: true,
        },
      }),
      createMockItem('3', {
        name: '进行中的电影',
        runTimeTicks: 72000000000,
        userData: {
          playbackPositionTicks: 36000000000, // 50% 进度
          playCount: 0,
          isFavorite: false,
          played: false,
        },
      }),
      createMockItem('4', {
        name: '未观看的电影',
        userData: {
          playbackPositionTicks: 0,
          playCount: 0,
          isFavorite: false,
          played: false,
        },
      }),
    ],
  },
}

/**
 * 混合媒体类型
 */
export const MixedTypes: Story = {
  args: {
    items: [
      createMockItem('1', {
        type: 'Movie',
        name: '电影示例',
      }),
      createMockItem('2', {
        type: 'Episode',
        name: '剧集示例',
        seriesName: '电视剧名称',
        parentIndexNumber: 1,
        indexNumber: 1,
      }),
      createMockItem('3', {
        type: 'Audio',
        name: '音乐示例',
        artists: ['艺术家 1', '艺术家 2'],
      }),
      createMockItem('4', {
        type: 'MusicAlbum',
        name: '专辑示例',
        albumArtist: '专辑艺术家',
      }),
    ],
  },
}

/**
 * 不同评分
 */
export const DifferentRatings: Story = {
  args: {
    items: [
      createMockItem('1', {
        name: '高分电影',
        communityRating: 9.5,
      }),
      createMockItem('2', {
        name: '中等评分',
        communityRating: 7.0,
      }),
      createMockItem('3', {
        name: '低分电影',
        communityRating: 4.5,
      }),
      createMockItem('4', {
        name: '无评分',
        communityRating: undefined,
      }),
    ],
  },
}

/**
 * 不同时长
 */
export const DifferentDurations: Story = {
  args: {
    items: [
      createMockItem('1', {
        name: '短片',
        runTimeTicks: 1800000000, // 30 分钟
      }),
      createMockItem('2', {
        name: '标准电影',
        runTimeTicks: 72000000000, // 2 小时
      }),
      createMockItem('3', {
        name: '长片',
        runTimeTicks: 180000000000, // 3 小时
      }),
      createMockItem('4', {
        name: '无时长信息',
        runTimeTicks: undefined,
      }),
    ],
  },
}

/**
 * 自定义图片尺寸
 */
export const CustomImageSize: Story = {
  args: {
    items: Array.from({ length: 12 }, (_, i) => createMockItem(i.toString())),
    imageWidth: 400,
    imageHeight: 600,
  },
}

/**
 * 自定义类名
 */
export const CustomClassName: Story = {
  args: {
    items: Array.from({ length: 12 }, (_, i) => createMockItem(i.toString())),
    className: 'custom-grid-class',
  },
}
