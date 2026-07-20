import { query } from './db.js';

const run = async () => {
  try {
    console.log('Bắt đầu cập nhật cấu trúc bảng equipments...');
    // Thêm cột category vào bảng equipments
    await query(`
      ALTER TABLE equipments 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'thiết bị'
    `);
    console.log('Đã bổ sung cột category thành công!');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi chạy di trú:', err);
    process.exit(1);
  }
};

run();
