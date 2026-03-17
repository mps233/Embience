import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import Layout from './components/layout/Layout'
import ServerConfig from './pages/ServerConfig'
import Login from './pages/Login'
import Home from './pages/Home'
import Library from './pages/Library'
import MediaDetail from './pages/MediaDetail'
import Player from './pages/Player'

/**
 * 创建 TanStack Query 客户端
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Emby UI 应用主组件
 * 配置路由和全局状态初始化
 */
function App() {
  const { serverUrl, isAuthenticated, initializeFromStorage } = useAuthStore()

  // 应用启动时从 localStorage 初始化认证状态
  useEffect(() => {
    initializeFromStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* 服务器配置页面 */}
          <Route path="/server-config" element={<ServerConfig />} />
          
          {/* 登录页面 */}
          <Route path="/login" element={<Login />} />
          
          {/* 主页 */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          
          {/* 媒体库页面 */}
          <Route 
            path="/library/:type" 
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            } 
          />
          
          {/* 媒体详情页面 */}
          <Route 
            path="/media/:id" 
            element={
              <ProtectedRoute>
                <MediaDetail />
              </ProtectedRoute>
            } 
          />
          
          {/* 播放器页面 */}
          <Route 
            path="/player/:id" 
            element={
              <ProtectedRoute>
                <Player />
              </ProtectedRoute>
            } 
          />
          
          {/* 搜索页面占位符 */}
          <Route 
            path="/search" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">搜索</h1>
                    <p className="text-muted-foreground">搜索功能即将推出...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* 收藏页面占位符 */}
          <Route 
            path="/favorites" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">收藏</h1>
                    <p className="text-muted-foreground">收藏页面即将推出...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* 播放列表页面占位符 */}
          <Route 
            path="/playlists" 
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">播放列表</h1>
                    <p className="text-muted-foreground">播放列表页面即将推出...</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* 根路径重定向 */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/home" replace />
              ) : serverUrl ? (
                <Navigate to="/login" replace />
              ) : (
                <Navigate to="/server-config" replace />
              )
            } 
          />
          
          {/* 404 页面 */}
          <Route 
            path="*" 
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-4">404</h1>
                  <p className="text-muted-foreground">页面未找到</p>
                </div>
              </div>
            } 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

