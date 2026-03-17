import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { useUIStore } from '@/stores/uiStore';

/**
 * 测试辅助函数：渲染带路由的 Sidebar 组件
 */
const renderSidebar = () => {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>
  );
};

describe('Sidebar 组件', () => {
  beforeEach(() => {
    // 重置 UI Store 状态
    useUIStore.setState({ sidebarOpen: true });
  });

  it('应该渲染所有导航链接', () => {
    renderSidebar();

    // 验证所有导航项都存在
    expect(screen.getByText('主页')).toBeInTheDocument();
    expect(screen.getByText('媒体库')).toBeInTheDocument();
    expect(screen.getByText('搜索')).toBeInTheDocument();
    expect(screen.getByText('收藏')).toBeInTheDocument();
    expect(screen.getByText('播放列表')).toBeInTheDocument();
  });

  it('应该显示正确的图标', () => {
    renderSidebar();

    // 验证导航项包含图标（通过 SVG 元素）
    const navLinks = screen.getAllByRole('link');
    navLinks.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('应该在移动端显示关闭按钮', () => {
    renderSidebar();

    // 关闭按钮应该存在（虽然在桌面端隐藏）
    const closeButton = screen.getByLabelText('关闭侧边栏');
    expect(closeButton).toBeInTheDocument();
  });

  it('点击关闭按钮应该关闭侧边栏', () => {
    renderSidebar();

    const closeButton = screen.getByLabelText('关闭侧边栏');
    fireEvent.click(closeButton);

    // 验证 sidebarOpen 状态变为 false
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('点击遮罩层应该关闭侧边栏', () => {
    renderSidebar();

    // 遮罩层应该存在（当 sidebarOpen 为 true 时）
    const overlay = document.querySelector('.bg-black\\/50');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      fireEvent.click(overlay);
      // 验证 sidebarOpen 状态变为 false
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    }
  });

  it('当 sidebarOpen 为 false 时不应该显示遮罩层', () => {
    useUIStore.setState({ sidebarOpen: false });
    renderSidebar();

    const overlay = document.querySelector('.bg-black\\/50');
    expect(overlay).not.toBeInTheDocument();
  });

  it('导航链接应该有正确的 href', () => {
    renderSidebar();

    expect(screen.getByText('主页').closest('a')).toHaveAttribute('href', '/home');
    expect(screen.getByText('媒体库').closest('a')).toHaveAttribute('href', '/library');
    expect(screen.getByText('搜索').closest('a')).toHaveAttribute('href', '/search');
    expect(screen.getByText('收藏').closest('a')).toHaveAttribute('href', '/favorites');
    expect(screen.getByText('播放列表').closest('a')).toHaveAttribute('href', '/playlists');
  });

  it('应该有正确的 ARIA 标签', () => {
    renderSidebar();

    // 验证导航区域有 aria-label
    const nav = screen.getByRole('navigation', { name: '主导航' });
    expect(nav).toBeInTheDocument();
  });

  it('移动端点击导航项应该关闭侧边栏', () => {
    // 模拟移动端窗口宽度
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    renderSidebar();

    const homeLink = screen.getByText('主页');
    fireEvent.click(homeLink);

    // 验证 sidebarOpen 状态变为 false
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('桌面端点击导航项不应该关闭侧边栏', () => {
    // 模拟桌面端窗口宽度
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    renderSidebar();

    const homeLink = screen.getByText('主页');
    fireEvent.click(homeLink);

    // 验证 sidebarOpen 状态保持为 true
    expect(useUIStore.getState().sidebarOpen).toBe(true);
  });
});
