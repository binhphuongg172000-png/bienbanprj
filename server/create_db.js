import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Trích xuất thông tin từ DATABASE_URL để kết nối tới database mặc định 'postgres' nhằm tạo 'erems_db'
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/erems_db';
const defaultDbUrl = dbUrl.replace(/\/erems_db$/, '/postgres');

console.log('Đang kết nối tới PostgreSQL mặc định để tạo database...');
console.log('Chuỗi kết nối:', defaultDbUrl);

const client = new Client({
  connectionString: defaultDbUrl
});

async function main() {
  try {
    await client.connect();
    console.log('Kết nối thành công. Đang chạy lệnh tạo database erems_db...');
    
    // Kiểm tra xem database erems_db đã tồn tại chưa
    const checkDb = await client.query("SELECT 1 FROM pg_database WHERE datname = 'erems_db'");
    if (checkDb.rows.length > 0) {
      console.log('Database "erems_db" đã tồn tại sẵn trong PostgreSQL.');
    } else {
      await client.query('CREATE DATABASE erems_db');
      console.log('Đã tạo thành công database "erems_db"!');
    }
  } catch (err) {
    console.error('Có lỗi xảy ra khi tạo database:', err.message);
    console.log('\n--- HƯỚNG DẪN KHẮC PHỤC ---');
    console.log('1. Hãy chắc chắn dịch vụ PostgreSQL Server đang chạy.');
    console.log('2. Đảm bảo Mật khẩu của tài khoản postgres khớp với mật khẩu trong file server/.env');
  } finally {
    await client.end();
  }
}

main();
