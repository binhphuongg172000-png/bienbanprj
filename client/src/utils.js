/**
 * Hàm tiện ích format ngày theo chuẩn dự án: dd/mm/yyyy
 * @param {string|Date} dateInput - Chuỗi ngày ISO (yyyy-mm-dd) hoặc đối tượng Date
 * @returns {string} Ngày theo định dạng dd/mm/yyyy
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  try {
    // Nếu là chuỗi ISO yyyy-mm-dd → tách trực tiếp để tránh lệch timezone
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const [year, month, day] = dateInput.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
};

/**
 * Lấy ngày hôm nay theo định dạng yyyy-mm-dd (dùng cho input[type=date])
 */
export const todayISO = () => new Date().toISOString().split('T')[0];

/**
 * Lấy ngày hôm nay theo định dạng dd/mm/yyyy
 */
export const todayFormatted = () => formatDate(todayISO());
