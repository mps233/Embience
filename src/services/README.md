# 服务层

此目录包含应用的业务逻辑服务。

## 目录结构

### api/
API 客户端和端点定义
- `embyClient.ts` - Emby API 客户端
- `danmakuClient.ts` - 弹幕 API 客户端
- `endpoints/` - API 端点定义

### auth/
认证相关服务
- `authService.ts` - 用户认证服务
- 提供用户登录、登出、认证状态管理功能
- 与 authStore 集成，自动持久化认证会话

### player/
播放器相关服务
- `videoService.ts` - Video.js 封装
- `audioService.ts` - Howler.js 封装
- `progressTracker.ts` - 播放进度跟踪

### danmaku/
弹幕相关服务
- `danmakuEngine.ts` - 弹幕渲染引擎
- `danmakuMatcher.ts` - 弹幕匹配逻辑
