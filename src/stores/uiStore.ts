import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI 状态接口
 */
interface UIState {
  // 侧边栏状态
  sidebarOpen: boolean;
  
  // 操作方法
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

/**
 * UI 状态管理 Store
 * 
 * 管理应用的 UI 状态，包括侧边栏的打开/关闭状态
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 默认状态：桌面端侧边栏打开，移动端关闭
      sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 768,
      
      // 切换侧边栏状态
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // 设置侧边栏状态
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    }),
    {
      name: 'emby-ui-store', // localStorage 键名
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }), // 只持久化侧边栏状态
    }
  )
);
