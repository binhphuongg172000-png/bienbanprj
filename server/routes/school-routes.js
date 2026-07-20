import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. GET: Lấy danh sách trường học kèm tên nhân viên Sales phụ trách và thông tin mở rộng
router.get('/', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id']; // user.id từ bảng users

    let queryText = `SELECT s.*, sa.name AS sales_name 
                     FROM schools s 
                     LEFT JOIN sales sa ON s.sales_id = sa.id`;
    let queryParams = [];

    if (userRole !== 'admin' && userId) {
      // Tra cứu sales_id thực tế từ bảng users dựa trên user.id
      const userRes = await query('SELECT sales_id FROM users WHERE id = $1', [userId]);
      const salesId = userRes.rows[0]?.sales_id;

      if (salesId) {
        queryText += ` WHERE s.sales_id = $1`;
        queryParams.push(salesId);
      } else {
        // User chưa liên kết sales_id: trả danh sách rỗng
        return res.json({ success: true, data: [], message: 'Tài khoản chưa được phân công phụ trách trường nào.' });
      }
    }

    queryText += ` ORDER BY s.created_at DESC`;

    const result = await query(queryText, queryParams);
    res.json({
      success: true,
      data: result.rows,
      message: 'Lấy danh sách trường học thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách trường học:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi lấy danh sách trường học.'
    });
  }
});


// 2. POST: Thêm mới trường học hàng loạt (Bulk Import) (Chỉ cho phép Admin)
router.post('/bulk', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được phép thêm trường học.'
    });
  }

  const { schools } = req.body;
  if (!Array.isArray(schools) || schools.length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Danh sách trường học không hợp lệ hoặc trống.'
    });
  }

  try {
    let importedCount = 0;
    let skippedCount = 0;
    // Chèn từng trường vào database
    for (const school of schools) {
      const { name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count } = school;
      if (name && sales_id) {
        // Kiểm tra trùng lặp
        const checkResult = await query(
          `SELECT id FROM schools WHERE name = $1 AND sales_id = $2 AND COALESCE(address, '') = COALESCE($3, '')`,
          [name, sales_id, address || '']
        );

        if (checkResult.rows.length === 0) {
          await query(
            `INSERT INTO schools (name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              name,
              sales_id,
              address || null,
              representative || null,
              new_students_count || 0,
              old_students_count || 0,
              classrooms_count || 0
            ]
          );
          importedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { importedCount, skippedCount },
      message: `Thêm thành công ${importedCount} trường. Đã bỏ qua ${skippedCount} trường bị trùng lặp.`
    });
  } catch (error) {
    console.error('Lỗi khi import trường học:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi import trường học.'
    });
  }
});

// 3. POST: Thêm mới trường học (Chỉ cho phép Admin)
router.post('/', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được phép thêm trường học.'
    });
  }

  const { name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count } = req.body;

  if (!name || !sales_id) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Vui lòng cung cấp đầy đủ tên trường học và nhân viên Sales phụ trách.'
    });
  }

  try {
    const result = await query(
      `INSERT INTO schools (name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        sales_id,
        address || null,
        representative || null,
        parseInt(new_students_count) || 0,
        parseInt(old_students_count) || 0,
        parseInt(classrooms_count) || 0
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Thêm mới trường học thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi thêm mới trường học:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi thêm mới trường học.'
    });
  }
});

// 3. PUT: Cập nhật thông tin trường học (Chỉ cho phép Admin)
router.put('/:id', async (req, res) => {
  const userRole = req.headers['x-user-role'];
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được phép cập nhật trường học.'
    });
  }

  const { id } = req.params;
  const { name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count } = req.body;

  if (!name || !sales_id) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Vui lòng cung cấp đầy đủ tên trường học và nhân viên Sales phụ trách.'
    });
  }

  try {
    // Kiểm tra trường học có tồn tại hay không
    const existCheck = await query('SELECT id FROM schools WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy trường học cần chỉnh sửa.'
      });
    }

    const result = await query(
      `UPDATE schools
       SET name = $1, sales_id = $2, address = $3, representative = $4,
           new_students_count = $5, old_students_count = $6, classrooms_count = $7
       WHERE id = $8
       RETURNING *`,
      [
        name,
        sales_id,
        address || null,
        representative || null,
        parseInt(new_students_count) || 0,
        parseInt(old_students_count) || 0,
        parseInt(classrooms_count) || 0,
        id
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Cập nhật thông tin trường học thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật trường học:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi cập nhật trường học.'
    });
  }
});

// 4. DELETE: Xóa trường học (Chỉ Admin mới có quyền thực thi)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role']; 
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      data: null,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới được phép xóa trường học.'
    });
  }

  try {
    const existCheck = await query('SELECT id FROM schools WHERE id = $1', [id]);
    if (existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Không tìm thấy trường học cần xóa.'
      });
    }

    await query('DELETE FROM schools WHERE id = $1', [id]);

    res.json({
      success: true,
      data: null,
      message: 'Xóa trường học khỏi hệ thống thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi xóa trường học:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server hoặc xung đột khóa ngoại khi xóa trường học.'
    });
  }
});

export default router;
