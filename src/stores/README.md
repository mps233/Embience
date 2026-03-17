# 状态管理 (Zustand Stores)

此目录包含应用的全局状态管理 stores。

## Stores 列表

- `authStore.ts` - 认证状态（用户、令牌、服务器配置）
- `playerStore.ts` - 播放器状态（当前播放项、播放状态、队列）
- `uiStore.ts` - UI 状态（侧边栏、加载状态、错误、过滤/排序偏好）
- `danmakuStore.ts` - 弹幕状态（弹幕列表、设置）

## 使用示例

```tsx
import { useAuthStore } from '@/stores/authStore'
import { usePlayerStore } from '@/stores/playerStore'

function Header() {
  const { user, logout } = useAuthStore()
  const { currentItem, isPlaying } = usePlayerStore()

  return (
    <header>
      <div>欢迎, {user?.name}</div>
      {currentItem && <div>正在播放: {currentItem.name}</div>}
      <button onClick={logout}>登出</button>
    </header>
  )
}
```

## Store 设计原则

1. **单一职责**: 每个 store 只管理相关的状态
2. **持久化**: 需要持久化的状态使用 localStorage
3. **类型安全**: 使用 TypeScript 定义完整的类型
4. **最小化**: 只存储必要的全局状态，局部状态使用 React state
