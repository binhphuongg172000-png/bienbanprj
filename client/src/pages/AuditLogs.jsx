import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import API_BASE_URL from '../apiConfig.js';

// Hàm dịch các key tiếng Anh sang tiếng Việt dễ hiểu
const translateKey = (key) => {
  const dictionary = {
    name: 'Tên',
    address: 'Địa chỉ',
    phone: 'Số điện thoại',
    email: 'Email',
    region: 'Khu vực',
    representative: 'Người đại diện',
    classrooms_count: 'Số phòng học',
    new_students_count: 'Học sinh tuyển mới',
    old_students_count: 'Học sinh cũ',
    model: 'Mã (Model)',
    origin: 'Xuất xứ',
    unit: 'Đơn vị tính',
    price: 'Đơn giá',
    unit_price: 'Đơn giá',
    specifications: 'Thông số kỹ thuật',
    accessories: 'Phụ kiện',
    type: 'Loại',
    status: 'Trạng thái',
    note: 'Ghi chú',
    quantity: 'Số lượng',
    total_amount: 'Tổng tiền',
    sales_id: 'Sales phụ trách',
    school_id: 'Trường học',
    estimate_id: 'Dự trù',
    equipment_id: 'Thiết bị',
    proposed_date: 'Ngày đề xuất',
    created_at: 'Ngày tạo'
  };
  const lowerKey = key.toLowerCase();
  return dictionary[lowerKey] || key;
};

// Component hiển thị dữ liệu đẹp mắt cho Non-tech
const DataViewer = ({ data, mappings }) => {
  if (!data) return null;
  
  // Ẩn ID chính để đỡ rối, nhưng giữ lại các ID phụ (equipment_id, estimate_id...) 
  // để người dùng còn biết thao tác trên đối tượng nào.
  // Ẩn thêm 'status' vì cột này đã bị xóa khỏi DB nhưng log cũ vẫn còn lưu.
  const hiddenKeys = ['id', 'status']; 
  const entries = Object.entries(data).filter(([key, value]) => !hiddenKeys.includes(key.toLowerCase()) && value !== null && value !== '');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
      {entries.map(([key, value]) => {
        const lowerKey = key.toLowerCase();
        
        // Nếu giá trị là UUID và có trong từ điển mappings (từ server trả về), thì hiển thị tên thay vì ID
        let displayValue = (mappings && mappings[value]) ? mappings[value] : value;

        // Format giá tiền nếu key là price hoặc total_amount
        if (lowerKey === 'price' || lowerKey === 'unit_price' || lowerKey === 'total_amount') {
          displayValue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
        }
        // Format ngày tháng nếu key là created_at
        if (lowerKey === 'created_at' && typeof value === 'string' && value.includes('T')) {
          displayValue = new Date(value).toLocaleString('vi-VN');
        }

        return (
          <div key={key} className="flex flex-col bg-slate-800/50 p-2 rounded border border-slate-700/50">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {translateKey(key)}
            </span>
            <span className="text-sm font-medium text-slate-200 break-words">
              {displayValue.toString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/audit`);
      if (res.data.success) {
        setLogs(res.data.data || []);
        setMappings(res.data.mappings || {});
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      showToast('error', 'Lỗi khi lấy lịch sử thao tác.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRevert = async (logId) => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục lại dữ liệu ở thời điểm này?')) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/audit/revert/${logId}`);
      if (res.data?.success) {
        showToast('success', 'Đã khôi phục dữ liệu thành công!');
        fetchLogs(); // Reload logs
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.message || 'Lỗi khi khôi phục.');
    }
  };
  
  const handleDownloadBackup = () => {
    window.location.href = `${API_BASE_URL}/api/audit/backup`;
  };

  // Lọc chỉ lấy những trường dữ liệu có sự thay đổi (dành cho thao tác UPDATE)
  // ĐỒNG THỜI luôn giữ lại các trường định danh (như name, school_id, sales_id) để người dùng biết đang sửa cái gì.
  const getChangedData = (log) => {
    if (log.action === 'UPDATE' && log.old_data && log.new_data) {
      const changedOld = {};
      const changedNew = {};
      
      const allKeys = new Set([...Object.keys(log.old_data), ...Object.keys(log.new_data)]);
      const contextKeys = ['name', 'school_id', 'sales_id', 'equipment_id', 'estimate_id'];
      
      allKeys.forEach(key => {
        // So sánh 2 giá trị. Coi null và undefined như nhau để tránh khác biệt giả.
        const valOld = log.old_data[key] == null ? '' : log.old_data[key];
        const valNew = log.new_data[key] == null ? '' : log.new_data[key];

        const isContextKey = contextKeys.includes(key.toLowerCase());

        if (valOld !== valNew || isContextKey) {
          if (log.old_data.hasOwnProperty(key)) changedOld[key] = log.old_data[key];
          if (log.new_data.hasOwnProperty(key)) changedNew[key] = log.new_data[key];
        }
      });
      return { old_data: changedOld, new_data: changedNew };
    }
    return { old_data: log.old_data, new_data: log.new_data };
  };

  return (
    <div className="flex flex-col gap-6">
      
      

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Lịch sử Hệ thống (Audit Logs)</h1>
          <p className="text-slate-400 text-sm mt-1">Giám sát mọi thay đổi dữ liệu trên toàn hệ thống và khôi phục khi cần thiết.</p>
        </div>
        
        <button
          onClick={handleDownloadBackup}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Tải Backup (JSON)
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col flex-1 min-h-[60vh]">
        <div className="p-4 flex-1 overflow-auto bg-slate-900/50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Chưa có lịch sử thay đổi nào được ghi nhận.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-800/80 text-slate-300 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 border-b border-slate-700">Thời gian</th>
                    <th className="px-4 py-3 border-b border-slate-700">Hành động</th>
                    <th className="px-4 py-3 border-b border-slate-700">Bảng</th>
                    <th className="px-4 py-3 border-b border-slate-700">Dữ liệu thay đổi</th>
                    <th className="px-4 py-3 border-b border-slate-700 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.map((log) => {
                    const { old_data, new_data } = getChangedData(log);
                    
                    return (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          log.action === 'DELETE' ? 'bg-red-500/20 text-red-400' : 
                          log.action === 'UPDATE' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200 capitalize">
                        {log.table_name === 'schools' ? 'Trường học' :
                         log.table_name === 'equipments' ? 'Thiết bị' :
                         log.table_name === 'sales' ? 'Nhân viên Sales' :
                         log.table_name === 'estimates' ? 'Dự trù' :
                         log.table_name === 'estimate_items' ? 'Chi tiết Dự trù' : log.table_name}
                      </td>
                      <td className="px-4 py-4 w-1/2">
                        <div className="flex flex-col gap-4">
                          {old_data && Object.keys(old_data).length > 0 && (
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                              <div className="flex items-center gap-2 mb-1 text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                  {log.action === 'UPDATE' ? 'Dữ liệu trước khi sửa (chỉ hiện phần thay đổi)' : 'Dữ liệu bị xóa'}
                                </span>
                              </div>
                              <DataViewer data={old_data} mappings={mappings} />
                            </div>
                          )}
                          
                          {new_data && Object.keys(new_data).length > 0 && (
                            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                              <div className="flex items-center gap-2 mb-1 text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold uppercase tracking-wider">
                                  {log.action === 'UPDATE' ? 'Dữ liệu sau khi sửa' : 'Dữ liệu vừa thêm mới'}
                                </span>
                              </div>
                              <DataViewer data={new_data} mappings={mappings} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-top pt-4">
                        <button
                          onClick={() => handleRevert(log.id)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto w-full max-w-[120px]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          Revert
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
