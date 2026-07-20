import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import API_BASE_URL from '../apiConfig.js';

const AdminEstimates = ({ user }) => {
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingIds, setTogglingIds] = useState(new Set());
  
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  const API_URL = `${API_BASE_URL}/api/estimates`;

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const fetchEstimates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(API_URL, {
        headers: {
          'x-user-role': user?.role || '',
          'x-user-id': user?.id || ''
        }
      });
      if (response.data?.success) {
        setEstimates(response.data.data);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend. Không thể tải danh sách dự trù.', err);
      showToast('error', 'Không kết nối được server. Không thể tải danh sách dự trù.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  const handleLockToggle = async (id, currentLockStatus) => {
    if (togglingIds.has(id)) return;
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const res = await axios.put(`${API_BASE_URL}/api/estimates/${id}/lock`, 
        { is_locked: !currentLockStatus },
        { headers: { 'x-user-role': user?.role } }
      );
      if (res.data.success) {
        showToast('success', res.data.message);
        await fetchEstimates(true);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi thay đổi trạng thái khóa.');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản dự trù này? Thao tác không thể hoàn tác!')) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/estimates/${id}`, {
        headers: { 'x-user-role': user?.role }
      });
      if (res.data.success) {
        showToast('success', 'Đã xóa bản dự trù thành công.');
        fetchEstimates(true);
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Lỗi khi xóa bản dự trù.');
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, [user, fetchEstimates]);

  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [selectedSchoolObj, setSelectedSchoolObj] = useState(null);

  // Nhận thông tin tìm kiếm từ sessionStorage (khi chuyển từ trang Lập dự trù sang)
  useEffect(() => {
    const savedSearch = sessionStorage.getItem('adminEstimateSearch');
    if (savedSearch) {
      setSearchQuery(savedSearch);
      sessionStorage.removeItem('adminEstimateSearch');
    }
  }, []);

  // Extract unique schools from estimates for autocomplete dropdown
  const uniqueSchoolsMap = new Map();
  estimates.forEach(est => {
    if (est.school_id && !uniqueSchoolsMap.has(est.school_id)) {
      uniqueSchoolsMap.set(est.school_id, {
        id: est.school_id,
        name: est.school_name,
        sales_name: est.sales_name,
        address: est.schoolAddress || est.school_address // Backend maps it to schoolAddress or keeps school_address
      });
    }
  });
  const allSchools = Array.from(uniqueSchoolsMap.values());

  const filteredSchools = allSchools.filter(school => {
    const term = searchQuery.toLowerCase();
    return (school.name || '').toLowerCase().includes(term);
  });

  // Tìm kiếm & Lọc
  let filteredEstimates = estimates;

  if (selectedSchoolObj) {
    filteredEstimates = filteredEstimates.filter(est => est.school_id === selectedSchoolObj.id);
  } else if (searchQuery) {
    const term = searchQuery.toLowerCase();
    filteredEstimates = filteredEstimates.filter(est => {
      return (est.school_name || '').toLowerCase().includes(term);
    });
  }

  const isAdmin = user?.role === 'admin';
  const shouldShowLatestOnly = !isAdmin || showLatestOnly;

  // Lọc chỉ hiển thị dự trù mới nhất cho mỗi trường
  if (shouldShowLatestOnly) {
    const latestMap = new Map();
    filteredEstimates.forEach(est => {
      // Vì backend đã sắp xếp ORDER BY created_at DESC, bản ghi đầu tiên gặp là mới nhất
      if (!latestMap.has(est.school_id)) {
        latestMap.set(est.school_id, est);
      }
    });
    filteredEstimates = Array.from(latestMap.values());
  }




  return (
    <div className="space-y-8 relative">
      
      

      {/* Tiêu đề trang & Filters */}
      <div className="flex flex-col items-start gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold text-white">{isAdmin ? 'Biên bản dự trù' : 'Kho Dự Trù Đã Lập'}</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">{isAdmin ? 'Quản lý toàn bộ biên bản dự trù thiết bị trên hệ thống.' : 'Nơi lưu trữ và xem lại các bản dự trù thiết bị bạn đã lập.'}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-start md:items-center mt-2 z-20">
          {/* Ô Tìm kiếm có dropdown */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-2.5 text-slate-500 text-[10px] pointer-events-none z-10">🔍</span>
            <input
              type="text"
              placeholder="Gõ để tìm trường..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSchoolDropdown(true);
                if (selectedSchoolObj && e.target.value !== selectedSchoolObj.name) {
                  setSelectedSchoolObj(null);
                }
              }}
              onFocus={() => setShowSchoolDropdown(true)}
              onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-300 shadow-inner"
            />
            
            {showSchoolDropdown && filteredSchools.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-900">
                {filteredSchools.map(school => (
                  <div
                    key={school.id}
                    onClick={() => {
                      setSelectedSchoolObj(school);
                      setSearchQuery(school.name);
                      setShowSchoolDropdown(false);
                    }}
                    className="px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="font-semibold">{school.name}</div>
                    {school.sales_name && (
                      <span className="text-[10px] text-purple-400 mt-1 block">💼 Sales: {school.sales_name}</span>
                    )}
                    {school.address && (
                      <span className="text-[10px] text-slate-500 mt-1 block">📍 {school.address}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 bg-slate-900/50 hover:bg-slate-900 px-3 py-2 rounded-xl border border-slate-800/60 transition-colors select-none">
              <input 
                type="checkbox" 
                className="rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900" 
                checked={showLatestOnly}
                onChange={(e) => setShowLatestOnly(e.target.checked)}
              />
              <span>Chỉ hiển thị dự trù mới nhất</span>
            </label>
          )}
        </div>
      </div>

      {/* Danh sách Biên bản */}
      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-6">Tất cả biên bản dự trù đã xuất</h3>
        
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
            <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
            <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
          </div>
        ) : filteredEstimates.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Không tìm thấy bản dự trù nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pr-4 w-[22%]">Trường học</th>
                  <th className="pb-3 pr-4 w-[15%]">Sales phụ trách</th>
                  <th className="pb-3 pr-4 text-right w-[11%]">Tổng tiền</th>
                  <th className="pb-3 pr-4 text-right w-[12%]">Chênh lệch</th>
                  <th className="pb-3 pr-4 pl-8 w-[14%]">Thời gian lập</th>
                  <th className="pb-3 pr-4 text-center w-[8%]">Trạng thái</th>
                  <th className="pb-3 pr-4 text-right w-[18%]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredEstimates.map((est) => (
                  <tr key={est.id} className="text-slate-300 hover:text-white transition-colors duration-150">
                    <td className="py-4 pr-4 font-semibold text-purple-400 truncate" title={est.school_name}>{est.school_name}</td>
                    <td className="py-4 pr-4 text-slate-400 truncate" title={est.sales_name}>{est.sales_name}</td>
                    <td className="py-4 pr-4 text-right font-bold text-blue-400">
                      {parseFloat(est.total_amount || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td className={`py-4 pr-4 font-bold text-right ${Math.round(((est.new_students_count || 0) / 105) * 100000000) - parseFloat(est.total_amount || 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {Math.round(((est.new_students_count || 0) / 105) * 100000000) - parseFloat(est.total_amount || 0) < 0 ? '- ' : ''}{Math.abs(Math.round(((est.new_students_count || 0) / 105) * 100000000) - parseFloat(est.total_amount || 0)).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-4 pr-4 pl-8 text-slate-400 whitespace-nowrap">
                      {est.created_at ? new Date(est.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-4 pr-4 text-center">
                      <div className="w-[70px] mx-auto flex justify-center">
                        {est.is_locked
                          ? <span className="inline-flex items-center gap-1 text-[10px] bg-amber-900/40 text-amber-500 border border-amber-800/50 px-2 py-0.5 rounded whitespace-nowrap">🔒 Đã khóa</span>
                          : <span className="text-[10px] text-slate-600">—</span>
                        }
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedEstimate(est)}
                          className="w-[64px] flex items-center justify-center gap-1 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 border border-blue-800/50 rounded-lg transition-colors text-[11px]"
                          title="Xem chi tiết"
                        >
                          👁️ Xem
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              disabled={togglingIds.has(est.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLockToggle(est.id, est.is_locked);
                              }}
                              className={`w-[72px] flex items-center justify-center gap-1 py-1.5 border rounded-lg transition-all text-[11px] ${togglingIds.has(est.id) ? 'opacity-40 cursor-not-allowed' : ''} ${est.is_locked ? 'bg-amber-900/40 hover:bg-amber-900/60 text-amber-500 border-amber-800/50' : 'bg-slate-800/40 hover:bg-slate-800/60 text-slate-400 border-slate-700/50'}`}
                              title={est.is_locked ? 'Mở khóa' : 'Khóa'}
                            >
                              {togglingIds.has(est.id) ? '⏳ ...' : (est.is_locked ? '🔓 Mở' : '🔒 Khóa')}
                            </button>
                            <button 
                              onClick={() => handleDelete(est.id)}
                              className="w-[64px] flex items-center justify-center gap-1 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/50 rounded-lg transition-colors text-[11px]"
                              title="Xóa"
                            >
                              🗑️ Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết và In ấn (Full-screen view) */}
      {selectedEstimate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-h-[95vh] overflow-y-auto flex flex-col justify-between animate-scale-in">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Xem Chi Tiết Bản Dự Trù
              </h3>
              <button
                onClick={() => setSelectedEstimate(null)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nội dung Mẫu in ấn */}
            <div id="print-area" className="bg-white text-slate-900 p-8 rounded-xl border border-slate-350 shadow-inner font-serif leading-relaxed text-xs">
              <div className="text-center mb-6">
                <p className="font-bold text-sm uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-semibold underline decoration-solid">Độc lập - Tự do - Hạnh phúc</p>
                <h2 className="text-base font-bold uppercase mt-6 tracking-wide">BẢNG DỰ TRÙ THIẾT BỊ</h2>
              </div>

              {/* Thông tin chung trong biên bản */}
              <div className="space-y-2 mb-6 text-slate-800 font-sans">
                <p><strong>Tên trường:</strong> <span className="font-bold text-slate-950">{selectedEstimate.school_name}</span></p>
                <p><strong>Địa chỉ trường:</strong> {selectedEstimate.school_address}</p>
                <p><strong>Nhân viên kinh doanh:</strong> {selectedEstimate.sales_name}</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-semibold mt-3 text-slate-900">
                  <p><strong>Học sinh mới:</strong> {selectedEstimate.new_students_count || 0} học sinh</p>
                  <p><strong>Học sinh cũ:</strong> {selectedEstimate.old_students_count || 0} học sinh</p>
                  <p><strong>Phòng học đầu tư:</strong> {selectedEstimate.classrooms_count || 0} phòng</p>
                </div>
              </div>

              {/* Bảng thiết bị */}
              <table className="w-full border-collapse border border-slate-400 text-left text-[11px] mb-6">
                <thead>
                  <tr className="bg-slate-105 font-bold">
                    <th className="border border-slate-400 p-2.5 text-center w-12">STT</th>
                    <th className="border border-slate-400 p-2.5">Tên Thiết Bị</th>
                    <th className="border border-slate-400 p-2.5">Thông Số Kỹ Thuật</th>
                    <th className="border border-slate-400 p-2.5 text-center w-12">SL</th>
                    <th className="border border-slate-400 p-2.5 text-right w-24">Đơn Giá (đ)</th>
                    <th className="border border-slate-400 p-2.5 text-right w-28">Thành Tiền (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEstimate.items && selectedEstimate.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-400 p-2.5 text-center font-sans">{idx + 1}</td>
                      <td className="border border-slate-400 p-2.5 font-sans font-medium">{item.equipmentName || item.equipment_name}</td>
                      <td className="border border-slate-400 p-2.5 font-sans text-[10px] text-slate-600">{item.equipmentSpecifications || item.equipment_specifications}</td>
                      <td className="border border-slate-400 p-2.5 text-center font-sans">{item.quantity}</td>
                      <td className="border border-slate-400 p-2.5 text-right font-sans">{parseFloat(item.unitPrice || item.unit_price || 0).toLocaleString('vi-VN')}</td>
                      <td className="border border-slate-400 p-2.5 text-right font-sans font-bold text-slate-900">{parseFloat((item.quantity || 0) * (item.unitPrice || item.unit_price || 0)).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50 text-[12px]">
                    <td colSpan="5" className="border border-slate-400 p-2.5 text-right">Tổng Cộng Dự Toán:</td>
                    <td className="border border-slate-400 p-2.5 text-right text-purple-700 font-extrabold">{parseFloat(selectedEstimate.total_amount || 0).toLocaleString('vi-VN')} đ</td>
                  </tr>
                  <tr className="font-bold bg-slate-50 text-[12px]">
                    <td colSpan="5" className="border border-slate-400 p-2.5 text-right text-slate-700">Ngân sách được đầu tư:</td>
                    <td className="border border-slate-400 p-2.5 text-right text-slate-700">
                      {Math.round(((selectedEstimate.new_students_count || 0) / 105) * 100000000).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                  <tr className="font-bold bg-slate-50 text-[12px]">
                    <td colSpan="5" className="border border-slate-400 p-2.5 text-right">Chênh lệch ngân sách:</td>
                    <td className={`border border-slate-400 p-2.5 text-right ${Math.round(((selectedEstimate.new_students_count || 0) / 105) * 100000000) - parseFloat(selectedEstimate.total_amount || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {Math.round(((selectedEstimate.new_students_count || 0) / 105) * 100000000) - parseFloat(selectedEstimate.total_amount || 0) < 0 ? '- ' : ''}{Math.abs(Math.round(((selectedEstimate.new_students_count || 0) / 105) * 100000000) - parseFloat(selectedEstimate.total_amount || 0)).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Phần chữ ký mẫu */}
              <div className="mt-8 flex justify-end">
                <p className="italic text-[11px] mb-4">
                  TP.HCM, ngày .... tháng ...... năm {new Date().getFullYear()}
                </p>
              </div>
              <div className="grid grid-cols-5 text-center mt-2 gap-1 text-[9px] whitespace-nowrap">
                <div className="flex flex-col justify-between h-24">
                  <p className="font-bold">Đại diện Sale</p>
                  <p className="mt-auto">{selectedEstimate.sales_name}</p>
                </div>
                <div className="flex flex-col justify-between h-24">
                  <p className="font-bold">Phụ trách khối iSMART</p>
                  <p className="mt-auto">Nguyễn Thị Kim Oanh</p>
                </div>
                <div className="flex flex-col justify-between h-24">
                  <p className="font-bold">Đại diện IT</p>
                  <p className="mt-auto">Trần Minh Hoàng</p>
                </div>
                <div className="flex flex-col justify-between h-24">
                  <p className="font-bold">Đại diện Tài Chính</p>
                  <p className="mt-auto">Ngô Minh Hòa</p>
                </div>
                <div className="flex flex-col justify-between h-24">
                  <p className="font-bold">Giám Đốc</p>
                  <p className="mt-auto">Nguyễn Thị Quang Ngọc</p>
                </div>
              </div>
            </div>

            {/* Footer Modal với nút Print */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-850">
              <button
                onClick={() => setSelectedEstimate(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-950/20 active:scale-95 transition-all cursor-pointer"
              >
                🖨️ Xuất In
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('print-area');
                  const opt = {
                    margin:       0.5,
                    filename:     `Du_Tru_${selectedEstimate?.school_name || 'Truong'}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2 },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                  };
                  html2pdf().set(opt).from(element).save();
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-950/20 active:scale-95 transition-all cursor-pointer"
              >
                📥 Lưu PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEstimates;
