-- Kích hoạt extension pgcrypto để dùng hàm gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng schools (dùng UNIQUE(name, sales_id) để tránh trùng lặp khi chèn mẫu)
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    sales_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    address VARCHAR(255),
    representative VARCHAR(100),
    new_students_count INTEGER DEFAULT 0,
    old_students_count INTEGER DEFAULT 0,
    classrooms_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, sales_id)
);

-- Bảng equipments (dùng UNIQUE(name) để tránh trùng lặp khi chèn mẫu)
CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL UNIQUE,
    specifications TEXT,
    accessories TEXT,
    unit_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng estimates (bản dự trù thiết bị trường học)
CREATE TABLE IF NOT EXISTS estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    proposed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    new_students_count INTEGER DEFAULT 0,
    old_students_count INTEGER DEFAULT 0,
    classrooms_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng estimate_items (chi tiết thiết bị trong bản dự trù)
CREATE TABLE IF NOT EXISTS estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL
);

-- Chèn dữ liệu mẫu sales (dùng ON CONFLICT(email) DO NOTHING)
INSERT INTO sales (id, name, email, status)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Nguyễn Văn B (Sales)', 'sales.b@erems.com', 'active'),
('22222222-2222-2222-2222-222222222222', 'Trần Thị C (Sales)', 'sales.c@erems.com', 'active')
ON CONFLICT (email) DO NOTHING;

-- Chèn dữ liệu mẫu schools (dùng ON CONFLICT(name, sales_id) DO NOTHING)
INSERT INTO schools (name, sales_id, address, representative, new_students_count, old_students_count, classrooms_count)
VALUES 
('Trường THPT Nguyễn Du', '11111111-1111-1111-1111-111111111111', '123 Đường Lê Lợi, Quận 1, TP. HCM', 'Nguyễn Thị Hoa', 250, 680, 18),
('Trường THCS Lê Lợi', '22222222-2222-2222-2222-222222222222', '456 Đường Nguyễn Huệ, Quận 3, TP. HCM', 'Trần Văn Hùng', 180, 520, 12),
('Trường Tiểu học Kim Đồng', '11111111-1111-1111-1111-111111111111', '789 Đường Điện Biên Phủ, Quận Bình Thạnh, TP. HCM', 'Phạm Minh Trí', 320, 850, 24)
ON CONFLICT (name, sales_id) DO NOTHING;

-- Chèn dữ liệu mẫu equipments (dùng ON CONFLICT(name) DO NOTHING)
INSERT INTO equipments (name, specifications, accessories, unit_price)
VALUES 
('Máy chiếu Epson X41', 'Độ phân giải XGA, độ sáng 3600 lumens, cổng HDMI', 'Dây HDMI, điều khiển từ xa, túi đựng', 12500000.00),
('Laptop Dell Vostro 3510', 'Intel Core i3, RAM 8GB, SSD 256GB, 15.6 inch', 'Adapter sạc, túi đựng laptop', 10800000.00),
('Loa kéo di động Soundmax M-7', 'Công suất 120W, kết nối Bluetooth', '2 micro không dây, dây nguồn, điều khiển từ xa', 3200000.00),
('Micro không dây Shure U830', 'Tần số UHF, khoảng cách thu âm 50m', '2 micro cầm tay, đế thu sóng, dây XLR', 1850000.00)
ON CONFLICT (name) DO NOTHING;
