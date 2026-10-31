import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  Users,
  GraduationCap,
  CalendarCheck,
  BarChart3,
  BookOpen,
  Calendar,
  ShieldAlert,
  Dices,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronsUpDown,
  Search,
  CheckCircle2,
  Clock,
  Star,
  Eye,
  ExternalLink,
  Maximize2,
  Sparkles,
  Award,
  Check,
  PlusCircle,
  FolderPlus,
  Pencil,
  Trash2,
  QrCode,
  Copy,
  X
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { PageHeader, Modal, ConfirmDialog, StatusChip } from '../../components/common/UIComponents';
import { ClassRoom, AttendanceStatus } from '../../types';

export const ClassList: React.FC = () => {
  const { classes, selectedClassId, setSelectedClassId } = useClass();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  // 2 CHÍNH XÁC 2 TAB: 'my-classes' (Lớp của tôi) & 'create-class' (Thêm mới lớp)
  const [mainTab, setMainTab] = useState<'my-classes' | 'create-class'>('my-classes');

  // Search và Filter ở Tab "Lớp của tôi"
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'all' | '10' | '11' | '12'>('all');

  // State "Mở to cửa sổ" (Window Modal lớn hiển thị chi tiết mọi màn hình bên trong lớp)
  const [windowClass, setWindowClass] = useState<ClassRoom | null>(null);
  const [activeWindowSubScreen, setActiveWindowSubScreen] = useState<
    'students' | 'attendance' | 'grades' | 'assignments' | 'schedule' | 'alerts' | 'tools'
  >('students');

  // State chỉnh sửa lớp học (Edit Modal)
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editCapacity, setEditCapacity] = useState(35);

  // State xóa lớp học (Delete confirm)
  const [deletingClass, setDeletingClass] = useState<ClassRoom | null>(null);

  // State Form Thêm mới lớp (Tab 2)
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(10);
  const [roomNumber, setRoomNumber] = useState('Phòng A.302');
  const [teacherName, setTeacherName] = useState('Cô Nguyễn Thị Mai');
  const [maxCapacity, setMaxCapacity] = useState(35);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [selectedBannerGradient, setSelectedBannerGradient] = useState('from-blue-600 to-indigo-700');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Toán học',
    'Vật lý',
    'Hóa học',
    'Ngữ văn',
    'Tiếng Anh'
  ]);

  // State điểm danh nhanh trực tiếp trong màn hình con của lớp
  const [quickAttendanceState, setQuickAttendanceState] = useState<Record<string, AttendanceStatus>>({});

  // Helper chọn màu chấm tròn dựa vào lớp hoặc dotColor
  const getDotBgClass = (cls: ClassRoom) => {
    if (cls.dotColor) {
      if (cls.dotColor.includes('#2563EB') || cls.dotColor.includes('blue')) return 'bg-blue-600';
      if (cls.dotColor.includes('#8B5CF6') || cls.dotColor.includes('#7C3AED') || cls.dotColor.includes('purple')) return 'bg-purple-600';
      if (cls.dotColor.includes('#10B981') || cls.dotColor.includes('emerald') || cls.dotColor.includes('green')) return 'bg-emerald-500';
      if (cls.dotColor.includes('#F59E0B') || cls.dotColor.includes('amber') || cls.dotColor.includes('orange')) return 'bg-amber-500';
    }
    // Fallback based on grade
    if (cls.gradeLevel === 10) return 'bg-blue-600';
    if (cls.gradeLevel === 11) return 'bg-emerald-500';
    return 'bg-amber-500';
  };

  // Helper lấy mã lớp chuẩn format CLS-...
  const getClassCode = (cls: ClassRoom) => {
    if (cls.code) return cls.code;
    return `CLS-${cls.name}-${Math.abs(cls.id.split('').reduce((a, b) => a + b.charCodeAt(0), 100)) % 900 + 100}`;
  };

  // Sao chép mã lớp vào bộ nhớ tạm
  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      success('Đã sao chép mã lớp!', `Mã ${code} đã được lưu vào bộ nhớ tạm.`);
    } catch {
      info('Mã lớp', code);
    }
  };

  // Vào không gian làm việc chính
  const handleEnterWorkspace = (cls: ClassRoom) => {
    setSelectedClassId(cls.id);
    success('Đã chọn lớp!', `Đang chuyển tới Bàn làm việc chính của Lớp ${cls.name}.`);
    navigate('/teacher/dashboard');
  };

  // Mở to cửa sổ
  const handleOpenWindow = (cls: ClassRoom) => {
    setWindowClass(cls);
    setSelectedClassId(cls.id);
  };

  // Mở modal sửa lớp
  const handleOpenEdit = (cls: ClassRoom) => {
    setEditingClass(cls);
    setEditName(cls.name);
    setEditRoom(cls.roomNumber);
    setEditTeacher(cls.homeroomTeacherName);
    setEditCapacity(cls.maxCapacity || 35);
  };

  // Lưu chỉnh sửa lớp
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    if (!editName.trim()) {
      error('Thiếu tên lớp', 'Vui lòng nhập tên lớp học.');
      return;
    }

    db.updateClass(editingClass.id, {
      name: editName.trim(),
      roomNumber: editRoom.trim(),
      homeroomTeacherName: editTeacher.trim(),
      maxCapacity: editCapacity
    });

    success('Cập nhật thành công!', `Đã lưu thay đổi cho Lớp ${editName.trim()}.`);
    setEditingClass(null);
  };

  // Xác nhận xóa lớp
  const handleConfirmDelete = () => {
    if (!deletingClass) return;
    db.deleteClass(deletingClass.id);
    success('Đã xóa lớp học', `Lớp ${deletingClass.name} đã được xóa khỏi hệ thống.`);
    setDeletingClass(null);
  };

  // Xử lý tạo lớp mới
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Thiếu tên lớp', 'Vui lòng nhập tên lớp học (ví dụ: 10A3, 11B2).');
      return;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedCode = `CLS-${name.trim().toUpperCase()}-${randomSuffix}`;

    const newCls = db.addClass({
      name: name.trim(),
      code: generatedCode,
      gradeLevel,
      homeroomTeacherId: 'usr-teacher-01',
      homeroomTeacherName: teacherName.trim(),
      academicYear,
      roomNumber: roomNumber.trim(),
      maxCapacity,
      subjectNames: selectedSubjects,
      bannerGradient: selectedBannerGradient,
      dotColor: gradeLevel === 10 ? '#2563EB' : gradeLevel === 11 ? '#10B981' : '#F59E0B'
    });

    success('Tạo lớp học thành công!', `Đã thêm lớp ${newCls.name} (${generatedCode}) vào hệ thống.`);
    setName('');
    // Chuyển về Tab "Lớp của tôi" và chọn lớp mới
    setMainTab('my-classes');
    setSelectedClassId(newCls.id);
  };

  const filteredClasses = classes.filter((cls) => {
    const matchSearch =
      cls.name.toLowerCase().includes(search.toLowerCase()) ||
      cls.homeroomTeacherName.toLowerCase().includes(search.toLowerCase()) ||
      cls.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      (cls.code && cls.code.toLowerCase().includes(search.toLowerCase()));
    const matchGrade = selectedGrade === 'all' || cls.gradeLevel.toString() === selectedGrade;
    return matchSearch && matchGrade;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Quản lý Lớp học Thông minh"
        subtitle="Quản lý danh sách lớp học, phòng học, giáo viên chủ nhiệm và không gian làm việc chính"
        badge={`${classes.length} Lớp học`}
      />

      {/* 2 TABS CHÍNH RÕ RÀNG: "LỚP CỦA TÔI" & "THÊM MỚI LỚP" */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0 bg-white px-2 pt-2 rounded-t-2xl shadow-xs">
        <button
          type="button"
          onClick={() => setMainTab('my-classes')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all relative ${
            mainTab === 'my-classes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lớp của tôi</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ml-1 ${
              mainTab === 'my-classes'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {classes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('create-class')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all relative ${
            mainTab === 'create-class'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Thêm mới lớp</span>
          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 ml-1">
            Tạo mới
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LỚP CỦA TÔI */}
      {/* ========================================================= */}
      {mainTab === 'my-classes' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          {/* Thanh tìm kiếm & lọc khối */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã lớp (CLS-...), tên lớp, GVCN, phòng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-semibold mr-1">Khối:</span>
              {(['all', '10', '11', '12'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    selectedGrade === grade
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {grade === 'all' ? 'Tất cả' : `K.${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* DANH SÁCH CÁC THẺ LỚP THIẾT KẾ CHUẨN THEO ẢNH CỦA NGƯỜI DÙNG */}
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Không tìm thấy lớp học nào</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Chưa có lớp nào khớp với từ khóa tìm kiếm.
              </p>
              <button
                onClick={() => setMainTab('create-class')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Chuyển sang Tab Thêm mới lớp
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {filteredClasses.map((cls) => {
                const classCode = getClassCode(cls);
                const dotClass = getDotBgClass(cls);
                const isSelected = selectedClassId === cls.id;

                return (
                  <div
                    key={cls.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md p-5 flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-400 ring-2 ring-blue-500/10'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    {/* HÀNG TIÊU ĐỀ: CHẤM MÀU, TÊN LỚP, MÃ QR PILL, NÚT SỬA & XÓA */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        {/* Bên trái: Chấm màu tròn + Tên lớp + Huy hiệu mã lớp kèm nút Copy */}
                        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                          {/* Chấm màu tròn tròn đặc trưng theo ảnh */}
                          <div className={`w-3.5 h-3.5 rounded-full ${dotClass} shrink-0`} />

                          {/* Tên lớp: Lớp 10A1, Lớp 10A2, v.v. */}
                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                            Lớp {cls.name}
                          </h3>

                          {/* Badge mã lớp (icon QR + Text + Icon Copy) */}
                          <div
                            onClick={(e) => handleCopyCode(e, classCode)}
                            title="Nhấn để sao chép mã lớp"
                            className="bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-md px-2 py-0.5 text-xs font-mono text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{classCode}</span>
                            <Copy className="w-3 h-3 text-slate-400 hover:text-slate-700" />
                          </div>
                        </div>

                        {/* Bên phải: Nút Sửa (Bút chì) & Nút Xóa (Thùng rác) */}
                        <div className="flex items-center gap-1 shrink-0 text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cls)}
                            title="Chỉnh sửa thông tin lớp"
                            className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingClass(cls)}
                            title="Xóa lớp học"
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* THÔNG TIN CHI TIẾT (PHÒNG, SĨ SỐ, GVCN) CHUẨN THEO ẢNH */}
                      <div className="mt-2.5 space-y-1 text-xs sm:text-sm text-slate-500">
                        <p className="flex items-center gap-1.5 flex-wrap">
                          <span>
                            Phòng: <strong className="font-bold text-slate-800">{cls.roomNumber}</strong>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span>
                            Sĩ số: <strong className="font-bold text-slate-800">{cls.studentCount} HS</strong>
                          </span>
                          <span className="text-slate-300">·</span>
                        </p>
                        <p>
                          GVCN: <span className="font-medium text-slate-800">{cls.homeroomTeacherName}</span>
                        </p>
                      </div>
                    </div>

                    {/* HÀNG DƯỚI: VÀO KHÔNG GIAN LÀM VIỆC CHÍNH > */}
                    <div className="mt-5 pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleEnterWorkspace(cls)}
                        className="text-blue-600 hover:text-blue-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition-colors group cursor-pointer"
                      >
                        <span>Vào không gian làm việc chính</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: THÊM MỚI LỚP (FORM VIEW HOÀN CHỈNH) */}
      {/* ========================================================= */}
      {mainTab === 'create-class' && (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-7 animate-in fade-in-50 duration-150 space-y-5">
          <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" />
                Khởi tạo Lớp học Mới
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Điền thông tin lớp, phân công giáo viên chủ nhiệm, phòng học và môn học cho năm học 2025 - 2026
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMainTab('my-classes')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>

          <form onSubmit={handleCreateClass} className="space-y-5">
            {/* 1. THÔNG TIN ĐỊNH DANH */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                1. Thông tin định danh lớp học
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên lớp học *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 10A3, 11B2, 12 chuyên Lý..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 font-bold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Tên ngắn gọn hiển thị trên thẻ lớp</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp *</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white font-medium text-slate-800"
                  >
                    <option value={10}>Khối 10 (Lớp 10)</option>
                    <option value={11}>Khối 11 (Lớp 11)</option>
                    <option value={12}>Khối 12 (Lớp 12)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Niên khóa / Năm học</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-800 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 2. PHÂN CÔNG & CƠ SỞ VẬT CHẤT */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                2. Phân công & Cơ sở vật chất
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giáo viên chủ nhiệm *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cô Nguyễn Thị Mai, Thầy Lê Hoàng Long..."
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng học cố định
                  </label>
                  <input
                    type="text"
                    placeholder="VD: A.302, B.201, C.105..."
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sĩ số tối đa (Chỉ tiêu)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 35)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMainTab('my-classes')}
                className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tạo lớp học mới & Lưu vào hệ thống
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL "MỞ TO CỬA SỔ" ĐẦY ĐỦ CÁC MÀN HÌNH BÊN TRONG CỦA LỚP */}
      {/* ========================================================= */}
      {windowClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Window Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${getDotBgClass(windowClass)} shrink-0`} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900">
                      Lớp {windowClass.name}
                    </h2>
                    <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-mono text-xs font-semibold">
                      {getClassCode(windowClass)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      Khối {windowClass.gradeLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phòng: <strong className="text-slate-700">{windowClass.roomNumber}</strong> • GVCN: <strong className="text-slate-700">{windowClass.homeroomTeacherName}</strong> • Sĩ số: <strong className="text-slate-700">{windowClass.studentCount} HS</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleEnterWorkspace(windowClass);
                    setWindowClass(null);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                >
                  <span>Vào bàn làm việc chính</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setWindowClass(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-screen tabs bar */}
            <div className="px-4 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto py-2">
              <button
                onClick={() => setActiveWindowSubScreen('students')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'students'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Học sinh ({db.getStudentsByClass(windowClass.id).length})</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('attendance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'attendance'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Điểm danh nhanh</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('grades')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'grades'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Sổ điểm</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('assignments')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'assignments'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bài tập ({db.getAssignments(windowClass.id).length})</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('schedule')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'schedule'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Thời khóa biểu</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('alerts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'alerts'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Cảnh báo</span>
              </button>

              <button
                onClick={() => setActiveWindowSubScreen('tools')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeWindowSubScreen === 'tools'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Công cụ lớp</span>
              </button>
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* 1. Học sinh */}
              {activeWindowSubScreen === 'students' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Danh sách học sinh lớp {windowClass.name}</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/students');
                      }}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Mở trang quản lý học sinh đầy đủ <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {db.getStudentsByClass(windowClass.id).map((st) => (
                      <div key={st.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <img src={st.avatar} alt={st.fullName} className="w-9 h-9 rounded-full object-cover" />
                          <div>
                            <h5
                              onClick={() => navigate(`/teacher/students/${st.id}`)}
                              className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer text-xs"
                            >
                              {st.fullName}
                            </h5>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {st.code} • ĐTB: <strong className="text-blue-600">{st.gpa}</strong> • Hạnh kiểm: {st.conduct}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px]">
                            <Star className="w-3.5 h-3.5 fill-amber-400" /> {st.stars} sao
                          </span>
                          <button
                            onClick={() => navigate(`/teacher/students/${st.id}`)}
                            className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs"
                          >
                            Hồ sơ 360°
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Điểm danh nhanh */}
              {activeWindowSubScreen === 'attendance' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Điểm danh hôm nay ({new Date().toLocaleDateString('vi-VN')})
                    </span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/attendance');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Mở màn hình Điểm danh chuyên sâu <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {db.getStudentsByClass(windowClass.id).map((st) => {
                      const currentStatus = quickAttendanceState[st.id] || (st.attendanceRate < 90 ? 'late' : 'present');
                      return (
                        <div key={st.id} className="p-3 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{st.fullName}</span>
                          <div className="flex items-center gap-1.5">
                            {(['present', 'late', 'excused', 'unexcused'] as AttendanceStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => {
                                  setQuickAttendanceState((prev) => ({ ...prev, [st.id]: status }));
                                  db.markAttendance({
                                    classId: windowClass.id,
                                    date: new Date().toISOString().split('T')[0],
                                    studentId: st.id,
                                    studentName: st.fullName,
                                    studentCode: st.code,
                                    status,
                                    recordedByTeacherId: 'usr-teacher-01'
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  currentStatus === status
                                    ? status === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : status === 'late'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {status === 'present' ? 'Có mặt' : status === 'late' ? 'Muộn' : status === 'excused' ? 'Có phép' : 'Không phép'}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Sổ điểm */}
              {activeWindowSubScreen === 'grades' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Sổ điểm môn Toán học - Học kỳ 1</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/grades');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Mở toàn bộ sổ điểm <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Học sinh</th>
                          <th className="p-3 text-center">TX1</th>
                          <th className="p-3 text-center">TX2</th>
                          <th className="p-3 text-center">TX3</th>
                          <th className="p-3 text-center">GK (x2)</th>
                          <th className="p-3 text-center">ĐTB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {db.getStudentsByClass(windowClass.id).slice(0, 8).map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{st.fullName}</td>
                            <td className="p-3 text-center font-mono">8.5</td>
                            <td className="p-3 text-center font-mono">9.0</td>
                            <td className="p-3 text-center font-mono">8.0</td>
                            <td className="p-3 text-center font-mono font-bold text-blue-700">8.8</td>
                            <td className="p-3 text-center font-bold text-emerald-700">8.6</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Bài tập */}
              {activeWindowSubScreen === 'assignments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Danh sách bài tập</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/assignments');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Quản lý bài tập & chấm bài <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {db.getAssignments(windowClass.id).map((a) => (
                      <div key={a.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <h6 className="font-bold text-slate-900">{a.title}</h6>
                          <p className="text-[11px] text-slate-500">
                            Môn: {a.subject} • Hạn nộp: {new Date(a.dueDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {a.submissionCount || 0}/{windowClass.studentCount} đã nộp
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Thời khóa biểu */}
              {activeWindowSubScreen === 'schedule' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Thời khóa biểu trong tuần</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/schedule');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Xem lịch học đầy đủ <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {db.getSchedules(windowClass.id).slice(0, 6).map((sch) => (
                      <div key={sch.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-blue-700">{sch.subject}</span>
                          <span className="text-[10px] text-slate-500 font-medium">Thứ {sch.dayOfWeek}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Tiết {sch.period}: {sch.startTime} - {sch.endTime}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Phòng {sch.room}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Cảnh báo */}
              {activeWindowSubScreen === 'alerts' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Cảnh báo thông minh</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/alerts');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Mở trung tâm cảnh báo <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {db.getAlerts().filter((a) => a.classId === windowClass.id).map((alt) => (
                      <div
                        key={alt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          alt.severity === 'critical' ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div>
                          <h6 className="font-bold">{alt.title}</h6>
                          <p className="text-[11px] opacity-80 mt-0.5">{alt.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedClassId(windowClass.id);
                            navigate('/teacher/alerts');
                          }}
                          className="px-3 py-1 bg-white rounded-lg text-xs font-bold shadow-xs shrink-0"
                        >
                          Xử lý ngay →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Công cụ lớp */}
              {activeWindowSubScreen === 'tools' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Công cụ phòng học tương tác</span>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/tools');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      Mở toàn màn hình <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/tools?tab=wheel');
                      }}
                      className="p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold text-center border border-purple-200 transition-colors"
                    >
                      Vòng quay may mắn
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/tools?tab=picker');
                      }}
                      className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold text-center border border-blue-200 transition-colors"
                    >
                      Gọi ngẫu nhiên
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/tools?tab=groups');
                      }}
                      className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold text-center border border-emerald-200 transition-colors"
                    >
                      Chia nhóm học tập
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClassId(windowClass.id);
                        navigate('/teacher/tools?tab=timer');
                      }}
                      className="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold text-center border border-amber-200 transition-colors"
                    >
                      Đồng hồ đếm ngược
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL CHỈNH SỬA LỚP HỌC */}
      {/* ========================================================= */}
      {editingClass && (
        <Modal
          isOpen={!!editingClass}
          onClose={() => setEditingClass(null)}
          title={`Chỉnh sửa Lớp ${editingClass.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp học *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phòng học *</label>
              <input
                type="text"
                required
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giáo viên chủ nhiệm *</label>
              <input
                type="text"
                required
                value={editTeacher}
                onChange={(e) => setEditTeacher(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sĩ số tối đa</label>
              <input
                type="number"
                min={10}
                max={60}
                value={editCapacity}
                onChange={(e) => setEditCapacity(parseInt(e.target.value) || 35)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* DIALOG XÁC NHẬN XÓA LỚP */}
      {/* ========================================================= */}
      {deletingClass && (
        <ConfirmDialog
          isOpen={!!deletingClass}
          title={`Xác nhận xóa Lớp ${deletingClass.name}?`}
          message={`Bạn có chắc chắn muốn xóa Lớp ${deletingClass.name} (Mã: ${getClassCode(deletingClass)})? Dữ liệu lớp học sẽ được xóa khỏi hệ thống.`}
          confirmText="Xóa lớp học"
          isDanger={true}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingClass(null)}
        />
      )}
    </div>
  );
};
