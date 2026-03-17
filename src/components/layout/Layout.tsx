import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

/**
 * Layout 组件属性
 */
interface LayoutProps {
  children: ReactNode;
  /** 是否显示页脚，默认为 true */
  showFooter?: boolean;
}

/**
 * 主布局组件
 * 
 * 提供应用的整体布局结构，包含：
 * - Header（顶部导航栏）
 * - Sidebar（侧边栏导航）
 * - 主内容区域
 * - Footer（页脚）
 * 
 * 响应式特性：
 * - 桌面端（≥768px）：侧边栏固定显示
 * - 移动端（<768px）：侧边栏可折叠，通过汉堡菜单控制
 * 
 * @example
 * ```tsx
 * <Layout>
 *   <YourPageContent />
 * </Layout>
 * ```
 */
export default function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <Header />

      {/* 主体区域 */}
      <div className="flex flex-1">
        {/* 主内容区域 */}
        <main className="flex-1">
          {/* 内容容器 */}
          <div className="relative pt-20">
            {children}
          </div>
        </main>
      </div>

      {/* 页脚 */}
      {showFooter && <Footer />}
    </div>
  );
}
