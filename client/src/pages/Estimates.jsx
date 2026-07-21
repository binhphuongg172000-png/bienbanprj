import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { formatDate, todayISO } from '../utils.js';
import html2pdf from 'html2pdf.js';
import API_BASE_URL from '../apiConfig.js';

const Estimates = ({ user, onNavigate }) => {
  const [schools, setSchools] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [salesList, setSalesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho Lập dự trù mới
  const [searchSchoolQuery, setSearchSchoolQuery] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [selectedSchoolObj, setSelectedSchoolObj] = useState(null);
  const [newStudentsCount, setNewStudentsCount] = useState('');
  const [oldStudentsCount, setOldStudentsCount] = useState('');
  const [classroomsCount, setClassroomsCount] = useState('');
  const [address, setAddress] = useState('');
  const [proposedDate, setProposedDate] = useState(todayISO());
  const [selectedItems, setSelectedItems] = useState([]); // [{ equipmentId, quantity, unitPrice }]

  // Toast thông báo
  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const [existingEstimate, setExistingEstimate] = useState(null);
  const [editingEstimateId, setEditingEstimateId] = useState(null);
  const [searchQueries, setSearchQueries] = useState({});
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);

  const schoolRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const schoolsRes = await axios.get(`${API_BASE_URL}/api/schools`, {
        headers: {
          'x-user-role': user?.role || '',
          'x-user-id': user?.id || ''
        }
      });
      if (schoolsRes.data?.success) setSchools(schoolsRes.data.data);

      const eqRes = await axios.get(`${API_BASE_URL}/api/equipments`);
      if (eqRes.data?.success) setEquipments(eqRes.data.data);

      const salesRes = await axios.get(`${API_BASE_URL}/api/sales`);
      if (salesRes.data?.success) setSalesList(salesRes.data.data);

    } catch (err) {
      console.warn('Lỗi kết nối database server.', err);
      showToast('error', 'Không kết nối được cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleClickOutside = (event) => {
      if (schoolRef.current && !schoolRef.current.contains(event.target)) {
        setShowSchoolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSchools = schools.filter(s =>
    s.name?.toLowerCase().includes(searchSchoolQuery.toLowerCase())
  );

  const handleSelectSchool = async (school) => {
    setSelectedSchoolObj(school);
    setSearchSchoolQuery(school.name);
    setShowSchoolDropdown(false);
    setExistingEstimate(null);

    setNewStudentsCount(school.new_students_count !== null ? school.new_students_count : '');
    setOldStudentsCount(school.old_students_count !== null ? school.old_students_count : '');
    setClassroomsCount(school.classrooms_count !== null ? school.classrooms_count : '');
    setAddress(school.address || '');
    setSelectedItems([]);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/estimates?school_id=${school.id}`);
      if (res.data?.success && res.data.data.length > 0) {
        const latest = res.data.data[0];
        setExistingEstimate(latest);

        if (latest.items && latest.items.length > 0) {
          const restoredItems = latest.items.map(item => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }));
          setSelectedItems(restoredItems);
        }
      }
    } catch (err) {
      console.log('Không tìm thấy bản dự trù gần nhất cho trường này.');
    }
  };

  const calculateUsableBudget = () => {
    const students = parseInt(newStudentsCount);
    if (!students || isNaN(students)) return 0;
    return Math.round((students / 105) * 100000000);
  };

  const usableBudget = calculateUsableBudget();

  const handleAddItemRow = () => {
    setSelectedItems([...selectedItems, { equipmentId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleUpdateItemRow = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;

    if (field === 'equipmentId') {
      const eq = equipments.find(e => e.id === value);
      if (eq) {
        updated[index].unitPrice = parseFloat(eq.unit_price) || 0;
      }
    }
    setSelectedItems(updated);
  };

  const handleRemoveItemRow = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice || 0);
    }, 0);
  };

  const totalCost = calculateTotal();
  const remainingBudget = usableBudget - totalCost;
  const isBudgetNegative = remainingBudget < 0;

  const checkIsUnchanged = () => {
    if (!existingEstimate) return false;

    const newStudentsMatch = (parseInt(newStudentsCount) || 0) === (existingEstimate.new_students_count || 0);
    const oldStudentsMatch = (parseInt(oldStudentsCount) || 0) === (existingEstimate.old_students_count || 0);
    const classroomsMatch = (parseInt(classroomsCount) || 0) === (existingEstimate.classrooms_count || 0);
    const addressMatch = (address || '').trim() === (existingEstimate.address || selectedSchoolObj?.address || '').trim();

    if (!newStudentsMatch || !oldStudentsMatch || !classroomsMatch || !addressMatch) {
      return false;
    }

    const currentItems = selectedItems.filter(i => i.equipmentId);
    const prevItems = existingEstimate.items || [];

    if (currentItems.length !== prevItems.length) {
      return false;
    }

    for (const item of currentItems) {
      const matchedItem = prevItems.find(ei => ei.equipmentId === item.equipmentId);
      if (!matchedItem) return false;
      if (parseFloat(matchedItem.quantity) !== parseFloat(item.quantity)) return false;
      if (parseFloat(matchedItem.unitPrice) !== parseFloat(item.unitPrice)) return false;
    }

    return true;
  };

  const isUnchanged = checkIsUnchanged();

  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    if (!selectedSchoolObj || selectedItems.length === 0 || selectedItems.some(i => !i.equipmentId)) {
      showToast('error', 'Vui lòng chọn đầy đủ trường học và danh sách thiết bị.');
      return;
    }

    if (existingEstimate?.is_locked) {
      showToast('error', 'Bản dự trù này đã bị khóa bởi Admin, không thể lưu thay đổi.');
      return;
    }

    // Kiểm tra xem có thay đổi so với bản dự trù gần nhất không
    if (existingEstimate) {
      if (isUnchanged) {
        showToast('error', 'Không có thông tin nào thay đổi so với bản dự trù trước đó.');
        return;
      }
    }

    const payload = {
      school_id: selectedSchoolObj.id,
      proposed_date: proposedDate,
      total_amount: totalCost,
      new_students_count: parseInt(newStudentsCount) || 0,
      old_students_count: parseInt(oldStudentsCount) || 0,
      classrooms_count: parseInt(classroomsCount) || 0,
      address: address,
      items: selectedItems.map(item => ({
        equipmentId: item.equipmentId,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0
      }))
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/estimates`, payload);
      if (response.data?.success) {
        showToast('success', 'Lưu bản dự trù vào Database thành công!');
        fetchData();
        
        // Chuyển hướng sang Lịch sử và tìm kiếm trường vừa lưu
        if (onNavigate) {
          sessionStorage.setItem('adminEstimateSearch', selectedSchoolObj.name);
          onNavigate('admin-estimates');
        }

        // Reset form (chỉ chạy ngầm nếu chưa chuyển tab)
        setSelectedSchoolObj(null);
        setSearchSchoolQuery('');
        setNewStudentsCount('');
        setOldStudentsCount('');
        setClassroomsCount('');
        setAddress('');
        setSelectedItems([]);
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.response?.data?.message || 'Lỗi lưu bản dự trù.');
    }
  };

  const handlePrintPreviewNow = () => {
    if (!selectedSchoolObj) return;
    
    const mockRecord = {
      isPreview: true,
      schoolName: selectedSchoolObj.name,
      salesName: selectedSchoolObj.sales_name || 'Chưa phân công',
      proposedDate: proposedDate,
      totalAmount: totalCost,
      schoolAddress: address || selectedSchoolObj.address || '',
      new_students_count: parseInt(newStudentsCount) || 0,
      old_students_count: parseInt(oldStudentsCount) || 0,
      classrooms_count: parseInt(classroomsCount) || 0,
      items: selectedItems.map(item => {
        const eq = equipments.find(e => e.id === item.equipmentId);
        return {
          equipmentName: eq ? eq.name : 'Thiết bị chưa xác định',
          equipmentSpecifications: eq ? eq.specifications : '',
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          unit: eq ? (eq.unit || 'cái') : 'cái'
        };
      })
    };
    
    setViewingRecord(mockRecord);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('print-area');
    const opt = {
      margin:       0.5,
      filename:     `Du_Tru_${viewingRecord?.schoolName || 'Truong'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const [viewingRecord, setViewingRecord] = useState(null);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý Dự Trù Thiết Bị</h1>
          <p className="text-slate-400 text-xs mt-1">Lập kế hoạch mua sắm thiết bị trường học, tự động quản lý ngân sách và kết xuất biên bản.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800/60 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white border-b border-slate-850 pb-3">
            {editingEstimateId ? 'Sửa bản dự trù' : 'Tạo bản dự thảo mới'}
          </h3>
          
          <form onSubmit={handleSaveEstimate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2" ref={schoolRef}>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Trường học tiếp nhận <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-[10px] pointer-events-none z-10">🔍</span>
                  <input
                    type="text"
                    placeholder="Gõ để tìm trường..."
                    value={searchSchoolQuery}
                    onChange={(e) => {
                      setSearchSchoolQuery(e.target.value);
                      setShowSchoolDropdown(true);
                    }}
                    onFocus={() => setShowSchoolDropdown(true)}
                    className="w-full bg-slate-900/60 border border-slate-800 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/30 rounded-xl pl-8 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all duration-300 shadow-inner"
                  />
                </div>

                {showSchoolDropdown && filteredSchools.length > 0 && (
                  <div className="absolute z-20 w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-900">
                    {filteredSchools.map(school => (
                      <div
                        key={school.id}
                        onClick={() => handleSelectSchool(school)}
                        className="px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer transition-colors flex flex-col"
                      >
                        <span className="font-semibold">{school.name}</span>
                        {school.sales_name && <span className="text-[10px] text-purple-400 mt-0.5">💼 Sales: {school.sales_name}</span>}
                        {school.address && <span className="text-[10px] text-slate-500 mt-0.5">📍 {school.address}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedSchoolObj && existingEstimate && (
              <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <p className="text-xs text-amber-500 leading-relaxed">
                    ⚠️ Trường này đã có dự trù vào lúc <span className="font-semibold">{existingEstimate.created_at ? new Date(existingEstimate.created_at).toLocaleString('vi-VN') : 'trước đó'}</span>. Dữ liệu đã được tải lên giống với dự trù trước đó.
                  </p>
                  {!existingEstimate.is_locked && (
                    <button type="button" onClick={() => {
                      setNewStudentsCount('');
                      setOldStudentsCount('');
                      setClassroomsCount('');
                      setSelectedItems([]);
                    }} className="whitespace-nowrap bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 font-medium text-xs px-3 py-2 rounded-lg border border-amber-500/30 transition-colors">
                      🔄 Làm trống dữ liệu để tạo mới
                    </button>
                  )}
                </div>
                {existingEstimate.is_locked && (
                  <p className="text-xs text-rose-500 font-bold mt-2">
                    🔒 Bản dự trù này đã bị khóa, liên hệ admin để mở khóa.
                  </p>
                )}
              </div>
            )}

            {selectedSchoolObj && (
              <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-450 mb-1">Số HS Mới</label>
                    <input
                      type="number"
                      value={newStudentsCount}
                      onChange={(e) => setNewStudentsCount(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-900/60 rounded-xl px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 mb-1">Số HS Cũ</label>
                    <input
                      type="number"
                      value={oldStudentsCount}
                      onChange={(e) => setOldStudentsCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 mb-1">Phòng đầu tư</label>
                    <input
                      type="number"
                      value={classroomsCount}
                      onChange={(e) => setClassroomsCount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-[10px] text-slate-450 mb-1 font-semibold">Địa chỉ trường</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {selectedSchoolObj && (
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">📊 PHÂN TÍCH HẠN MỨC NGÂN SÁCH</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Cột 1: Ngân sách được cấp */}
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Ngân sách được cấp</span>
                      <span className="text-[9px] text-slate-650 block mt-0.5">({newStudentsCount || 0} HS mới / 105 * 100M)</span>
                    </div>
                    <span className="text-sm font-bold text-blue-400 mt-2 block">
                      {usableBudget.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Cột 2: Dự toán đề xuất */}
                  <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Dự toán đề xuất</span>
                      <span className="text-[9px] text-slate-650 block mt-0.5">({selectedItems.filter(i => i.equipmentId).length} hạng mục)</span>
                    </div>
                    <span className="text-sm font-bold text-purple-400 mt-2 block">
                      {totalCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Cột 3: Ngân sách còn lại */}
                  <div className={`bg-slate-950/40 border p-3 rounded-lg flex flex-col justify-between ${
                    remainingBudget >= 0 ? 'border-emerald-950/50' : 'border-rose-950/50'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Ngân sách còn lại</span>
                      <span className={`text-[10px] font-bold block mt-0.5 ${
                        remainingBudget >= 0 ? 'text-emerald-500' : 'text-rose-500 animate-pulse'
                      }`}>
                        {remainingBudget >= 0 ? '✅ Trong hạn mức' : '🚨 Vượt hạn mức!'}
                      </span>
                    </div>
                    <span className={`text-sm font-extrabold mt-2 block ${
                      remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-450'
                    }`}>
                      {remainingBudget.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {usableBudget > 0 && (
                  <div className="space-y-1 pt-1">
                    {(() => {
                      const percentUsed = (totalCost / usableBudget) * 100;
                      return (
                        <>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">Tỷ lệ sử dụng ngân sách:</span>
                            <span className={`font-bold ${percentUsed > 100 ? 'text-rose-500' : 'text-purple-400'}`}>
                              {percentUsed.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentUsed > 100 
                                  ? 'bg-gradient-to-r from-rose-600 to-red-500' 
                                  : 'bg-gradient-to-r from-purple-600 to-blue-500'
                              }`}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {selectedSchoolObj && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-400">Thiết bị đề xuất</label>
                  <button type="button" onClick={handleAddItemRow} className="text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/30">
                    + Thêm
                  </button>
                </div>
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 bg-slate-950/45 p-4 border border-slate-800/60 rounded-xl items-start sm:items-center">
                    
                    {/* Ô Tìm kiếm Thiết bị */}
                    <div className="flex-1 w-full relative">
                      <input
                        type="text"
                        placeholder="Tìm kiếm và chọn thiết bị..."
                        value={
                          searchQueries[idx] !== undefined
                            ? searchQueries[idx]
                            : equipments.find(e => e.id === item.equipmentId)?.name || ''
                        }
                        onChange={(e) => {
                          setSearchQueries({ ...searchQueries, [idx]: e.target.value });
                          setActiveDropdownIndex(idx);
                        }}
                        onFocus={() => {
                          setActiveDropdownIndex(idx);
                          const currentName = equipments.find(e => e.id === item.equipmentId)?.name || '';
                          setSearchQueries({ ...searchQueries, [idx]: currentName });
                        }}
                        onBlur={() => {
                          // Đóng dropdown trễ để bắt sự kiện click
                          setTimeout(() => {
                            setActiveDropdownIndex(null);
                            setSearchQueries(prev => {
                              const updated = { ...prev };
                              delete updated[idx];
                              return updated;
                            });
                          }, 250);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-655 focus:outline-none transition-colors"
                      />
                      
                      {activeDropdownIndex === idx && (
                        <div className="absolute z-30 w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-900">
                          {(() => {
                            const queryText = searchQueries[idx] || '';
                            const sortedEquipments = [...equipments].sort((a, b) => {
                              const catA = (a.category || '').toLowerCase() === 'đầu tư khác' ? 1 : 0;
                              const catB = (b.category || '').toLowerCase() === 'đầu tư khác' ? 1 : 0;
                              return catA - catB;
                            });
                            
                            const filtered = sortedEquipments.filter(eq => 
                              eq.name?.toLowerCase().includes(queryText.toLowerCase()) ||
                              eq.category?.toLowerCase().includes(queryText.toLowerCase())
                            );

                            if (filtered.length === 0) {
                              return <div className="p-3 text-xs text-slate-500 text-center italic">Không tìm thấy thiết bị...</div>;
                            }

                            return filtered.map(eq => {
                              const isOther = (eq.category || '').toLowerCase() === 'đầu tư khác';
                              return (
                                <div
                                  key={eq.id}
                                  onClick={() => {
                                    handleUpdateItemRow(idx, 'equipmentId', eq.id);
                                    setActiveDropdownIndex(null);
                                    setSearchQueries(prev => {
                                      const updated = { ...prev };
                                      delete updated[idx];
                                      return updated;
                                    });
                                  }}
                                  className="px-4 py-2.5 text-xs hover:bg-slate-900 hover:text-white cursor-pointer transition-colors flex justify-between items-center gap-2 text-slate-300"
                                >
                                  <div>
                                    <span className="font-semibold block">{eq.name}</span>
                                    {eq.specifications && (
                                      <span className="text-[10px] text-slate-500 block truncate max-w-[250px]">{eq.specifications}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                      isOther 
                                        ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20' 
                                        : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                                    }`}>
                                      {isOther ? 'Đầu tư khác' : 'Thiết bị'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 border border-slate-800 px-1 py-0.5 rounded">{eq.unit || 'cái'}</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-start">
                      {/* Đơn giá */}
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          value={item.unitPrice || ''} 
                          onChange={(e) => handleUpdateItemRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)} 
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white text-right" 
                          placeholder="Đơn giá"
                        />
                        <span className="text-[10px] text-slate-500">đ</span>
                      </div>

                      {/* Số lượng */}
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number" 
                          step="any"
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseFloat(e.target.value) || 0)} 
                          className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white text-center" 
                          placeholder="SL"
                        />
                        <span className="text-[10px] text-purple-400 font-semibold w-10 truncate text-left" title={equipments.find(e => e.id === item.equipmentId)?.unit || 'cái'}>
                          {equipments.find(e => e.id === item.equipmentId)?.unit || 'cái'}
                        </span>
                      </div>

                      {/* Xóa */}
                      <button type="button" onClick={() => handleRemoveItemRow(idx)} className="text-red-400 hover:text-red-300 transition-colors px-1 text-sm">🗑️</button>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {selectedSchoolObj && (
              <div className="flex justify-between items-center pt-6 border-t border-slate-800/80">
                <div>
                  <span className="text-xs text-slate-400">Tổng cộng kinh phí dự trù:</span>
                  <span className="text-xl font-extrabold text-purple-405 block mt-0.5">{totalCost.toLocaleString('vi-VN')} đ</span>
                </div>
                  {existingEstimate ? (
                    existingEstimate.is_locked ? (
                      <button type="button" disabled className="bg-slate-800 text-slate-500 font-medium text-xs px-6 py-3 rounded-xl cursor-not-allowed">
                        🔒 Đã khóa
                      </button>
                    ) : isUnchanged ? (
                      <button type="button" disabled className="bg-slate-850 border border-slate-800 text-slate-500 font-medium text-xs px-6 py-3 rounded-xl cursor-not-allowed" title="Không có thông tin nào thay đổi so với bản trước đó.">
                        ⚠️ Không đổi (Không thể lưu)
                      </button>
                    ) : (
                      <button type="submit" className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-medium text-xs px-6 py-3 rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]">
                        💾 Lưu cập nhật dự trù
                      </button>
                    )
                  ) : (
                    <button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 text-white font-medium text-xs px-6 py-3 rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]">
                      💾 Lưu bản dự trù mới
                    </button>
                  )}
              </div>
            )}
          </form>
        </div>

        {/* Cột Phải - Xem trước tài liệu Live Preview */}
        {selectedSchoolObj && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800/60 rounded-2xl p-5 flex flex-col h-fit space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">📄 Xem trước biên bản</h3>
            </div>
            <div 
              onClick={handlePrintPreviewNow}
              className="relative bg-white text-slate-900 p-4 rounded-xl border border-slate-200 shadow-xl font-serif text-[6px] leading-tight w-full hover:border-purple-500/70 hover:shadow-purple-950/20 active:scale-[0.99] transition-all cursor-pointer select-none group overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] z-10">
                <div className="bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-xl font-sans font-bold text-xs whitespace-nowrap animate-pulse">
                  👁️ Xem chi tiết & Xuất in
                </div>
              </div>
              
              <div className="text-center mb-2">
                <p className="font-bold uppercase text-[6px] text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="underline decoration-solid font-semibold text-[4px] text-slate-700 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                <h4 className="font-bold uppercase text-[7px] mt-2 text-purple-900 border-b border-purple-100 pb-1">
                  BẢNG DỰ TRÙ THIẾT BỊ
                </h4>
              </div>

              <div className="space-y-0.5 text-slate-800 mb-2 font-sans text-[5.5px] leading-snug">
                <p><strong>Tên trường:</strong> <span className="font-bold text-slate-950">{selectedSchoolObj.name}</span></p>
                <p><strong>Địa chỉ trường:</strong> {address || selectedSchoolObj.address || '---'}</p>
                <p><strong>Nhân viên kinh doanh:</strong> {selectedSchoolObj.sales_name || user?.full_name}</p>
                
                <div className="grid grid-cols-3 gap-0.5 bg-slate-50 p-1 rounded border border-slate-200 text-[5px] font-semibold mt-1 text-slate-800">
                  <p><strong>Học sinh mới:</strong> {newStudentsCount || 0} học sinh</p>
                  <p><strong>Học sinh cũ:</strong> {oldStudentsCount || 0} học sinh</p>
                  <p><strong>Phòng học đầu tư:</strong> {classroomsCount || 0} phòng</p>
                </div>
              </div>

              {selectedItems.length > 0 ? (
                <table className="w-full border-collapse border border-slate-300 text-left text-[4.5px] mb-2 font-sans">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-300 p-0.5 text-center w-4">STT</th>
                      <th className="border border-slate-300 p-0.5">Tên Thiết Bị</th>
                      <th className="border border-slate-300 p-0.5">Thông Số Kỹ Thuật</th>
                      <th className="border border-slate-300 p-0.5 text-center w-4">ĐVT</th>
                      <th className="border border-slate-300 p-0.5 text-center w-4">SL</th>
                      <th className="border border-slate-300 p-0.5 text-right w-10">Đơn Giá (đ)</th>
                      <th className="border border-slate-300 p-0.5 text-right w-12">Thành Tiền (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, idx) => {
                      const eq = equipments.find(e => String(e.id) === String(item.equipmentId)) || {};
                      return (
                        <tr key={idx} className="text-slate-800">
                          <td className="border border-slate-300 p-0.5 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 p-0.5 truncate max-w-[50px] font-medium">{eq.name || '---'}</td>
                          <td className="border border-slate-300 p-0.5 truncate max-w-[50px] text-[4px] text-slate-500">{eq.specifications || '---'}</td>
                          <td className="border border-slate-300 p-0.5 text-center">{eq.unit || 'cái'}</td>
                          <td className="border border-slate-300 p-0.5 text-center">{item.quantity}</td>
                          <td className="border border-slate-300 p-0.5 text-right whitespace-nowrap">{(item.unitPrice || 0).toLocaleString('vi-VN')}</td>
                          <td className="border border-slate-300 p-0.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50 text-slate-900 text-[5px]">
                      <td colSpan="6" className="border border-slate-300 p-0.5 text-right">Tổng Cộng Dự Toán:</td>
                      <td className="border border-slate-300 p-0.5 text-right text-purple-700 font-bold whitespace-nowrap">
                        {totalCost.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-slate-400 italic py-3 border border-dashed border-slate-200 rounded-lg font-sans text-[5px] mb-2">
                  Chưa chọn thiết bị nào...
                </div>
              )}

              <div className="mt-1 flex justify-end text-[4.5px] font-sans">
                <p className="italic">TP.HCM, ngày .... tháng ...... năm {new Date().getFullYear()}</p>
              </div>
              <div className="grid grid-cols-5 text-center mt-1 gap-1 text-[4.5px] font-sans border-t border-slate-100 pt-1 text-slate-900">
                <div className="flex flex-col justify-between h-8">
                  <p className="font-bold">Sale</p>
                  <p className="mt-auto font-semibold text-slate-800 whitespace-nowrap origin-bottom" style={{ fontSize: '3.8px' }}>{selectedSchoolObj.sales_name || user?.full_name}</p>
                </div>
                <div className="flex flex-col justify-between h-8">
                  <p className="font-bold">Khối iSMART</p>
                  <p className="mt-auto font-semibold text-slate-800 whitespace-nowrap origin-bottom" style={{ fontSize: '3.8px' }}>Nguyễn Thị Kim Oanh</p>
                </div>
                <div className="flex flex-col justify-between h-8">
                  <p className="font-bold">IT</p>
                  <p className="mt-auto font-semibold text-slate-800 whitespace-nowrap origin-bottom" style={{ fontSize: '3.8px' }}>Trần Minh Hoàng</p>
                </div>
                <div className="flex flex-col justify-between h-8">
                  <p className="font-bold">Tài Chính</p>
                  <p className="mt-auto font-semibold text-slate-800 whitespace-nowrap origin-bottom" style={{ fontSize: '3.8px' }}>Ngô Minh Hòa</p>
                </div>
                <div className="flex flex-col justify-between h-8">
                  <p className="font-bold">Giám Đốc</p>
                  <p className="mt-auto font-semibold text-slate-800 whitespace-nowrap origin-bottom" style={{ fontSize: '3.8px' }}>Nguyễn Thị Quang Ngọc</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết và In ấn */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-h-[95vh] overflow-y-auto flex flex-col justify-between animate-scale-in">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-6">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Xem Chi Tiết Bản Dự Trù
              </h3>
              <button
                onClick={() => setViewingRecord(null)}
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
                <p><strong>Tên trường:</strong> <span className="font-bold text-slate-950">{viewingRecord.schoolName}</span></p>
                <p><strong>Địa chỉ trường:</strong> {viewingRecord.schoolAddress}</p>
                <p><strong>Nhân viên kinh doanh:</strong> {viewingRecord.salesName}</p>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-semibold mt-3 text-slate-900">
                  <p><strong>Học sinh mới:</strong> {viewingRecord.new_students_count || 0} học sinh</p>
                  <p><strong>Học sinh cũ:</strong> {viewingRecord.old_students_count || 0} học sinh</p>
                  <p><strong>Phòng học đầu tư:</strong> {viewingRecord.classrooms_count || 0} phòng</p>
                </div>
              </div>

              {/* Bảng thiết bị */}
              <table className="w-full border-collapse border border-slate-400 text-left text-[11px] mb-6">
                <thead>
                  <tr className="bg-slate-105 font-bold">
                    <th className="border border-slate-400 p-2.5 text-center w-12">STT</th>
                    <th className="border border-slate-400 p-2.5">Tên Thiết Bị</th>
                    <th className="border border-slate-400 p-2.5">Thông Số Kỹ Thuật</th>
                    <th className="border border-slate-400 p-2.5 text-center w-12">ĐVT</th>
                    <th className="border border-slate-400 p-2.5 text-center w-12">SL</th>
                    <th className="border border-slate-400 p-2.5 text-right w-24">Đơn Giá (đ)</th>
                    <th className="border border-slate-400 p-2.5 text-right w-28">Thành Tiền (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingRecord.items && viewingRecord.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-400 p-2.5 text-center font-sans">{idx + 1}</td>
                      <td className="border border-slate-400 p-2.5 font-sans font-medium">{item.equipmentName}</td>
                      <td className="border border-slate-400 p-2.5 font-sans text-[10px] text-slate-600">{item.equipmentSpecifications}</td>
                      <td className="border border-slate-400 p-2.5 text-center font-sans">{item.unit || 'cái'}</td>
                      <td className="border border-slate-400 p-2.5 text-center font-sans">{item.quantity}</td>
                      <td className="border border-slate-400 p-2.5 text-right font-sans whitespace-nowrap">{item.unitPrice.toLocaleString('vi-VN')}</td>
                      <td className="border border-slate-400 p-2.5 text-right font-sans font-bold text-slate-900 whitespace-nowrap">{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50 text-[12px]">
                    <td colSpan="6" className="border border-slate-400 p-2.5 text-right">Tổng Cộng Dự Toán:</td>
                    <td className="border border-slate-400 p-2.5 text-right text-purple-700 font-extrabold whitespace-nowrap">{(viewingRecord.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                  </tr>
                </tbody>
              </table>

              {/* Phần chữ ký mẫu */}
              <div className="mt-8 flex justify-end">
                <p className="italic text-[11px] mb-4">
                  TP.HCM, ngày .... tháng ...... năm {new Date().getFullYear()}
                </p>
              </div>
              <div className="grid grid-cols-5 text-center mt-2 gap-2 text-[8px] text-slate-900 whitespace-nowrap">
                <div className="flex flex-col justify-between h-24 border-r border-slate-100 last:border-0 px-1">
                  <p className="font-bold text-slate-900">Đại diện Sale</p>
                  <p className="mt-auto text-slate-800 font-semibold leading-tight text-[7.5px] whitespace-nowrap">{viewingRecord.salesName}</p>
                </div>
                <div className="flex flex-col justify-between h-24 border-r border-slate-100 last:border-0 px-1">
                  <p className="font-bold text-slate-900">Phụ trách khối iSMART</p>
                  <p className="mt-auto text-slate-800 font-semibold leading-tight text-[7.5px] whitespace-nowrap">Nguyễn Thị Kim Oanh</p>
                </div>
                <div className="flex flex-col justify-between h-24 border-r border-slate-100 last:border-0 px-1">
                  <p className="font-bold text-slate-900">Đại diện IT</p>
                  <p className="mt-auto text-slate-800 font-semibold leading-tight text-[7.5px] whitespace-nowrap">Trần Minh Hoàng</p>
                </div>
                <div className="flex flex-col justify-between h-24 border-r border-slate-100 last:border-0 px-1">
                  <p className="font-bold text-slate-900">Đại diện Tài Chính</p>
                  <p className="mt-auto text-slate-800 font-semibold leading-tight text-[7.5px] whitespace-nowrap">Ngô Minh Hòa</p>
                </div>
                <div className="flex flex-col justify-between h-24 border-r border-slate-100 last:border-0 px-1">
                  <p className="font-bold text-slate-900">Giám Đốc</p>
                  <p className="mt-auto text-slate-800 font-semibold leading-tight text-[7.5px] whitespace-nowrap">Nguyễn Thị Quang Ngọc</p>
                </div>
              </div>
            </div>

            {/* Footer Modal với nút Print */}
            <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t border-slate-850">
              <button
                onClick={() => setViewingRecord(null)}
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
                onClick={handleDownloadPDF}
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

export default Estimates;
