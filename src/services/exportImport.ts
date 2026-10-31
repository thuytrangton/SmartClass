import { Student } from '../types';

export interface ImportValidationRow {
  rowNumber: number;
  data: Partial<Student>;
  isValid: boolean;
  errors: { column: string; message: string }[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  rows: ImportValidationRow[];
}

export const exportImportService = {
  /**
   * Tạo tệp mẫu CSV cho nhập danh sách học sinh
   */
  getStudentSampleCsv(): string {
    const headers = ['Mã học sinh', 'Họ và tên', 'Ngày sinh (YYYY-MM-DD)', 'Giới tính (Nam/Nữ)', 'Số điện thoại', 'Họ tên phụ huynh', 'SĐT phụ huynh', 'Địa chỉ'];
    const sampleRows = [
      ['HS-10A1-13', 'Hoàng Văn Thái', '2010-05-15', 'Nam', '0912345678', 'Hoàng Văn Bình', '0987654321', '12 Nguyễn Trãi, Hà Đông'],
      ['HS-10A1-14', 'Vũ Mai Phương', '2010-09-20', 'Nữ', '0922334455', 'Nguyễn Thị Hoa', '0933445566', '45 Trần Phú, Hà Đông']
    ];
    return [headers.join(','), ...sampleRows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Tải về file CSV
   */
  downloadCsv(content: string, fileName: string) {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Xuất danh sách học sinh ra CSV
   */
  exportStudentsToCsv(students: Student[], className: string) {
    const headers = ['STT', 'Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Lớp', 'ĐTB', 'Hạnh kiểm', 'Chuyên cần (%)', 'Sao thi đua', 'Phụ huynh', 'SĐT Phụ huynh', 'Địa chỉ'];
    const rows = students.map((s, idx) => [
      idx + 1,
      `"${s.code}"`,
      `"${s.fullName}"`,
      `"${s.dateOfBirth}"`,
      `"${s.gender}"`,
      `"${s.className}"`,
      s.gpa,
      `"${s.conduct}"`,
      s.attendanceRate,
      s.stars,
      `"${s.parentName || ''}"`,
      `"${s.parentPhone || ''}"`,
      `"${s.address || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadCsv(csvContent, `Danh_sach_hoc_sinh_${className}_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Xuất bảng điểm ra CSV
   */
  exportGradesToCsv(grades: any[], className: string, subject: string) {
    const headers = ['STT', 'Họ và tên', 'Môn học', 'TX1', 'TX2', 'TX3', 'GK', 'CK', 'Điểm TB', 'Ghi chú'];
    const rows = grades.map((g, idx) => [
      idx + 1,
      `"${g.studentName}"`,
      `"${g.subject}"`,
      g.tx1 ?? '',
      g.tx2 ?? '',
      g.tx3 ?? '',
      g.gk ?? '',
      g.ck ?? '',
      g.average ?? '',
      `"${g.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadCsv(csvContent, `Bang_diem_${className}_${subject}_${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Parse CSV và validate từng dòng
   */
  validateAndPreviewStudentCsv(csvText: string, defaultClassId: string, defaultClassName: string): ImportPreviewResult {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { totalRows: 0, validRowsCount: 0, invalidRowsCount: 0, rows: [] };
    }

    // skip header line
    const dataLines = lines.slice(1);
    const parsedRows: ImportValidationRow[] = [];

    dataLines.forEach((line, index) => {
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      const errors: { column: string; message: string }[] = [];

      const code = parts[0] || '';
      const fullName = parts[1] || '';
      const dob = parts[2] || '';
      const gender = parts[3] || '';
      const phone = parts[4] || '';
      const parentName = parts[5] || '';
      const parentPhone = parts[6] || '';
      const address = parts[7] || '';

      if (!code) {
        errors.push({ column: 'Mã học sinh', message: 'Mã học sinh không được để trống.' });
      }
      if (!fullName) {
        errors.push({ column: 'Họ và tên', message: 'Họ và tên không được để trống.' });
      } else if (fullName.length < 3) {
        errors.push({ column: 'Họ và tên', message: 'Họ và tên quá ngắn.' });
      }

      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        errors.push({ column: 'Ngày sinh', message: 'Định dạng ngày sinh phải là YYYY-MM-DD.' });
      }

      if (gender !== 'Nam' && gender !== 'Nữ') {
        errors.push({ column: 'Giới tính', message: 'Giới tính phải là "Nam" hoặc "Nữ".' });
      }

      const isValid = errors.length === 0;

      const studentData: Partial<Student> = {
        code,
        fullName,
        dateOfBirth: dob || '2010-01-01',
        gender: (gender === 'Nữ' ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
        phone,
        parentName,
        parentPhone,
        address,
        classId: defaultClassId,
        className: defaultClassName,
        status: 'active',
        gpa: 8.0,
        conduct: 'Tốt',
        attendanceRate: 100,
        stars: 10,
        avatar: `https://images.unsplash.com/photo-${1500000000000 + index * 1000}?w=150&auto=format&fit=crop&q=80`
      };

      parsedRows.push({
        rowNumber: index + 2, // header is row 1
        data: studentData,
        isValid,
        errors
      });
    });

    const validCount = parsedRows.filter((r) => r.isValid).length;
    const invalidCount = parsedRows.filter((r) => !r.isValid).length;

    return {
      totalRows: parsedRows.length,
      validRowsCount: validCount,
      invalidRowsCount: invalidCount,
      rows: parsedRows
    };
  }
};
