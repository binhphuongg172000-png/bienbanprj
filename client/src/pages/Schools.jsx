import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import * as XLSX from 'xlsx';
import API_BASE_URL from '../apiConfig.js';

const Schools = ({ user }) => {
  const [schools, setSchools] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States cho Form
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [name, setName] = useState('');
  const [salesId, setSalesId] = useState('');
  const [address, setAddress] = useState('');
  const [representative, setRepresentative] = useState('');
  const [newStudentsCount, setNewStudentsCount] = useState('');
  const [oldStudentsCount, setOldStudentsCount] = useState('');
  const [classroomsCount, setClassroomsCount] = useState('');

  // States cho Toast Thông Báo
  

  // States cho modal xác nhận xóa
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // States cho Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = `${API_BASE_URL}/api/schools`;

  const mockSales = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Nguyễn Văn B (Sales)' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Trần Thị C (Sales)' },
  ];

  // Dữ liệu mock dự phòng nếu Backend/PostgreSQL chưa chạy
  const fallbackSchools = [
    { id: '1', name: 'Trường THPT Nguyễn Du (Mock)', sales_id: '11111111-1111-1111-1111-111111111111', sales_name: 'Nguyễn Văn B (Sales)', address: '123 Lê Lợi, Q.1, TP.HCM', representative: 'Nguyễn Thị Hoa', new_students_count: 250, old_students_count: 680, classrooms_count: 18 },
    { id: '2', name: 'Trường THCS Lê Lợi (Mock)', sales_id: '22222222-2222-2222-2222-222222222222', sales_name: 'Trần Thị C (Sales)', address: '456 Nguyễn Huệ, Q.3, TP.HCM', representative: 'Trần Văn Hùng', new_students_count: 180, old_students_count: 520, classrooms_count: 12 },
  ];

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  // Load danh sách trường học và Sales
  const fetchSchoolsAndSales = async () => {
    setLoading(true);
    try {
      const [schoolsRes, salesRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(`${API_BASE_URL}/api/sales`)
      ]);

      if (schoolsRes.data?.success) {
        setSchools(schoolsRes.data.data);
      } else {
        setSchools(fallbackSchools);
      }

      if (salesRes.data?.success) {
        setSalesList(salesRes.data.data);
      } else {
        setSalesList(mockSales);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend. Chuyển sang chế độ Local Memory.', err);
      if (schools.length === 0) {
        setSchools(fallbackSchools);
      }
      if (salesList.length === 0) {
        setSalesList(mockSales);
      }
      showToast('error', 'Không kết nối được database server. Đang dùng bộ nhớ tạm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolsAndSales();
  }, []);

  // Xử lý nộp Form (Lưu / Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !salesId) {
      showToast('error', 'Vui lòng nhập tên trường học và chọn Sales phụ trách.');
      return;
    }

    const payload = { 
      name, 
      sales_id: salesId, 
      address, 
      representative,
      new_students_count: parseInt(newStudentsCount) || 0,
      old_students_count: parseInt(oldStudentsCount) || 0,
      classrooms_count: parseInt(classroomsCount) || 0
    };

    try {
      if (isEditing) {
        // Gọi API cập nhật
        const response = await axios.put(`${API_URL}/${currentId}`, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Cập nhật thông tin trường học thành công!');
          fetchSchoolsAndSales();
          resetForm();
        }
      } else {
        // Gọi API thêm mới
        const response = await axios.post(API_URL, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Thêm trường học thành công!');
          fetchSchoolsAndSales();
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      // Ghi nhận trực tiếp vào state nếu không có server để user vẫn thấy hoạt động
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      showToast('error', errorMessage + ' (Đã cập nhật tạm vào bộ nhớ client)');
      
      const salesObj = mockSales.find(sa => sa.id === salesId);
      const mockPayload = { ...payload, sales_name: salesObj ? salesObj.name : '-' };

      if (isEditing) {
        setSchools(schools.map(s => s.id === currentId ? { ...s, ...mockPayload } : s));
      } else {
        setSchools([{ id: Date.now().toString(), ...mockPayload }, ...schools]);
      }
      resetForm();
    }
  };

  // Nạp dữ liệu vào form để sửa
  const handleEdit = (school) => {
    setIsEditing(true);
    setCurrentId(school.id);
    setName(school.name);
    setSalesId(school.sales_id || '');
    setAddress(school.address || '');
    setRepresentative(school.representative || '');
    setNewStudentsCount(school.new_students_count !== null ? school.new_students_count : '');
    setOldStudentsCount(school.old_students_count !== null ? school.old_students_count : '');
    setClassroomsCount(school.classrooms_count !== null ? school.classrooms_count : '');
  };

  // Yêu cầu xóa trường học (mở modal)
  const handleDeleteRequest = (id, name) => {
    setDeleteConfirmId(id);
    setDeleteConfirmName(name);
  };

  // Xác nhận xóa thực sự
  const handleConfirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;

    try {
      const response = await axios.delete(`${API_URL}/${id}`, {
        headers: { 'x-user-role': user?.role || 'admin' }
      });
      if (response.data?.success) {
        showToast('success', 'Xóa trường học thành công!');
        fetchSchoolsAndSales();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Không thể xóa trường học.';
      showToast('error', errorMessage);
      
      // Xóa tạm trên UI nếu không có server để kiểm thử
      if (err.message.includes('Network Error') || err.response?.status === 404) {
        setSchools(schools.filter(s => s.id !== id));
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
    setSalesId('');
    setAddress('');
    setRepresentative('');
    setNewStudentsCount('');
    setOldStudentsCount('');
    setClassroomsCount('');
  };

  // ---------------- LỖI & BULK IMPORT ---------------- //

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map data from Excel to DB structure
        const mappedData = data.map(row => {
          // Find sales_id based on Sales name in the file
          const salesName = row['Sales phụ trách'] || row['Tên Sales'] || '';
          const matchedSales = salesList.find(s => s.name.toLowerCase().trim() === salesName.toLowerCase().trim());
          
          return {
            name: row['Tên trường'],
            sales_name_raw: salesName, // Just for preview
            sales_id: matchedSales ? matchedSales.id : null,
            address: row['Địa chỉ'],
            representative: row['Đại diện'],
            new_students_count: parseInt(row['Học sinh mới']) || 0,
            old_students_count: parseInt(row['Học sinh cũ']) || 0,
            classrooms_count: parseInt(row['Số phòng học']) || 0
          };
        }).filter(item => item.name); // Bỏ qua các dòng không có tên trường

        setImportData(mappedData);
      } catch (err) {
        showToast('error', 'Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (importData.length === 0) return;
    
    // Kiểm tra xem có trường nào chưa map được sales_id không
    const invalidRows = importData.filter(item => !item.sales_id);
    if (invalidRows.length > 0) {
      if (!window.confirm(`Có ${invalidRows.length} trường học không tìm thấy hoặc sai tên Sales (sẽ bị bỏ qua). Bạn có muốn tiếp tục import các trường hợp lệ?`)) {
        return;
      }
    }

    const validData = importData.filter(item => item.sales_id && item.name);
    if (validData.length === 0) {
      showToast('error', 'Không có dữ liệu hợp lệ để import.');
      return;
    }

    setImporting(true);
    try {
      const res = await axios.post(`${API_URL}/bulk`, { schools: validData }, {
        headers: { 'x-user-role': user?.role }
      });
      if (res.data.success) {
        showToast('success', res.data.message || 'Import thành công.');
        setShowImportModal(false);
        setImportData([]);
        fetchSchoolsAndSales(); // reload data
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Lỗi khi import dữ liệu.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Tên trường': 'Tiểu học ABC',
        'Sales phụ trách': 'Nguyễn Văn A',
        'Địa chỉ': '123 Đường X, Quận Y',
        'Đại diện': 'Trần Văn B',
        'Học sinh mới': 100,
        'Học sinh cũ': 500,
        'Số phòng học': 20
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_TruongHoc.xlsx');
  };

  // --------------------------------------------------- //

  // Tìm kiếm trường học
  const filteredSchools = schools.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 relative">
      
      

      {/* Tiêu đề trang */}
      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Trường học</h1>
          <p className="text-slate-400 text-xs mt-1">Danh mục, học sinh và phòng học các trường học tiếp nhận phân bổ thiết bị.</p>
        </div>
        
        {/* Ô Tìm kiếm nhanh & Nút Import */}
        <div className="flex flex-wrap items-center gap-4 w-full">
          <div className="relative w-64">
            <span className="absolute left-3 top-2.5 text-slate-500 text-[10px] pointer-events-none z-10">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên trường học..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-300 shadow-inner"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-400 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2"
            >
              📥 Import Excel
            </button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bảng Danh sách Trường học */}
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900 border border-slate-800/60 rounded-2xl p-6`}>
          <h3 className="text-sm font-bold text-white mb-6">Danh sách trường học</h3>
          
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              Không tìm thấy trường học nào trùng khớp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Tên trường</th>
                    <th className="pb-3 pr-4">Sales phụ trách</th>
                    <th className="pb-3 pr-4">Đại diện</th>
                    <th className="pb-3 pr-4">Học sinh (Mới / Cũ)</th>
                    <th className="pb-3 pr-4">Phòng học đầu tư</th>
                    {isAdmin && <th className="pb-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="text-slate-300 hover:text-white transition-colors duration-150">
                      <td className="py-4 pr-4 font-semibold">
                        <div>{school.name}</div>
                        {school.address && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-xs truncate" title={school.address}>
                            📍 {school.address}
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-purple-400 font-medium">{school.sales_name || 'Chưa phân công'}</td>
                      <td className="py-4 pr-4">{school.representative || '-'}</td>
                      <td className="py-4 pr-4">
                        <div className="text-emerald-400 font-semibold">{school.new_students_count || 0} <span className="text-[10px] text-slate-500 font-normal">mới</span></div>
                        <div className="text-slate-400">{school.old_students_count || 0} <span className="text-[10px] text-slate-500 font-normal">cũ</span></div>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-blue-400">{school.classrooms_count || 0} phòng</td>
                      {isAdmin && (
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(school)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition cursor-pointer"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(school.id, school.name)}
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

        {/* Form Thêm/Sửa Trường học (Phải - 1col, chỉ Admin mới thấy) */}
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-6 h-fit">
            <h3 className="text-sm font-bold text-white mb-6 border-b border-slate-850 pb-3">
              {isEditing ? '⚡ Chỉnh sửa trường học' : '➕ Thêm trường học mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tên trường học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên trường học..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Sales phụ trách <span className="text-red-500">*</span>
                </label>
                <select
                  value={salesId}
                  onChange={(e) => setSalesId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                >
                  <option value="">-- Chọn Sales phụ trách --</option>
                  {salesList.map(sa => (
                    <option key={sa.id} value={sa.id}>{sa.name.replace(' (Sales)', '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Người đại diện (Hiệu trưởng/Cán bộ)
                </label>
                <input
                  type="text"
                  placeholder="Nhập họ và tên..."
                  value={representative}
                  onChange={(e) => setRepresentative(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-450 uppercase tracking-wider mb-1">HS Mới</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newStudentsCount}
                    onChange={(e) => setNewStudentsCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-450 uppercase tracking-wider mb-1">HS Cũ</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={oldStudentsCount}
                    onChange={(e) => setOldStudentsCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-450 uppercase tracking-wider mb-1">Phòng học</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={classroomsCount}
                    onChange={(e) => setClassroomsCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Địa chỉ trường
                </label>
                <textarea
                  placeholder="Nhập địa chỉ..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
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
                  {isEditing ? 'Lưu thay đổi' : 'Thêm trường'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal Xác nhận Xóa tuỳ chỉnh (Premium UI) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/30 border border-red-800/40 flex items-center justify-center text-xl text-red-500 animate-pulse">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Xác nhận xóa trường học</h4>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa <span className="text-white font-semibold">{deleteConfirmName}</span> khỏi hệ thống? Hành động này không thể phục hồi.
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

      {/* Modal Bulk Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Nhập Trường học từ file Excel</h2>
              <button 
                onClick={() => { setShowImportModal(false); setImportData([]); }}
                className="text-slate-500 hover:text-white transition cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 flex items-end gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Chọn file Excel (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-900/30 file:text-purple-400 hover:file:bg-purple-900/50 cursor-pointer"
                />
              </div>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer border border-slate-700 h-[36px]"
              >
                📄 Tải file mẫu
              </button>
            </div>

            {/* Preview Data */}
            <div className="flex-1 overflow-auto bg-slate-950 border border-slate-850 rounded-xl p-4">
              {importData.length > 0 ? (
                <div>
                  <p className="text-xs text-emerald-400 font-semibold mb-3">Đã tải {importData.length} dòng dữ liệu</p>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                        <th className="pb-2 pr-4">Tên trường</th>
                        <th className="pb-2 pr-4">Địa chỉ</th>
                        <th className="pb-2 pr-4">Đại diện</th>
                        <th className="pb-2 pr-4">Sales (File)</th>
                        <th className="pb-2 pr-4">Trạng thái map Sales</th>
                        <th className="pb-2 pr-2">HS Mới</th>
                        <th className="pb-2 pr-2">HS Cũ</th>
                        <th className="pb-2">Phòng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="py-2 pr-4 text-slate-300 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 text-slate-400 text-[10px]">{row.address || '-'}</td>
                          <td className="py-2 pr-4 text-slate-400 text-[10px]">{row.representative || '-'}</td>
                          <td className="py-2 pr-4 text-slate-400 text-[10px]">{row.sales_name_raw}</td>
                          <td className="py-2 pr-4">
                            {row.sales_id ? (
                              <span className="text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded text-[10px]">Hợp lệ</span>
                            ) : (
                              <span className="text-red-400 bg-red-900/30 px-2 py-0.5 rounded text-[10px]">Không khớp</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-slate-400">{row.new_students_count}</td>
                          <td className="py-2 pr-2 text-slate-400">{row.old_students_count}</td>
                          <td className="py-2 text-slate-400">{row.classrooms_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                  <span className="text-3xl mb-2">📁</span>
                  <p>Chưa có dữ liệu. Vui lòng chọn file Excel để xem trước.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => { setShowImportModal(false); setImportData([]); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importData.length === 0 || importing}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  importData.length > 0 && !importing
                    ? 'bg-purple-650 hover:bg-purple-550 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  `Lưu ${importData.length > 0 ? importData.length : ''} trường học`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;
