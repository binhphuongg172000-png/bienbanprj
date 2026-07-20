import React from 'react';

const Layout = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'schools', label: 'Quản lý Trường học', icon: '🏫' },
    { id: 'sales', label: 'Quản lý Sales', icon: '💼' },
    { id: 'equipments', label: 'Danh mục Thiết bị', icon: '💻' },
    { id: 'other-investments', label: 'Danh mục Đầu tư khác', icon: '💰' },
    { id: 'admin-estimates', label: 'Biên bản dự trù', icon: '📁' },
    { id: 'handovers', label: 'Biên bản Bàn giao', icon: '🤝' },
    { id: 'users', label: 'Quản lý Người dùng', icon: '👥' },
    { id: 'audit-logs', label: 'Lịch sử Hệ thống', icon: '⏳' },
  ];

  const salesMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'estimates', label: 'Bản dự trù Thiết bị', icon: '📝' },
    { id: 'admin-estimates', label: 'Kho Dự Trù Đã Lập', icon: '📁' },
    { id: 'handovers', label: 'Biên bản Bàn giao', icon: '🤝' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : salesMenuItems;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-purple-500 selection:text-white">
      {/* Sidebar bên trái */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <img src="/logo.png" alt="EREM Logo" className="w-8 h-8 rounded-lg object-cover shadow-md shadow-purple-500/10" />
          <span className="font-bold text-lg tracking-tight text-white">EREM System</span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-500/10 text-purple-400 border-l-2 border-purple-500 pl-3.5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Hệ thống</span>
            <span>/</span>
            <span className="text-slate-200 capitalize">
              {menuItems.find((item) => item.id === activeTab)?.label || activeTab}
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-6">
            <span className="hidden md:inline-block text-xs text-slate-500">Giờ máy chủ: {new Date().toLocaleDateString('vi-VN')}</span>
            
            <div className="flex items-center gap-4 pl-4 border-l border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-white">{user.name || 'Admin User'}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{user.role || 'admin'}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 font-semibold text-sm shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Nội dung chính hiển thị các Component con */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
