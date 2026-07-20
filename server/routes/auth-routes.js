import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.role, u.sales_id, s.name as sales_name 
       FROM users u 
       LEFT JOIN sales s ON u.sales_id = s.id 
       WHERE u.username = $1 AND u.password = $2`,
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu.' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.full_name,
        role: user.role,
        sales_id: user.sales_id,
        sales_name: user.sales_name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập.' });
  }
});

export default router;
