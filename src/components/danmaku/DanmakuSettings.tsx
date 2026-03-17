/**
 * 弹幕设置组件
 * 
 * 提供弹幕显示设置界面
 */

import { useDanmakuStore } from '@/stores/danmakuStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// 弹幕设置图标组件 - 弹幕横线 + 六边形齿轮
const DanmakuSettingsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path fillRule="evenodd" d="m15.645 4.881 1.06-1.473a.998.998 0 1 0-1.622-1.166L13.22 4.835a110.67 110.67 0 0 0-1.1-.007h-.131c-.47 0-.975.004-1.515.012L8.783 2.3A.998.998 0 0 0 7.12 3.408l.988 1.484c-.688.019-1.418.042-2.188.069a4.013 4.013 0 0 0-3.83 3.44c-.165 1.15-.245 2.545-.245 4.185 0 1.965.115 3.67.35 5.116a4.012 4.012 0 0 0 3.763 3.363c1.903.094 3.317.141 5.513.141a.988.988 0 0 0 0-1.975 97.58 97.58 0 0 1-5.416-.139 2.037 2.037 0 0 1-1.91-1.708c-.216-1.324-.325-2.924-.325-4.798 0-1.563.076-2.864.225-3.904.14-.977.96-1.713 1.945-1.747 2.444-.087 4.465-.13 6.063-.131 1.598 0 3.62.044 6.064.13.96.034 1.71.81 1.855 1.814.075.524.113 1.962.141 3.065v.002c.005.183.01.07.014-.038.004-.096.008-.189.011-.081a.987.987 0 1 0 1.974-.069c-.004-.105-.007-.009-.011.09-.002.056-.004.112-.007.135l-.002.01a.574.574 0 0 1-.005-.091v-.027c-.03-1.118-.073-2.663-.16-3.276-.273-1.906-1.783-3.438-3.74-3.507-.905-.032-1.752-.058-2.543-.079Zm-3.113 4.703h-1.307v4.643h2.2v.04l.651-1.234c.113-.215.281-.389.482-.509v-.11h.235c.137-.049.283-.074.433-.074h1.553V9.584h-1.264a8.5 8.5 0 0 0 .741-1.405l-1.078-.381c-.24.631-.501 1.23-.806 1.786h-1.503l.686-.305c-.228-.501-.5-.959-.806-1.394l-1.034.348c.294.392.566.839.817 1.35Zm-1.7 5.502h2.16l-.564 1.068h-1.595v-1.068Zm-2.498-1.863.152-1.561h1.96V8.289H7.277v.969h2.048v1.435h-1.84l-.306 3.51h2.254c0 1.155-.043 1.906-.12 2.255-.076.348-.38.523-.925.523-.305 0-.61-.022-.893-.055l.294 1.056.061.005c.282.02.546.039.81.039.991-.065 1.547-.414 1.677-1.046.11-.631.175-1.883.175-3.757H8.334Zm5.09-.8v.85h-1.188v-.85h1.187Zm-1.188-.955h1.187v-.893h-1.187v.893Zm2.322.007v-.893h1.241v.893h-1.241Zm.528 2.757a1.26 1.26 0 0 1 1.087-.627l4.003-.009a1.26 1.26 0 0 1 1.094.63l1.721 2.982c.226.39.225.872-.001 1.263l-1.743 3a1.26 1.26 0 0 1-1.086.628l-4.003.009a1.26 1.26 0 0 1-1.094-.63l-1.722-2.982a1.26 1.26 0 0 1 .002-1.263l1.742-3Zm1.967.858a1.26 1.26 0 0 0-1.08.614l-.903 1.513a1.26 1.26 0 0 0-.002 1.289l.885 1.492c.227.384.64.62 1.086.618l2.192-.005a1.26 1.26 0 0 0 1.08-.615l.904-1.518a1.26 1.26 0 0 0 .001-1.288l-.884-1.489a1.26 1.26 0 0 0-1.086-.616l-2.193.005Zm2.517 2.76a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z" clipRule="evenodd" />
  </svg>
)

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
          <DanmakuSettingsIcon className="w-5 h-5 text-white/85" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-72 rounded-2xl border shadow-2xl z-50 p-0"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
        }}
      >
        <DropdownMenuLabel className="text-white/95 text-sm font-semibold px-4 py-3" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>弹幕设置</DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

        {/* 透明度 */}
        <div className="px-4 py-3">
          <label className="text-sm text-white/90 mb-2 block">
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

        <DropdownMenuSeparator className="my-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

        {/* 滚动速度 */}
        <div className="px-4 py-3">
          <label className="text-sm text-white/90 mb-2 block">
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
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>极慢</span>
            <span>慢</span>
            <span>正常</span>
            <span>快</span>
            <span>极快</span>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

        {/* 字体大小 */}
        <div className="px-4 py-3">
          <label className="text-sm text-white/90 mb-2 block">
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
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>12px</span>
            <span>30px</span>
            <span>48px</span>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

        {/* 显示区域 */}
        <div className="px-4 py-3">
          <label className="text-sm text-white/90 mb-2 block">
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
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>10%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
