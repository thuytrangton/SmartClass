import React from 'react';
import {
  BarChart3,
  Download,
  CalendarCheck,
  TrendingUp,
  FileSpreadsheet,
  Award,
  ShieldAlert,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { exportImportService } from '../../services/exportImport';
import { PageHeader, StatCard } from '../../components/common/UIComponents';

export const TeacherReports: React.FC = () => {
  const { selectedClassId, selectedClass, selectedSubject } = useClass();
  const { success } = useToast();

  const students = db.getStudentsByClass(selectedClassId);
  const grades = db.getGradesByClassAndSubject(selectedClassId, selectedSubject || 'Toán học');
  const alerts = db.getAlerts().filter((a) => a.classId === selectedClassId);

  // Performance progression chart
  const progressData = [
    { week: 'Tuần 1', attendance: 98, avgGrade: 8.0 },
    { week: 'Tuần 2', attendance: 96, avgGrade: 8.2 },
    { week: 'Tuần 3', attendance: 97, avgGrade: 8.1 },
    { week: 'Tuần 4', attendance: 95, avgGrade: 8.5 },
    { week: 'Tuần 5', attendance: 96, avgGrade: 8.4 }
  ];

  const handleExportFullReport = () => {
    exportImportService.exportStudentsToCsv(students, selectedClass?.name || '10A1');
    success('Đã xuất báo cáo tổng hợp!', 'Tệp CSV thống kê chi tiết lớp học đã được tải về.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Báo cáo & Thống kê Tổng thể - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle="Tổng hợp dữ liệu kết quả học tập, chuyên cần và nền nếp kỷ luật của lớp"
      >
        <button
          onClick={handleExportFullReport}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Xuất Báo cáo Tổng hợp (CSV)
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sĩ số lớp"
          value={`${students.length} học sinh`}
          icon={Users}
          color="blue"
          subtitle="Đủ 100% hồ sơ"
        />
        <StatCard
          title="Tỷ lệ chuyên cần trung bình"
          value="96.2%"
          icon={CalendarCheck}
          color="emerald"
          subtitle="Tăng 1.5% so với tháng trước"
        />
        <StatCard
          title="ĐTB Môn học lớp"
          value="8.35"
          icon={TrendingUp}
          color="indigo"
          subtitle="Học lực Giỏi"
        />
        <StatCard
          title="Cảnh báo phát sinh"
          value={alerts.length}
          icon={ShieldAlert}
          color="amber"
          subtitle="Đang trong quy trình xử lý"
        />
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Xu hướng Chuyên cần & Điểm số theo các tuần học
            </h4>
            <p className="text-xs text-slate-400">Theo dõi tiến độ phát triển năng lực học sinh qua từng tuần</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span> Chuyên cần (%)
            </span>
            <span className="flex items-center gap-1.5 text-purple-600">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span> Điểm trung bình (x10)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="attendance" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
              <Line
                type="monotone"
                dataKey={(d) => d.avgGrade * 10}
                name="Điểm TB (x10)"
                stroke="#7C3AED"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
