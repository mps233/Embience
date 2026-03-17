/**
 * 路由保护组件
 * 
 * 用于保护需要认证的路由，未认证用户将被重定向到：
 * - 未配置服务器：重定向到服务器配置页面
 * - 已配置服务器但未登录：重定向到登录页面
 * - 已认证：渲染受保护的内容
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  /** 受保护的子组件 */
  children: React.ReactNode
  /** 自定义重定向路径（可选） */
  redirectTo?: string
}

/**
 * 路由保护组件
 * 
 * @example
 * ```tsx
 * <Route 
 *   path="/library" 
 *   element={
 *     <ProtectedRoute>
 *       <Library />
 *     </ProtectedRoute>
 *   } 
 * />
 * ```
 */
export function ProtectedRoute({ children, redirectTo }: ProtectedRouteProps) {
  const { isAuthenticated, serverUrl } = useAuthStore()

  // 已认证：渲染受保护的内容
  if (isAuthenticated) {
    return <>{children}</>
  }

  // 如果提供了自定义重定向路径，使用它
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />
  }

  // 未认证且未配置服务器：重定向到服务器配置页面
  if (!serverUrl) {
    return <Navigate to="/server-config" replace />
  }

  // 未认证但已配置服务器：重定向到登录页面
  return <Navigate to="/login" replace />
}
