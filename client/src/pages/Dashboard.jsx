import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ user }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: {
            'x-user-role': user?.role || 'user',
            'x-user-id': user?.id || ''
          }
        });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return <div className="text-slate-400 p-8">Đang tải dữ liệu...</div>;
  }

  const formatCurrency = (val) => {
    if (!val) return '0 VNĐ';
    if (val >= 1000000000) return `${(val / 1000000000).toFixed(2)} Tỷ`;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)} Tr`;
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  const isAdmin = user?.role === 'admin';
  const name = user?.name || (isAdmin ? 'Admin' : 'User');

  // Prepare stats based on fetched data
  const stats = isAdmin ? [
    { 
      title: 'Tổng số trường học', 
      value: data?.totalSchools || '0', 
      change: 'Toàn hệ thống', 
      icon: '🏫', 
      color: 'from-blue-600 to-indigo-600' 
    },
    { 
      title: 'Tổng số thiết bị', 
      value: data?.totalEquipments || '0', 
      change: 'Danh mục thiết bị', 
      icon: '💻', 
      color: 'from-purple-600 to-pink-600' 
    },
    { 
      title: 'Tổng ngân sách được đầu tư', 
      value: formatCurrency(data?.totalBudget), 
      change: data?.budgetDiff >= 0 ? `Dư: ${formatCurrency(data?.budgetDiff)}` : `Âm: ${formatCurrency(Math.abs(data?.budgetDiff))}`, 
      icon: data?.budgetDiff >= 0 ? '📈' : '📉', 
      color: data?.budgetDiff >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-rose-600' 
    },
    { 
      title: 'Tổng ngân sách đã đầu tư', 
      value: formatCurrency(data?.totalCost), 
      change: 'Giá trị dự trù mới nhất', 
      icon: '💰', 
      color: 'from-amber-500 to-orange-600' 
    },
  ] : [
    { 
      title: 'Số trường quản lý', 
      value: data?.totalSchools || '0', 
      change: 'Trường bạn phụ trách', 
      icon: '🏫', 
      color: 'from-blue-600 to-indigo-600' 
    },
    { 
      title: 'Số dự trù đã lập', 
      value: data?.totalEstimates || '0', 
      change: 'Các bản ghi trong lịch sử', 
      icon: '📝', 
      color: 'from-purple-600 to-pink-600' 
    },
    { 
      title: 'Ngân sách được đầu tư', 
      value: formatCurrency(data?.totalBudget), 
      change: 'Tổng hạn mức ngân sách', 
      icon: '📈', 
      color: 'from-emerald-500 to-teal-600' 
    },
    { 
      title: 'Ngân sách đã đầu tư', 
      value: formatCurrency(data?.totalCost), 
      change: 'Giá trị dự trù mới nhất', 
      icon: '💰', 
      color: 'from-amber-500 to-orange-600' 
    },
    { 
      title: 'Chênh lệch ngân sách', 
      value: formatCurrency(data?.budgetDiff), 
      change: data?.budgetDiff >= 0 ? `Dư: ${formatCurrency(data?.budgetDiff)}` : `Vượt: ${formatCurrency(Math.abs(data?.budgetDiff))}`, 
      icon: data?.budgetDiff >= 0 ? '⚖️' : '⚠️', 
      color: data?.budgetDiff >= 0 ? 'from-teal-650 to-emerald-550' : 'from-rose-650 to-red-550' 
    },
  ];

  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 border border-slate-800/80 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        <h1 className="text-3xl font-bold text-white mb-2">Chào buổi tối, {name}!</h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Chào mừng đến với bảng điều khiển EREM System. Dưới đây là thông số thống kê tổng hợp và các hoạt động bàn giao, dự trù thiết bị gần nhất.
        </p>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-6`}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{stat.title}</span>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${stat.color} flex items-center justify-center text-white text-lg shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className={`text-xs ${stat.title.toLowerCase().includes('ngân sách') && data?.budgetDiff < 0 ? 'text-rose-400' : stat.title.toLowerCase().includes('ngân sách') && data?.budgetDiff >= 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities (Left - 2cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Hoạt động gần đây</h3>
            <button className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-150 cursor-pointer">
              Xem tất cả →
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {recentActivities.length > 0 ? recentActivities.map((act) => (
              <div key={act.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{act.action}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{act.school} • {act.time}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20`}>
                  {act.status}
                </span>
              </div>
            )) : (
              <div className="py-4 text-sm text-slate-500 text-center">Chưa có hoạt động nào gần đây.</div>
            )}
          </div>
        </div>

        {/* Quick Links (Right - 1col) */}
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Thao tác nhanh</h3>
            <p className="text-slate-400 text-xs mb-6">Truy cập trực tiếp tới các tiến trình nghiệp vụ cốt lõi.</p>

            <div className="space-y-3">
              {isAdmin && (
                <button className="w-full py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer">
                  <span>🏫 Quản lý Trường học</span>
                  <span className="text-slate-500">→</span>
                </button>
              )}
              <button className="w-full py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer">
                <span>📝 Lập dự trù thiết bị mới</span>
                <span className="text-slate-500">→</span>
              </button>
              <button className="w-full py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer">
                <span>🤝 Lập biên bản bàn giao</span>
                <span className="text-slate-500">→</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-850 text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Hệ thống EREM System v1.0</span>
          </div>
        </div>
      </div>

      {/* Thống kê theo Sales (Chỉ dành for Admin) */}
      {isAdmin && data?.salesStats && (
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Thống kê theo Nhân viên Kinh doanh (Sales)</h3>
              <p className="text-slate-400 text-xs mt-1">Danh sách tổng hợp hiệu suất quản lý và ngân sách của từng Sales.</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/20">
                  <th className="p-4 pl-6">Nhân viên Sales</th>
                  <th className="p-4 text-center">Trường quản lý</th>
                  <th className="p-4 text-center">Dự trù đã lập</th>
                  <th className="p-4 text-right">Ngân sách được cấp</th>
                  <th className="p-4 text-right">Ngân sách đã lập</th>
                  <th className="p-4 text-right pr-6">Ngân sách còn lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.salesStats.map((sale) => (
                  <tr key={sale.salesId} className="hover:bg-slate-850/30 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-white flex items-center gap-2">
                      <span className="text-base">💼</span> {sale.salesName}
                    </td>
                    <td className="p-4 text-center text-slate-300 font-medium">{sale.totalSchools} trường</td>
                    <td className="p-4 text-center text-slate-300 font-medium">{sale.totalEstimates} bản</td>
                    <td className="p-4 text-right text-emerald-400 font-semibold">{formatCurrency(sale.totalBudget)}</td>
                    <td className="p-4 text-right text-purple-400 font-semibold">{formatCurrency(sale.totalCost)}</td>
                    <td className="p-4 text-right pr-6 font-bold">
                      <span className={sale.remainingBudget >= 0 ? 'text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20' : 'text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-500/20'}>
                        {formatCurrency(sale.remainingBudget)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Danh sách trường đầu tư âm / dương (Chỉ dành cho Sales) */}
      {!isAdmin && (data?.positiveSchools || data?.negativeSchools) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* List trường đầu tư âm (Vượt hạn mức) */}
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-850 pb-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-white">Trường Vượt Hạn Mức (Đầu tư Âm)</h3>
                <p className="text-slate-400 text-xs mt-0.5">Danh sách trường có giá trị dự trù vượt quá ngân sách được cấp.</p>
              </div>
            </div>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {data.negativeSchools && data.negativeSchools.length > 0 ? (
                data.negativeSchools.map(sch => (
                  <div key={sch.id} className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sch.name}</h4>
                      <div className="text-xs text-slate-400 mt-1.5 space-y-0.5">
                        <p>Ngân sách được cấp: <span className="text-slate-300 font-semibold">{formatCurrency(sch.budget)}</span></p>
                        <p>Ngân sách đã lập: <span className="text-slate-300 font-semibold">{formatCurrency(sch.spent)}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-800/40">
                        {formatCurrency(sch.diff)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center">Không có trường nào vượt hạn mức. 🎉</div>
              )}
            </div>
          </div>

          {/* List trường đầu tư dương (Trong hạn mức) */}
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-850 pb-3">
              <span className="text-xl">✅</span>
              <div>
                <h3 className="text-base font-bold text-white">Trường Trong Hạn Mức (Đầu tư Dương)</h3>
                <p className="text-slate-400 text-xs mt-0.5">Danh sách trường có giá trị dự trù nằm trong hạn mức ngân sách.</p>
              </div>
            </div>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {data.positiveSchools && data.positiveSchools.length > 0 ? (
                data.positiveSchools.map(sch => (
                  <div key={sch.id} className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{sch.name}</h4>
                      <div className="text-xs text-slate-400 mt-1.5 space-y-0.5">
                        <p>Ngân sách được cấp: <span className="text-slate-300 font-semibold">{formatCurrency(sch.budget)}</span></p>
                        <p>Ngân sách đã lập: <span className="text-slate-300 font-semibold">{formatCurrency(sch.spent)}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                        +{formatCurrency(sch.diff)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center">Không có trường nào trong hạn mức.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
