import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import * as XLSX from 'xlsx';

const Equipments = ({ user }) => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // States cho Form
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [name, setName] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [accessories, setAccessories] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [unit, setUnit] = useState('cái');

  // States cho Toast
  

  // States cho modal xác nhận xóa
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // States cho Bulk Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const API_URL = 'http://localhost:5000/api/equipments';

  const fallbackEquipments = [];

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      if (response.data?.success) {
        const filtered = response.data.data.filter(eq => !eq.category || eq.category === 'thiết bị');
        setEquipments(filtered);
      } else {
        setEquipments(fallbackEquipments);
      }
    } catch (err) {
      console.warn('Lỗi kết nối Backend. Chuyển sang chế độ Local Memory.', err);
      if (equipments.length === 0) {
        setEquipments(fallbackEquipments);
      }
      showToast('error', 'Không kết nối được database server. Đang dùng bộ nhớ tạm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !unitPrice) {
      showToast('error', 'Vui lòng cung cấp tên thiết bị và đơn giá.');
      return;
    }

    const payload = {
      name,
      specifications,
      accessories,
      unit_price: parseFloat(unitPrice.toString().replace(/\./g, '')) || 0,
      category: 'thiết bị',
      unit
    };

    try {
      if (isEditing) {
        const response = await axios.put(`${API_URL}/${currentId}`, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Cập nhật thiết bị thành công!');
          fetchEquipments();
          resetForm();
        }
      } else {
        const response = await axios.post(API_URL, payload, {
          headers: { 'x-user-role': user?.role || 'user' }
        });
        if (response.data?.success) {
          showToast('success', 'Thêm mới thiết bị thành công!');
          fetchEquipments();
          resetForm();
        }
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.';
      showToast('error', errorMessage + ' (Đã cập nhật tạm vào bộ nhớ client)');
      
      if (isEditing) {
        setEquipments(equipments.map(eq => eq.id === currentId ? { ...eq, ...payload } : eq));
      } else {
        setEquipments([{ id: Date.now().toString(), ...payload }, ...equipments]);
      }
      resetForm();
    }
  };

  const handleEdit = (eq) => {
    setIsEditing(true);
    setCurrentId(eq.id);
    setName(eq.name);
    setSpecifications(eq.specifications || '');
    setAccessories(eq.accessories || '');
    setUnitPrice(formatNumberInput(eq.unit_price.toString()));
    setUnit(eq.unit || 'cái');
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
        showToast('success', 'Xóa thiết bị thành công!');
        fetchEquipments();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Không thể xóa thiết bị.';
      showToast('error', errorMessage);

      if (err.message.includes('Network Error') || err.response?.status === 404) {
        setEquipments(equipments.filter(eq => eq.id !== id));
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
    setSpecifications('');
    setAccessories('');
    setUnitPrice('');
    setUnit('cái');
  };

  function formatNumberInput(val) {
    if (!val) return '';
    const num = val.toString().replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

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
          let price = row['Đơn giá (VNĐ)'];
          if (typeof price === 'string') {
            price = parseInt(price.replace(/[^0-9]/g, '')) || 0;
          }

          return {
            name: row['Tên thiết bị'],
            specifications: row['Thông số kỹ thuật'],
            accessories: row['Phụ kiện'],
            unit_price: price || 0,
            unit: row['Đơn vị tính'] || 'cái',
            category: 'thiết bị'
          };
        }).filter(item => item.name); // Bỏ qua các dòng không có tên

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
    
    setImporting(true);
    try {
      const res = await axios.post(`${API_URL}/bulk`, { equipments: importData }, {
        headers: { 'x-user-role': user?.role }
      });
      if (res.data.success) {
        showToast('success', res.data.message || 'Import thành công.');
        setShowImportModal(false);
        setImportData([]);
        fetchEquipments(); // reload data
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
        'Tên thiết bị': 'Ti vi tương tác 75 inch',
        'Thông số kỹ thuật': 'RAM 4GB, ROM 32GB, Kính cường lực',
        'Phụ kiện': 'Điều khiển, bút cảm ứng, giá treo',
        'Đơn vị tính': 'cái',
        'Đơn giá (VNĐ)': 25000000
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_ThietBi.xlsx');
  };

  // --------------------------------------------------- //

  const filteredEquipments = equipments.filter(eq => 
    eq.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 relative">
      

      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Danh mục thiết bị</h1>
          <p className="text-slate-400 text-xs mt-1">Quản lý thư viện thiết bị chuẩn dùng để áp dụng giá trị khi làm dự trù.</p>
        </div>
        {/* Ô Tìm kiếm nhanh & Nút Import */}
        <div className="flex flex-wrap items-center gap-4 w-full">
          <div className="relative w-64">
            <span className="absolute left-3 top-2.5 text-slate-500 text-[10px] pointer-events-none z-10">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tên thiết bị..."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-900 border border-slate-800/60 rounded-2xl p-6`}>
          <h3 className="text-sm font-bold text-white mb-6">Danh sách thiết bị</h3>

          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
              <div className="h-10 bg-slate-850 rounded-lg animate-pulse" />
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              Không tìm thấy thiết bị nào trùng khớp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Tên thiết bị</th>
                    <th className="pb-3 pr-4">Linh kiện kèm theo</th>
                    <th className="pb-3 pr-4">ĐVT</th>
                    <th className="pb-3 pr-4">Đơn giá</th>
                    {isAdmin && <th className="pb-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredEquipments.map((eq) => (
                    <tr key={eq.id} className="text-slate-300 hover:text-white transition-colors duration-150">
                      <td className="py-4 pr-4 font-semibold">
                        <div>{eq.name}</div>
                        {eq.specifications && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-xs truncate" title={eq.specifications}>
                            {eq.specifications}
                          </div>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        {eq.accessories ? (
                          <div className="space-y-0.5">
                            {eq.accessories.split(',').map((acc, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0"></span>
                                <span>{acc.trim()}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Không có</span>
                        )}
                      </td>
                      <td className="py-4 pr-4 text-slate-400">
                        {eq.unit || 'cái'}
                      </td>
                      <td className="py-4 pr-4 font-semibold text-blue-400">
                        {parseFloat(eq.unit_price).toLocaleString('vi-VN')} đ
                      </td>
                      {isAdmin && (
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => handleEdit(eq)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition cursor-pointer"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(eq.id, eq.name)}
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
              {isEditing ? '⚡ Cập nhật thông tin thiết bị' : '➕ Thêm thiết bị mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tên thiết bị <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên thiết bị..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Đơn giá (đ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 12.500.000"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(formatNumberInput(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Đơn vị tính <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: cái, bộ..."
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Thông số kỹ thuật
                </label>
                <textarea
                  placeholder="Nhập mô tả thông số..."
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  rows="2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Linh kiện kèm theo
                </label>
                <textarea
                  placeholder="Mỗi linh kiện cách nhau bởi dấu phẩy. Ví dụ: Dây HDMI, Điều khiển từ xa, Túi đựng..."
                  value={accessories}
                  onChange={(e) => setAccessories(e.target.value)}
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
                <p className="text-[10px] text-slate-600 mt-1">Phân cách các linh kiện bằng dấu phẩy (,)</p>
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
                  {isEditing ? 'Lưu thay đổi' : 'Thêm thiết bị'}
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
              <h4 className="text-sm font-bold text-white">Xác nhận xóa thiết bị</h4>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa thiết bị <span className="text-white font-semibold">{deleteConfirmName}</span> khỏi danh mục hệ thống?
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
              <h2 className="text-lg font-bold text-white">Nhập Thiết bị từ file Excel</h2>
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
                        <th className="pb-2 pr-4">Tên thiết bị</th>
                        <th className="pb-2 pr-4">ĐVT</th>
                        <th className="pb-2 pr-4">Đơn giá (VNĐ)</th>
                        <th className="pb-2 pr-4">Thông số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/50">
                          <td className="py-2 pr-4 text-slate-300 font-medium">{row.name}</td>
                          <td className="py-2 pr-4 text-slate-400">{row.unit || 'cái'}</td>
                          <td className="py-2 pr-4 text-emerald-400">{row.unit_price.toLocaleString('vi-VN')} đ</td>
                          <td className="py-2 pr-4 text-slate-400 text-[10px]">{row.specifications || '-'}</td>
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
                  `Lưu ${importData.length > 0 ? importData.length : ''} thiết bị`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipments;
