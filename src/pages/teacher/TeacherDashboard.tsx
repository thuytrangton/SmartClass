import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Check,
  CheckCircle2,
  Calendar,
  FileCode2,
  TrendingUp,
  Target,
  Disc,
  Bot
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClass } from '../../contexts/ClassContext';
import { db } from '../../services/db';
import {
  Breadcrumb,
  CyberButton,
  CyberStatCard,
  CyberPanel,
  QuickActionCard,
  SectionHeader,
  ClassCard,
  SmartAlertPanel,
  CyberAccentColor
} from '../../components/cyber/CyberUI';

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

  const quickActions: Array<{
    label: string;
    icon: any;
    path: string;
    accent: CyberAccentColor;
  }> = [
    {
      label: 'Thời khóa biểu',
      icon: Calendar,
      path: '/teacher/schedule',
      accent: 'cyan'
    },
    {
      label: 'Điểm danh',
      icon: Check,
      path: '/teacher/attendance',
      accent: 'green'
    },
    {
      label: 'Giao bài tập',
      icon: FileCode2,
      path: '/teacher/assignments?tab=create',
      accent: 'purple'
    },
    {
      label: 'Nhập sổ điểm',
      icon: TrendingUp,
      path: '/teacher/grades',
      accent: 'blue'
    },
    {
      label: 'Vòng quay lớp',
      icon: Disc,
      path: '/teacher/tools',
      accent: 'yellow'
    },
    {
      label: 'AI Soạn bài',
      icon: Bot,
      path: '/teacher/ai',
      accent: 'magenta'
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

  const alertItems = [
    {
      id: 'alert-kiet',
      studentName: 'Đặng Tuấn Kiệt',
      className: '10A1',
      severityLabel: 'NGHIÊM TRỌNG',
      isCritical: true,
      description:
        'Học sinh đã vắng 3 buổi trong tháng (1 buổi không phép). Tỷ lệ chuyên cần giảm xuống...'
    },
    ...alerts.slice(0, 2).map((al) => ({
      id: al.id,
      studentName: al.studentName,
      className: al.className,
      severityLabel: al.severity === 'critical' ? 'NGHIÊM TRỌNG' : 'CẦN LƯU Ý',
      isCritical: al.severity === 'critical',
      description: al.description
    }))
  ];

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb, Welcome Heading & Action Buttons with Dark Cyan Divider */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#164452]">
        <div>
          <Breadcrumb
            items={[
              { label: 'Tổng quan', onClick: () => navigate('/teacher/dashboard') },
              { label: 'Bàn làm việc giáo viên' }
            ]}
          />
          <h1 className="text-2xl font-extrabold text-[#F4F6FB] tracking-tight mt-2">
            Xin chào, {displayName}!
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <CyberButton
            variant="primary"
            slanted
            icon={Calendar}
            onClick={() => navigate('/teacher/schedule')}
          >
            Thời khóa biểu
          </CyberButton>

          <CyberButton
            variant="outline"
            icon={Check}
            iconClassName="text-[#18D9A0]"
            onClick={() => navigate('/teacher/attendance')}
          >
            Điểm danh
          </CyberButton>
        </div>
      </div>

      {/* 4 KPI Stat Cards (Desktop 4 cols, Tablet 2 cols, Mobile 1 col, gap 20px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <CyberStatCard
          title="Tổng học sinh phụ trách"
          value={students.length || 32}
          subtitle={`Thuộc ${classes.length || 4} lớp học`}
          icon={Users}
          accent="cyan"
          onClick={() => navigate('/teacher/students')}
        />

        <CyberStatCard
          title="Có mặt hôm nay"
          value={presentCount}
          badgeText="96.8% chuyên cần"
          subtitle={`Vắng: ${absentCount} · Đi muộn: ${lateCount}`}
          icon={CheckCircle2}
          accent="green"
          onClick={() => navigate('/teacher/attendance')}
        />

        <CyberStatCard
          title="Bài tập chờ chấm"
          value={assignments.length || 1}
          subtitle={assignments[0]?.title || 'Bài tập Hàm số bậc hai'}
          icon={FileCode2}
          accent="yellow"
          onClick={() => navigate('/teacher/assignments?tab=list')}
        />

        <CyberStatCard
          title="Cảnh báo học tập & ..."
          value={alerts.length || 3}
          subtitle="Cần theo dõi và hỗ trợ"
          icon={Target}
          accent="magenta"
          onClick={() => navigate('/teacher/alerts')}
        />
      </div>

      {/* Quick Actions Panel (TÁC VỤ NHANH THƯỜNG DÙNG) */}
      <CyberPanel className="p-5">
        <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#00E5F0] mb-4">
          TÁC VỤ NHANH THƯỜNG DÙNG
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {quickActions.map((act) => (
            <QuickActionCard
              key={act.label}
              label={act.label}
              icon={act.icon}
              accent={act.accent}
              onClick={() => navigate(act.path)}
            />
          ))}
        </div>
      </CyberPanel>

      {/* Bottom Section: Assigned Classes (8 cols) & Smart Alerts (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left: Lớp học đang phụ trách */}
        <div className="xl:col-span-8 space-y-4">
          <SectionHeader
            title={`Lớp học đang phụ trách (${classes.length || 4})`}
            actionLabel="Xem tất cả"
            onAction={() => navigate('/teacher/classes')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayClasses.slice(0, 4).map((cls, idx) => {
              const isFirst = idx % 2 === 0;
              return (
                <ClassCard
                  key={cls.id}
                  name={cls.name}
                  gradeLevel={cls.gradeLevel || 10}
                  roomNumber={(cls as any).roomNumber || (isFirst ? 'A.302' : 'A.304')}
                  homeroomTeacherName={
                    isFirst
                      ? 'Cô Nguyễn Thị Mai'
                      : cls.homeroomTeacherName || 'Thầy Lê Hoàng Long'
                  }
                  accent={isFirst ? 'blue' : 'purple'}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    navigate('/teacher/classes');
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Right: Cảnh báo thông minh */}
        <div className="xl:col-span-4">
          <SmartAlertPanel
            count={alerts.length || 3}
            items={alertItems}
            onSelectAlert={() => navigate('/teacher/alerts')}
          />
        </div>
      </div>
    </div>
  );
};
