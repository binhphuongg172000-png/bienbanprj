import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. GET: Lấy danh sách thiết bị
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM equipments ORDER BY created_at DESC');
    res.json({
      success: true,
      data: result.rows,
      message: 'Lấy danh sách thiết bị thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thiết bị:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi lấy danh sách thiết bị.'
    });
  }
});

// 2. POST: Thêm mới thiết bị hàng loạt (Bulk Import) (Chỉ cho phép Admin)
router.post('/bulk', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền thêm thiết bị.'
    });
  }

  const { equipments } = req.body;
  if (!Array.isArray(equipments) || equipments.length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Danh sách thiết bị không hợp lệ hoặc trống.'
    });
  }

  try {
    let importedCount = 0;
    // Chèn từng thiết bị vào database
    for (const equipment of equipments) {
      const { name, specifications, accessories, unit_price, category, unit } = equipment;
      if (name && unit_price !== undefined) {
        await query(
          `INSERT INTO equipments (name, specifications, accessories, unit_price, category, unit)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [name, specifications || null, accessories || null, unit_price, category || 'thiết bị', unit || 'cái']
        );
        importedCount++;
      }
    }

    res.status(201).json({
      success: true,
      data: { importedCount },
      message: `Thêm thành công ${importedCount} thiết bị.`
    });
  } catch (error) {
    console.error('Lỗi khi import thiết bị:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi import thiết bị.'
    });
  }
});

// 3. POST: Thêm thiết bị mới (Chỉ Admin)
router.post('/', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền thêm thiết bị.'
    });
  }

  const { name, specifications, accessories, unit_price, category, unit } = req.body;

  if (!name || unit_price === undefined) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Vui lòng cung cấp tên thiết bị và đơn giá.'
    });
  }

  try {
    const result = await query(
      `INSERT INTO equipments (name, specifications, accessories, unit_price, category, unit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, specifications || null, accessories || null, unit_price, category || 'thiết bị', unit || 'cái']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Thêm mới thiết bị thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi thêm thiết bị:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi thêm thiết bị.'
    });
  }
});


// 3. PUT: Cập nhật thông tin thiết bị (Chỉ Admin)
router.put('/:id', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền cập nhật thiết bị.'
    });
  }

  const { id } = req.params;
  const { name, specifications, accessories, unit_price, category, unit } = req.body;

  if (!name || unit_price === undefined) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Tên thiết bị và đơn giá không được bỏ trống.'
    });
  }

  try {
    const existCheck = await query('SELECT id FROM equipments WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy thiết bị cần cập nhật.'
      });
    }

    const result = await query(
      `UPDATE equipments
       SET name = $1, specifications = $2, accessories = $3, unit_price = $4, category = $5, unit = $6
       WHERE id = $7
       RETURNING *`,
      [name, specifications || null, accessories || null, unit_price, category || 'thiết bị', unit || 'cái', id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thông tin thiết bị thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật thiết bị:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi cập nhật thiết bị.'
    });
  }
});

// 4. DELETE: Xóa thiết bị khỏi danh mục (Chỉ Admin)
router.delete('/:id', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được quyền xóa thiết bị.'
    });
  }

  const { id } = req.params;

  try {
    const existCheck = await query('SELECT id FROM equipments WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy thiết bị cần xóa.'
      });
    }

    await query('DELETE FROM equipments WHERE id = $1', [id]);
    res.json({
      success: true,
      data: { id },
      message: 'Xóa thiết bị thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi xóa thiết bị:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi xóa thiết bị.'
    });
  }
});

export default router;
