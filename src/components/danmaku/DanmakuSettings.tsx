/**
 * 弹幕设置组件
 * 
 * 提供弹幕显示设置界面
 */

import { Settings } from 'lucide-react'
import { useDanmakuStore } from '@/stores/danmakuStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * 弹幕设置组件
 */
export default function DanmakuSettings() {
  const { settings, updateSettings } = useDanmakuStore()

  // 获取速度档位描述
  const getSpeedLabel = (value: number): string => {
    if (value <= 2) return '极慢'
    if (value <= 4) return '慢'
    if (value <= 6) return '正常'
    if (value <= 8) return '快'
    return '极快'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/[0.1] transition-all duration-200 hover:scale-105 active:scale-95"
          title="弹幕设置"
          aria-label="弹幕设置"
        >
          <Settings className="w-5 h-5 text-white/85" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-72 rounded-lg border shadow-2xl z-50"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <DropdownMenuLabel className="text-white">弹幕设置</DropdownMenuLabel>
        <DropdownMenuSeparator style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* 透明度 */}
        <div className="px-3 py-3">
          <label className="text-sm text-white/80 mb-2 block">
            透明度: {settings.opacity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.opacity}
            onChange={(e) => updateSettings({ opacity: parseInt(e.target.value, 10) })}
            className="w-full h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
        </div>

        <DropdownMenuSeparator style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* 滚动速度 */}
        <div className="px-3 py-3">
          <label className="text-sm text-white/80 mb-2 block">
            滚动速度: {getSpeedLabel(settings.speed)} ({settings.speed}/10)
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={settings.speed}
            onChange={(e) => updateSettings({ speed: parseInt(e.target.value, 10) })}
            className="w-full h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>极慢</span>
            <span>慢</span>
            <span>正常</span>
            <span>快</span>
            <span>极快</span>
          </div>
        </div>

        <DropdownMenuSeparator style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* 字体大小 */}
        <div className="px-3 py-3">
          <label className="text-sm text-white/80 mb-2 block">
            字体大小: {settings.fontSize}px
          </label>
          <input
            type="range"
            min="12"
            max="48"
            step="2"
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>12px</span>
            <span>30px</span>
            <span>48px</span>
          </div>
        </div>

        <DropdownMenuSeparator style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* 显示区域 */}
        <div className="px-3 py-3">
          <label className="text-sm text-white/80 mb-2 block">
            显示区域: {settings.displayArea}% (从顶部开始)
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={settings.displayArea}
            onChange={(e) => updateSettings({ displayArea: parseInt(e.target.value, 10) })}
            className="w-full h-1 bg-white/[0.15] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
