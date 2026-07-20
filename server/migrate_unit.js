import { query } from './db.js';

const run = async () => {
  try {
    console.log('Bắt đầu bổ sung cột unit vào bảng equipments...');
    await query(`
      ALTER TABLE equipments 
      ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'cái'
    `);
    console.log('Đã bổ sung cột unit thành công!');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi chạy di trú:', err);
    process.exit(1);
  }
};

run();
