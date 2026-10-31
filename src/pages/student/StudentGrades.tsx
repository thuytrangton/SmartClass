import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { db } from '../../services/db';
import { PageHeader, StatCard } from '../../components/common/UIComponents';

export const StudentGrades: React.FC = () => {
  const student = db.getStudentById('std-10a1-01') || db.getStudents()[0];
  const grades = db.getGradesByStudent(student.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bảng điểm & Xếp loại - Em ${student.fullName}`}
        subtitle={`Lớp ${student.className} • Điểm trung bình học kỳ 1: ${student.gpa} (Học lực Xuất sắc)`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Điểm trung bình (GPA)"
          value={student.gpa}
          icon={TrendingUp}
          color="blue"
          subtitle="Top 3 học sinh điểm cao nhất"
        />
        <StatCard
          title="Hạnh kiểm"
          value={student.conduct}
          icon={Award}
          color="emerald"
          subtitle="Xếp loại Tốt"
        />
        <StatCard
          title="Chuyên cần"
          value={`${student.attendanceRate}%`}
          icon={CheckCircle2}
          color="purple"
          subtitle="Không có buổi nghỉ không phép"
        />
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h4 className="font-extrabold text-sm text-slate-900">Chi tiết điểm các môn học</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Môn học</th>
                <th className="p-3 text-center">TX 1</th>
                <th className="p-3 text-center">TX 2</th>
                <th className="p-3 text-center">TX 3</th>
                <th className="p-3 text-center bg-blue-50/50">Giữa kỳ</th>
                <th className="p-3 text-center bg-purple-50/50">Cuối kỳ</th>
                <th className="p-3 text-center bg-emerald-50 text-emerald-900 font-extrabold">ĐTB Môn</th>
                <th className="p-3">Lời nhận xét của Giáo viên bộ môn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-900">{g.subject}</td>
                  <td className="p-3 text-center font-medium">{g.tx1 ?? '-'}</td>
                  <td className="p-3 text-center font-medium">{g.tx2 ?? '-'}</td>
                  <td className="p-3 text-center font-medium">{g.tx3 ?? '-'}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{g.gk ?? '-'}</td>
                  <td className="p-3 text-center font-bold text-purple-700">{g.ck ?? '-'}</td>
                  <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/50">
                    {g.average ?? '-'}
                  </td>
                  <td className="p-3 text-slate-600">{g.notes || 'Học tập rất tích cực.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
