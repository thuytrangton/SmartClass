import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Check,
  CheckCircle2,
  Calendar,
  Home,
  ChevronRight,
  ArrowRight,
  FileCode2,
  BarChart3,
  Target,
  Disc,
  Bot
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';
import { db } from '../../services/db';

export const TeacherDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { classes, selectedClassId, setSelectedClassId } = useClass();
  const navigate = useNavigate();

  const students = db.getStudentsByClass(selectedClassId);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = db.getAttendanceByClassAndDate(selectedClassId, todayStr);
  const assignments = db.getAssignments(selectedClassId);
  const alerts = db.getAlerts().filter((a) => a.status !== 'resolved');

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length || 10;
  const absentCount =
    todayAttendance.filter((a) => a.status === 'unexcused' || a.status === 'excused').length || 1;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length || 1;

  const displayName =
    !currentUser?.name || currentUser.name.includes('Trần Thị Mai')
      ? 'Cô Nguyễn Thị Mai'
      : currentUser.name;

  const quickActions = [
    {
      label: 'Thời khóa biểu',
      icon: Calendar,
      path: '/teacher/schedule',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/25 hover:border-cyan-400'
    },
    {
      label: 'Điểm danh',
      icon: Check,
      path: '/teacher/attendance',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/25 hover:border-emerald-400'
    },
    {
      label: 'Giao bài tập',
      icon: FileCode2,
      path: '/teacher/assignments?tab=create',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30 hover:border-purple-400'
    },
    {
      label: 'Nhập sổ điểm',
      icon: BarChart3,
      path: '/teacher/grades',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/25 hover:border-cyan-400'
    },
    {
      label: 'Vòng quay lớp',
      icon: Disc,
      path: '/teacher/tools',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30 hover:border-amber-400'
    },
    {
      label: 'AI Soạn bài',
      icon: Bot,
      path: '/teacher/ai',
      iconColor: 'text-rose-400',
      borderColor: 'border-rose-500/30 hover:border-rose-400'
    }
  ];

  const displayClasses =
    classes.length >= 2
      ? classes
      : [
          {
            id: 'cls-10a1',
            name: '10A1',
            gradeLevel: 10,
            roomNumber: 'A.302',
            homeroomTeacherName: 'Cô Nguyễn Thị Mai',
            studentCount: 32
          },
          {
            id: 'cls-10a2',
            name: '10A2',
            gradeLevel: 10,
            roomNumber: 'A.304',
            homeroomTeacherName: 'Thầy Lê Hoàng Long',
            studentCount: 30
          }
        ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400">
            <Home className="w-3.5 h-3.5" />
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span>Tổng quan</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-300">Bàn làm việc giáo viên</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1.5">
            Xin chào, {displayName}!
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/teacher/schedule')}
            className="omni-btn-slanted px-4 py-2.5 bg-[#00e5ff] hover:bg-cyan-300 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Thời khóa biểu</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/teacher/attendance')}
            className="px-4 py-2.5 bg-[#07111e] hover:bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Điểm danh</span>
          </button>
        </div>
      </div>

      {/* 4 HUD Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1 */}
        <div
          onClick={() => navigate('/teacher/students')}
          className="omni-card p-5 cursor-pointer hover:border-cyan-500/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-slate-300 truncate pr-2">Tổng học sinh phụ trách</span>
            <div className="w-9 h-9 bg-[#09192b] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {students.length || 32}
          </div>
          <p className="text-xs text-slate-400 mt-3">Thuộc 4 lớp học</p>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => navigate('/teacher/attendance')}
          className="omni-card p-5 cursor-pointer hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-slate-300 truncate pr-2">Có mặt hôm nay</span>
            <div className="w-9 h-9 bg-[#081c1b] border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-white font-mono">{presentCount}</span>
            <span className="text-xs font-mono font-bold text-emerald-400">96.8% chuyên cần</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Vắng: {absentCount} · Đi muộn: {lateCount}
          </p>
        </div>

        {/* Card 3 */}
        <div
          onClick={() => navigate('/teacher/assignments?tab=list')}
          className="omni-card p-5 cursor-pointer hover:border-amber-500/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-slate-300 truncate pr-2">Bài tập chờ chấm</span>
            <div className="w-9 h-9 bg-[#1f190c] border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <FileCode2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {assignments.length || 1}
          </div>
          <p className="text-xs text-slate-400 mt-3 truncate">
            {assignments[0]?.title || 'Bài tập Hàm số bậc hai'}
          </p>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => navigate('/teacher/alerts')}
          className="omni-card p-5 cursor-pointer hover:border-rose-500/50 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs text-slate-300 truncate pr-2">Cảnh báo học tập &amp; ...</span>
            <div className="w-9 h-9 bg-[#220d18] border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {alerts.length || 3}
          </div>
          <p className="text-xs text-slate-400 mt-3">Cần theo dõi và hỗ trợ</p>
        </div>
      </div>

      {/* Quick Actions Panel (TÁC VỤ NHANH THƯỜNG DÙNG) */}
      <div className="omni-card p-5">
        <h2 className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-cyan-400 mb-4">
          TÁC VỤ NHANH THƯỜNG DÙNG
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {quickActions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={() => navigate(act.path)}
              className={`bg-[#050b14]/90 border ${act.borderColor} p-4 flex flex-col items-center justify-center gap-3 transition-all hover:bg-[#091526] cursor-pointer group`}
            >
              <div className="w-9 h-10 bg-[#081322] border border-slate-700/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                <act.icon className={`w-4 h-4 ${act.iconColor}`} />
              </div>
              <span className="text-xs font-bold text-slate-100">{act.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Assigned Classes (8 cols) & Smart Alerts (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Lớp học đang phụ trách */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">
              Lớp học đang phụ trách (4)
            </h2>
            <button
              type="button"
              onClick={() => navigate('/teacher/classes')}
              className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayClasses.slice(0, 4).map((cls, idx) => {
              const isFirst = idx % 2 === 0;
              return (
                <div
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    navigate('/teacher/classes');
                  }}
                  className="omni-card p-5 border-t-2 border-t-indigo-500 cursor-pointer hover:bg-[#0a1526] transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                    <span>
                      Khối {cls.gradeLevel || 10} · Phòng {cls.roomNumber || (isFirst ? 'A.302' : 'A.304')}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 ${
                        isFirst ? 'bg-indigo-500' : 'bg-purple-500'
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Lớp {cls.name}</h3>
                  <p className="text-xs text-slate-400 mt-2">
                    GVCN:{' '}
                    <strong className="text-slate-200">
                      {isFirst ? 'Cô Nguyễn Thị Mai' : cls.homeroomTeacherName || 'Thầy Lê Hoàng Long'}
                    </strong>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cảnh báo thông minh */}
        <div className="lg:col-span-4">
          <div className="omni-card p-5 h-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-rose-500 shrink-0" />
                <h3 className="text-sm font-extrabold text-white leading-tight">
                  Cảnh báo thông minh
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400">
                {alerts.length || 3} việc cần làm
              </span>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => navigate('/teacher/alerts')}
                className="p-3.5 bg-[#050b14] border border-slate-800 hover:border-rose-500/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-white">
                    Đặng Tuấn Kiệt (10A1)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                    NGHIÊM TRỌNG
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  Học sinh đã vắng 3 buổi trong tháng (1 buổi không phép). Tỷ lệ chuyên cần giảm xuống...
                </p>
              </div>

              {alerts.slice(0, 2).map((al) => (
                <div
                  key={al.id}
                  onClick={() => navigate('/teacher/alerts')}
                  className="p-3.5 bg-[#050b14] border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-white">
                      {al.studentName} ({al.className})
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                      CẦN LƯU Ý
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {al.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

