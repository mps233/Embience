# Emby UI

现代化的 Emby 媒体服务器 Web 用户界面

## 功能特性

- 🎬 媒体库浏览（电影、电视剧、音乐）
- 🔍 全局搜索功能
- ⭐ 收藏管理
- 📝 播放列表管理
- 🎥 视频播放（支持 HLS 自适应流）
- 🎵 音频播放（持久化播放器）
- 💬 弹幕功能
- 📱 响应式设计（支持桌面和移动设备）
- 🌙 暗色/亮色主题切换
- ♿ 完整的键盘导航和无障碍支持

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式方案**: TailwindCSS + shadcn/ui
- **状态管理**: Zustand
- **数据获取**: TanStack Query (React Query v5)
- **路由**: React Router v6
- **视频播放**: Video.js + hls.js
- **音频播放**: Howler.js

## 快速开始

### 前置要求

- Node.js 18+ 
- npm 或 yarn
- 运行中的 Emby 服务器

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd emby-ui

# 安装依赖
npm install
```

### 配置

复制 `.env.example` 到 `.env.local` 并配置你的 Emby 服务器：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# Emby 服务器 URL
VITE_EMBY_SERVER_URL=http://your-emby-server:8096

# 弹幕 API URL（可选）
VITE_DANMAKU_API_URL=https://api.dandanplay.net

# 应用配置
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=Emby UI
VITE_CLIENT_NAME=Emby Web
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 代码检查和格式化

```bash
# 运行 ESLint
npm run lint

# 格式化代码
npm run format
```

## 项目结构

```
src/
├── components/          # React 组件
│   ├── ui/             # shadcn/ui 基础组件
│   ├── layout/         # 布局组件
│   ├── media/          # 媒体相关组件
│   ├── player/         # 播放器组件
│   ├── danmaku/        # 弹幕组件
│   └── common/         # 通用组件
├── pages/              # 页面组件
├── hooks/              # 自定义 Hooks
├── stores/             # Zustand 状态管理
├── services/           # 业务逻辑服务
│   ├── api/           # API 客户端
│   ├── player/        # 播放器服务
│   └── danmaku/       # 弹幕服务
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── App.tsx
└── main.tsx
```

## Emby 服务器配置

### CORS 配置

如果你的 Emby 服务器和 Web 应用不在同一域名下，需要配置 CORS：

1. 登录 Emby 服务器管理面板
2. 进入 **设置 > 高级 > 网络**
3. 在 **CORS 允许的源** 中添加你的 Web 应用域名

例如：`http://localhost:5173` 或 `https://your-domain.com`

### API 密钥（可选）

你也可以使用 API 密钥进行认证：

1. 在 Emby 管理面板中创建 API 密钥
2. 在应用中使用 API 密钥而不是用户密码

## 部署

### 静态托管

构建后的文件可以部署到任何静态托管服务：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

### Docker

```bash
# 构建 Docker 镜像
docker build -t emby-ui .

# 运行容器
docker run -p 80:80 emby-ui
```

### Nginx

将构建后的 `dist` 目录部署到 Nginx：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

## 开发指南

### 添加新组件

使用 shadcn/ui CLI 添加组件：

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

### 代码规范

- 使用 TypeScript strict 模式
- 组件使用函数式组件 + Hooks
- 代码注释使用中文
- 变量名、函数名使用英文
- 遵循 React 最佳实践

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [Emby 官方文档](https://dev.emby.media/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vite.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- [shadcn/ui 文档](https://ui.shadcn.com/)
