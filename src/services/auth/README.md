# 认证服务 (Auth Service)

认证服务提供用户认证相关的业务逻辑，包括用户登录、登出和认证状态管理。

## 功能特性

- ✅ 获取公开用户列表
- ✅ 用户名密码认证
- ✅ 用户登出
- ✅ 认证状态检查
- ✅ 自动持久化认证会话
- ✅ 设备信息管理

## 使用方法

### 1. 创建认证服务实例

```typescript
import { createEmbyClient } from '@/services/api/embyClient'
import { createAuthService } from '@/services/auth/authService'

// 创建 API 客户端
const apiClient = createEmbyClient({
  serverUrl: 'http://your-emby-server:8096',
})

// 创建认证服务
const authService = createAuthService(apiClient)
```

### 2. 初始化认证状态

在应用启动时调用，以恢复之前的认证会话：

```typescript
// 在 App.tsx 或主入口文件中
authService.initializeFromStorage()
```

### 3. 获取公开用户列表

```typescript
try {
  const users = await authService.getPublicUsers()
  console.log('公开用户列表:', users)
} catch (error) {
  console.error('获取用户列表失败:', error)
}
```

### 4. 用户登录

```typescript
try {
  const session = await authService.authenticateByName({
    username: 'myusername',
    password: 'mypassword',
  })
  
  console.log('登录成功:', session.user.name)
  console.log('访问令牌:', session.accessToken)
} catch (error) {
  console.error('登录失败:', error.message)
}
```

### 5. 检查认证状态

```typescript
if (authService.isAuthenticated()) {
  console.log('用户已登录')
  const user = authService.getCurrentUser()
  console.log('当前用户:', user?.name)
} else {
  console.log('用户未登录')
}
```

### 6. 用户登出

```typescript
try {
  await authService.logout()
  console.log('登出成功')
} catch (error) {
  console.error('登出失败:', error)
}
```

## 与 Auth Store 集成

认证服务自动与 `authStore` 集成，所有认证状态变化都会同步到 Store：

```typescript
import { useAuthStore } from '@/stores/authStore'

function MyComponent() {
  const { user, isAuthenticated } = useAuthStore()
  
  return (
    <div>
      {isAuthenticated ? (
        <p>欢迎, {user?.name}!</p>
      ) : (
        <p>请登录</p>
      )}
    </div>
  )
}
```

## 错误处理

认证服务会抛出友好的错误消息：

```typescript
try {
  await authService.authenticateByName(credentials)
} catch (error) {
  if (error.message.includes('用户名或密码错误')) {
    // 处理凭据错误
  } else if (error.message.includes('网络连接失败')) {
    // 处理网络错误
  } else {
    // 处理其他错误
  }
}
```

## 设备信息

认证服务自动管理设备信息，包括：

- 客户端类型（Client）
- 设备名称（Device）
- 设备唯一 ID（DeviceId）
- 应用版本（Version）

```typescript
const deviceInfo = authService.getDeviceInfo()
console.log('设备信息:', deviceInfo)
```

## 会话持久化

认证会话会自动持久化到 `localStorage`，包括：

- 用户信息
- 访问令牌
- 服务器 URL

在浏览器刷新后，调用 `initializeFromStorage()` 即可恢复会话。

## API 参考

### `getPublicUsers(): Promise<PublicUser[]>`

获取服务器上的公开用户列表。

**返回值：** 公开用户数组

**抛出：** 当网络请求失败时

### `authenticateByName(credentials: LoginCredentials): Promise<AuthSession>`

使用用户名和密码进行认证。

**参数：**
- `credentials.username` - 用户名
- `credentials.password` - 密码（明文）

**返回值：** 认证会话信息

**抛出：** 当认证失败时

### `logout(): Promise<void>`

登出当前用户。

**抛出：** 当登出请求失败时（但仍会清除本地凭据）

### `isAuthenticated(): boolean`

检查用户是否已认证。

**返回值：** 是否已认证

### `initializeFromStorage(): void`

从本地存储初始化认证状态。应在应用启动时调用。

### `getCurrentUser(): User | null`

获取当前用户信息。

**返回值：** 当前用户信息，如果未认证则返回 null

### `getAccessToken(): string | null`

获取当前访问令牌。

**返回值：** 当前访问令牌，如果未认证则返回 null

### `getDeviceInfo(): DeviceInfo`

获取设备信息。

**返回值：** 设备信息对象

## 需求映射

- **需求 1.1**: `getPublicUsers()` - 显示公开用户列表
- **需求 1.2**: `authenticateByName()` - 使用 AuthenticateByName 端点认证
- **需求 1.3**: `authenticateByName()` - 存储访问令牌和用户 ID
- **需求 1.4**: `authenticateByName()` - 认证失败时显示错误消息
- **需求 1.5**: `getDeviceInfo()` - 包含设备信息
- **需求 1.6**: `logout()` - 调用 Sessions/Logout 并清除凭据
- **需求 1.7**: `initializeFromStorage()` - 在浏览器刷新后保持会话
