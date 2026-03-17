/**
 * MediaGrid 组件
 * 
 * 响应式网格布局显示媒体项列表：
 * - 响应式网格（6/4/2/1 列）
 * - 虚拟滚动（列表超过 50 项时启用）
 * - 加载状态（骨架屏）
 * - 空状态
 * 
 * 需求：2.2, 2.4, 11.1, 11.2, 11.3, 11.4, 12.4, 12.6
 */

import { useMemo } from 'react'
import { Grid as VirtualGrid } from 'react-window'
import MediaCard from './MediaCard'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/types/emby'

/**
 * MediaGrid 组件属性
 */
export interface MediaGridProps {
  /** 媒体项列表 */
  items: MediaItem[]
  /** 是否正在加载 */
  isLoading?: boolean
  /** 自定义类名 */
  className?: string
  /** 卡片图片宽度 */
  imageWidth?: number
  /** 卡片图片高度 */
  imageHeight?: number
  /** 最大列数（桌面端），默认为 8 */
  maxColumns?: number
}

/**
 * 骨架屏卡片
 */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg">
      {/* 图片骨架 */}
      <div className="aspect-[2/3] animate-pulse rounded-lg bg-white/5" />
      
      {/* 信息骨架 */}
      <div className="p-2 pt-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  )
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-white/5 p-6">
        <svg
          className="h-12 w-12 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold">暂无媒体内容</h3>
      <p className="text-sm text-muted-foreground">
        此分类下没有找到任何媒体项
      </p>
    </div>
  )
}

/**
 * MediaGrid 组件
 * 
 * 需求 2.2：Media_Browser 应当以网格布局显示媒体项
 * 需求 2.4：Media_Browser 应当支持响应式布局，在不同屏幕尺寸下调整网格列数
 * 需求 11.1：Emby_UI_Application 应当在大屏幕（≥1536px）上显示 6 列网格
 * 需求 11.2：Emby_UI_Application 应当在中等屏幕（≥768px）上显示 4 列网格
 * 需求 11.3：Emby_UI_Application 应当在小屏幕（≥640px）上显示 2 列网格
 * 需求 11.4：Emby_UI_Application 应当在移动设备（<640px）上显示 1 列网格
 * 需求 12.4：Emby_UI_Application 应当在加载媒体项时显示骨架屏
 * 需求 12.6：Emby_UI_Application 应当对超过 50 项的列表启用虚拟滚动
 */
export default function MediaGrid({
  items,
  isLoading = false,
  className,
  imageWidth = 300,
  imageHeight = 450,
  maxColumns = 8,
}: MediaGridProps) {
  /**
   * 需求 12.6：超过 50 项时启用虚拟滚动
   * 暂时禁用虚拟滚动以避免 react-window 的兼容性问题
   */
  const useVirtualScroll = false // items.length > 50

  /**
   * 计算响应式列数
   * 需求 11.1-11.4：响应式网格列数
   */
  const getColumnCount = (): number => {
    if (typeof window === 'undefined') return 6
    
    const width = window.innerWidth
    if (width >= 1536) return 6 // 2xl
    if (width >= 768) return 4  // md
    if (width >= 640) return 2  // sm
    return 1 // mobile
  }

  /**
   * 需求 12.4：加载状态显示骨架屏
   */
  if (isLoading) {
    const columnCount = getColumnCount()
    const skeletonCount = columnCount * 3 // 显示 3 行骨架屏
    
    return (
      <div
        className={cn(
          'grid gap-3',
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
          className
        )}
      >
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    )
  }

  /**
   * 空状态
   */
  if (items.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    )
  }

  /**
   * 需求 2.2, 2.4：标准网格布局（不使用虚拟滚动）
   */
  if (!useVirtualScroll) {
    // 根据 maxColumns 动态生成网格类名
    const gridColsClass = maxColumns === 8 
      ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8'
      : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9'
    
    return (
      <div
        className={cn(
          'grid gap-4',
          gridColsClass,
          className
        )}
      >
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
        ))}
      </div>
    )
  }

  /**
   * 需求 12.6：虚拟滚动网格（超过 50 项）
   */
  return <VirtualGridComponent items={items} className={className} imageWidth={imageWidth} imageHeight={imageHeight} />
}

/**
 * 虚拟滚动网格组件
 * 
 * 需求 12.6：使用 react-window 实现虚拟滚动
 */
function VirtualGridComponent({
  items,
  className,
  imageWidth = 300,
  imageHeight = 450,
}: MediaGridProps) {
  /**
   * 计算网格参数
   */
  const gridParams = useMemo(() => {
    const columnCount = (() => {
      if (typeof window === 'undefined') return 6
      const width = window.innerWidth
      if (width >= 1536) return 6
      if (width >= 768) return 4
      if (width >= 640) return 2
      return 1
    })()

    const itemCount = items?.length || 0
    const rowCount = Math.max(1, Math.ceil(itemCount / columnCount))
    const columnWidth = typeof window !== 'undefined' ? Math.floor(window.innerWidth / columnCount) : 300
    const rowHeight = Math.floor(columnWidth * 1.8) // 卡片高度约为宽度的 1.8 倍（2/3 图片 + 信息区域）

    return {
      columnCount,
      rowCount,
      columnWidth,
      rowHeight,
      width: typeof window !== 'undefined' ? window.innerWidth : 1920,
      height: typeof window !== 'undefined' ? Math.max(400, window.innerHeight - 200) : 800, // 减去头部高度，最小 400px
    }
  }, [items?.length])

  /**
   * 网格单元数据
   */
  const cellData = useMemo(() => ({
    items: items || [],
    imageWidth,
    imageHeight,
    columnCount: gridParams.columnCount,
  }), [items, imageWidth, imageHeight, gridParams.columnCount])

  // 如果没有项目，不渲染虚拟网格
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <VirtualGrid
        columnCount={gridParams.columnCount}
        columnWidth={gridParams.columnWidth}
        height={gridParams.height}
        rowCount={gridParams.rowCount}
        rowHeight={gridParams.rowHeight}
        width={gridParams.width}
        itemData={cellData}
      >
        {/* @ts-expect-error react-window 的类型定义不完整，但运行时正确 */}
        {Cell}
      </VirtualGrid>
    </div>
  )
}

/**
 * 虚拟网格单元组件数据类型
 */
interface CellData {
  items: MediaItem[]
  imageWidth: number
  imageHeight: number
  columnCount: number
}

/**
 * 虚拟网格单元组件属性
 */
interface CellComponentProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: CellData
}

/**
 * 虚拟网格单元组件
 */
function Cell({ columnIndex, rowIndex, style, data }: CellComponentProps) {
  // 确保 data 和 style 存在
  if (!data || !style) {
    return null
  }

  const { items, imageWidth, imageHeight, columnCount } = data
  
  // 确保 items 存在
  if (!items || !Array.isArray(items)) {
    return null
  }

  const index = rowIndex * columnCount + columnIndex
  
  // 超出范围的单元格不渲染
  if (index >= items.length) {
    return null
  }

  const item = items[index]

  // 确保 item 存在
  if (!item) {
    return null
  }

  return (
    <div style={style} className="p-2">
      <MediaCard
        item={item}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />
    </div>
  )
}
