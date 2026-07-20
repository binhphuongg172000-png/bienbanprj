import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import schoolRoutes from './routes/school-routes.js';
import salesRoutes from './routes/sales-routes.js';
import equipmentRoutes from './routes/equipment-routes.js';
import estimateRoutes from './routes/estimate-routes.js';
import auditRoutes from './routes/audit-routes.js';
import dashboardRoutes from './routes/dashboard-routes.js';
import authRoutes from './routes/auth-routes.js';
import userRoutes from './routes/user-routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS chặt chẽ theo RULES.md
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id']
}));

app.use(express.json());
app.use(cookieParser());

// Khởi tạo cơ sở dữ liệu từ file init.sql tự động khi start server
const initDatabase = async () => {
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sqlContent);
      console.log('Database tables initialized and preloaded with mock data.');
    }
  } catch (error) {
    console.error('Failed to initialize database tables:', error.message);
    console.log('Ensure PostgreSQL is running and DATABASE_URL in server/.env is correct.');
  }
};

await initDatabase();

// Đăng ký routes
app.use('/api/schools', schoolRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Route test hệ thống
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'healthy' },
    message: 'Backend server is running normally.'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
