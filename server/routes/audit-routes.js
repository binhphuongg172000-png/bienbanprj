import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// 1. GET: Lấy danh sách lịch sử thay đổi (Audit Logs)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC
      LIMIT 200
    `);

    // Lấy thông tin name của các bảng để map ID thành Tên
    const sales = await query('SELECT id, name FROM sales');
    const schools = await query(`
      SELECT sch.id, sch.name as school_name, sl.name as sales_name
      FROM schools sch
      LEFT JOIN sales sl ON sch.sales_id = sl.id
    `);
    const equipments = await query('SELECT id, name FROM equipments');
    const estimates = await query(`
      SELECT e.id, sch.name as school_name, sl.name as sales_name
      FROM estimates e 
      LEFT JOIN schools sch ON e.school_id = sch.id
      LEFT JOIN sales sl ON sch.sales_id = sl.id
    `);

    const mappings = {};
    sales.rows.forEach(r => mappings[r.id] = r.name);
    
    schools.rows.forEach(r => {
      if (r.sales_name) {
        mappings[r.id] = r.school_name + ' (Sales: ' + r.sales_name + ')';
      } else {
        mappings[r.id] = r.school_name;
      }
    });

    equipments.rows.forEach(r => mappings[r.id] = r.name);
    estimates.rows.forEach(r => {
      if (r.school_name && r.sales_name) {
        mappings[r.id] = 'Dự trù (' + r.school_name + ' - Sales: ' + r.sales_name + ')';
      } else if (r.school_name) {
        mappings[r.id] = 'Dự trù (' + r.school_name + ')';
      } else {
        mappings[r.id] = 'Dự trù (Không rõ)';
      }
    });

    res.json({
      success: true,
      data: result.rows,
      mappings,
      message: 'Lấy lịch sử thay đổi thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử thay đổi:', error);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Lỗi server khi lấy lịch sử.'
    });
  }
});

// 1.5 GET: Tải file backup toàn bộ log (JSON)
router.get('/backup', async (req, res) => {
  try {
    const result = await query('SELECT * FROM audit_logs ORDER BY created_at ASC');
    
    // Set headers to force download
    res.setHeader('Content-disposition', 'attachment; filename=database_backup_log.json');
    res.setHeader('Content-type', 'application/json');
    
    // Send the JSON data
    res.status(200).send(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Lỗi khi tải file backup log:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải file backup.'
    });
  }
});

// 2. POST: Khôi phục lại bản ghi (Revert)
router.post('/revert/:logId', async (req, res) => {
  const { logId } = req.params;

  try {
    const logCheck = await query('SELECT * FROM audit_logs WHERE id = $1', [logId]);
    if (logCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy log này.' });
    }

    const log = logCheck.rows[0];
    const { table_name, action, old_data, new_data } = log;

    if (action !== 'INSERT' && !old_data) {
      return res.status(400).json({ success: false, message: 'Không có dữ liệu cũ để khôi phục.' });
    }

    // Xóa trường created_at nếu có để tránh lỗi khi chèn ngược (tùy thuộc DB)
    // Nhưng vì ta chèn hết cả old_data, nên nếu không có thay đổi schema thì vẫn ok.
    
    // Disable temporarily trigger to avoid recursion (we don't want revert to trigger an UPDATE log)
    // Actually, letting it log is fine (it's like an Undo action).

    if (action === 'DELETE') {
      const columns = Object.keys(old_data).join(', ');
      const placeholders = Object.keys(old_data).map((_, idx) => `$${idx + 1}`).join(', ');
      const values = Object.values(old_data);

      await query(
        `INSERT INTO ${table_name} (${columns}) VALUES (${placeholders})`,
        values
      );
    } else if (action === 'UPDATE') {
      const updates = Object.keys(old_data).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
      const values = Object.values(old_data);
      const idIdx = Object.keys(old_data).length + 1;

      await query(
        `UPDATE ${table_name} SET ${updates} WHERE id = $${idIdx}`,
        [...values, old_data.id]
      );
    } else if (action === 'INSERT') {
      if (!new_data || !new_data.id) {
         return res.status(400).json({ success: false, message: 'Không có thông tin bản ghi để xóa khôi phục.' });
      }
      await query(`DELETE FROM ${table_name} WHERE id = $1`, [new_data.id]);
    }

    res.json({
      success: true,
      message: 'Khôi phục dữ liệu thành công.'
    });
  } catch (error) {
    console.error('Lỗi khi khôi phục dữ liệu:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi khôi phục.'
    });
  }
});

export default router;
