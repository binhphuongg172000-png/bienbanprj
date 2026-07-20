-- Thêm UNIQUE constraint cho schools nếu chưa có
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_name_sales_id_unique') THEN
    ALTER TABLE schools ADD CONSTRAINT schools_name_sales_id_unique UNIQUE (name, sales_id);
  END IF;
END $$;

-- Thêm UNIQUE constraint cho equipments nếu chưa có
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipments_name_unique') THEN
    ALTER TABLE equipments ADD CONSTRAINT equipments_name_unique UNIQUE (name);
  END IF;
END $$;

-- Seed dữ liệu Sales
INSERT INTO sales (id, name, email, status)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Nguyen Van B (Sales)', 'sales.b@erems.com', 'active'),
('22222222-2222-2222-2222-222222222222', 'Tran Thi C (Sales)', 'sales.c@erems.com', 'active')
ON CONFLICT (email) DO NOTHING;

-- Seed dữ liệu Schools
INSERT INTO schools (name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count)
VALUES 
('Truong THPT Nguyen Du', '11111111-1111-1111-1111-111111111111', '123 Le Loi, Quan 1, TP.HCM', 'Nguyen Thi Hoa', 250, 680, 18),
('Truong THCS Le Loi', '22222222-2222-2222-2222-222222222222', '456 Nguyen Hue, Quan 3, TP.HCM', 'Tran Van Hung', 180, 520, 12),
('Truong Tieu hoc Kim Dong', '11111111-1111-1111-1111-111111111111', '789 Dien Bien Phu, Binh Thanh', 'Pham Minh Tri', 320, 850, 24)
ON CONFLICT (name, sales_id) DO NOTHING;

-- Seed dữ liệu Equipments
INSERT INTO equipments (name, specifications, accessories, unit_price)
VALUES 
('May chieu Epson X41', 'XGA 3600 lumens HDMI', 'Day HDMI, Dieu khien, Tui dung', 12500000.00),
('Laptop Dell Vostro 3510', 'Core i3 8GB SSD 256GB', 'Adapter sac, Tui dung', 10800000.00),
('Loa keo Soundmax M-7', '120W Bluetooth', '2 Micro, Day nguon', 3200000.00),
('Micro khong day Shure U830', 'UHF 50m', '2 Micro cam tay, De thu song', 1850000.00)
ON CONFLICT (name) DO NOTHING;

-- Kiểm tra
SELECT 'schools' as tbl, COUNT(*) FROM schools
UNION ALL
SELECT 'equipments', COUNT(*) FROM equipments
UNION ALL
SELECT 'sales', COUNT(*) FROM sales;
