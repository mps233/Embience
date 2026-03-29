# Embience

基于 React + TypeScript 的 Emby/Jellyfin Web 客户端，当前重点覆盖媒体浏览、搜索、收藏和视频播放（含弹幕）。

感谢大佬 [sheetung](https://github.com/sheetung) 提供的 GPT-5.4 支持。

## 当前功能（与代码一致）

- 服务器配置：手动输入地址并自动探测 Emby/Jellyfin 类型
- 登录认证：用户名 + 密码登录、登出、会话持久化（localStorage）
- 路由保护：未配置服务器跳转到 `/server-config`，未登录跳转到 `/login`
- 首页：Hero 轮播 + 按媒体库分类展示“最新内容”
- 媒体库页：按类型浏览（电影/剧集/音乐）+ 排序（首字母/年份/最新添加）
- 搜索页：关键词搜索 + 流派匹配搜索 + 类型过滤
- 收藏页：展示并过滤当前用户收藏
- 媒体详情页：
  - 元数据、评分、简介、演职员、媒体流信息
  - 收藏/取消收藏
  - 电视剧季集导航
  - 相似内容推荐
- 播放页：
  - 自定义控制栏（播放/暂停、快进快退、音量、全屏、进度拖动）
  - 音轨/字幕切换
  - 播放进度上报与续播
  - 弹幕匹配、弹幕开关、弹幕设置、手动选择弹幕源
- 视觉与交互：
  - 响应式布局
  - 主题色切换（非明暗主题切换）

## 当前路由

- `/server-config`：服务器配置
- `/login`：登录页
- `/home`：首页
- `/library/:type`：媒体库
- `/media/:id`：媒体详情
- `/player/:id`：播放页
- `/search`：搜索页
- `/favorites`：收藏页
- `/playlists`：占位页（尚未实现）

## 已知限制

- 自动化测试文件已移除，当前仓库不包含测试命令与测试用例
- 播放列表页目前是占位内容
- Header 中“语言切换”按钮为占位逻辑
- 用户头像当前使用首字母 fallback（未接入真实头像 URL）
- `MediaGrid` 中虚拟滚动逻辑暂未启用（虽然保留了 `react-window` 代码）

## 技术栈

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + Radix UI（shadcn 风格组件）
- Zustand（状态管理）
- TanStack Query v5（服务端状态）
- React Router v6（路由）
- Video.js（播放器）

## 快速开始

### 前置要求

- Node.js 18+
- npm
- 可访问的 Emby 或 Jellyfin 服务器

### 安装

```bash
npm install
```

### 环境变量（可选）

先复制模板：

```bash
cp .env.example .env.local
```

可配置项：

```env
# 开发代理默认目标地址（仅开发环境 Vite 代理使用）
VITE_EMBY_SERVER_URL=http://localhost:8096

# 弹幕 API 地址（可选）
VITE_DANMAKU_API_URL=https://api.dandanplay.net

# 应用标识信息（可选）
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=Emby UI
VITE_CLIENT_NAME=Emby Web
```

说明：实际服务器地址通常在应用内的 `/server-config` 页面配置与保存。
说明：上面的 `.env.local` 主要用于本地开发或本地构建。

### 开发与构建

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 项目结构

```text
src/
├── components/
│   ├── common/
│   ├── danmaku/
│   ├── layout/
│   ├── media/
│   ├── player/
│   └── ui/
├── hooks/
├── pages/
├── services/
│   ├── api/
│   ├── auth/
│   ├── danmaku/
│   ├── media/
│   └── player/
├── stores/
├── types/
└── utils/
```

## 部署说明

项目为标准 Vite SPA，构建产物在 `dist/`。部署到任意静态托管平台时，请确保启用 SPA fallback（将未知路由回退到 `index.html`）。

### Docker Hub

推荐直接使用已经发布好的镜像：

```bash
docker pull miaona/embience:latest
```

最简单的启动方式：

```bash
docker run -d \
  --name embience \
  -p 27880:80 \
  miaona/embience:latest
```

启动后访问：

```text
http://<你的主机IP>:27880
```

### Docker 运行时配置

镜像支持运行时配置。容器启动时会自动生成 `/config.js`，所以用户只需要在 `docker run` 时通过 `-e` 传参，不需要自己重新 build 镜像。

完整示例：

```bash
docker run -d \
  --name embience \
  -p 27880:80 \
  -e VITE_EMBY_SERVER_URL=http://192.168.50.210:8091 \
  -e VITE_DANMAKU_API_URL=https://your-danmaku-api.example.com \
  -e VITE_APP_VERSION=1.0.0 \
  -e VITE_APP_NAME="Embience" \
  -e VITE_CLIENT_NAME="Emby Web" \
  miaona/embience:latest
```

常见用法：

- 如果你希望用户自己在 `/server-config` 页面填写媒体服务器地址，可以不传 `VITE_EMBY_SERVER_URL`。
- 如果你希望弹幕功能开箱即用，建议传入可访问的 `VITE_DANMAKU_API_URL`。
- 修改环境变量后，删除旧容器并重新创建即可，不需要重新构建镜像。

### 镜像发布

仓库已配置 GitHub Actions 自动构建并推送 Docker Hub 镜像：

- 推送到 `main` 分支时自动发布
- 推送 `v*.*.*` 标签时自动发布对应版本标签
- 也支持手动触发工作流

默认镜像地址为：

```text
miaona/embience
```

## Screenshots

建议将截图放到 `docs/screenshots/` 目录，并按以下文件名命名。

### 1. 服务器配置页

![服务器配置页](docs/screenshots/01-server-config.png)

### 2. 登录页

![登录页](docs/screenshots/02-login.png)

### 3. 首页（Hero + 分区）

![首页 Hero 与分区](docs/screenshots/03-home-hero.png)

### 4. 媒体库页（排序）

![媒体库页](docs/screenshots/04-library-sort.png)

### 5. 搜索页（有结果）

![搜索结果页](docs/screenshots/05-search-results.png)

### 6. 搜索页（空状态）

![搜索空状态](docs/screenshots/06-search-empty.png)

### 7. 收藏页

![收藏页](docs/screenshots/07-favorites.png)

### 8. 媒体详情页

![媒体详情页](docs/screenshots/08-media-detail.png)

### 9. 播放页（控制栏）

![播放页控制栏](docs/screenshots/09-player-controls.png)

### 10. 播放页（弹幕）

![播放页弹幕功能](docs/screenshots/10-player-danmaku.png)

### 截图规范

- 桌面端统一使用 `1920x1080`
- 额外补一张移动端（建议 `390x844`，可选首页或播放器）
- 使用同一账号与同一媒体库，保证截图风格一致
- 推荐隐藏浏览器书签栏与无关插件 UI
- 若包含个人媒体信息，请先打码后再提交

## 相关链接

- [Emby API 文档](https://dev.emby.media/)
- [Jellyfin 文档](https://jellyfin.org/docs/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vite.dev/)
