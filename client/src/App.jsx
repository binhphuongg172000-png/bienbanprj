import React, { useState, useEffect } from 'react';
import { Toaster, toast, useToasterStore } from 'react-hot-toast';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Estimates from './pages/Estimates';
import Schools from './pages/Schools';
import Sales from './pages/Sales';
import Equipments from './pages/Equipments';
import AdminEstimates from './pages/AdminEstimates';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';

function App() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    const TOAST_LIMIT = 4;
    const visibleToasts = toasts.filter(t => t.visible);
    if (visibleToasts.length > TOAST_LIMIT) {
      const dismissCount = visibleToasts.length - TOAST_LIMIT;
      for (let i = 0; i < dismissCount; i++) {
        toast.dismiss(visibleToasts[i].id);
      }
    }
  }, [toasts]);
  // Khôi phục trạng thái đăng nhập từ localStorage khi reload (F5)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [resetKey, setResetKey] = useState(0);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('activeTab');
  };

  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('activeTab', 'dashboard');
    setActiveTab('dashboard');
  };

  const handleTabChange = (tab) => {
    if (activeTab === tab) {
      setResetKey(prev => prev + 1);
    }
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  };

  // Render Component dựa trên Tab đang active
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'schools':
        return <Schools user={user} />;
      case 'sales':
        return <Sales user={user} />;
      case 'equipments':
        return <Equipments user={user} />;
      case 'estimates':
        return <Estimates key={`estimates-${resetKey}`} user={user} onNavigate={handleTabChange} />;
      case 'admin-estimates':
        return <AdminEstimates user={user} />;
      case 'audit-logs':
        return <AuditLogs user={user} />;
      case 'users':
        return <Users user={user} />;
      case 'handovers':
        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Lập & In Biên bản Bàn giao</h2>
            <p className="text-slate-400 text-sm">Giao diện tạo biên bản bàn giao và xuất in PDF đang được xây dựng ở bước tiếp theo...</p>
          </div>
        );
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#cbd5e1',
            fontSize: '12px',
            border: '1px solid #1e293b',
            padding: '12px 16px',
            fontWeight: '600'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          },
        }} 
      />
      {isLoggedIn ? (
        <Layout
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          user={user}
          onLogout={handleLogout}
        >
          {renderContent()}
        </Layout>
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}

export default App;
