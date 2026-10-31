import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileQuestion,
  LogOut,
  Calendar,
  Save,
  Users,
  Search,
  Sparkles
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { AttendanceStatus } from '../../types';
import { PageHeader } from '../../components/common/UIComponents';

export const AttendanceManager: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { currentUser } = useAuth();
  const { success, info } = useToast();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});

  const students = db.getStudentsByClass(selectedClassId);

  // Load existing attendance for selected class & date
  useEffect(() => {
    const existing = db.getAttendanceByClassAndDate(selectedClassId, date);
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};

    students.forEach((st) => {
      const rec = existing.find((e) => e.studentId === st.id);
      if (rec) {
        map[st.id] = { status: rec.status, note: rec.note || '' };
      } else {
        // default to present if not marked yet
        map[st.id] = { status: 'present', note: '' };
      }
    });

    setAttendanceMap(map);
  }, [selectedClassId, date, students.length]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note
      }
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; note: string }> = {};
    students.forEach((s) => {
      updated[s.id] = { status: 'present', note: '' };
    });
    setAttendanceMap(updated);
    success('Đã chọn tất cả Có mặt!', `Áp dụng cho ${students.length} học sinh.`);
  };

  const handleSaveAttendance = () => {
    students.forEach((st) => {
      const data = attendanceMap[st.id] || { status: 'present', note: '' };
      db.markAttendance({
        classId: selectedClassId,
        date,
        studentId: st.id,
        studentName: st.fullName,
        studentCode: st.code,
        status: data.status,
        note: data.note,
        recordedByTeacherId: currentUser?.id || 'usr-teacher-01'
      });
    });

    // Check if there are any unexcused absences and trigger smart alert
    const unexcusedStudents = students.filter((st) => attendanceMap[st.id]?.status === 'unexcused');
    if (unexcusedStudents.length > 0) {
      unexcusedStudents.forEach((st) => {
        db.addAlert({
          title: 'Học sinh vắng không phép',
          studentId: st.id,
          studentName: st.fullName,
          classId: selectedClassId,
          className: selectedClass?.name || '10A1',
          type: 'attendance',
          severity: 'critical',
          description: `${st.fullName} vắng học không phép ngày ${date}.`,
          suggestedAction: `Gọi điện liên hệ ngay với phụ huynh ${st.parentName || ''} (${st.parentPhone || ''}).`
        });
      });
      info('Hệ thống đã tự động tạo cảnh báo!', 'Đã tạo cảnh báo vắng không phép cho các học sinh liên quan.');
    }

    success('Lưu điểm danh thành công!', `Dữ liệu điểm danh ngày ${date} của lớp ${selectedClass?.name} đã được cập nhật.`);
  };

  // Status counts
  const counts = {
    present: Object.values(attendanceMap).filter((v) => v.status === 'present').length,
    late: Object.values(attendanceMap).filter((v) => v.status === 'late').length,
    excused: Object.values(attendanceMap).filter((v) => v.status === 'excused').length,
    unexcused: Object.values(attendanceMap).filter((v) => v.status === 'unexcused').length,
    early_leave: Object.values(attendanceMap).filter((v) => v.status === 'early_leave').length
  };

  const filteredStudents = students.filter(
    (s) => s.fullName.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Điểm danh Thông minh - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle={`Quản lý điểm danh ngày ${new Date(date).toLocaleDateString('vi-VN')} • Tối ưu thao tác nhanh trên cả điện thoại và máy tính`}
      >
        <button
          onClick={handleMarkAllPresent}
          className="px-3.5 py-2 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Tất cả có mặt
        </button>
        <button
          onClick={handleSaveAttendance}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Lưu điểm danh
        </button>
      </PageHeader>

      {/* Date Picker & Search Controls */}
      <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-slate-300">Ngày điểm danh:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-700 bg-[#0b1324] text-slate-100 outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm nhanh học sinh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-xl border border-slate-700 bg-[#0b1324] text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Counters Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-2xl text-center">
          <span className="font-extrabold text-lg text-emerald-300 block">{counts.present}</span>
          <span className="text-emerald-400 font-semibold text-[11px]">Có mặt</span>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/50 p-3 rounded-2xl text-center">
          <span className="font-extrabold text-lg text-amber-300 block">{counts.late}</span>
          <span className="text-amber-400 font-semibold text-[11px]">Đi muộn</span>
        </div>
        <div className="bg-cyan-950/40 border border-cyan-800/50 p-3 rounded-2xl text-center">
          <span className="font-extrabold text-lg text-cyan-300 block">{counts.excused}</span>
          <span className="text-cyan-400 font-semibold text-[11px]">Có phép</span>
        </div>
        <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-2xl text-center">
          <span className="font-extrabold text-lg text-rose-300 block">{counts.unexcused}</span>
          <span className="text-rose-400 font-semibold text-[11px]">Không phép</span>
        </div>
        <div className="bg-purple-950/40 border border-purple-800/50 p-3 rounded-2xl text-center col-span-2 sm:col-span-1">
          <span className="font-extrabold text-lg text-purple-300 block">{counts.early_leave}</span>
          <span className="text-purple-400 font-semibold text-[11px]">Về sớm</span>
        </div>
      </div>

      {/* Attendance List (Không làm hiệu ứng mờ khi rê chuột vào, giữ nguyên bình thường) */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-semibold">
          <span>Danh sách điểm danh ({filteredStudents.length} học sinh)</span>
          <span className="text-cyan-400">Nhấn nút trạng thái để thay đổi</span>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredStudents.map((st, idx) => {
            const current = attendanceMap[st.id] || { status: 'present', note: '' };

            return (
              <div
                key={st.id}
                className="p-4 bg-[#0f172a] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Student Info */}
                <div className="flex items-center gap-3 min-w-[220px]">
                  <span className="w-6 text-center font-bold text-slate-400 text-xs">{idx + 1}</span>
                  <img
                    src={st.avatar}
                    alt={st.fullName}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                  />
                  <div>
                    <h5 className="font-bold text-sm text-slate-100">{st.fullName}</h5>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {st.code} • SĐT PH: {st.parentPhone || 'Chưa có'}
                    </p>
                  </div>
                </div>

                {/* Middle: 5 Status Buttons (Không hiệu ứng mờ khi rê chuột) */}
                <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center">
                  <button
                    type="button"
                    onClick={() => setStatus(st.id, 'present')}
                    className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      current.status === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Có mặt
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus(st.id, 'late')}
                    className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      current.status === 'late'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Đi muộn
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus(st.id, 'excused')}
                    className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      current.status === 'excused'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Có phép
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus(st.id, 'unexcused')}
                    className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      current.status === 'unexcused'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Không phép
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus(st.id, 'early_leave')}
                    className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      current.status === 'early_leave'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    Về sớm
                  </button>
                </div>

                {/* Right: Reason/Note field */}
                <div className="w-full md:w-56 shrink-0">
                  <input
                    type="text"
                    placeholder="Ghi chú (lý do)..."
                    value={current.note}
                    onChange={(e) => setNote(st.id, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-700 outline-none focus:border-cyan-500 bg-[#0b1324] text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
