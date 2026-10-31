import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  BookOpen,
  ShieldAlert,
  Sparkles,
  Dices,
  Clock,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';
import { db } from '../../services/db';
import { StatCard, PageHeader, StatusChip } from '../../components/common/UIComponents';

export const TeacherDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedClass, selectedClassId } = useClass();
  const navigate = useNavigate();

  const students = db.getStudentsByClass(selectedClassId);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = db.getAttendanceByClassAndDate(selectedClassId, todayStr);
  const assignments = db.getAssignments(selectedClassId);
  const alerts = db.getAlerts().filter((a) => a.classId === selectedClassId && a.status !== 'resolved');
  const schedules = db.getSchedules(selectedClassId);
  const auditLogs = db.getAuditLogs().slice(0, 5);

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'unexcused' || a.status === 'excused').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;

  // Grade distribution data for chart
  const gradeDistribution = [
    { name: 'Xuất sắc (≥9)', count: students.filter((s) => s.gpa >= 9).length, color: '#2563EB' },
    { name: 'Giỏi (8 - 8.9)', count: students.filter((s) => s.gpa >= 8 && s.gpa < 9).length, color: '#3B82F6' },
    { name: 'Khá (6.5 - 7.9)', count: students.filter((s) => s.gpa >= 6.5 && s.gpa < 8).length, color: '#60A5FA' },
    { name: 'Trung bình (<6.5)', count: students.filter((s) => s.gpa < 6.5).length, color: '#F59E0B' }
  ];

  // Attendance summary chart
  const attendanceChartData = [
    { name: 'Có mặt', value: presentCount || students.length - 2, color: '#10B981' },
    { name: 'Đi muộn', value: lateCount || 1, color: '#F59E0B' },
    { name: 'Vắng', value: absentCount || 1, color: '#EF4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header (Đã bỏ nút Điểm danh hôm nay lặp lại với thẻ bên dưới) */}
      <PageHeader
        title={`Bàn làm việc Giáo viên - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle={`Chào mừng ${currentUser?.name || 'Cô Trần Thị Mai'}, chúc cô một ngày dạy học tràn đầy năng lượng!`}
        badge={`Học kỳ 1 • 2025-2026`}
      />

      {/* 4 Stat Cards (Mỗi tính năng chỉ giữ 1 thẻ duy nhất) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sĩ số lớp"
          value={`${students.length} học sinh`}
          icon={Users}
          color="blue"
          subtitle={`Phòng: ${selectedClass?.roomNumber || '201'}`}
          onClick={() => navigate('/teacher/students')}
        />
        <StatCard
          title="Điểm danh hôm nay"
          value={`${presentCount}/${students.length}`}
          icon={CalendarCheck}
          color="emerald"
          subtitle={`Có mặt: ${presentCount} • Vắng: ${absentCount} • Muộn: ${lateCount}`}
          onClick={() => navigate('/teacher/attendance')}
        />
        <StatCard
          title="Bài tập đang giao"
          value={assignments.length}
          icon={BookOpen}
          color="purple"
          subtitle="2 bài sắp đến hạn nộp"
          onClick={() => navigate('/teacher/assignments')}
        />
        <StatCard
          title="Cảnh báo cần xử lý"
          value={alerts.length}
          icon={ShieldAlert}
          color={alerts.length > 0 ? 'rose' : 'emerald'}
          subtitle={alerts.length > 0 ? `${alerts[0]?.title}` : 'Không có cảnh báo'}
          onClick={() => navigate('/teacher/alerts')}
        />
      </div>

      {/* Main Grid: Charts & Overview (Đã xóa Bộ công cụ hỗ trợ lớp học trực quan và các khối tính năng lặp lại) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Academic & Attendance Charts */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic GPA Distribution */}
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-100">Phổ điểm học lực lớp {selectedClass?.name}</h4>
                <p className="text-[11px] text-slate-400">Dựa trên kết quả ĐTB môn học kỳ 1</p>
              </div>
              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-0.5 rounded-md">
                ĐTB: 8.35
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val ?? 0} học sinh`, 'Số lượng']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, fontSize: 12, color: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance Pie Chart */}
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-sm text-slate-100">Tỷ lệ chuyên cần hôm nay</h4>
                <p className="text-[11px] text-slate-400">Ngày {new Date().toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-md">
                Đạt 95.5%
              </span>
            </div>
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: 12, fontSize: 12, color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Có mặt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Đi muộn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Vắng
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Recent Activity Timeline */}
        <div className="lg:col-span-4">
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xs h-full">
            <h4 className="font-bold text-sm text-slate-100 mb-4">Hoạt động lớp gần đây</h4>
            <div className="space-y-3.5">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div>
                  <div>
                    <p className="font-semibold text-slate-200">{log.action}</p>
                    <p className="text-[11px] text-slate-400">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
