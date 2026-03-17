# API 端点常量

本目录包含所有 Emby API 端点的常量定义，按功能模块组织。

## 文件结构

- `auth.ts` - 认证相关端点（登录、登出、获取用户列表）
- `media.ts` - 媒体相关端点（浏览、搜索、详情）
- `playback.ts` - 播放相关端点（进度报告、流 URL）
- `index.ts` - 统一导出所有端点

## 使用示例

### 认证端点

```typescript
import { authEndpoints } from '@/services/api/endpoints'
import { embyClient } from '@/services/api/embyClient'

// 获取公开用户列表
const users = await embyClient.get(authEndpoints.getPublicUsers())

// 用户认证
const session = await embyClient.post(authEndpoints.authenticateByName(), {
  Username: 'username',
  Pw: 'password',
})

// 登出
await embyClient.post(authEndpoints.logout())
```

### 媒体端点

```typescript
import { mediaEndpoints } from '@/services/api/endpoints'
import { embyClient } from '@/services/api/embyClient'

const userId = 'user-id'

// 获取顶级视图
const views = await embyClient.get(mediaEndpoints.getViews(userId))

// 获取媒体项列表
const items = await embyClient.get(mediaEndpoints.getItems(userId), {
  Recursive: true,
  IncludeItemTypes: 'Movie',
  Limit: 20,
})

// 获取单个媒体项详情
const item = await embyClient.get(mediaEndpoints.getItem(userId, 'item-id'))

// 获取最新添加的项目
const latest = await embyClient.get(mediaEndpoints.getLatest(userId), {
  Limit: 10,
})
```

### 播放端点

```typescript
import { playbackEndpoints } from '@/services/api/endpoints'
import { embyClient } from '@/services/api/embyClient'

// 报告播放开始
await embyClient.post(playbackEndpoints.reportPlaybackStart(), {
  ItemId: 'item-id',
  MediaSourceId: 'source-id',
  PositionTicks: 0,
  PlayMethod: 'DirectPlay',
  PlaySessionId: 'session-id',
})

// 报告播放进度
await embyClient.post(playbackEndpoints.reportPlaybackProgress(), {
  ItemId: 'item-id',
  PositionTicks: 12345678,
  IsPaused: false,
  PlaySessionId: 'session-id',
})

// 报告播放停止
await embyClient.post(playbackEndpoints.reportPlaybackStopped(), {
  ItemId: 'item-id',
  PositionTicks: 12345678,
  PlaySessionId: 'session-id',
})

// 获取视频流 URL
const videoUrl = playbackEndpoints.getVideoStreamUrl('item-id')

// 获取音频流 URL
const audioUrl = playbackEndpoints.getAudioStreamUrl('item-id')

// 根据类型获取流 URL
const streamUrl = playbackEndpoints.getStreamUrl('item-id', 'video')
```

## 设计原则

1. **函数式设计**：所有端点都是返回字符串的函数，支持参数化
2. **类型安全**：使用 TypeScript 确保参数类型正确
3. **清晰命名**：端点名称清晰表达其功能
4. **模块化**：按功能模块组织，便于维护和扩展
5. **文档完善**：每个端点都有 JSDoc 注释说明用途和参数

## 扩展指南

添加新端点时，请遵循以下步骤：

1. 确定端点所属的功能模块（auth、media、playback 等）
2. 在对应的文件中添加端点函数
3. 添加 JSDoc 注释说明用途和参数
4. 如果是新模块，创建新文件并在 `index.ts` 中导出
5. 更新本 README 文档

## 参考文档

- [Emby API 官方文档](https://dev.emby.media/doc/restapi/)
- [Emby API 参考文档](.kiro/steering/emby-api-reference.md)
