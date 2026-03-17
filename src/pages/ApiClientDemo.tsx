/**
 * API 客户端演示页面
 * 用于测试和展示 EmbyApiClient 的功能
 */

import { useState } from 'react'
import { createEmbyClient } from '@/services/api'
import type { PublicUser } from '@/types/emby'

export default function ApiClientDemo() {
  const [serverUrl, setServerUrl] = useState('http://localhost:8096')
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 测试服务器连接
  const testConnection = async () => {
    setLoading(true)
    setResult('正在测试服务器连接...')
    
    try {
      const client = createEmbyClient({ serverUrl })
      const info = await client.get('/System/Info', {}, { skipAuth: true })
      
      setResult(`✓ 服务器连接成功！\n\n服务器信息：\n${JSON.stringify(info, null, 2)}`)
    } catch (error) {
      setResult(`✗ 服务器连接失败：\n${error}`)
    } finally {
      setLoading(false)
    }
  }

  // 获取公开用户列表
  const getPublicUsers = async () => {
    setLoading(true)
    setResult('正在获取公开用户列表...')
    
    try {
      const client = createEmbyClient({ serverUrl })
      const users = await client.get<PublicUser[]>('/Users/Public', {}, { skipAuth: true })
      
      setResult(`✓ 获取到 ${users.length} 个公开用户：\n\n${JSON.stringify(users, null, 2)}`)
    } catch (error) {
      setResult(`✗ 获取公开用户失败：\n${error}`)
    } finally {
      setLoading(false)
    }
  }

  // 测试设备信息
  const testDeviceInfo = () => {
    setResult('正在测试设备信息...')
    
    const client1 = createEmbyClient({ serverUrl })
    const deviceInfo1 = client1.getDeviceInfo()
    
    const client2 = createEmbyClient({ serverUrl })
    const deviceInfo2 = client2.getDeviceInfo()
    
    const isPersisted = deviceInfo1.deviceId === deviceInfo2.deviceId
    
    setResult(
      `设备信息测试结果：\n\n` +
      `客户端 1 设备 ID: ${deviceInfo1.deviceId}\n` +
      `客户端 2 设备 ID: ${deviceInfo2.deviceId}\n\n` +
      `持久化状态: ${isPersisted ? '✓ 成功' : '✗ 失败'}\n\n` +
      `完整设备信息：\n${JSON.stringify(deviceInfo1, null, 2)}`
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Emby API 客户端演示</h1>
        
        {/* 服务器 URL 配置 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">服务器配置</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8096"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">功能测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              测试服务器连接
            </button>
            <button
              onClick={getPublicUsers}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              获取公开用户
            </button>
            <button
              onClick={testDeviceInfo}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              测试设备信息
            </button>
          </div>
        </div>

        {/* 结果显示 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">测试结果</h2>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
            {result || '点击上方按钮开始测试...'}
          </pre>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">使用说明</h3>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>确保 Emby Server 正在运行</li>
            <li>输入正确的服务器 URL（格式：http://hostname:port）</li>
            <li>点击测试按钮查看 API 客户端功能</li>
            <li>设备信息会自动持久化到 localStorage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
