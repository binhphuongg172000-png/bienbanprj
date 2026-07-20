import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. GET: Lấy danh sách nhân viên Sales
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM sales ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows,
      message: 'Lấy danh sách Sales thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Sales:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi lấy danh sách Sales.'
    });
  }
});

// 2. POST: Thêm mới nhân viên Sales (Chỉ Admin)
router.post('/', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền thêm Sales.'
    });
  }

  const { name, email, status } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Vui lòng cung cấp đầy đủ tên và email của Sales.'
    });
  }

  try {
    // Kiểm tra trùng email
    const emailCheck = await query('SELECT id FROM sales WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Email nhân viên Sales đã tồn tại trên hệ thống.'
      });
    }

    const result = await query(
      `INSERT INTO sales (name, email, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, email, status || 'active']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Thêm mới nhân viên Sales thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi thêm mới Sales:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi thêm mới Sales.'
    });
  }
});

// 3. PUT: Cập nhật thông tin nhân viên Sales (Chỉ Admin)
router.put('/:id', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền cập nhật thông tin Sales.'
    });
  }

  const { id } = req.params;
  const { name, email, status } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Tên và email không được bỏ trống.'
    });
  }

  try {
    // Kiểm tra sự tồn tại của Sales
    const existCheck = await query('SELECT id FROM sales WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy nhân viên Sales cần cập nhật.'
      });
    }

    // Kiểm tra trùng email với tài khoản khác
    const emailCheck = await query('SELECT id FROM sales WHERE email = $1 AND id <> $2', [email, id]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Email mới đã trùng với một nhân viên Sales khác.'
      });
    }

    const result = await query(
      `UPDATE sales
       SET name = $1, email = $2, status = $3
       WHERE id = $4
       RETURNING *`,
      [name, email, status || 'active', id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thông tin Sales thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật Sales:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi cập nhật Sales.'
    });
  }
});

// 4. DELETE: Xóa nhân viên Sales (Chỉ Admin)
router.delete('/:id', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền xóa Sales.'
    });
  }

  const { id } = req.params;

  try {
    const existCheck = await query('SELECT id FROM sales WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy nhân viên Sales cần xóa.'
      });
    }

    await query('DELETE FROM sales WHERE id = $1', [id]);
    res.json({
      success: true,
      data: { id },
      message: 'Xóa nhân viên Sales thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi xóa Sales:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi xóa Sales.'
    });
  }
});

export default router;
