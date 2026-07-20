import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Middleware to check admin role
const checkAdmin = (req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

// GET all users
router.get('/', checkAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.role, u.sales_id, s.name as sales_name, u.created_at
       FROM users u
       LEFT JOIN sales s ON u.sales_id = s.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create user
router.post('/', checkAdmin, async (req, res) => {
  const { username, password, full_name, role, sales_id } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  try {
    const result = await query(
      `INSERT INTO users (username, password, full_name, role, sales_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username, password, full_name, role || 'user', sales_id || null]
    );
    res.json({ success: true, data: result.rows[0], message: 'User created' });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update user
router.put('/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, full_name, role, sales_id, password } = req.body;
  try {
    let result;
    if (password) {
      result = await query(
        `UPDATE users SET username=$1, full_name=$2, role=$3, sales_id=$4, password=$5, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,
        [username, full_name, role, sales_id || null, password, id]
      );
    } else {
      result = await query(
        `UPDATE users SET username=$1, full_name=$2, role=$3, sales_id=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,
        [username, full_name, role, sales_id || null, id]
      );
    }
    res.json({ success: true, data: result.rows[0], message: 'User updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE user
router.delete('/:id', checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
