/**
 * Footer 组件
 * 
 * 页脚组件，显示版权信息和其他链接
 */
export default function Footer() {
  return (
    <footer className="border-t border-white/10" style={{ backgroundColor: '#17181A' }}>
      <div className="px-16 sm:px-24 lg:px-64 py-8 flex items-center justify-between">
        <p className="text-sm text-white/40">
          © 2026 Embience
        </p>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            关于
          </a>
          <a
            href="#"
            className="text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            帮助
          </a>
        </div>
      </div>
    </footer>
  );
}
