# BẢNG QUẢN LÝ TÍNH NĂNG (PROJECT BACKLOG)
**Dự án**: Hệ thống Quản lý Thiết bị & Xuất Biên bản Trường học (EREMS)

---

## 1. Trạng thái Tổng quan Dự án

| Trạng thái | Định nghĩa | Số lượng |
| :--- | :--- | :--- |
| `🔴 TODO` | Chưa thực hiện | 7 |
| `🟡 WIP` | Đang thực hiện | 0 |
| `🟢 DONE` | Đã hoàn thành & duyệt | 0 |

---

## 2. Chi tiết Backlog Tính năng (Phase 1 & Phase 2)

### 🔴 F-01: Xác thực & Phân quyền người dùng (Auth & RBAC)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Thiết lập cơ chế đăng ký, đăng nhập tài khoản và phân quyền Admin/User bằng JWT.
- **User Story**:
  - *Là một Người dùng*, tôi muốn có thể đăng nhập bằng Username và Password để truy cập các tính năng phù hợp với quyền hạn của mình.
  - *Là một Quản trị viên (Admin)*, tôi muốn có tài khoản đặc quyền để được toàn quyền Thêm, Sửa, Xóa các danh mục dữ liệu chính (Trường học, Sales, Thiết bị).
  - *Là một User thường (Sales/Thủ kho)*, tôi muốn hệ thống chặn quyền ghi (không thể tạo/sửa/xóa) đối với các danh mục Trường, Sales, Thiết bị để tránh sai sót dữ liệu.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Bảng `users` (đọc dữ liệu để so khớp thông tin khi login, ghi dữ liệu mới khi admin đăng ký tài khoản).
- **Ràng buộc bảo mật (Security Rules)**:
  - Mật khẩu phải băm bằng `bcrypt` (salt rounds = 10+) trước khi lưu.
  - Token JWT phải có hạn sử dụng (ví dụ: 1h-24h) và được ký bằng khóa bí mật lấy từ biến môi trường `JWT_SECRET`.
  - Chỉ Admin mới có quyền gọi API tạo tài khoản mới.

---

### 🔴 F-02: Quản lý Trường học (School Management)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Quản lý danh sách các trường học nhận thiết bị.
- **User Story**:
  - *Là một Admin*, tôi muốn Thêm mới một trường học với các thông tin: Mã trường, Tên trường, Địa chỉ, Số điện thoại, và Người đại diện, để làm dữ liệu nền tảng cho việc lập biên bản.
  - *Là một Admin*, tôi muốn Chỉnh sửa thông tin trường học hoặc Xóa trường học (chỉ khi trường học chưa liên kết với biên bản/dự trù nào) để giữ dữ liệu chính xác.
  - *Là một User thường*, tôi muốn Tìm kiếm và Xem thông tin trường học để chọn nhanh trường học khi lập biên bản hoặc bản dự trù.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Bảng `schools` (Ghi khi Admin tạo/sửa/xóa trường học; Đọc khi lập dự trù, bàn giao hoặc hiển thị danh sách).
  - **Kiểm tra ràng buộc**: Cần kiểm tra xem `school_id` có tồn tại trong `estimate_records` hay `handover_records` hay không trước khi thực hiện thao tác Xóa (mã ngoại RESTRICT/NO ACTION).
- **Ràng buộc bảo mật (Security Rules)**:
  - Các API POST, PUT, DELETE yêu cầu phải có Token JWT hợp lệ và quyền `role = 'admin'`. Nếu không có, trả về lỗi `403 Forbidden`.
  - Validate dữ liệu đầu vào (không để trống mã trường, tên trường) trước khi lưu để tránh SQL Injection và lưu dữ liệu rác.

---

### 🔴 F-03: Quản lý Nhân viên Sales (Sales Management)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Quản lý danh sách nhân viên Sales phụ trách các địa bàn.
- **User Story**:
  - *Là một Admin*, tôi muốn Thêm/Sửa/Xóa thông tin nhân viên Sales (Tên, Email, Điện thoại, Trạng thái hoạt động) để giao phó người phụ trách các dự án dự trù thiết bị.
  - *Là một User thường*, tôi muốn xem danh sách nhân viên Sales đang hoạt động để chọn người phụ trách tương ứng khi lên dự thảo mua sắm thiết bị.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Bảng `sales` (Ghi khi Admin tạo/sửa/xóa nhân viên; Đọc khi hiển thị danh sách hoặc chọn trong Bản dự trù).
  - **Kiểm tra ràng buộc**: Kiểm tra sự tồn tại của `sales_id` trong `estimate_records` trước khi Xóa nhân viên để tránh mồ côi khóa ngoại.
- **Ràng buộc bảo mật (Security Rules)**:
  - Các API POST, PUT, DELETE bảo vệ bằng JWT và chỉ cho phép `role = 'admin'` thực thi.
  - Email của sales phải đúng định dạng và là duy nhất (UNIQUE) trên hệ thống.

---

### 🔴 F-04: Quản lý Danh mục Thiết bị (Equipment Catalog)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Quản lý danh sách thiết bị có trong kho hoặc danh mục kinh doanh.
- **User Story**:
  - *Là một Admin*, tôi muốn Thêm thiết bị mới (Mã thiết bị, Tên, Thông số kỹ thuật, Xuất xứ, Đơn giá tiêu chuẩn, Số lượng tồn kho) để đồng bộ danh mục kinh doanh.
  - *Là một Admin*, tôi muốn cập nhật thông số hoặc đơn giá thiết bị khi có thay đổi từ nhà cung cấp.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Bảng `equipments` (Ghi khi Admin tạo/sửa/xóa thiết bị; Đọc khi hiển thị danh mục thiết bị).
- **Ràng buộc bảo mật (Security Rules)**:
  - Các API thay đổi dữ liệu thiết bị (POST, PUT, DELETE) chỉ dành riêng cho tài khoản Admin.
  - Ràng buộc giá trị số lượng tồn kho `stock_quantity >= 0` và đơn giá `unit_price >= 0` để tránh dữ liệu lỗi.

---

### 🔴 F-05: Lập & Lưu trữ Bản dự trù Thiết bị (Equipment Estimate & Budgeting)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Cho phép chọn trường học, nhân viên kinh doanh phụ trách, chọn thiết bị và số lượng dự kiến để sinh ra file dự trù, đồng thời lưu trữ vào database.
- **User Story**:
  - *Là một User/Admin*, tôi muốn tạo một Bản dự trù bằng cách: chọn một trường học, chọn nhân viên Sales phụ trách, sau đó chọn hàng loạt thiết bị từ danh mục và điền số lượng mong muốn.
  - *Là một User/Admin*, tôi muốn hệ thống tự động tính toán tổng tiền tạm tính dựa trên đơn giá và số lượng, sau đó bấm "Lưu" để hệ thống lưu trữ toàn bộ dữ liệu này vào database.
  - *Là một User/Admin*, tôi muốn truy cập lại danh sách các bản dự trù đã lập để xem chi tiết hoặc xuất ra định dạng PDF đẹp mắt để gửi cho khách hàng.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Ghi thông tin cha vào `estimate_records`, ghi danh sách thiết bị con vào `estimate_items`.
  - **Đọc liên kết**: Đọc từ bảng `schools`, `sales`, và `equipments` để hiển thị đầy đủ thông tin mô tả trên giao diện và PDF.
  - **Cập nhật**: Tính toán lại `total_amount` trong `estimate_records` dựa trên tổng tiền của các `estimate_items` liên quan.
- **Ràng buộc bảo mật (Security Rules)**:
  - Người dùng phải đăng nhập (yêu cầu JWT hợp lệ) mới được tạo hoặc xem bản dự trù.
  - Đơn giá ghi nhận trong `estimate_items` phải được chốt và sao chép cứng từ bảng `equipments` tại thời điểm tạo dự trù để tránh việc thay đổi đơn giá gốc làm lệch số liệu lịch sử.

---

### 🔴 F-06: Lập & In Biên bản Bàn giao (Equipment Handover Record)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Tạo biên bản bàn giao thiết bị thực tế cho trường học và hỗ trợ xuất PDF/In ấn.
- **User Story**:
  - *Là một User/Admin*, tôi muốn lập biên bản bàn giao bao gồm: chọn trường nhận, nhập thông tin người giao, người nhận, ngày bàn giao, và chọn các thiết bị kèm trạng thái vật lý lúc bàn giao (Ví dụ: "Mới 100%", "Có trầy xước nhẹ").
  - *Là một User/Admin*, tôi muốn bấm in trực tiếp biên bản bàn giao với mẫu chuẩn ký tên (Bên giao ký, Bên nhận ký) để hoàn tất thủ tục bàn giao thực địa.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc/Ghi**: Ghi thông tin biên bản vào `handover_records` và ghi chi tiết danh sách thiết bị bàn giao vào `handover_items`.
  - **Đọc liên kết**: Đọc từ các bảng `schools` và `equipments` để phục vụ hiển thị chi tiết biên bản bàn giao.
  - **Cập nhật Kho**: Giảm số lượng thiết bị tương ứng trong `equipments.stock_quantity` dựa trên số lượng thiết bị thực tế bàn giao (nếu hệ thống quản lý theo kho thực tế).
- **Ràng buộc bảo mật (Security Rules)**:
  - Yêu cầu đăng nhập để tạo biên bản. Trường `created_by` phải tự động gán bằng ID của User lấy từ JWT Payload để truy vết trách nhiệm.

---

### 🔴 F-07: Thống kê & Báo cáo (Analytics & Dashboard)
- **Trạng thái**: `🔴 TODO`
- **Mô tả**: Biểu đồ trực quan hóa dữ liệu cấp phát và kinh phí dự trù.
- **User Story**:
  - *Là một Admin*, tôi muốn xem biểu đồ tổng kinh phí dự trù theo từng tháng/năm học và bảng xếp hạng những trường nhận được nhiều thiết bị nhất để có kế hoạch phân bổ hợp lý trong tương lai.
  - *Là một Admin*, tôi muốn xem báo cáo hiệu quả doanh số dự trù của từng nhân viên Sales.
- **Tác động Database (Cấu trúc lưu trữ)**:
  - **Đọc**: Truy vấn gom nhóm (GROUP BY) và tính tổng (SUM) trên các bảng `estimate_records`, `estimate_items`, `handover_items` để vẽ biểu đồ và xuất báo cáo. Không ghi dữ liệu mới.
- **Ràng buộc bảo mật (Security Rules)**:
  - API báo cáo và thống kê chỉ mở quyền truy cập đối với `role = 'admin'`. Người dùng thường không thể truy cập các API này.
