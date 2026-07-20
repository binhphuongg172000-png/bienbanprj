import pool, { query } from './db.js';

const seed = async () => {
  try {
    console.log('Bắt đầu chèn dữ liệu mẫu biên bản dự trù...');
    
    // 1. Lấy danh sách trường học
    const schools = await query('SELECT id, name, new_students_count, old_students_count, classrooms_count FROM schools');
    if (schools.rows.length === 0) {
      console.log('Không tìm thấy trường học nào. Vui lòng đảm bảo database đã chạy migrate_unique.sql.');
      process.exit(0);
    }
    
    // 2. Lấy danh sách thiết bị
    const equipments = await query('SELECT id, name, unit_price FROM equipments');
    if (equipments.rows.length === 0) {
      console.log('Không tìm thấy thiết bị nào. Vui lòng đảm bảo database đã chạy migrate_unique.sql.');
      process.exit(0);
    }

    console.log(`Tìm thấy ${schools.rows.length} trường học và ${equipments.rows.length} thiết bị.`);

    // Xóa các bản ghi dự trù cũ để tránh trùng lặp
    await query('DELETE FROM estimate_items');
    await query('DELETE FROM estimates');
    console.log('Đã dọn dẹp các bản dự trù cũ.');

    // 3. Tạo các bản dự trù mẫu cho từng trường học
    for (let i = 0; i < schools.rows.length; i++) {
      const school = schools.rows[i];
      const students = parseInt(school.new_students_count) || 0;
      const schoolBudget = Math.round((students / 105) * 100000000);
      
      console.log(`Trường: ${school.name}, Học sinh mới: ${students}, Ngân sách cấp: ${schoolBudget} đ`);

      if (i === 0) {
        // Trường thứ 1: Đầu tư Dương (Trong hạn mức)
        // Tổng tiền dự trù nhỏ hơn ngân sách được cấp
        const eq = equipments.rows[0]; // Epson projector
        const qty = 2;
        const price = parseFloat(eq.unit_price);
        const totalAmount = qty * price; // 25,000,000 đ
        
        const estRes = await query(`
          INSERT INTO estimates (school_id, total_amount, new_students_count, old_students_count, classrooms_count, proposed_date)
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING id
        `, [school.id, totalAmount, school.new_students_count, school.old_students_count, school.classrooms_count]);
        
        const estId = estRes.rows[0].id;
        await query(`
          INSERT INTO estimate_items (estimate_id, equipment_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [estId, eq.id, qty, price]);
        
        console.log(`- Tạo dự trù DƯƠNG cho ${school.name}: ${totalAmount.toLocaleString('vi-VN')} đ (Ngân sách: ${schoolBudget.toLocaleString('vi-VN')} đ)`);
      } 
      else if (i === 1) {
        // Trường thứ 2: Đầu tư Âm (Vượt hạn mức)
        // Sử dụng số lượng lớn thiết bị để vượt quá ngân sách được cấp
        const eq = equipments.rows[1]; // Laptop Dell (10,800,000 đ)
        const price = parseFloat(eq.unit_price);
        const qty = Math.ceil(schoolBudget / price) + 1; // Chắc chắn vượt
        const totalAmount = qty * price;
        
        const estRes = await query(`
          INSERT INTO estimates (school_id, total_amount, new_students_count, old_students_count, classrooms_count, proposed_date)
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING id
        `, [school.id, totalAmount, school.new_students_count, school.old_students_count, school.classrooms_count]);
        
        const estId = estRes.rows[0].id;
        await query(`
          INSERT INTO estimate_items (estimate_id, equipment_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [estId, eq.id, qty, price]);
        
        console.log(`- Tạo dự trù ÂM cho ${school.name}: ${totalAmount.toLocaleString('vi-VN')} đ (Ngân sách: ${schoolBudget.toLocaleString('vi-VN')} đ)`);
      }
      else {
        // Trường thứ 3: Tạo nhiều phiên bản (Để test lịch sử và lấy bản ghi mới nhất)
        // Bản ghi 1 (Cũ, Vượt hạn mức)
        const eq = equipments.rows[0];
        const price = parseFloat(eq.unit_price);
        const qty1 = Math.ceil(schoolBudget / price) + 2;
        const totalAmount1 = qty1 * price;
        
        const estRes1 = await query(`
          INSERT INTO estimates (school_id, total_amount, new_students_count, old_students_count, classrooms_count, proposed_date, created_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - 1, NOW() - INTERVAL '1 day') RETURNING id
        `, [school.id, totalAmount1, school.new_students_count, school.old_students_count, school.classrooms_count]);
        
        await query(`
          INSERT INTO estimate_items (estimate_id, equipment_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [estRes1.rows[0].id, eq.id, qty1, price]);

        // Bản ghi 2 (Mới nhất, Trong hạn mức)
        const qty2 = 1; // 12,500,000 đ
        const totalAmount2 = qty2 * price;
        
        const estRes2 = await query(`
          INSERT INTO estimates (school_id, total_amount, new_students_count, old_students_count, classrooms_count, proposed_date, created_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, NOW()) RETURNING id
        `, [school.id, totalAmount2, school.new_students_count, school.old_students_count, school.classrooms_count]);
        
        await query(`
          INSERT INTO estimate_items (estimate_id, equipment_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
        `, [estRes2.rows[0].id, eq.id, qty2, price]);

        console.log(`- Tạo 2 dự trù cho ${school.name}. Bản mới nhất trong hạn mức: ${totalAmount2.toLocaleString('vi-VN')} đ`);
      }
    }

    console.log('Đã chèn thành công dữ liệu mẫu biên bản dự trù!');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi chèn dữ liệu mẫu:', err);
    process.exit(1);
  }
};

seed();
