import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '../Layout';
import { useUIStore } from '@/stores/uiStore';

/**
 * 创建测试用的 QueryClient
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

describe('Layout 组件', () => {
  beforeEach(() => {
    // 重置 UI store 状态
    useUIStore.setState({ sidebarOpen: true });
  });

  it('应该渲染 Header、Sidebar、Footer 和子内容', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <div>测试内容</div>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // 验证子内容被渲染
    expect(screen.getByText('测试内容')).toBeInTheDocument();

    // 验证 Header 被渲染（通过 Logo 文本）
    expect(screen.getByText('Emby UI')).toBeInTheDocument();

    // 验证 Sidebar 被渲染（通过导航项）
    expect(screen.getByText('主页')).toBeInTheDocument();
    expect(screen.getByText('媒体库')).toBeInTheDocument();
    expect(screen.getByText('搜索')).toBeInTheDocument();

    // 验证 Footer 被渲染
    expect(screen.getByText(/© 2024 Emby UI/)).toBeInTheDocument();
  });

  it('应该支持隐藏页脚', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout showFooter={false}>
            <div>测试内容</div>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // 验证页脚不被渲染
    expect(screen.queryByText(/© 2024 Emby UI/)).not.toBeInTheDocument();
  });

  it('应该正确应用响应式类名', () => {
    const queryClient = createTestQueryClient();
    
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <div>测试内容</div>
          </Layout>
        </BrowserRouter>
      </QueryClientProvider>
    );

    // 验证主容器有正确的类名
    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('flex-1');
    expect(mainElement).toHaveClass('transition-all');
  });
});
