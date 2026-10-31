# SMART CLASS - HỆ THỐNG QUẢN LÝ LỚP HỌC THÔNG MINH

Hệ thống EdTech quản lý lớp học thông minh đa phân quyền (Admin, Giáo viên, Học sinh, Phụ huynh) với hồ sơ 360°, điểm danh thông minh, sổ điểm điện tử, bài tập & thi trắc nghiệm trực tuyến, bộ công cụ lớp học trực quan và AI Trợ giảng.

---

## I. TÀI KHOẢN TRẢI NGHIỆM DEMO (1-CHẠM)

Hệ thống tích hợp nút chuyển đổi nhanh vai trò ngay tại trang Đăng nhập và thanh Header:

| Vai trò | Họ tên | Email | Mô tả |
| :--- | :--- | :--- | :--- |
| **Giáo viên (Mặc định)** | Cô Trần Thị Mai | `mai.tran@smartclass.edu.vn` | GVCN Lớp 10A1, quản lý điểm, điểm danh, AI trợ giảng, công cụ lớp |
| **Học sinh** | Nguyễn Minh Quân | `quan.nm@student.smartclass.edu.vn` | Học sinh lớp 10A1, làm bài tập, thi trắc nghiệm, xem bảng điểm |
| **Phụ huynh** | Nguyễn Văn Hùng | `hung.nguyen@parent.smartclass.edu.vn` | Bố em Quân, theo dõi chuyên cần, nhận xét giáo viên, nhắn tin GVCN |
| **Admin** | Nguyễn Văn Quản Trị | `admin@smartclass.edu.vn` | Quản trị trường, niên khóa, người dùng, audit log, sao lưu JSON |

*Mật khẩu thử nghiệm:* Bất kỳ (đã cấu hình chế độ đăng nhập tự động 1 chạm).

---

## II. CÔNG NGHỆ SỬ DỤNG

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, React Router v7, Lucide Icons, Recharts, Canvas-Confetti
* **Architecture:** Repository / Service Abstraction Layer (`src/services/db.ts`) tách biệt hoàn toàn giữa UI và Data Layer
* **Database Target:** PostgreSQL / Supabase với RLS (Row-Level Security) & Multi-School Isolation
* **AI Engine:** Module AI Trợ giảng tích hợp sẵn (`src/services/aiService.ts`) hỗ trợ tạo đề trắc nghiệm, soạn giáo án chuẩn CV 5512 và gợi ý nhận xét học bạ

---

## III. CẤU TRÚC THƯ MỤC

```text
/
├── schema.sql                     # PostgreSQL Schema chuẩn, RLS, Indexes, Foreign Keys
├── README.md                      # Tài liệu kỹ thuật và hướng dẫn vận hành
├── src/
│   ├── types/                     # TypeScript Domain Interfaces
│   ├── data/                      # Dữ liệu mẫu khởi tạo (2 lớp 10A1, 10A2; 25 học sinh)
│   ├── services/
│   │   ├── db.ts                  # Reactive Database Service (in-memory + session sync)
│   │   ├── aiService.ts           # AI Trợ giảng (Soạn đề, giáo án CV 5512, nhận xét)
│   │   └── exportImport.ts        # Xử lý nhập/xuất CSV, validate theo dòng/cột
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Authentication & Role Switcher
│   │   ├── ClassContext.tsx       # Lưu giữ context lớp, môn học, học kỳ toàn cục
│   │   └── ToastContext.tsx       # Thông báo Toast hệ thống
│   ├── components/
│   │   ├── common/                # UI Primitives: StatCard, Modal, ConfirmDialog, StatusChip
│   │   └── layout/                # AppLayout, Sidebar theo vai trò, Header với Search toàn cục
│   ├── routes/
│   │   ├── AppRoutes.tsx          # Định tuyến phân quyền toàn bộ hệ thống
│   │   └── RoleGuard.tsx          # Bảo vệ Route Guard & 403 Forbidden
│   └── pages/
│       ├── auth/                  # Login, Forbidden (403), NotFound (404)
│       ├── teacher/               # Dashboard, 360 Profile, Attendance, Gradebook, Tools, AI...
│       ├── student/               # Student Portal, Homework, Quiz Take, Personal Grades...
│       ├── parent/                # Parent Portal, Child Progress, Chat with Teacher...
│       └── admin/                 # Admin Dashboard, User RBAC, Audit Logs, Backup/Restore...
```

---

## IV. CÁC TÍNH NĂNG NỔI BẬT

1. **Hồ sơ học sinh 360°:**
   * Tích hợp toàn diện: Điểm số các môn, biểu đồ tiến bộ, tỷ lệ chuyên cần, nhật ký hành vi rèn luyện, liên lạc phụ huynh và ghi chú sức khỏe.
2. **Điểm danh thông minh siêu tốc:**
   * 5 trạng thái chuẩn: Có mặt, Đi muộn, Có phép, Không phép, Về sớm.
   * Nút "Tất cả có mặt" 1 chạm và tự động kích hoạt cảnh báo thông minh nếu vắng không phép.
   * Giao diện tối ưu thao tác cảm ứng lớn trên điện thoại.
3. **Sổ điểm điện tử & Lịch sử chỉnh sửa điểm (Grade Audit):**
   * Nhập điểm trực tiếp trên bảng, tự động tính điểm trung bình môn theo hệ số (TX hệ số 1, GK hệ số 2, CK hệ số 3).
   * Mọi thao tác sửa điểm bắt buộc nhập lý do và được lưu vĩnh viễn vào nhật ký kiểm toán.
4. **Bộ công cụ lớp học trực quan (Classroom Tools):**
   * **Vòng quay may mắn (Wheel):** Vẽ bằng Canvas mượt mà, hiệu ứng pháo hoa Confetti, tự động nạp danh sách học sinh của lớp.
   * **Gọi tên ngẫu nhiên:** Hiệu ứng lật thẻ, tùy chọn loại trừ các bạn đã được gọi.
   * **Chia nhóm tự động:** Tùy chọn chia 2-6 nhóm, phân bổ đồng đều thành viên.
   * **Đồng hồ đếm ngược:** Hiển thị số lớn, nút chọn nhanh 1p, 3p, 5p, 10p, 15p và chuông báo hoàn thành.
5. **AI Trợ giảng:**
   * Soạn đề kiểm tra trắc nghiệm 15 phút theo chủ đề và độ khó.
   * Thiết kế Kế hoạch bài dạy (Giáo án) theo chuẩn Công văn 5512.
   * Tự động sinh nhận xét học bạ dựa trên GPA, chuyên cần và hạnh kiểm. Giáo viên toàn quyền duyệt và sửa trước khi lưu.
6. **Quy trình Cảnh báo thông minh 4 bước:**
   * `Mới ghi nhận` → `Đã xem` → `Đang xử lý` → `Đã giải quyết` (kèm ghi chú xử lý).

---

## V. HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy dev server (Port 3000)
npm run dev

# 3. Kiểm tra build sản phẩm
npm run build
```

---

## VI. TRIỂN KHAI VỚI SUPABASE / POSTGRESQL

1. Tạo project mới trên [Supabase](https://supabase.com).
2. Vào mục **SQL Editor**, dán toàn bộ nội dung trong tệp `schema.sql` và bấm **Run**.
3. Cấu hình biến môi trường trong `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Thay thế adapter trong `src/services/db.ts` sang Supabase client SDK (interface đã được thiết kế sẵn sàng tương thích).
