# Security Specification: Smart Edu Firestore Security Rules

## 1. Data Invariants
- **Catch-all Default Deny**: Bất kỳ đường dẫn nào không được khai báo rõ ràng đều bị chặn (`read, write: if false`).
- **Identity Integrity**: Người dùng chỉ có thể đọc và cập nhật hồ sơ cá nhân của chính họ (`/users/{userId}`). Trường `id` và `email` là bất biến sau khi khởi tạo, `role` không thể tự nâng cấp thành admin nếu không phải quản trị viên.
- **Admin Privilege**: Quản trị viên hệ thống (email: `thuytrangtonnu@gmail.com` hoặc có tài liệu trong `/admins/{uid}`) có toàn quyền xem và quản lý hệ thống.
- **Question Bank Access**:
  - Xem danh sách câu hỏi: Người dùng đã đăng nhập có thể xem câu hỏi công khai (`status == 'approved'`) hoặc câu hỏi do chính họ tạo (`authorId == request.auth.uid`) hoặc admin.
  - Tạo câu hỏi: Người dùng đã đăng nhập (Giáo viên / Admin) có `authorId == request.auth.uid`.
  - Cập nhật câu hỏi: Chỉ tác giả câu hỏi (`authorId == request.auth.uid`) hoặc admin mới được cập nhật.
  - Xóa câu hỏi: Chỉ tác giả hoặc admin mới được xóa.
- **Path Variable Hardening**: Mọi ID trong path variable ({userId}, {questionId}, {classId}, {scheduleId}, {announcementId}) phải thỏa mãn hàm `isValidId()`: chuỗi ký tự hợp lệ, độ dài <= 128, ký tự chữ và số cùng dấu gạch nối/dưới.
- **Temporal Integrity**: `createdAt` và `updatedAt` luôn được xác thực theo `request.time` khi tạo mới hoặc cập nhật.
- **Immortal Fields**: Các trường nhận dạng tác giả (`authorId`), ID tài liệu (`id`) không thể bị thay đổi khi cập nhật.

## 2. Dirty Dozen Test Payloads (Designed to Fail)
1. **Ghost Field Injection**: Payload chứa `isVerified: true` hoặc `isAdmin: true` gửi vào `/users/{userId}`. (Phải bị chặn bởi `affectedKeys().hasOnly()`).
2. **Identity Spoofing**: Payload tạo câu hỏi tại `/questions/{questionId}` với `authorId: 'other-user'` khác với `request.auth.uid`. (Phải bị chặn bởi kiểm tra `incoming().authorId == request.auth.uid`).
3. **Denial-of-Wallet Long Content**: Payload câu hỏi chứa trường `content` với độ dài > 10,000 ký tự. (Phải bị chặn bởi `incoming().content.size() <= 10000`).
4. **Invalid Path Injection**: Gửi request tới ID chứa ký tự injection như `../secret/doc` hoặc chuỗi 2KB. (Phải bị chặn bởi `isValidId(docId)`).
5. **Unauthorized Question Deletion**: Người dùng B cố gắng xóa câu hỏi của người dùng A. (Phải bị chặn bởi `existing().authorId == request.auth.uid || isAdmin()`).
6. **Unauthenticated Read to Users**: Khách chưa đăng nhập cố gắng đọc danh sách `/users`. (Phải bị chặn bởi `isSignedIn()`).
7. **Role Escalation**: Học sinh/giáo viên thông thường gửi yêu cầu update trường `role: 'admin'` vào `/users/{userId}`. (Phải bị chặn vì `role` chỉ admin mới có thể cập nhật hoặc bị loại khỏi allowlist của user thông thường).
8. **Invalid Enum in Question**: Payload câu hỏi với `difficulty: 'Cực khó'` không nằm trong enum cho phép. (Phải bị chặn bởi `isValidQuestion()`).
9. **Missing Required Fields**: Payload tạo câu hỏi mới thiếu trường `subject` hoặc `type`. (Phải bị chặn bởi `data.keys().hasAll(...)`).
10. **Tampering CreatedAt**: Cố gắng sửa đổi `createdAt` ban đầu của câu hỏi. (Phải bị chặn bởi `incoming().createdAt == existing().createdAt`).
11. **Negative / Invalid Grade Level**: Khối lớp `gradeLevel: 99` hoặc âm. (Phải bị chặn bởi điều kiện `incoming().gradeLevel >= 1 && incoming().gradeLevel <= 12`).
12. **Blanket Query Scraping**: Cố gắng truy vấn toàn bộ câu hỏi nháp `status == 'draft'` của giáo viên khác. (Phải bị chặn bởi quy tắc list bắt buộc kiểm tra `resource.data.authorId == request.auth.uid || resource.data.status == 'approved' || isAdmin()`).
