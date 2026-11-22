# OmniClass — AI-Powered Class Management System (SmartClass 4.0)

Hệ thống Quản lý Lớp học Thông minh giao diện Cyberpunk HUD (`OmniClass`), tích hợp đầy đủ nghiệp vụ cho Giáo viên, Học sinh, Phụ huynh và Quản trị viên (Admin), lưu trữ dữ liệu đồng bộ thời gian thực qua Firebase Firestore & Authentication.

## 1. Kiến trúc & Công nghệ
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide React + React Router.
- **Design System (`src/components/cyber/CyberUI.tsx` & `src/index.css`)**:
  - Bảng màu Cyberpunk HUD chuẩn: Nền chính `#03060D`, Sidebar `#04070E`, Header `#050811`, Card `#090D18`, Hover `#101827`, Cyan `#00E5F0`, Border `#164452`, Magenta `#FF0066`, Green `#18D9A0`, Yellow `#F5E900`, Purple `#A45CFF`, Blue `#367CFF`, Text chính `#F4F6FB`, Text phụ `#96A3B8`.
  - Kích thước bố cục: Header cao `70px`, Sidebar rộng `308px` (Desktop), Content padding `30px`, Card grid gap `20px`, nền lưới kỹ thuật `32px`.
  - Bộ component tái sử dụng: `CyberPanel`, `CyberButton`, `CyberBadge`, `CyberStatCard`, `QuickActionCard`, `SectionHeader`, `Breadcrumb`, `ClassCard`, `SmartAlertPanel`, `CyberInput`, `CyberSelect`, `CyberTextarea`, `CyberModal`, `CyberTabs`, `LoadingSkeleton`, `CyberEmptyState`.
- **Dữ liệu thật & Đồng bộ**:
  - Kết nối trực tiếp với `db` (`src/services/db.ts`) và đồng bộ Cloud Firestore (`src/firebase.ts`).
  - Các chỉ số KPI trên Dashboard (Tổng học sinh, Có mặt hôm nay, Bài tập chờ chấm, Cảnh báo học tập) và danh sách lớp học/cảnh báo tự động lấy từ dữ liệu hệ thống hiện hữu và có fallback an toàn theo đúng mẫu tham chiếu khi lớp chưa phát sinh bản ghi trong ngày.

## 2. Hướng dẫn chạy & Build
```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (port 3000)
npm run dev

# Kiểm tra TypeScript / Lint
npm run lint

# Build bản Production
npm run build
```
