# 布局组件

此目录包含应用的布局组件，提供响应式的整体布局结构。

## 组件列表

- `Layout.tsx` - 主布局组件（包含 Header、Sidebar、Footer 和主内容区域）
- `Header.tsx` - 顶部导航栏（包含 Logo、汉堡菜单按钮）
- `Sidebar.tsx` - 侧边栏导航（响应式，桌面固定，移动可折叠）
- `Footer.tsx` - 页脚（显示版权信息）

## 功能特性

### 响应式设计

- **桌面端（≥768px）**：侧边栏固定显示在左侧
- **移动端（<768px）**：侧边栏默认隐藏，通过汉堡菜单按钮控制显示/隐藏
- **遮罩层**：移动端打开侧边栏时显示半透明遮罩，点击遮罩关闭侧边栏

### 状态管理

使用 Zustand 管理侧边栏状态：
- `sidebarOpen`：侧边栏是否打开
- `toggleSidebar()`：切换侧边栏状态
- `setSidebarOpen(open)`：设置侧边栏状态

状态会持久化到 localStorage，页面刷新后保持。

### 动画效果

- 侧边栏展开/收起使用 CSS transition 实现平滑过渡（300ms）
- 遮罩层淡入淡出效果

## 使用示例

### 基础使用

```tsx
import Layout from '@/components/layout/Layout'

function MyPage() {
  return (
    <Layout>
      <h1>页面标题</h1>
      <p>页面内容...</p>
    </Layout>
  )
}
```

### 隐藏页脚

```tsx
import Layout from '@/components/layout/Layout'

function MyPage() {
  return (
    <Layout showFooter={false}>
      <h1>无页脚的页面</h1>
    </Layout>
  )
}
```

### 控制侧边栏

```tsx
import { useUIStore } from '@/stores/uiStore'

function MyComponent() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore()
  
  return (
    <div>
      <p>侧边栏状态: {sidebarOpen ? '打开' : '关闭'}</p>
      <button onClick={toggleSidebar}>切换侧边栏</button>
      <button onClick={() => setSidebarOpen(true)}>打开侧边栏</button>
      <button onClick={() => setSidebarOpen(false)}>关闭侧边栏</button>
    </div>
  )
}
```

## 响应式网格布局

布局组件支持 TailwindCSS 的响应式断点：

| 断点 | 屏幕宽度 | 网格列数（推荐） | 侧边栏行为 |
|------|---------|----------------|-----------|
| 默认 | <640px  | 1 列           | 可折叠    |
| sm   | ≥640px  | 2 列           | 可折叠    |
| md   | ≥768px  | 3-4 列         | 固定显示  |
| lg   | ≥1024px | 4 列           | 固定显示  |
| xl   | ≥1280px | 6 列           | 固定显示  |

示例：

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-4">
  {items.map(item => (
    <MediaCard key={item.id} item={item} />
  ))}
</div>
```

## 无障碍访问

- 所有交互元素都有适当的 `aria-label`
- 支持键盘导航（Tab 键）
- 焦点指示器清晰可见
- 遮罩层使用 `aria-hidden="true"` 避免屏幕阅读器读取

## 使用说明

布局组件的用法请参考本文件中的代码片段与属性说明。
