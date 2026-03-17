/**
 * 弹幕输入组件
 * 
 * 允许用户发送新弹幕
 */

import { useState } from 'react'
import { Send } from 'lucide-react'
import { useDanmakuStore } from '@/stores/danmakuStore'
import type { DanmakuType } from '@/types/danmaku'

/**
 * 弹幕输入组件属性
 */
interface DanmakuInputProps {
  /** 当前播放时间（秒） */
  currentTime: number
  /** 发送弹幕回调 */
  onSend: (text: string, color: string, type: DanmakuType) => Promise<void>
}

/**
 * 预设颜色
 */
const PRESET_COLORS = [
  { name: '白色', value: '#FFFFFF' },
  { name: '红色', value: '#FF0000' },
  { name: '橙色', value: '#FF7F00' },
  { name: '黄色', value: '#FFFF00' },
  { name: '绿色', value: '#00FF00' },
  { name: '青色', value: '#00FFFF' },
  { name: '蓝色', value: '#0000FF' },
  { name: '紫色', value: '#8B00FF' },
]

/**
 * 弹幕输入组件
 */
export default function DanmakuInput({ currentTime, onSend }: DanmakuInputProps) {
  const [text, setText] = useState('')
  const [color, setColor] = useState('#FFFFFF')
  const [type, setType] = useState<DanmakuType>('scroll')
  const [isSending, setIsSending] = useState(false)
  
  const { addDanmaku } = useDanmakuStore()

  /**
   * 处理发送弹幕
   */
  const handleSend = async () => {
    if (!text.trim() || isSending) return

    try {
      setIsSending(true)

      // 发送到服务器
      await onSend(text.trim(), color, type)

      // 添加到本地列表（立即显示）
      addDanmaku({
        time: currentTime,
        type,
        color,
        author: 'me',
        text: text.trim(),
      })

      // 清空输入
      setText('')
    } catch (error) {
      console.error('发送弹幕失败:', error)
      alert('发送弹幕失败，请稍后重试')
    } finally {
      setIsSending(false)
    }
  }

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-black/50 rounded-lg">
      {/* 颜色选择 */}
      <div className="flex gap-1">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setColor(preset.value)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              color === preset.value ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: preset.value }}
            title={preset.name}
            aria-label={`选择${preset.name}`}
          />
        ))}
      </div>

      {/* 类型选择 */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value as DanmakuType)}
        className="px-2 py-1 bg-black/70 text-white text-sm rounded border border-white/20 focus:outline-none focus:border-white/40"
      >
        <option value="scroll">滚动</option>
        <option value="top">顶部</option>
        <option value="bottom">底部</option>
      </select>

      {/* 输入框 */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="发送弹幕..."
        maxLength={100}
        disabled={isSending}
        className="flex-1 px-3 py-1 bg-black/70 text-white text-sm rounded border border-white/20 focus:outline-none focus:border-white/40 placeholder:text-white/40"
      />

      {/* 发送按钮 */}
      <button
        onClick={handleSend}
        disabled={!text.trim() || isSending}
        className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded transition-colors"
        aria-label="发送弹幕"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  )
}
