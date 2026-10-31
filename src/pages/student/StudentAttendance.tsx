import React from 'react';
import { CalendarCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { db } from '../../services/db';
import { PageHeader, StatCard } from '../../components/common/UIComponents';

export const StudentAttendance: React.FC = () => {
  const student = db.getStudentById('std-10a1-01') || db.getStudents()[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chuyên cần & Điểm danh - Em ${student.fullName}`}
        subtitle={`Theo dõi số buổi có mặt, nghỉ học và thời gian đến lớp`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Tỷ lệ chuyên cần"
          value={`${student.attendanceRate}%`}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Rất tốt"
        />
        <StatCard
          title="Buổi có mặt"
          value="42 buổi"
          icon={CalendarCheck}
          color="blue"
          subtitle="Đầy đủ"
        />
        <StatCard
          title="Nghỉ có phép"
          value="1 buổi"
          icon={AlertCircle}
          color="purple"
          subtitle="Lý do khám sức khỏe"
        />
        <StatCard
          title="Vắng không phép"
          value="0 buổi"
          icon={AlertCircle}
          color="emerald"
          subtitle="Tuyệt đối chấp hành"
        />
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        <h4 className="font-extrabold text-sm text-slate-900">Ghi nhận từ Giáo viên chủ nhiệm</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Em Quân luôn đến lớp đúng giờ, hỗ trợ lớp trực nhật và truy bài đầu giờ nghiêm túc. Tỷ lệ chuyên cần gương mẫu cho cả lớp noi theo.
        </p>
      </div>
    </div>
  );
};
