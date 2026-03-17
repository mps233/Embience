import { Home, Library, Search, Heart, ListMusic, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

/**
 * Sidebar 组件
 * 
 * 侧边栏导航，包含：
 * - 导航链接（主页、媒体库、搜索、收藏、播放列表）
 * - 当前活动路由高亮显示
 * - 响应式行为（桌面固定，移动可折叠）
 * - 移动端点击导航项后自动关闭
 * 
 * 需求：2.1, 7.1, 8.5
 */
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  // 导航项配置
  const navItems = [
    { icon: Home, label: '主页', href: '/home' },
    { icon: Library, label: '媒体库', href: '/library' },
    { icon: Search, label: '搜索', href: '/search' },
    { icon: Heart, label: '收藏', href: '/favorites' },
    { icon: ListMusic, label: '播放列表', href: '/playlists' },
  ];

  /**
   * 处理导航项点击
   * 移动端点击后自动关闭侧边栏
   */
  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 border-r bg-background transition-transform duration-300 ease-in-out',
          'md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 移动端关闭按钮 */}
        <div className="flex items-center justify-between border-b p-4 md:hidden">
          <h2 className="text-lg font-semibold">导航</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭侧边栏"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 导航列表 */}
        <nav className="space-y-1 p-4" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    // 活动路由高亮样式
                    isActive
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
