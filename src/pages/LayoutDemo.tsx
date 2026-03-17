import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';

/**
 * 布局演示页面
 * 
 * 展示主布局组件的使用方式和响应式特性
 */
export default function LayoutDemo() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">布局演示</h1>
          <p className="text-muted-foreground mt-2">
            展示响应式布局组件的功能
          </p>
        </div>

        {/* 功能说明 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">布局特性</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>
                <strong>响应式设计：</strong>
                桌面端（≥768px）侧边栏固定显示，移动端可通过汉堡菜单折叠
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>
                <strong>状态持久化：</strong>
                侧边栏的打开/关闭状态会保存到 localStorage
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>
                <strong>流畅动画：</strong>
                侧边栏展开/收起使用 CSS transition 实现平滑过渡
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>
                <strong>无障碍访问：</strong>
                支持键盘导航和屏幕阅读器
              </span>
            </li>
          </ul>
        </Card>

        {/* 网格布局示例 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">响应式网格示例</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i} className="p-4 text-center">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm">卡片 {i + 1}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* 断点说明 */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">TailwindCSS 断点</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">sm (≥640px):</span>
              <span className="text-muted-foreground">2 列网格</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">md (≥768px):</span>
              <span className="text-muted-foreground">3 列网格，侧边栏固定</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">lg (≥1024px):</span>
              <span className="text-muted-foreground">4 列网格</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">xl (≥1280px):</span>
              <span className="text-muted-foreground">6 列网格</span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
