/**
 * 弹幕 Canvas 组件
 * 
 * 覆盖在视频播放器上，渲染弹幕
 */

import { useEffect, useRef } from 'react'
import { useDanmakuStore } from '@/stores/danmakuStore'
import { createDanmakuEngine, type DanmakuEngine } from '@/services/danmaku/danmakuEngine'

/**
 * 弹幕 Canvas 组件属性
 */
interface DanmakuCanvasProps {
  /** 当前播放时间（秒） */
  currentTime: number
  /** 是否暂停 */
  isPaused: boolean
  /** 视频元素引用（用于获取尺寸） */
  videoRef: React.RefObject<HTMLVideoElement>
}

/**
 * 弹幕 Canvas 组件
 */
export default function DanmakuCanvas({
  currentTime,
  isPaused,
  videoRef,
}: DanmakuCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<DanmakuEngine | null>(null)
  
  const { danmakuList, settings } = useDanmakuStore()

  // 初始化弹幕引擎
  useEffect(() => {
    if (!canvasRef.current) return

    try {
      // 创建引擎
      const engine = createDanmakuEngine({
        canvas: canvasRef.current,
        settings,
      })

      engineRef.current = engine

      // 加载弹幕
      if (danmakuList.length > 0) {
        engine.loadDanmaku(danmakuList)
      }

      // 开始渲染
      engine.start()

      // 清理函数
      return () => {
        engine.destroy()
        engineRef.current = null
      }
    } catch (error) {
      console.error('初始化弹幕引擎失败:', error)
    }
  }, []) // 只在组件挂载时初始化一次

  // 更新弹幕列表
  useEffect(() => {
    if (engineRef.current && danmakuList.length > 0) {
      engineRef.current.loadDanmaku(danmakuList)
    }
  }, [danmakuList])

  // 更新设置
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings)
    }
  }, [settings])

  // 同步播放时间
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTime(currentTime)
    }
  }, [currentTime])

  // 同步暂停状态（不再根据 enabled 状态暂停引擎）
  useEffect(() => {
    if (engineRef.current) {
      if (isPaused) {
        engineRef.current.pause()
      } else {
        engineRef.current.resume()
      }
    }
  }, [isPaused])

  // 处理窗口大小变化和宽高比变化
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && canvasRef.current) {
        // 延迟调用 resize，确保 DOM 已更新
        // 使用更长的延迟，确保视频容器的宽度已经完全调整
        setTimeout(() => {
          if (engineRef.current) {
            engineRef.current.resize()
          }
        }, 200)
      }
    }

    window.addEventListener('resize', handleResize)
    
    // 立即触发一次 resize，确保初始尺寸正确
    handleResize()
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{
        // 弹幕关闭时隐藏 Canvas，但保持组件挂载
        display: settings.enabled ? 'block' : 'none',
      }}
    />
  )
}
