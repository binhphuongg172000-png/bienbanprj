import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id']; // This is sales_id for User role

    if (userRole === 'admin') {
      const schoolsRes = await query('SELECT id, new_students_count, sales_id FROM schools');
      const eqRes = await query('SELECT COUNT(*) FROM equipments');
      const estCountRes = await query('SELECT school_id, COUNT(*) as count FROM estimates GROUP BY school_id');
      const allEstCountRes = await query('SELECT COUNT(DISTINCT school_id) FROM estimates');
      
      const latestEstRes = await query(`
        SELECT DISTINCT ON (school_id) school_id, total_amount 
        FROM estimates 
        ORDER BY school_id, created_at DESC
      `);

      const recentRes = await query(`
        SELECT e.id, e.total_amount, e.created_at, s.name as school_name, sa.name as sales_name
        FROM estimates e
        JOIN schools s ON e.school_id = s.id
        LEFT JOIN sales sa ON s.sales_id = sa.id
        ORDER BY e.created_at DESC LIMIT 5
      `);

      const salesRes = await query('SELECT id, name FROM sales');

      // Map data helper
      const latestEstimatesMap = new Map();
      latestEstRes.rows.forEach(r => {
        latestEstimatesMap.set(r.school_id, parseFloat(r.total_amount || 0));
      });

      const estCountMap = new Map();
      estCountRes.rows.forEach(r => {
        estCountMap.set(r.school_id, parseInt(r.count || 0));
      });

      // System calculations
      const totalBudget = schoolsRes.rows.reduce((sum, sch) => {
        const students = parseInt(sch.new_students_count) || 0;
        return sum + Math.round((students / 105) * 100000000);
      }, 0);

      const totalCost = Array.from(latestEstimatesMap.values()).reduce((sum, val) => sum + val, 0);

      // Sales statistics breakdown
      const salesStats = salesRes.rows.map(sale => {
        const saleSchools = schoolsRes.rows.filter(s => s.sales_id === sale.id);
        const totalSchools = saleSchools.length;
        
        let saleBudget = 0;
        let saleCost = 0;
        let saleEstimates = 0;

        saleSchools.forEach(sch => {
          const students = parseInt(sch.new_students_count) || 0;
          saleBudget += Math.round((students / 105) * 100000000);
          saleCost += latestEstimatesMap.get(sch.id) || 0;
          if (latestEstimatesMap.has(sch.id)) {
            saleEstimates += 1;
          }
        });

        return {
          salesId: sale.id,
          salesName: sale.name,
          totalSchools,
          totalEstimates: saleEstimates,
          totalBudget: saleBudget,
          totalCost: saleCost,
          remainingBudget: saleBudget - saleCost
        };
      });

      const data = {
        totalSchools: schoolsRes.rows.length,
        totalEquipments: parseInt(eqRes.rows[0].count),
        totalEstimates: parseInt(allEstCountRes.rows[0].count),
        totalCost: totalCost,
        totalBudget: totalBudget,
        budgetDiff: totalBudget - totalCost,
        salesStats,
        recentActivities: recentRes.rows.map(r => ({
          id: r.id,
          action: `Dự trù: ${parseFloat(r.total_amount).toLocaleString('vi-VN')} đ`,
          school: r.school_name,
          time: new Date(r.created_at).toLocaleString('vi-VN'),
          status: r.sales_name || 'Hệ thống'
        }))
      };

      res.json({ success: true, data });
    } else {
      // User (Sales)
      const userRes = await query('SELECT sales_id FROM users WHERE id = $1', [userId]);
      const salesId = userRes.rows[0]?.sales_id;

      let schoolsRes = { rows: [] };
      if (salesId) {
        schoolsRes = await query('SELECT id, name, new_students_count FROM schools WHERE sales_id = $1', [salesId]);
      }
      const schoolIds = schoolsRes.rows.map(s => s.id);

      let totalBudget = 0;
      let totalCost = 0;
      let totalEstimates = 0;
      let recentActivities = [];
      const positiveSchools = [];
      const negativeSchools = [];

      if (schoolIds.length > 0) {
        // Calculate budget
        totalBudget = schoolsRes.rows.reduce((sum, sch) => {
          const students = parseInt(sch.new_students_count) || 0;
          return sum + Math.round((students / 105) * 100000000);
        }, 0);

        // Get latest estimates for spent budget
        const latestEstRes = await query(`
          SELECT DISTINCT ON (school_id) school_id, total_amount 
          FROM estimates 
          WHERE school_id = ANY($1)
          ORDER BY school_id, created_at DESC
        `, [schoolIds]);

        const latestEstimatesMap = new Map();
        latestEstRes.rows.forEach(r => {
          latestEstimatesMap.set(r.school_id, parseFloat(r.total_amount || 0));
        });

        totalCost = Array.from(latestEstimatesMap.values()).reduce((sum, val) => sum + val, 0);


        // Count total estimates created (1 per school, latest)
        const countRes = await query(`
          SELECT COUNT(DISTINCT school_id) FROM estimates WHERE school_id = ANY($1)
        `, [schoolIds]);
        totalEstimates = parseInt(countRes.rows[0].count || 0);

        // Group positive/negative schools
        schoolsRes.rows.forEach(sch => {
          const students = parseInt(sch.new_students_count) || 0;
          const schoolBudget = Math.round((students / 105) * 100000000);
          const schoolSpent = latestEstimatesMap.get(sch.id) || 0;
          const diff = schoolBudget - schoolSpent;

          const schoolItem = {
            id: sch.id,
            name: sch.name,
            budget: schoolBudget,
            spent: schoolSpent,
            diff: diff
          };

          if (diff < 0) {
            negativeSchools.push(schoolItem);
          } else {
            positiveSchools.push(schoolItem);
          }
        });

        // Get recent activities
        const recentRes = await query(`
          SELECT e.id, e.total_amount, e.created_at, s.name as school_name 
          FROM estimates e 
          JOIN schools s ON e.school_id = s.id
          WHERE e.school_id = ANY($1) 
          ORDER BY e.created_at DESC
          LIMIT 5
        `, [schoolIds]);

        recentActivities = recentRes.rows.map(r => ({
          id: r.id,
          action: `Dự trù: ${parseFloat(r.total_amount).toLocaleString('vi-VN')} đ`,
          school: r.school_name,
          time: new Date(r.created_at).toLocaleString('vi-VN'),
          status: 'Hoàn thành'
        }));
      }

      const data = {
        totalSchools: schoolsRes.rows.length,
        totalEstimates: totalEstimates,
        totalCost: totalCost,
        totalBudget: totalBudget,
        budgetDiff: totalBudget - totalCost,
        positiveSchools,
        negativeSchools,
        recentActivities
      };

      res.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error in dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

export default router;
