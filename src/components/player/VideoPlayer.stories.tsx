/**
 * VideoPlayer 组件 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react'
import { VideoPlayer } from './VideoPlayer'
import type { MediaItem } from '@/types/emby'

const meta: Meta<typeof VideoPlayer> = {
  title: 'Components/Player/VideoPlayer',
  component: VideoPlayer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof VideoPlayer>

// 示例媒体项
const mockMediaItem: MediaItem = {
  id: 'test-movie-id',
  name: '示例电影',
  type: 'Movie',
  overview: '这是一个示例电影的描述',
  productionYear: 2024,
  runTimeTicks: 72000000000, // 2 小时
  mediaSources: [
    {
      id: 'test-media-source-id',
      protocol: 'File',
      path: '/path/to/movie.mp4',
      container: 'mp4',
      size: 2000000000,
      bitrate: 5000000,
      supportsDirectPlay: true,
      supportsDirectStream: true,
      supportsTranscoding: true,
      mediaStreams: [
        {
          type: 'Video',
          codec: 'h264',
          width: 1920,
          height: 1080,
          bitRate: 4000000,
          index: 0,
        },
        {
          type: 'Audio',
          codec: 'aac',
          language: 'eng',
          displayTitle: '英语',
          channels: 2,
          bitRate: 128000,
          index: 1,
        },
        {
          type: 'Audio',
          codec: 'aac',
          language: 'chi',
          displayTitle: '中文',
          channels: 2,
          bitRate: 128000,
          index: 2,
        },
        {
          type: 'Subtitle',
          codec: 'srt',
          language: 'eng',
          displayTitle: '英语字幕',
          isTextSubtitleStream: true,
          index: 3,
        },
        {
          type: 'Subtitle',
          codec: 'srt',
          language: 'chi',
          displayTitle: '中文字幕',
          isTextSubtitleStream: true,
          index: 4,
        },
      ],
    },
  ],
}

/**
 * 默认视频播放器
 */
export const Default: Story = {
  args: {
    mediaItem: mockMediaItem,
  },
}

/**
 * 带起始位置的播放器
 */
export const WithStartPosition: Story = {
  args: {
    mediaItem: mockMediaItem,
    startPositionTicks: 360000000000, // 从 1 小时处开始
  },
}

/**
 * 带回调的播放器
 */
export const WithCallbacks: Story = {
  args: {
    mediaItem: mockMediaItem,
    onPlaybackStart: (sessionInfo) => {
      console.log('播放开始:', sessionInfo)
    },
    onPlaybackProgress: (progress) => {
      console.log('播放进度:', progress)
    },
    onPlaybackEnd: () => {
      console.log('播放结束')
    },
  },
}
