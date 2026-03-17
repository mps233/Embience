/**
 * 弹幕渲染引擎
 * 
 * 使用 Canvas 渲染弹幕，支持滚动、顶部固定、底部固定三种类型
 * 实现碰撞检测、弹幕池管理等功能
 */

import type { DanmakuItem, DanmakuSettings } from '@/types/danmaku'

/**
 * 弹幕轨道
 */
interface DanmakuTrack {
  /** 轨道索引 */
  index: number
  /** 最后一条弹幕的结束时间 */
  lastEndTime: number
  /** 最后一条弹幕的右边界位置 */
  lastRightPosition: number
}

/**
 * 渲染中的弹幕
 */
interface RenderingDanmaku {
  /** 弹幕数据 */
  item: DanmakuItem
  /** X 坐标 */
  x: number
  /** Y 坐标 */
  y: number
  /** 轨道索引 */
  trackIndex: number
  /** 开始渲染的时间戳 */
  startTime: number
  /** 是否已完成 */
  finished: boolean
}

/**
 * 弹幕引擎配置
 */
export interface DanmakuEngineConfig {
  /** Canvas 元素 */
  canvas: HTMLCanvasElement
  /** 弹幕设置 */
  settings: DanmakuSettings
}

/**
 * 弹幕渲染引擎类
 */
export class DanmakuEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private settings: DanmakuSettings
  
  // 弹幕数据
  private danmakuList: DanmakuItem[] = []
  private renderingDanmaku: RenderingDanmaku[] = []
  
  // 轨道管理
  private tracks: DanmakuTrack[] = []
  private trackHeight = 30
  
  // 动画控制
  private animationFrameId: number | null = null
  private currentTime = 0
  private isPaused = false

  constructor(config: DanmakuEngineConfig) {
    this.canvas = config.canvas
    this.settings = config.settings
    
    const ctx = this.canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }
    this.ctx = ctx
    
    // 初始化轨道
    this.initTracks()
    
    // 设置 Canvas 尺寸（考虑设备像素比）
    this.resize()
  }

  /**
   * 初始化轨道
   */
  private initTracks(): void {
    const rect = this.canvas.getBoundingClientRect()
    const maxTracks = Math.floor(rect.height / this.trackHeight)
    this.tracks = Array.from({ length: maxTracks }, (_, index) => ({
      index,
      lastEndTime: 0,
      lastRightPosition: rect.width,
    }))
  }

  /**
   * 调整 Canvas 尺寸
   */
  resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    // Canvas 的 width 和 height 属性只能是整数
    // 为了避免 CSS 尺寸和内部分辨率的宽高比不一致导致拉伸
    // 我们需要将两者都取整到相同的值
    const cssWidth = Math.floor(rect.width)
    const cssHeight = Math.floor(rect.height)
    
    // 设置 Canvas 内部分辨率（考虑设备像素比以提高清晰度）
    this.canvas.width = cssWidth * dpr
    this.canvas.height = cssHeight * dpr
    
    // 缩放上下文以匹配设备像素比
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    
    console.log('[弹幕引擎] Canvas 尺寸调整:', {
      cssWidth,
      cssHeight,
      dpr,
      internalWidth: this.canvas.width,
      internalHeight: this.canvas.height,
    })
    
    // 重新初始化轨道（使用 CSS 尺寸）
    const maxTracks = Math.floor(cssHeight / this.trackHeight)
    this.tracks = Array.from({ length: maxTracks }, (_, index) => ({
      index,
      lastEndTime: 0,
      lastRightPosition: cssWidth,
    }))
  }

  /**
   * 加载弹幕列表
   * 
   * @param list - 弹幕列表
   */
  loadDanmaku(list: DanmakuItem[]): void {
    // 过滤弹幕
    this.danmakuList = this.filterDanmaku(list)
  }

  /**
   * 过滤弹幕
   * 
   * @param list - 原始弹幕列表
   * @returns 过滤后的弹幕列表
   */
  private filterDanmaku(list: DanmakuItem[]): DanmakuItem[] {
    return list.filter((item) => {
      // 过滤关键词
      if (this.settings.filters.keywords.length > 0) {
        const hasBlockedKeyword = this.settings.filters.keywords.some((keyword) =>
          item.text.includes(keyword)
        )
        if (hasBlockedKeyword) return false
      }

      // 过滤用户
      if (this.settings.filters.users.length > 0) {
        if (this.settings.filters.users.includes(item.author)) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 开始渲染
   */
  start(): void {
    if (this.animationFrameId !== null) {
      return
    }
    
    this.isPaused = false
    this.animate()
  }

  /**
   * 暂停渲染
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * 恢复渲染
   */
  resume(): void {
    this.isPaused = false
  }

  /**
   * 停止渲染
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.clear()
    this.renderingDanmaku = []
  }

  /**
   * 跳转到指定时间
   * 
   * @param time - 时间（秒）
   */
  seek(time: number): void {
    this.currentTime = time
    this.renderingDanmaku = []
    this.resetTracks()
  }

  /**
   * 更新当前时间
   * 
   * @param time - 时间（秒）
   */
  updateTime(time: number): void {
    this.currentTime = time
  }

  /**
   * 更新设置
   * 
   * @param settings - 新设置
   */
  updateSettings(settings: DanmakuSettings): void {
    this.settings = settings
    
    // 重新过滤弹幕
    if (this.danmakuList.length > 0) {
      const originalList = [...this.danmakuList]
      this.loadDanmaku(originalList)
    }
  }

  /**
   * 添加新弹幕
   * 
   * @param item - 弹幕项
   */
  addDanmaku(item: DanmakuItem): void {
    this.danmakuList.push(item)
    this.danmakuList.sort((a, b) => a.time - b.time)
  }

  /**
   * 动画循环
   */
  private animate = (): void => {
    // 始终渲染，即使弹幕被禁用（这样可以清空画布）
    if (!this.isPaused) {
      this.render()
    }

    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  /**
   * 渲染一帧
   */
  private render(): void {
    // 清空画布
    this.clear()

    // 如果弹幕被禁用，只清空画布，不渲染新弹幕
    if (!this.settings.enabled) {
      return
    }

    // 添加新弹幕到渲染队列
    this.addNewDanmaku()

    // 更新和渲染现有弹幕
    this.updateAndRenderDanmaku()

    // 清理已完成的弹幕
    this.cleanupFinishedDanmaku()
  }

  /**
   * 清空画布
   */
  private clear(): void {
    // 使用 CSS 尺寸清空画布（因为上下文已经缩放了 DPR）
    const rect = this.canvas.getBoundingClientRect()
    this.ctx.clearRect(0, 0, rect.width, rect.height)
  }

  /**
   * 添加新弹幕到渲染队列
   */
  private addNewDanmaku(): void {
    // 限制同时显示的弹幕数量
    if (this.renderingDanmaku.length >= this.settings.maxCount) {
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    const canvasWidth = rect.width

    // 查找应该显示的弹幕（扩大时间窗口到 0.5 秒）
    const newDanmaku = this.danmakuList.filter(
      (item) =>
        item.time <= this.currentTime &&
        item.time > this.currentTime - 0.5 && // 扩大到 0.5 秒的容错窗口
        !this.renderingDanmaku.some((rd) => rd.item === item)
    )

    // 添加到渲染队列
    for (const item of newDanmaku) {
      if (this.renderingDanmaku.length >= this.settings.maxCount) {
        break
      }

      const track = this.findAvailableTrack(item)
      if (track !== null) {
        // 计算弹幕的初始位置（根据时间差调整）
        const timeDiff = this.currentTime - item.time
        const speed = this.getSpeed()
        const initialX = canvasWidth - (timeDiff * speed * 60) // 60fps
        
        this.renderingDanmaku.push({
          item,
          x: Math.max(initialX, canvasWidth), // 确保不会从屏幕外开始
          y: track.index * this.trackHeight + 5,
          trackIndex: track.index,
          startTime: performance.now(),
          finished: false,
        })
      }
    }
  }

  /**
   * 查找可用轨道
   * 
   * @param item - 弹幕项
   * @returns 可用轨道，如果没有则返回 null
   */
  private findAvailableTrack(item: DanmakuItem): DanmakuTrack | null {
    // 根据显示区域过滤轨道
    // displayArea: 0-100，表示从顶部开始的显示区域高度百分比
    // 例如：10 = 只在顶部 10% 显示，50 = 从顶部到中间显示，100 = 全屏显示
    
    const displayAreaPercent = Math.max(0, Math.min(100, this.settings.displayArea))
    const maxTrackIndex = Math.floor((this.tracks.length * displayAreaPercent) / 100)
    
    // 至少要有一条轨道可用
    const availableTracks = this.tracks.slice(0, Math.max(1, maxTrackIndex))

    // 计算新弹幕的宽度
    const newDanmakuWidth = this.measureText(item.text, item.fontSize)
    const speed = this.getSpeed()
    const rect = this.canvas.getBoundingClientRect()
    const canvasWidth = rect.width
    
    // 查找可用轨道（改进的碰撞检测）
    for (const track of availableTracks) {
      // 获取该轨道上所有未完成的弹幕
      const danmakuInTrack = this.renderingDanmaku.filter(
        (rd) => rd.trackIndex === track.index && !rd.finished
      )

      // 如果轨道为空，直接使用
      if (danmakuInTrack.length === 0) {
        return track
      }

      // 检查是否会与轨道上的弹幕碰撞
      let canUseTrack = true
      
      for (const existingDanmaku of danmakuInTrack) {
        const existingWidth = this.measureText(
          existingDanmaku.item.text,
          existingDanmaku.item.fontSize
        )
        
        // 计算现有弹幕的右边界位置
        const existingRightEdge = existingDanmaku.x + existingWidth
        
        // 如果现有弹幕的右边界还在屏幕内，且距离屏幕右边缘不够远
        // 则新弹幕可能会追上它，不能使用这个轨道
        const minSafeDistance = 50 // 最小安全距离（像素）
        
        if (existingRightEdge > canvasWidth - minSafeDistance) {
          canUseTrack = false
          break
        }
        
        // 额外检查：如果现有弹幕移动速度较慢，需要更大的安全距离
        // 确保新弹幕不会追上前面的弹幕
        const timeToReachRightEdge = (canvasWidth - existingRightEdge) / speed
        const newDanmakuTravelDistance = speed * timeToReachRightEdge
        
        if (newDanmakuTravelDistance < newDanmakuWidth + minSafeDistance) {
          canUseTrack = false
          break
        }
      }

      if (canUseTrack) {
        return track
      }
    }

    return null
  }

  /**
   * 更新和渲染弹幕
   */
  private updateAndRenderDanmaku(): void {
    const speed = this.getSpeed()

    for (const danmaku of this.renderingDanmaku) {
      if (danmaku.finished) continue

      // 更新位置
      if (danmaku.item.type === 'scroll') {
        danmaku.x -= speed
        
        // 检查是否完成
        const textWidth = this.measureText(danmaku.item.text, danmaku.item.fontSize)
        if (danmaku.x + textWidth < 0) {
          danmaku.finished = true
        }
      }

      // 渲染弹幕
      this.renderDanmakuItem(danmaku)
    }
  }

  /**
   * 渲染单条弹幕
   * 
   * @param danmaku - 渲染中的弹幕
   */
  private renderDanmakuItem(danmaku: RenderingDanmaku): void {
    const { item, x, y } = danmaku

    // 设置样式
    const fontSize = this.getFontSize(item.fontSize)
    this.ctx.font = `${fontSize}px Arial, sans-serif`
    this.ctx.fillStyle = item.color
    this.ctx.globalAlpha = this.settings.opacity / 100

    // 绘制描边（提高可读性）
    this.ctx.strokeStyle = '#000000'
    this.ctx.lineWidth = 2
    this.ctx.strokeText(item.text, x, y + fontSize)

    // 绘制文本
    this.ctx.fillText(item.text, x, y + fontSize)

    // 恢复透明度
    this.ctx.globalAlpha = 1
  }

  /**
   * 清理已完成的弹幕
   */
  private cleanupFinishedDanmaku(): void {
    this.renderingDanmaku = this.renderingDanmaku.filter((rd) => !rd.finished)
  }

  /**
   * 重置轨道状态
   */
  private resetTracks(): void {
    for (const track of this.tracks) {
      track.lastEndTime = 0
      track.lastRightPosition = this.canvas.width
    }
  }

  /**
   * 获取滚动速度
   * 
   * @returns 速度（像素/帧）
   */
  private getSpeed(): number {
    // speed: 1-10，数值越大越快
    // 基础速度 = 1.5 像素/帧
    // 最终速度 = 基础速度 * (speed / 5)
    const baseSpeed = 1.5
    const speedMultiplier = this.settings.speed / 5
    return baseSpeed * speedMultiplier
  }

  /**
   * 获取字体大小
   * 
   * @param itemFontSize - 弹幕项的字体大小（可选）
   * @returns 字体大小（像素）
   */
  private getFontSize(itemFontSize?: number): number {
    // 如果弹幕项指定了字体大小，使用弹幕项的
    if (itemFontSize) {
      return itemFontSize
    }

    // 否则使用设置中的字体大小（12-48px）
    return Math.max(12, Math.min(48, this.settings.fontSize))
  }

  /**
   * 测量文本宽度
   * 
   * @param text - 文本内容
   * @param fontSize - 字体大小
   * @returns 文本宽度（像素）
   */
  private measureText(text: string, fontSize?: number): number {
    const size = this.getFontSize(fontSize)
    this.ctx.font = `${size}px Arial, sans-serif`
    return this.ctx.measureText(text).width
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.stop()
    this.danmakuList = []
    this.renderingDanmaku = []
    this.tracks = []
  }
}

/**
 * 创建弹幕引擎实例
 * 
 * @param config - 引擎配置
 * @returns 弹幕引擎实例
 */
export function createDanmakuEngine(config: DanmakuEngineConfig): DanmakuEngine {
  return new DanmakuEngine(config)
}
