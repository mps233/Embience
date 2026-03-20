/**
 * Header 组件
 * 
 * 顶部导航栏，包含：
 * - 应用 Logo 和标题
 * - 汉堡菜单按钮（移动端）
 * - 用户信息和登出按钮
 * 
 * 需求：1.6, 11.5
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, User as UserIcon, Github, Globe, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'
import { createAuthService } from '@/services/auth/authService'
import { createEmbyClient } from '@/services/api/embyClient'

/**
 * Header 组件
 */
export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, serverUrl, serverType } = useAuthStore()
  const navRef = useRef<HTMLDivElement>(null)
  
  // 判断是否是首页
  const isHomePage = location.pathname === '/home' || location.pathname === '/'
  
  // 滚动状态 - 初始化为 true，确保页面切换时有动画
  const [isScrolled, setIsScrolled] = useState(true)
  
  // 动画强制状态 - 用于确保页面切换时的动画
  const [forceAnimation, setForceAnimation] = useState(false)
  
  // 使用 ref 跟踪上一次的路径
  const prevPathname = useRef(location.pathname)
  
  // 鼠标位置状态
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  // 主题色状态
  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem('themeColor') || 'coral'
  })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // 处理页面切换和滚动
  useEffect(() => {
    const currentPath = location.pathname
    const isPageChange = prevPathname.current !== currentPath
    
    if (isPageChange) {
      // 页面切换时的动画逻辑
      setForceAnimation(true)
      
      if (isHomePage) {
        // 切换到首页：确保先是紧凑状态，然后根据滚动位置决定最终状态
        setIsScrolled(true)
        setTimeout(() => {
          // 根据当前滚动位置决定最终状态
          setIsScrolled(window.scrollY > 50)
          setForceAnimation(false)
        }, 50)
      } else {
        // 切换到其他页面：确保先是展开状态，然后收缩
        setIsScrolled(false)
        setTimeout(() => {
          setIsScrolled(true)
          setForceAnimation(false)
        }, 50)
      }
      
      prevPathname.current = currentPath
    } else {
      // 非页面切换时的逻辑（首次加载或刷新）
      if (isHomePage) {
        // 首页：立即设置正确的初始状态，然后监听滚动
        setIsScrolled(window.scrollY > 50)
        
        const handleScroll = () => {
          if (!forceAnimation) {
            setIsScrolled(window.scrollY > 50)
          }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
      } else {
        // 非首页：设为紧凑状态
        setIsScrolled(true)
      }
    }
  }, [location.pathname, isHomePage])

  // 获取当前主题色的 RGB 值
  const getThemeColorRgb = () => {
    const colorMap: Record<string, string> = {
      coral: '229, 94, 57',
      sky: '14, 165, 233',
      lavender: '139, 92, 246',
      mint: '16, 185, 129',
      rose: '244, 63, 94',
      amber: '245, 158, 11',
      cyan: '6, 182, 212',
      white: '255, 255, 255',
    }
    return colorMap[themeColor] || colorMap.coral
  }

  // 应用主题色
  useEffect(() => {
    const colorMap: Record<string, string> = {
      coral: '#e55e39',
      sky: '#0ea5e9',
      lavender: '#8b5cf6',
      mint: '#10b981',
      rose: '#f43f5e',
      amber: '#f59e0b',
      cyan: '#06b6d4',
      white: '#ffffff',
    }
    document.documentElement.style.setProperty('--theme-color', colorMap[themeColor] || colorMap.coral)
    localStorage.setItem('themeColor', themeColor)
  }, [themeColor])

  // 点击外部关闭颜色选择面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  // 主题色选项
  const themeColors = [
    { name: '珊瑚橙', value: 'coral', color: '#e55e39' },
    { name: '天空蓝', value: 'sky', color: '#0ea5e9' },
    { name: '薰衣草', value: 'lavender', color: '#8b5cf6' },
    { name: '薄荷绿', value: 'mint', color: '#10b981' },
    { name: '玫瑰红', value: 'rose', color: '#f43f5e' },
    { name: '琥珀黄', value: 'amber', color: '#f59e0b' },
    { name: '青色', value: 'cyan', color: '#06b6d4' },
    { name: '纯白', value: 'white', color: '#ffffff' },
  ]

  // 监听鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return
    const rect = navRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  // 创建认证服务实例
  const authService = useMemo(() => {
    if (!serverUrl) return null
    const apiClient = createEmbyClient({
      serverUrl,
      serverType: serverType || undefined,
    })
    return createAuthService(apiClient)
  }, [serverUrl, serverType])

  // 使用登出 Hook
  const { mutate: logout, isPending: isLoggingOut } = useLogout(authService!)

  /**
   * 处理登出
   */
  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        // 登出成功后重定向到登录页
        navigate('/login')
      },
    })
  }

  /**
   * 获取用户头像 URL
   */
  const getUserAvatarUrl = (): string | null => {
    if (!user?.id || !serverUrl) return null
    // 注意：这里假设用户有 primaryImageTag，实际可能需要从 User 类型中获取
    // 由于当前 User 类型没有 primaryImageTag，我们暂时返回 null
    return null
  }

  /**
   * 获取用户名首字母（用于头像 fallback）
   */
  const getUserInitial = (): string => {
    if (!user?.name) return 'U'
    return user.name.charAt(0).toUpperCase()
  }

  return (
    <header className="fixed top-0 z-50 w-full">
      {/* 导航栏下方的渐变阴影背景 */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-32 w-full bg-gradient-to-b from-black/80 to-transparent" />
      
      {/* 外部发光效果 - 跟随鼠标位置，使用主题色 */}
      {isScrolled && navRef.current && (
        <div
          className="pointer-events-none absolute z-0 transition-opacity duration-300"
          style={{
            left: `${navRef.current.getBoundingClientRect().left + mousePos.x - 80}px`,
            top: `${navRef.current.getBoundingClientRect().top + mousePos.y - 80}px`,
            width: '160px',
            height: '160px',
            background: `radial-gradient(circle, rgba(${getThemeColorRgb()}, 0.2), transparent 70%)`,
            filter: 'blur(30px)',
            opacity: isHovering ? 1 : 0,
          }}
        />
      )}
      
      <div 
        ref={navRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`relative z-10 mx-auto flex items-center justify-between rounded-full px-6 py-3 transition-all duration-300 ease-out ${
          isScrolled
            ? 'mt-3 w-[90%] max-w-5xl bg-[#0a0a0a]/60 shadow-2xl backdrop-blur-md md:w-[80%]' 
            : 'w-full max-w-7xl bg-transparent'
        }`}
      >
        {/* 跟随鼠标的发光边框效果，使用主题色 */}
        {isScrolled && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 100px at ${mousePos.x}px ${mousePos.y}px, rgba(${getThemeColorRgb()}, 0.6), transparent 70%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: '1px',
              opacity: isHovering ? 1 : 0,
            }}
          />
        )}
        
        {/* 静态边框 */}
        {isScrolled && (
          <div className="pointer-events-none absolute inset-0 rounded-full border border-white/10" />
        )}
        {/* Logo 和标题 */}
        <button
          onClick={() => navigate('/home')}
          className="group flex items-center gap-3"
        >
          <div 
            className={`flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
              isScrolled ? 'h-9 w-9' : 'h-10 w-10'
            }`}
          >
            {/* SVG Logo - 简洁可爱风格 */}
            <svg 
              viewBox="0 0 40 40" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-lg"
            >
              {/* 外圈 */}
              <circle 
                cx="20" 
                cy="20" 
                r="18" 
                fill="white"
                opacity="0.95"
              />
              
              {/* 左眼 */}
              <circle 
                cx="14" 
                cy="17" 
                r="2.5" 
                fill="#17181A"
              />
              
              {/* 右眼 - 播放按钮（超圆润版本） */}
              <path 
                d="M 23.5 15 Q 23.5 14 24.5 14.5 L 28 16.5 Q 29 17 29 17.5 Q 29 18 28 18.5 L 24.5 20.5 Q 23.5 21 23.5 20 Z" 
                fill="#17181A"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              
              {/* 微笑弧线 - 圆润版本 */}
              <path 
                d="M 12 24 Q 20 29, 28 24" 
                stroke="#17181A" 
                strokeWidth="2.8" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={`font-bold tracking-tight text-white transition-all duration-300 ${
            isScrolled ? 'text-base' : 'text-lg'
          }`}>
            Embience
          </span>
        </button>

        {/* 导航链接 */}
        <nav className="hidden items-center gap-8 md:flex">
          <button
            onClick={() => navigate('/home')}
            className="text-sm font-medium text-[oklch(0.707_0.022_261.325)] transition-colors"
            style={{ ['--hover-color' as any]: 'var(--theme-color)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            首页
          </button>
          <button
            onClick={() => navigate('/search')}
            className="text-sm font-medium text-[oklch(0.707_0.022_261.325)] transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            搜索
          </button>
          <button
            onClick={() => navigate('/favorites')}
            className="text-sm font-medium text-[oklch(0.707_0.022_261.325)] transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            收藏
          </button>
          <button
            onClick={() => navigate('/playlists')}
            className="text-sm font-medium text-[oklch(0.707_0.022_261.325)] transition-colors"
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-color)'}
            onMouseLeave={(e) => e.currentTarget.style.color = ''}
          >
            播放列表
          </button>
        </nav>

        {/* 用户信息区域 */}
        <div className="hidden items-center gap-3 md:flex">
          {/* GitHub 图标 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full p-0 text-[oklch(0.707_0.022_261.325)] transition-colors hover:bg-white/10"
            onClick={() => window.open('https://github.com/yourusername/emby-ui', '_blank')}
            aria-label="GitHub"
            onMouseEnter={(e) => {
              const icon = e.currentTarget.querySelector('svg')
              if (icon) icon.style.color = 'var(--theme-color)'
            }}
            onMouseLeave={(e) => {
              const icon = e.currentTarget.querySelector('svg')
              if (icon) icon.style.color = ''
            }}
          >
            <Github className="h-5 w-5 transition-colors" />
          </Button>

          {/* 语言切换图标 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full p-0 text-[oklch(0.707_0.022_261.325)] transition-colors hover:bg-white/10"
            onClick={() => {
              // TODO: 实现语言切换逻辑
              console.log('切换语言')
            }}
            aria-label="切换语言"
            onMouseEnter={(e) => {
              const icon = e.currentTarget.querySelector('svg')
              if (icon) icon.style.color = 'var(--theme-color)'
            }}
            onMouseLeave={(e) => {
              const icon = e.currentTarget.querySelector('svg')
              if (icon) icon.style.color = ''
            }}
          >
            <Globe className="h-5 w-5 transition-colors" />
          </Button>

          {/* 主题色选择器 */}
          <div className="relative" ref={colorPickerRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0 text-[oklch(0.707_0.022_261.325)] transition-colors hover:bg-white/10"
              onClick={() => setShowColorPicker(!showColorPicker)}
              aria-label="选择主题色"
              onMouseEnter={(e) => {
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = 'var(--theme-color)'
              }}
              onMouseLeave={(e) => {
                const icon = e.currentTarget.querySelector('svg')
                if (icon) icon.style.color = ''
              }}
            >
              <Palette className="h-5 w-5 transition-colors" />
            </Button>

            {/* 颜色选择面板 */}
            {showColorPicker && (
              <div 
                className="absolute right-0 top-12 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl"
                style={{
                  zIndex: 9999,
                  backgroundColor: 'rgba(10, 10, 10, 0.6)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  width: '280px',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                }}
              >
                {/* 标题区域 */}
                <div className="px-5 py-4 border-b backdrop-blur-sm" style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" style={{ color: 'var(--theme-color)' }} />
                    <span className="text-sm font-medium text-white/90">
                      选择主题色
                    </span>
                  </div>
                </div>

                {/* 颜色网格 */}
                <div className="p-5">
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '16px',
                  }}>
                    {themeColors.map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => {
                          setThemeColor(theme.value)
                          setShowColorPicker(false)
                        }}
                        className="group relative flex flex-col items-center gap-2 transition-all hover:scale-105"
                        aria-label={theme.name}
                        title={theme.name}
                      >
                        {/* 颜色方块 */}
                        <div 
                          className="relative rounded-2xl transition-all"
                          style={{ 
                            backgroundColor: theme.color,
                            width: '48px',
                            height: '48px',
                            boxShadow: themeColor === theme.value 
                              ? `0 0 0 3px rgba(10, 10, 10, 0.6), 0 0 0 5px ${theme.color}40, 0 8px 16px rgba(0, 0, 0, 0.4)`
                              : '0 4px 12px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          {/* 选中指示器 */}
                          {themeColor === theme.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg 
                                className="w-6 h-6" 
                                fill="none" 
                                stroke="white" 
                                viewBox="0 0 24 24"
                                style={{
                                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                                }}
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth={3} 
                                  d="M5 13l4 4L19 7" 
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* 颜色名称 */}
                        <span 
                          className="text-xs transition-colors"
                          style={{ 
                            color: themeColor === theme.value ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.5)',
                            fontWeight: themeColor === theme.value ? 500 : 400,
                          }}
                        >
                          {theme.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                  aria-label="用户菜单"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getUserAvatarUrl() || undefined} alt={user.name} />
                    <AvatarFallback className="bg-white text-black">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.policy.isAdministrator ? '管理员' : '用户'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? '登出中...' : '登出'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="flex items-center space-x-2"
            >
              <UserIcon className="h-4 w-4" />
              <span className="hidden sm:inline">登录</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
