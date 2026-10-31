import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Award,
  Star,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Phone,
  MapPin,
  Mail
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { Student } from '../../types';
import { exportImportService, ImportPreviewResult } from '../../services/exportImport';
import { PageHeader, Modal, ConfirmDialog } from '../../components/common/UIComponents';

export const StudentList: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterConduct, setFilterConduct] = useState('all');
  const [filterGender, setFilterGender] = useState('all');

  // Open / Close state for each student's inner summary
  const [openStudentIds, setOpenStudentIds] = useState<Record<string, boolean>>({});

  const toggleStudentOpen = (id: string) => {
    setOpenStudentIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleExpandAll = () => {
    const updated: Record<string, boolean> = {};
    students.forEach((s) => {
      updated[s.id] = true;
    });
    setOpenStudentIds(updated);
  };

  const handleCollapseAll = () => {
    setOpenStudentIds({});
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [selectedStudentForAward, setSelectedStudentForAward] = useState<Student | null>(null);
  const [awardPoints, setAwardPoints] = useState(5);
  const [awardCategory, setAwardCategory] = useState('Hăng hái phát biểu');
  const [awardNote, setAwardNote] = useState('');

  // Delete confirm state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // New student form state
  const [newStudent, setNewStudent] = useState({
    code: '',
    fullName: '',
    dateOfBirth: '2010-05-15',
    gender: 'Nam' as 'Nam' | 'Nữ',
    phone: '',
    parentName: '',
    parentPhone: '',
    address: 'Hà Đông, Hà Nội'
  });

  // Import state
  const [importCsvText, setImportCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);

  const students = db.getStudentsByClass(selectedClassId);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.parentName && s.parentName.toLowerCase().includes(search.toLowerCase()));

    const matchConduct = filterConduct === 'all' || s.conduct === filterConduct;
    const matchGender = filterGender === 'all' || s.gender === filterGender;

    return matchSearch && matchConduct && matchGender;
  });

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.fullName || !newStudent.code) {
      error('Thiếu thông tin', 'Vui lòng nhập họ tên và mã học sinh.');
      return;
    }

    db.addStudent({
      code: newStudent.code,
      fullName: newStudent.fullName,
      dateOfBirth: newStudent.dateOfBirth,
      gender: newStudent.gender,
      classId: selectedClassId,
      className: selectedClass?.name || '10A1',
      phone: newStudent.phone,
      parentName: newStudent.parentName,
      parentPhone: newStudent.parentPhone,
      address: newStudent.address,
      status: 'active',
      gpa: 8.0,
      conduct: 'Tốt',
      attendanceRate: 100,
      stars: 10,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
    });

    success('Thêm học sinh thành công!', `Đã thêm ${newStudent.fullName} vào lớp.`);
    setIsAddModalOpen(false);
    setNewStudent({
      code: '',
      fullName: '',
      dateOfBirth: '2010-05-15',
      gender: 'Nam',
      phone: '',
      parentName: '',
      parentPhone: '',
      address: 'Hà Đông, Hà Nội'
    });
  };

  const handleAwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForAward) return;

    db.addBehavior({
      studentId: selectedStudentForAward.id,
      studentName: selectedStudentForAward.fullName,
      classId: selectedClassId,
      type: awardPoints >= 0 ? 'positive' : 'negative',
      points: awardPoints,
      category: awardCategory,
      note: awardNote || 'Ghi nhận trong giờ học',
      teacherName: selectedClass?.homeroomTeacherName || 'Cô Trần Thị Mai'
    });

    success(
      awardPoints >= 0 ? `Đã cộng ${awardPoints} sao!` : `Đã trừ ${Math.abs(awardPoints)} sao`,
      `Ghi nhận cho học sinh ${selectedStudentForAward.fullName}.`
    );
    setIsAwardModalOpen(false);
    setAwardNote('');
  };

  const handleDeleteConfirm = () => {
    if (studentToDelete) {
      db.deleteStudent(studentToDelete.id);
      success('Đã xóa học sinh', `Đã xóa ${studentToDelete.fullName} khỏi danh sách lớp.`);
      setStudentToDelete(null);
    }
  };

  const handleExportCsv = () => {
    exportImportService.exportStudentsToCsv(filteredStudents, selectedClass?.name || '10A1');
    success('Xuất file thành công', `Đã xuất ${filteredStudents.length} học sinh ra CSV.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setImportCsvText(text);
        const preview = exportImportService.validateAndPreviewStudentCsv(
          text,
          selectedClassId,
          selectedClass?.name || '10A1'
        );
        setImportPreview(preview);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.validRowsCount === 0) {
      error('Không thể nhập', 'Không có dòng dữ liệu hợp lệ nào.');
      return;
    }

    const validRows = importPreview.rows.filter((r) => r.isValid);
    validRows.forEach((r) => {
      db.addStudent(r.data as Omit<Student, 'id'>);
    });

    success('Nhập dữ liệu thành công!', `Đã nhập thành công ${validRows.length} học sinh vào lớp.`);
    setIsImportModalOpen(false);
    setImportCsvText('');
    setImportPreview(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Danh sách Học sinh - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle={`Quản lý hồ sơ 360°, kết quả học tập và thông tin liên lạc của ${students.length} học sinh`}
      >
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Xuất CSV
        </button>
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Nhập Excel/CSV
        </button>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          Thêm học sinh
        </button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã HS, phụ huynh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterConduct}
            onChange={(e) => setFilterConduct(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium outline-none"
          >
            <option value="all">Tất cả hạnh kiểm</option>
            <option value="Tốt">Hạnh kiểm Tốt</option>
            <option value="Khá">Hạnh kiểm Khá</option>
          </select>

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium outline-none"
          >
            <option value="all">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-8 text-center"></th>
                <th className="py-3.5 px-4">Học sinh</th>
                <th className="py-3.5 px-3">Mã HS</th>
                <th className="py-3.5 px-3">Ngày sinh</th>
                <th className="py-3.5 px-3">Giới tính</th>
                <th className="py-3.5 px-3 text-center">ĐTB</th>
                <th className="py-3.5 px-3 text-center">Hạnh kiểm</th>
                <th className="py-3.5 px-3 text-center">Chuyên cần</th>
                <th className="py-3.5 px-3 text-center">Sao thi đua</th>
                <th className="py-3.5 px-4">Phụ huynh</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isOpen = !!openStudentIds[st.id];

                  return (
                    <React.Fragment key={st.id}>
                      <tr className={`transition-colors ${isOpen ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleStudentOpen(st.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title={isOpen ? 'Click để đóng thông tin' : 'Click để mở thông tin'}
                          >
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => toggleStudentOpen(st.id)}
                          >
                            <img
                              src={st.avatar}
                              alt={st.fullName}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                            />
                            <div>
                              <p className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer">
                                {st.fullName}
                              </p>
                              <p className="text-[11px] text-slate-400">{st.address}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-600">{st.code}</td>
                        <td className="py-3 px-3">{new Date(st.dateOfBirth).toLocaleDateString('vi-VN')}</td>
                        <td className="py-3 px-3">{st.gender}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            {st.gpa}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                              st.conduct === 'Tốt'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {st.conduct}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-700">{st.attendanceRate}%</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {st.stars}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{st.parentName || 'Chưa cập nhật'}</p>
                          <p className="text-[11px] text-slate-400">{st.parentPhone || ''}</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/teacher/students/${st.id}`)}
                              title="Hồ sơ 360°"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudentForAward(st);
                                setIsAwardModalOpen(true);
                              }}
                              title="Cộng / Trừ sao thi đua"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setStudentToDelete(st)}
                              title="Xóa học sinh"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* MÀN HÌNH BÊN TRONG: MỞ RA KHI CLICK 1, ĐÓNG LẠI KHI CLICK 2 */}
                      {isOpen && (
                        <tr className="bg-slate-50/80 animate-in fade-in duration-150">
                          <td colSpan={11} className="p-4 border-b border-slate-200">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-800 text-xs">
                                    Thông tin nhanh: {st.fullName} ({st.code})
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                    Đang học
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleStudentOpen(st.id)}
                                  className="text-xs font-bold text-slate-400 hover:text-rose-600"
                                >
                                  ✕ Đóng màn hình này
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Liên hệ học sinh
                                  </span>
                                  <p className="flex items-center gap-1.5 text-slate-700">
                                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{st.phone || 'Chưa có SĐT'}</span>
                                  </p>
                                  <p className="flex items-center gap-1.5 text-slate-700">
                                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                                    <span className="truncate">{st.address}</span>
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Phụ huynh & Giám hộ
                                  </span>
                                  <p className="font-bold text-slate-800">{st.parentName || 'Chưa cập nhật'}</p>
                                  <p className="flex items-center gap-1.5 text-slate-700">
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{st.parentPhone || 'Chưa có SĐT phụ huynh'}</span>
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Kết quả rèn luyện
                                  </span>
                                  <p className="text-slate-700">
                                    Điểm TB: <strong className="text-blue-600">{st.gpa}</strong> • Hạnh kiểm: <strong>{st.conduct}</strong>
                                  </p>
                                  <p className="text-slate-700">
                                    Chuyên cần: <strong>{st.attendanceRate}%</strong> • Sao thi đua: <strong className="text-amber-600">{st.stars} ⭐</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudentForAward(st);
                                    setIsAwardModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-xs flex items-center gap-1 border border-amber-200"
                                >
                                  <Award className="w-3.5 h-3.5 text-amber-600" /> Tặng sao thi đua
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/students/${st.id}`)}
                                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-xs"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Mở Hồ sơ 360° đầy đủ
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm học sinh */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm học sinh mới vào lớp"
        subtitle={`Lớp hiện tại: ${selectedClass?.name}`}
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mã học sinh *</label>
              <input
                type="text"
                required
                placeholder="HS-10A1-13"
                value={newStudent.code}
                onChange={(e) => setNewStudent({ ...newStudent, code: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={newStudent.fullName}
                onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={newStudent.dateOfBirth}
                onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giới tính</label>
              <select
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as 'Nam' | 'Nữ' })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên Phụ huynh</label>
              <input
                type="text"
                placeholder="Nguyễn Văn B"
                value={newStudent.parentName}
                onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SĐT Phụ huynh</label>
              <input
                type="text"
                placeholder="0912 345 678"
                value={newStudent.parentPhone}
                onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
            <input
              type="text"
              value={newStudent.address}
              onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs"
            >
              Lưu học sinh
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cộng/Trừ sao thi đua */}
      <Modal
        isOpen={isAwardModalOpen}
        onClose={() => setIsAwardModalOpen(false)}
        title="Ghi nhận Hành vi & Điểm thi đua"
        subtitle={`Học sinh: ${selectedStudentForAward?.fullName}`}
      >
        <form onSubmit={handleAwardSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Loại ghi nhận</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAwardPoints(5);
                  setAwardCategory('Hăng hái phát biểu');
                }}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  awardPoints > 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                + Khen thưởng (+Sao)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAwardPoints(-3);
                  setAwardCategory('Nói chuyện riêng');
                }}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  awardPoints < 0 ? 'bg-rose-50 border-rose-500 text-rose-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                - Nhắc nhở (-Sao)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số sao thay đổi</label>
              <input
                type="number"
                value={awardPoints}
                onChange={(e) => setAwardPoints(parseInt(e.target.value) || 0)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng mục</label>
              <select
                value={awardCategory}
                onChange={(e) => setAwardCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
              >
                <option value="Hăng hái phát biểu">Hăng hái phát biểu</option>
                <option value="Làm bài tập xuất sắc">Làm bài tập xuất sắc</option>
                <option value="Giúp đỡ bạn bè">Giúp đỡ bạn bè</option>
                <option value="Nói chuyện riêng">Nói chuyện riêng</option>
                <option value="Đi học muộn">Đi học muộn</option>
                <option value="Không làm bài tập">Không làm bài tập</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú chi tiết</label>
            <textarea
              rows={2}
              value={awardNote}
              onChange={(e) => setAwardNote(e.target.value)}
              placeholder="VD: Xung phong giải bài tập khó trên bảng..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAwardModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs"
            >
              Cập nhật thi đua
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nhập CSV với Validation & Preview theo tiêu chuẩn */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập danh sách học sinh từ Excel / CSV"
        subtitle="Hệ thống tự động kiểm tra định dạng và báo lỗi theo dòng/cột trước khi nhập"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <span>Tải tệp mẫu chuẩn để điền dữ liệu đúng định dạng:</span>
            <button
              onClick={() => {
                const sample = exportImportService.getStudentSampleCsv();
                exportImportService.downloadCsv(sample, 'Mau_nhap_hoc_sinh_SmartClass.csv');
              }}
              className="font-bold underline text-blue-700 hover:text-blue-900"
            >
              Tải file mẫu CSV
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn tệp CSV từ máy tính:
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
          </div>

          {importPreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-slate-600">Tổng số dòng: {importPreview.totalRows}</span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hợp lệ: {importPreview.validRowsCount}
                </span>
                {importPreview.invalidRowsCount > 0 && (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Có lỗi: {importPreview.invalidRowsCount} dòng
                  </span>
                )}
              </div>

              {/* Preview Table */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-[10px] uppercase text-slate-600 font-bold">
                    <tr>
                      <th className="p-2">Dòng</th>
                      <th className="p-2">Trạng thái</th>
                      <th className="p-2">Mã HS</th>
                      <th className="p-2">Họ tên</th>
                      <th className="p-2">Ngày sinh</th>
                      <th className="p-2">Chi tiết lỗi (nếu có)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.rows.map((row) => (
                      <tr key={row.rowNumber} className={row.isValid ? 'bg-white' : 'bg-rose-50/50'}>
                        <td className="p-2 font-mono font-medium">{row.rowNumber}</td>
                        <td className="p-2">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-bold">Hợp lệ</span>
                          ) : (
                            <span className="text-rose-600 font-bold">Lỗi</span>
                          )}
                        </td>
                        <td className="p-2">{row.data.code}</td>
                        <td className="p-2 font-medium">{row.data.fullName}</td>
                        <td className="p-2">{row.data.dateOfBirth}</td>
                        <td className="p-2 text-rose-600 font-medium">
                          {row.errors.map((e) => `${e.column}: ${e.message}`).join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Đóng
            </button>
            <button
              disabled={!importPreview || importPreview.validRowsCount === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-xs font-bold text-white rounded-xl shadow-xs transition-colors"
            >
              Xác nhận nhập ({importPreview?.validRowsCount || 0} học sinh)
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa học sinh"
        message={`Bạn có chắc chắn muốn xóa học sinh ${studentToDelete?.fullName} (${studentToDelete?.code}) khỏi hệ thống? Dữ liệu điểm danh và bảng điểm liên quan sẽ bị xóa.`}
        isDanger={true}
        confirmText="Xác nhận xóa"
      />
    </div>
  );
};
