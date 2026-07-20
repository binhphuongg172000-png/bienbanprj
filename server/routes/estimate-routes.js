import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. GET: Lấy danh sách bản dự trù (hỗ trợ filter theo school_id, tự động lọc theo sales nếu là user thường)
router.get('/', async (req, res) => {
  try {
    const { school_id } = req.query;
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id']; // user.id từ bảng users

    let whereClause = '';
    let queryParams = [];
    let paramIndex = 1;

    if (userRole !== 'admin' && userId) {
      // Tra cứu sales_id thực tế từ bảng users dựa trên user.id
      const userRes = await query('SELECT sales_id FROM users WHERE id = $1', [userId]);
      const salesId = userRes.rows[0]?.sales_id;

      if (salesId) {
        whereClause = `WHERE s.sales_id = $${paramIndex}`;
        queryParams.push(salesId);
        paramIndex++;
        if (school_id) {
          whereClause += ` AND e.school_id = $${paramIndex}`;
          queryParams.push(school_id);
          paramIndex++;
        }
      } else {
        // User chưa liên kết sales_id: trả rỗng
        return res.json({ success: true, data: [], message: 'Tài khoản chưa được phân công phụ trách trường nào.' });
      }
    } else if (school_id) {
      whereClause = `WHERE e.school_id = $${paramIndex}`;
      queryParams.push(school_id);
      paramIndex++;
    }


    const estimatesResult = await query(
      `SELECT e.*, s.name AS school_name, s.address AS school_address, sa.name AS sales_name 
       FROM estimates e
       JOIN schools s ON e.school_id = s.id
       JOIN sales sa ON s.sales_id = sa.id
       ${whereClause}
       ORDER BY e.created_at DESC`,
      queryParams
    );


    const itemsResult = await query(
      `SELECT ei.*, eq.name AS equipment_name, eq.specifications AS equipment_specifications
       FROM estimate_items ei
       JOIN equipments eq ON ei.equipment_id = eq.id`
    );

    // Ghép các mặt hàng thiết bị vào từng bản dự trù tương ứng
    const data = estimatesResult.rows.map(est => {
      return {
        ...est,
        schoolName: est.school_name,
        schoolAddress: est.school_address,
        salesName: est.sales_name,
        proposedDate: est.proposed_date ? new Date(est.proposed_date).toISOString().split('T')[0] : '',
        totalAmount: parseFloat(est.total_amount),
        items: itemsResult.rows
          .filter(item => item.estimate_id === est.id)
          .map(item => ({
            id: item.id,
            equipmentId: item.equipment_id,
            equipmentName: item.equipment_name,
            equipmentSpecifications: item.equipment_specifications,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price)
          }))
      };
    });

    res.json({
      success: true,
      data,
      message: 'Lấy danh sách bản dự trù thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách dự trù:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi lấy danh sách bản dự trù.'
    });
  }
});


// 2. POST: Lưu một bản dự trù mới (Gồm cả chi tiết danh sách thiết bị - Dùng transaction)
router.post('/', async (req, res) => {
  const { 
    school_id, 
    proposed_date, 
    total_amount, 
    new_students_count, 
    old_students_count, 
    classrooms_count, 
    address,
    items 
  } = req.body;

  if (!school_id || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Thông tin trường học và danh sách thiết bị không được để trống.'
    });
  }

  try {
    // Bắt đầu Transaction để đảm bảo tính toàn vẹn
    await query('BEGIN');

    // Chèn thông tin chung bản dự trù
    const estimateInsertRes = await query(
      `INSERT INTO estimates (
        school_id, proposed_date, total_amount, 
        new_students_count, old_students_count, classrooms_count
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        school_id,
        proposed_date || new Date(),
        total_amount || 0,
        parseInt(new_students_count) || 0,
        parseInt(old_students_count) || 0,
        parseInt(classrooms_count) || 0
      ]
    );

    const newEstimateId = estimateInsertRes.rows[0].id;

    // Cập nhật lại số liệu học sinh, phòng học và địa chỉ bên bảng schools
    await query(
      `UPDATE schools 
       SET new_students_count = $1, old_students_count = $2, classrooms_count = $3, address = $4
       WHERE id = $5`,
      [
        parseInt(new_students_count) || 0,
        parseInt(old_students_count) || 0,
        parseInt(classrooms_count) || 0,
        address || null,
        school_id
      ]
    );

    // Chèn danh sách các thiết bị được lập trong bản dự trù
    for (const item of items) {
      if (!item.equipmentId || !item.quantity || !item.unitPrice) {
        throw new Error('Thông tin thiết bị trong danh sách không đầy đủ hoặc không hợp lệ.');
      }
      await query(
        `INSERT INTO estimate_items (estimate_id, equipment_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [
          newEstimateId,
          item.equipmentId,
          parseFloat(item.quantity),
          parseFloat(item.unitPrice)
        ]
      );
    }

    // Cam kết Transaction thành công
    await query('COMMIT');

    res.status(201).json({
      success: true,
      data: estimateInsertRes.rows[0],
      message: 'Lưu bản dự trù vào cơ sở dữ liệu thành công.'
    });
  } catch (error) {
    // Hoàn tác nếu xảy ra bất kỳ lỗi gì
    await query('ROLLBACK');
    console.error('Lỗi khi lưu bản dự trù:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lưu bản dự trù.'
    });
  }
});

// 3. PUT: Cập nhật thông tin bản dự trù
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { school_id, sales_id, equipmentList, additionalExpenses, budget, note, summary } = req.body;
  const adminMode = req.headers['x-user-role'] === 'admin';

  try {
    await query('BEGIN');

    // Kiểm tra xem bản dự trù có bị khóa không
    const estCheck = await query('SELECT is_locked FROM estimates WHERE id = $1', [id]);
    if (estCheck.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Bản dự trù không tồn tại.' });
    }

    if (estCheck.rows[0].is_locked && !adminMode) {
      await query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bản dự trù đã bị khóa, không thể sửa.' });
    }

    // Cập nhật thông tin cơ bản của bản dự trù
    const updateEstResult = await query(
      `UPDATE estimates 
       SET school_id = $1, sales_id = $2, base_budget = $3, actual_total = $4, difference = $5,
           note = $6, total_students = $7, new_students_count = $8, old_students_count = $9, 
           classrooms_count = $10
       WHERE id = $11 RETURNING *`,
      [
        school_id, sales_id, budget, summary.totalEquipmentCost, summary.difference,
        note, summary.totalStudents, summary.newStudents, summary.oldStudents,
        summary.classrooms, id
      ]
    );

    // Xóa các thiết bị và chi phí phát sinh cũ
    await query('DELETE FROM estimate_items WHERE estimate_id = $1', [id]);
    await query('DELETE FROM estimate_additional_expenses WHERE estimate_id = $1', [id]);

    // Thêm lại thiết bị
    if (equipmentList && equipmentList.length > 0) {
      for (const eq of equipmentList) {
        await query(
          `INSERT INTO estimate_items 
           (estimate_id, equipment_id, quantity, unit_price, is_custom, custom_name, custom_unit) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, eq.id || null, eq.quantity, eq.unitPrice, eq.isCustom || false, eq.isCustom ? eq.name : null, eq.isCustom ? eq.unit : null]
        );
      }
    }

    // Thêm lại chi phí phát sinh
    if (additionalExpenses && additionalExpenses.length > 0) {
      for (const exp of additionalExpenses) {
        await query(
          `INSERT INTO estimate_additional_expenses 
           (estimate_id, expense_name, amount, note) 
           VALUES ($1, $2, $3, $4)`,
          [id, exp.name, exp.amount, exp.note]
        );
      }
    }

    await query('COMMIT');
    res.json({ success: true, data: updateEstResult.rows[0], message: 'Cập nhật thành công.' });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Lỗi khi cập nhật bản dự trù:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// 3.1 PUT: Khóa/Mở khóa bản dự trù
router.put('/:id/lock', async (req, res) => {
  const { id } = req.params;
  const { is_locked } = req.body;
  const adminMode = req.headers['x-user-role'] === 'admin';

  if (!adminMode) {
    return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền khóa/mở khóa.' });
  }

  try {
    const result = await query(
      `UPDATE estimates SET is_locked = $1 WHERE id = $2 RETURNING *`,
      [is_locked, id]
    );
    res.json({ success: true, data: result.rows[0], message: is_locked ? 'Đã khóa bản dự trù.' : 'Đã mở khóa bản dự trù.' });
  } catch (error) {
    console.error('Lỗi khóa dự trù:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
});

// 4. DELETE: Xóa bản dự trù khỏi hệ thống
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const adminMode = req.headers['x-user-role'] === 'admin';
  
  try {
    const estCheck = await query('SELECT is_locked FROM estimates WHERE id = $1', [id]);
    if (estCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản dự trù.' });
    }

    if (estCheck.rows[0].is_locked && !adminMode) {
      return res.status(403).json({ success: false, message: 'Bản dự trù đã bị khóa, không thể xóa.' });
    }

    const result = await query(
      `DELETE FROM estimates WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản dự trù cần xóa.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Xóa bản dự trù khỏi hệ thống thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi xóa bản dự trù:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa bản dự trù.'
    });
  }
});

export default router;
