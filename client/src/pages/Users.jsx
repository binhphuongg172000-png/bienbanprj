import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const Users = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', full_name: '', role: 'user', sales_id: '' });
  const [editingId, setEditingId] = useState(null);
  

  const API_URL = 'http://localhost:5000/api/users';
  const SALES_API_URL = 'http://localhost:5000/api/sales';

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, salesRes] = await Promise.all([
        axios.get(API_URL, { headers: { 'x-user-role': user?.role } }),
        axios.get(SALES_API_URL)
      ]);
      if (usersRes.data?.success) setUsers(usersRes.data.data);
      if (salesRes.data?.success) setSalesList(salesRes.data.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu', err);
      showToast('error', 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.full_name) {
      return showToast('error', 'Vui lòng nhập tên đăng nhập và họ tên.');
    }
    if (!editingId && !formData.password) {
      return showToast('error', 'Vui lòng nhập mật khẩu cho tài khoản mới.');
    }

    try {
      if (editingId) {
        const res = await axios.put(`${API_URL}/${editingId}`, formData, { headers: { 'x-user-role': user?.role } });
        if (res.data.success) {
          showToast('success', 'Cập nhật tài khoản thành công!');
          setEditingId(null);
        }
      } else {
        const res = await axios.post(API_URL, formData, { headers: { 'x-user-role': user?.role } });
        if (res.data.success) {
          showToast('success', 'Tạo tài khoản mới thành công!');
        }
      }
      setFormData({ username: '', password: '', full_name: '', role: 'user', sales_id: '' });
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setFormData({
      username: u.username,
      password: '',
      full_name: u.full_name,
      role: u.role,
      sales_id: u.sales_id || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await axios.delete(`${API_URL}/${id}`, { headers: { 'x-user-role': user?.role } });
      if (res.data.success) {
        showToast('success', 'Xóa tài khoản thành công!');
        fetchData();
      }
    } catch (err) {
      showToast('error', 'Lỗi khi xóa tài khoản.');
    }
  };

  if (user?.role !== 'admin') {
    return <div className="py-20 text-center text-slate-500">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-8 relative">
      

      <div>
        <h1 className="text-2xl font-bold text-white">Quản lý Tài Khoản</h1>
        <p className="text-slate-400 text-xs mt-1">Thêm, sửa, xóa tài khoản và gán nhân viên Sales cho từng tài khoản.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800/60 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white border-b border-slate-850 pb-3 mb-4">
            {editingId ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tên đăng nhập *</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm" placeholder="VD: sale01" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Mật khẩu {editingId && '(Bỏ trống nếu không đổi)'}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Họ và tên *</label>
              <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm" placeholder="VD: Nguyễn Văn A" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Quyền hạn</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm">
                <option value="user">User (Sales)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formData.role === 'user' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Gán Nhân Viên Sales</label>
                <select value={formData.sales_id} onChange={e => setFormData({...formData, sales_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm">
                  <option value="">-- Không gán --</option>
                  {salesList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                </select>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 rounded-lg transition">{editingId ? 'Cập nhật' : 'Tạo mới'}</button>
              {editingId && (
                <button type="button" onClick={() => {setEditingId(null); setFormData({ username: '', password: '', full_name: '', role: 'user', sales_id: '' });}} className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition">Hủy</button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-850/50">
            <h3 className="text-sm font-bold text-white">Danh sách tài khoản ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Quyền</th>
                  <th className="px-4 py-3">Sales gán</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Đang tải...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Chưa có tài khoản nào</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                      <td className="px-4 py-3">{u.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u.sales_name || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEdit(u)} className="text-blue-400 hover:text-blue-300 mr-3" title="Sửa">✏️</button>
                        {u.username !== 'admin' && (
                          <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300" title="Xóa">🗑️</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
