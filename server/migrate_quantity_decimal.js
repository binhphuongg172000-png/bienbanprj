import { query } from './db.js';

const run = async () => {
  try {
    console.log('Bắt đầu chuyển đổi kiểu dữ liệu cột quantity thành DECIMAL...');
    await query(`
      ALTER TABLE estimate_items 
      ALTER COLUMN quantity TYPE DECIMAL(12,2);
    `);
    console.log('Đã chuyển đổi thành công!');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi chạy di trú:', err);
    process.exit(1);
  }
};

run();
