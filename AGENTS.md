# AGENTS 协作文档

本文档基于 `.kiro` 目录中的规格与引导文档整理，作为本仓库的统一协作上下文。目标是让进入项目的代理或开发者可以快速理解产品目标、技术约束、当前进度与协作规则。

## 1. 项目定位

本项目是一个面向 Emby 媒体服务器的现代化 Web 用户界面，提供媒体浏览、搜索、播放与用户数据管理能力。应用为 React 单页应用，直接对接 Emby Server REST API，并预留弹幕能力集成。

核心目标：

- 提供桌面与移动端一致、流畅的媒体浏览体验
- 支持 Emby 用户认证与会话持久化
- 支持视频 HLS 播放、音频持续播放与播放进度同步
- 支持搜索、收藏、播放列表、过滤排序等媒体管理能力
- 保持良好的性能、错误处理与可扩展性

## 2. 语言与协作规则

- 所有交流默认使用中文
- 需求文档、设计文档、任务文档优先使用中文
- 代码注释、提交信息、开发日志优先使用中文
- 变量名、函数名、类名等代码标识符保持英文
- 技术术语可以保留英文，但应尽量给出中文语义

## 3. 技术栈

- 前端框架：React 18 + TypeScript
- 构建工具：Vite
- 样式方案：TailwindCSS + shadcn/ui
- 状态管理：Zustand
- 数据获取：TanStack Query
- 路由：React Router v6
- 视频播放：Video.js + hls.js
- 音频播放：Howler.js

## 4. 推荐架构

项目采用分层结构：

1. 表示层：React 组件 + UI 组件库
2. 业务逻辑层：Hooks + Zustand stores + services
3. 数据访问层：TanStack Query + API Client
4. 外部服务层：Emby Server API + Danmu API

推荐目录结构：

- `src/components`: 页面和通用组件
- `src/pages`: 路由页面
- `src/hooks`: 自定义 Hook
- `src/stores`: Zustand 状态管理
- `src/services`: API、播放器、弹幕等服务
- `src/types`: 类型定义
- `src/utils`: 工具函数与常量

## 5. 核心业务能力

### 5.1 用户认证

- 从 Emby 服务器拉取公开用户列表
- 使用 `Users/AuthenticateByName` 完成登录
- 存储 `AccessToken`、`UserId` 与服务器地址
- 请求头中附带设备信息与 `X-Emby-Token`
- 支持 `Sessions/Logout` 登出与本地会话持久化

### 5.2 媒体浏览

- 获取顶级视图，如电影、电视剧、音乐
- 获取媒体项列表与单项详情
- 展示标题、海报、年份、评分、时长等元数据
- 展示用户相关数据，如播放次数、收藏状态、恢复位置
- 列表超过 50 项时优先考虑虚拟滚动
- 图片使用懒加载

### 5.3 媒体详情

- 展示描述、演员、类型、导演、年份等信息
- 展示主图、背景图、Logo 等多种图片
- 对电视剧内容展示季和剧集层级
- 展示媒体源、音轨、字幕信息
- 支持播放、继续播放、从头播放
- 可扩展相似内容或推荐内容

### 5.4 视频播放

- 通过 Emby 获取可播放流地址
- 使用 Video.js 播放 HLS 内容
- 支持 DirectPlay、DirectStream、Transcode
- 支持字幕与音轨切换
- 标准播放控制：播放、暂停、拖动、音量、全屏
- 播放开始、进度变化、停止时向 Emby 上报状态

### 5.5 音频播放

- 使用通用音频端点与 Howler.js
- 支持底部持续迷你播放器
- 支持队列、上下曲与导航不中断
- 进度同步行为与视频一致

### 5.6 其他增强能力

- 全局搜索，输入防抖 300ms
- 收藏管理与收藏视图
- 播放列表创建、增删、排序与播放
- 过滤排序与偏好持久化
- 错误提示、重试与网络异常处理
- 响应式布局与移动端可用性
- 弹幕能力预留对接 `danmu_api`

## 6. Emby API 约定

- 基础路径：`http[s]://hostname:port/emby/{apipath}`
- 认证请求头需包含 `Authorization`
- 登录成功后的请求需携带 `X-Emby-Token`
- 常用端点包括：
  - `GET /System/Info`
  - `GET /Users/Public`
  - `POST /Users/AuthenticateByName`
  - `POST /Sessions/Logout`
  - `GET /Users/{UserId}/Views`
  - `GET /Users/{UserId}/Items`
  - `GET /Users/{UserId}/Items/{Id}`
  - `GET /Users/{UserId}/Items/Latest`
  - 播放状态相关的 `Sessions/Playing*`

实现时应注意：

- 初始化时生成并持久化设备信息
- 所有媒体查询尽量复用统一 API Client
- 播放进度上报要包含 `PlaySessionId` 与 `PlayMethod`
- 离线情况下应考虑本地队列与恢复补发

## 7. 响应式与性能目标

- 大屏宽度大于 1280px 时优先 6 列
- 中屏 768px 到 1280px 优先 4 列
- 小屏 480px 到 768px 优先 2 列
- 窄屏小于 480px 优先单列
- 小于 768px 时提供可折叠导航
- 对长列表使用虚拟滚动
- 对图片使用 Intersection Observer 懒加载
- API 响应通过 TanStack Query 缓存，基线目标为 5 分钟
- 搜索与频繁交互使用防抖

## 8. 当前实现进度

根据 `.kiro/specs/emby-ui/tasks.md`，当前状态可视为：

- 第一阶段核心能力已基本完成
- 已完成：项目初始化、API 客户端、类型定义、认证、基础布局、媒体浏览、媒体详情、视频播放、进度跟踪
- 第一阶段检查点尚未完全收尾
- 第二阶段尚未系统展开，音频播放等增强能力仍待推进

## 9. 接下来优先级

如果继续按原计划推进，建议优先顺序如下：

1. 完成第一阶段检查与验证，确认现有核心功能可用
2. 实现音频播放与持久迷你播放器
3. 补齐搜索、收藏、过滤排序
4. 完成错误处理、播放列表与弹幕能力
5. 针对性能与无障碍做系统性收尾

## 10. 开发时的默认准则

- 优先复用现有服务、类型与 store，不重复造结构
- 新增功能时先对齐 `.kiro` 中的需求与设计，不随意偏离
- 优先保证 Emby API 行为正确，再处理视觉细节
- 写代码时保持模块边界清晰，避免页面组件直接承担过多业务逻辑
- 对播放、认证、进度上报等状态敏感功能，优先补测试或至少做手动验证

## 11. 原始参考文档

本文件整理自以下文档：

- `.kiro/specs/emby-ui/requirements.md`
- `.kiro/specs/emby-ui/design.md`
- `.kiro/specs/emby-ui/tasks.md`
- `.kiro/steering/chinese-communication.md`
- `.kiro/steering/emby-api-reference.md`

如果本文件与原始规格出现冲突，应以 `.kiro` 中更具体、更新的文档为准。
