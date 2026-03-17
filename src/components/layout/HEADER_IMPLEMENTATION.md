# Header 组件实现文档

## 概述

Header 组件是应用的顶部导航栏，提供应用标识、用户信息显示和登出功能。

## 功能特性

### 1. 应用标识
- **Logo**：显示字母 "E" 作为应用图标
- **标题**：显示 "Emby UI" 应用名称
- **位置**：固定在页面顶部，支持背景模糊效果

### 2. 用户信息显示
- **未登录状态**：显示"登录"按钮，点击跳转到登录页面
- **已登录状态**：
  - 显示用户头像（Avatar）
  - 头像使用用户名首字母作为 fallback
  - 点击头像显示下拉菜单

### 3. 用户下拉菜单
- **用户信息**：
  - 显示用户名
  - 显示用户角色（管理员/用户）
- **操作选项**：
  - 登出按钮：调用登出 API 并重定向到登录页

### 4. 响应式设计
- **移动端**：显示汉堡菜单按钮，用于切换侧边栏
- **桌面端**：隐藏汉堡菜单按钮
- **自适应布局**：使用 Flexbox 实现响应式布局

## 技术实现

### 依赖组件
- `Button`：shadcn/ui 按钮组件
- `Avatar`：shadcn/ui 头像组件
- `DropdownMenu`：shadcn/ui 下拉菜单组件
- `lucide-react`：图标库（Menu, LogOut, User）

### 状态管理
- **useAuthStore**：获取用户信息和服务器 URL
- **useUIStore**：控制侧边栏的打开/关闭状态
- **useLogout**：处理用户登出逻辑

### 核心功能

#### 1. 用户头像 URL
```typescript
const getUserAvatarUrl = (): string | null => {
  if (!user?.id || !serverUrl) return null
  // 当前实现返回 null，因为 User 类型暂无 primaryImageTag
  return null
}
```

#### 2. 用户名首字母
```typescript
const getUserInitial = (): string => {
  if (!user?.name) return 'U'
  return user.name.charAt(0).toUpperCase()
}
```

#### 3. 登出处理
```typescript
const handleLogout = () => {
  logout(undefined, {
    onSuccess: () => {
      navigate('/login')
    },
  })
}
```

## 样式设计

### 布局
- **高度**：64px (h-16)
- **位置**：sticky top-0，固定在顶部
- **层级**：z-50，确保在其他内容之上
- **背景**：半透明背景 + 模糊效果

### 响应式断点
- **移动端**：< 768px，显示汉堡菜单
- **桌面端**：≥ 768px，隐藏汉堡菜单

### 颜色方案
- **Logo 背景**：primary 主题色
- **Logo 文字**：primary-foreground
- **头像 fallback**：primary 背景 + primary-foreground 文字

## 测试覆盖

### 单元测试
- ✅ 渲染应用 Logo 和标题
- ✅ 显示汉堡菜单按钮
- ✅ 未登录时显示登录按钮
- ✅ 已登录时显示用户头像
- ✅ 正确获取用户名首字母（中文）
- ✅ 正确获取用户名首字母（英文）

### 测试文件
`src/components/layout/__tests__/Header.test.tsx`

## 需求映射

### 需求 1.6：用户登出
- ✅ 实现登出按钮
- ✅ 调用 Sessions/Logout 端点
- ✅ 清除存储的凭据
- ✅ 重定向到登录页面

### 需求 11.5：响应式设计
- ✅ 移动端显示汉堡菜单按钮
- ✅ 响应式布局适配不同屏幕尺寸

## 使用示例

```tsx
import Header from '@/components/layout/Header'

function App() {
  return (
    <div>
      <Header />
      {/* 其他内容 */}
    </div>
  )
}
```

## 未来改进

1. **用户头像**：
   - 支持从 Emby 服务器获取用户头像
   - 需要在 User 类型中添加 primaryImageTag 字段

2. **更多菜单选项**：
   - 用户设置
   - 主题切换
   - 语言切换

3. **通知功能**：
   - 显示系统通知
   - 未读消息提示

4. **搜索功能**：
   - 在 Header 中集成全局搜索框

## 相关文件

- 组件实现：`src/components/layout/Header.tsx`
- 单元测试：`src/components/layout/__tests__/Header.test.tsx`
- UI 组件：
  - `src/components/ui/avatar.tsx`
  - `src/components/ui/dropdown-menu.tsx`
  - `src/components/ui/button.tsx`
