import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Award,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import { PageHeader, StatCard, StatusChip } from '../../components/common/UIComponents';

export const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Find student record for demo user
  const student = db.getStudentById('std-10a1-01') || db.getStudents()[0];
  const assignments = db.getAssignments(student.classId);
  const quizzes = db.getQuizzes(student.classId);
  const schedules = db.getSchedules(student.classId);
  const grades = db.getGradesByStudent(student.id);

  const pendingAssignments = assignments.slice(0, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cổng Học tập - Em ${student.fullName}`}
        subtitle={`Lớp ${student.className} • Năm học 2025 - 2026 • Chúc em có một buổi học thật hiệu quả!`}
        badge="Cổng Học Sinh"
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Điểm trung bình (ĐTB)"
          value={student.gpa}
          icon={TrendingUp}
          color="blue"
          subtitle="Học lực: Xuất sắc"
          onClick={() => navigate('/student/grades')}
        />
        <StatCard
          title="Tỷ lệ chuyên cần"
          value={`${student.attendanceRate}%`}
          icon={CheckCircle2}
          color="emerald"
          subtitle="42/42 buổi có mặt"
          onClick={() => navigate('/student/attendance')}
        />
        <StatCard
          title="Sao thi đua tích lũy"
          value={`${student.stars} sao`}
          icon={Star}
          color="amber"
          subtitle="Xếp hạng #2 toàn lớp"
        />
        <StatCard
          title="Bài tập cần hoàn thành"
          value={pendingAssignments.length}
          icon={BookOpen}
          color="purple"
          subtitle="Hạn chót tuần này"
          onClick={() => navigate('/student/assignments')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Pending Homework & Quizzes */}
        <div className="lg:col-span-8 space-y-6">
          {/* Pending Assignments */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Nhiệm vụ & Bài tập cần làm
              </h4>
              <button
                onClick={() => navigate('/student/assignments')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Xem tất cả ({assignments.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {assignments.map((asn) => (
                <div
                  key={asn.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md">
                        {asn.subject}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900">{asn.title}</h5>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{asn.description}</p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Hạn nộp: {new Date(asn.dueDate).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/student/assignments')}
                    className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Nộp bài
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quizzes to take */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Đề kiểm tra trắc nghiệm trực tuyến
              </h4>
              <button
                onClick={() => navigate('/student/quizzes')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800"
              >
                Vào làm bài →
              </button>
            </div>

            <div className="space-y-3">
              {quizzes.map((qz) => (
                <div
                  key={qz.id}
                  className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-bold text-xs text-purple-900">{qz.title}</h5>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Thời lượng: {qz.durationMinutes} phút • {qz.questions.length} câu hỏi trắc nghiệm
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/student/quizzes')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Bắt đầu làm bài
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Today Schedule & Leaderboard */}
        <div className="lg:col-span-4 space-y-6">
          {/* Today Schedule */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Lịch học hôm nay
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Thứ Hai</span>
            </div>

            <div className="space-y-2">
              {schedules.slice(0, 4).map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{item.subject}</span>
                    <span className="text-blue-600 font-mono text-[11px]">Tiết {item.period}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {item.startTime} - {item.endTime} • {item.room}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Star Badge */}
          <div className="bg-gradient-to-tr from-amber-400 to-amber-500 rounded-3xl p-5 text-slate-900 shadow-md text-center">
            <Award className="w-10 h-10 mx-auto text-amber-900 mb-1" />
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
              Vinh danh Sao Rèn Luyện
            </span>
            <h3 className="text-2xl font-black mt-1">{student.stars} Sao</h3>
            <p className="text-xs text-amber-900 mt-1">
              Top 2 học sinh tích cực nhất lớp 10A1!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
