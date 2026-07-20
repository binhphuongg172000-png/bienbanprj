import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Sales = ({ user }) => {
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // States cho Form
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('active');

  // States cho Toast Thông Báo
  

  // States cho modal xác nhận xóa
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const API_URL = 'http://localhost:5000/api/sales';

  const fallbackSales = [
    { id: 'sa111111-1111-1111-1111-111111111111', name: 'Nguyễn Văn B (Sales)', email: 'sales.b@erems.com', status: 'active' },
    { id: 'sa222222-2222-2222-2222-222222222222', name: 'Trần Thị C (Sales)', email: 'sales.c@erems.com', status: 'active' }
  ];

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      if (response.data?.success) {
        setSalesList(response.data.data);
      } else {
        setSalesList(fallbackSales);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend. Chuyển sang chế độ Local Memory.', err);
      if (salesList.length === 0) {
        setSalesList(fallbackSales);
      }
      showToast('error', 'Không kết nối được database server. Đang dùng bộ nhớ tạm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      showToast('error', 'Vui lòng điền tên và email của nhân viên Sales.');
      return;
    }

    const payload = { name, email, status };

    try {
      if (isEditing) {
        const response = await axios.put(`${API_URL}/${currentId}`, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Cập nhật thông tin Sales thành công!');
          fetchSales();
          resetForm();
        }
      } else {
        const response = await axios.post(API_URL, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Thêm mới nhân viên Sales thành công!');
          fetchSales();
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      showToast('error', errorMessage + ' (Đã cập nhật tạm vào bộ nhớ client)');
      
      if (isEditing) {
        setSalesList(salesList.map(s => s.id === currentId ? { ...s, ...payload } : s));
      } else {
        setSalesList([{ id: Date.now().toString(), ...payload }, ...salesList]);
      }
      resetForm();
    }
  };

  const handleEdit = (sales) => {
    setIsEditing(true);
    setCurrentId(sales.id);
    setName(sales.name);
    setEmail(sales.email);
    setStatus(sales.status || 'active');
  };

  const handleDeleteRequest = (id, name) => {
    setDeleteConfirmId(id);
    setDeleteConfirmName(name);
  };

  const handleConfirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;

    try {
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: { 'x-user-role': user?.role || 'admin' }
      });
      if (response.data?.success) {
        showToast('success', 'Xóa nhân viên Sales thành công!');
        fetchSales();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Không thể xóa nhân viên Sales.';
      showToast('error', errorMessage);

      if (err.message.includes('Network Error') || err.response?.status === 404) {
        setSalesList(salesList.filter(s => s.id !== id));
        showToast('success', 'Đã xóa tạm khỏi bộ nhớ Client.');
      }
    } finally {
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setName('');
    setEmail('');
    setStatus('active');
  };

  const filteredSales = salesList.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 relative">
      

      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý nhân viên Sales</h1>
          <p className="text-slate-400 text-xs mt-1">Danh mục nhân viên kinh doanh chịu trách nhiệm quản lý dự trù phân bổ thiết bị.</p>
        </div>

        <div className="relative w-64">
          <span className="absolute left-3 top-2.5 text-slate-500 text-[10px] pointer-events-none z-10">🔍</span>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-300 shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900 border border-slate-800/60 rounded-2xl p-6`}>
          <h3 className="text-sm font-bold text-white mb-6">Danh sách nhân viên Sales</h3>

          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              Không tìm thấy nhân viên Sales nào trùng khớp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Họ và tên</th>
                    <th className="pb-3 pr-4">Email liên hệ</th>
                    <th className="pb-3 pr-4">Trạng thái</th>
                    {isAdmin && <th className="pb-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredSales.map((sales) => (
                    <tr key={sales.id} className="text-slate-300 hover:text-white transition-colors duration-150">
                      <td className="py-4 pr-4 font-semibold">{sales.name}</td>
                      <td className="py-4 pr-4 text-slate-400 font-mono">{sales.email}</td>
                      <td className="py-4 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sales.status === 'active' 
                            ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400' 
                            : 'bg-slate-950/60 border border-slate-800/40 text-slate-500'
                        }`}>
                          {sales.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(sales)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition cursor-pointer"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(sales.id, sales.name)}
                            className="px-2 py-1 bg-red-950/30 hover:bg-red-950/60 border border-red-800/20 hover:border-red-800/40 text-red-400 rounded-md transition cursor-pointer"
                          >
                            🗑️ Xóa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 h-fit">
            <h3 className="text-sm font-bold text-white mb-6 border-b border-slate-850 pb-3">
              {isEditing ? '⚡ Cập nhật thông tin Sales' : '➕ Thêm nhân viên Sales'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tên nhân viên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email liên hệ <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="name@erems.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Trạng thái hoạt động
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isEditing ? 'Lưu thay đổi' : 'Thêm Sales'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/30 border border-red-800/40 flex items-center justify-center text-xl text-red-500 animate-pulse">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Xác nhận xóa Sales</h4>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa nhân viên <span className="text-white font-semibold">{deleteConfirmName}</span> khỏi danh sách hệ thống?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/20 active:scale-[0.98] transition cursor-pointer"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
