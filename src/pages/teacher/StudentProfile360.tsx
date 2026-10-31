import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GraduationCap,
  CalendarCheck,
  Star,
  Award,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Edit3
} from 'lucide-react';
import { db } from '../../services/db';
import { aiService, StudentFeedbackResult } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, StatusChip, Modal } from '../../components/common/UIComponents';

export const StudentProfile360: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance' | 'behaviors' | 'aiFeedback'>('overview');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<StudentFeedbackResult | null>(null);
  const [editableRemark, setEditableRemark] = useState('');

  const student = db.getStudentById(id || 'std-10a1-01') || db.getStudents()[0];
  const grades = db.getGradesByStudent(student.id);
  const behaviors = db.getBehaviors().filter((b) => b.studentId === student.id);
  const attendanceRecords = db.getAttendanceByClassAndDate(student.classId, new Date().toISOString().split('T')[0])
    .filter((a) => a.studentId === student.id);

  const handleGenerateAiFeedback = async () => {
    setIsAiLoading(true);
    try {
      const res = await aiService.generateStudentFeedback(
        student.fullName,
        student.gpa,
        student.conduct,
        student.attendanceRate,
        student.stars,
        student.notes
      );
      setAiFeedback(res);
      setEditableRemark(res.overallRemark);
      setActiveTab('aiFeedback');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveRemark = () => {
    db.updateStudent(student.id, { notes: editableRemark });
    success('Đã lưu nhận xét học bạ!', 'Nhận xét của giáo viên đã được cập nhật vào hồ sơ học sinh.');
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teacher/students')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>

        <button
          onClick={handleGenerateAiFeedback}
          disabled={isAiLoading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          {isAiLoading ? 'AI đang phân tích...' : 'AI Gợi ý nhận xét học bạ'}
        </button>
      </div>

      {/* 360 Banner Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={student.avatar}
              alt={student.fullName}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-50 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-extrabold text-slate-900">{student.fullName}</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {student.className}
                </span>
                <StatusChip status={student.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono font-medium">
                Mã định danh: {student.code} • Sinh ngày: {new Date(student.dateOfBirth).toLocaleDateString('vi-VN')} • Giới tính: {student.gender}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {student.address}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">ĐTB học kỳ</span>
              <span className="text-xl font-black text-blue-600">{student.gpa}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Hạnh kiểm</span>
              <span className="text-xl font-black text-emerald-600">{student.conduct}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Chuyên cần</span>
              <span className="text-xl font-black text-indigo-600">{student.attendanceRate}%</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400 block">Sao thi đua</span>
              <span className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-amber-400" /> {student.stars}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Tổng quan & Liên lạc', icon: GraduationCap },
            { id: 'grades', label: 'Bảng điểm chi tiết', icon: FileText },
            { id: 'attendance', label: 'Chuyên cần', icon: CalendarCheck },
            { id: 'behaviors', label: 'Hành vi & Thi đua', icon: Award },
            { id: 'aiFeedback', label: 'Nhận xét AI & Giáo viên', icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parent & Family Contact Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              Thông tin Phụ huynh & Liên lạc gia đình
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Họ và tên phụ huynh:</span>
                <span className="font-bold text-slate-800">{student.parentName || 'Nguyễn Văn Hùng'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Quan hệ với học sinh:</span>
                <span className="font-bold text-slate-800">{student.parentRelationship || 'Bố'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                <span className="text-slate-500">Số điện thoại liên hệ:</span>
                <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {student.parentPhone || '0913 222 333'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Địa chỉ gia đình:</span>
                <span className="font-medium text-slate-800">{student.address}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={`tel:${student.parentPhone || '0913222333'}`}
                className="flex-1 text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Gọi điện phụ huynh
              </a>
              <button
                onClick={() => navigate('/teacher/announcements')}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Gửi tin nhắn
              </button>
            </div>
          </div>

          {/* Health & Teacher Notes Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              Sức khỏe & Ghi chú riêng của Giáo viên
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <span className="font-bold text-amber-900 block mb-1">Tình trạng sức khỏe & dị ứng:</span>
                <p className="text-amber-800 leading-relaxed">{student.healthNotes || 'Sức khỏe tốt, không ghi nhận bệnh lý mãn tính.'}</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
                <span className="font-bold text-blue-900 block mb-1">Ghi chú đặc điểm tâm lý / tính cách:</span>
                <p className="text-blue-800 leading-relaxed">{student.notes || 'Học sinh chăm ngoan, hòa đồng, năng nổ trong các phong trào Đoàn trường.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bảng điểm */}
      {activeTab === 'grades' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900">Chi tiết điểm các môn - Học kỳ 1</h4>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Điểm trung bình chung: {student.gpa}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Môn học</th>
                  <th className="p-3 text-center">TX 1</th>
                  <th className="p-3 text-center">TX 2</th>
                  <th className="p-3 text-center">TX 3</th>
                  <th className="p-3 text-center">Giữa kỳ (x2)</th>
                  <th className="p-3 text-center">Cuối kỳ (x3)</th>
                  <th className="p-3 text-center">ĐTB môn</th>
                  <th className="p-3">Nhận xét của giáo viên bộ môn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Chưa có điểm chi tiết cho học sinh này.
                    </td>
                  </tr>
                ) : (
                  grades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-900">{g.subject}</td>
                      <td className="p-3 text-center font-medium">{g.tx1 ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.tx2 ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.tx3 ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.gk ?? '-'}</td>
                      <td className="p-3 text-center font-medium">{g.ck ?? '-'}</td>
                      <td className="p-3 text-center">
                        <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {g.average ?? '-'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{g.notes || 'Học lực vững vàng.'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Chuyên cần */}
      {activeTab === 'attendance' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900">Lịch sử điểm danh và chuyên cần</h4>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Tỷ lệ chuyên cần: {student.attendanceRate}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-emerald-800 font-bold block text-lg">42</span>
              <span className="text-emerald-600 text-[11px]">Buổi có mặt</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-blue-800 font-bold block text-lg">1</span>
              <span className="text-blue-600 text-[11px]">Nghỉ có phép</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-amber-800 font-bold block text-lg">1</span>
              <span className="text-amber-600 text-[11px]">Đi học muộn</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-rose-800 font-bold block text-lg">0</span>
              <span className="text-rose-600 text-[11px]">Vắng không phép</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Hành vi & Thi đua */}
      {activeTab === 'behaviors' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900">Nhật ký Hành vi & Sao thi đua</h4>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> Tổng sao: {student.stars}
            </span>
          </div>

          <div className="space-y-2.5">
            {behaviors.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Chưa có ghi nhận hành vi nào.</p>
            ) : (
              behaviors.map((b) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    b.points >= 0
                      ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900'
                      : 'bg-rose-50/50 border-rose-100 text-rose-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{b.category}</span>
                      <span className="text-[10px] text-slate-400">({b.date})</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{b.note}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Giáo viên ghi: {b.teacherName}</p>
                  </div>
                  <span
                    className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                      b.points >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {b.points >= 0 ? `+${b.points}` : b.points} sao
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: AI Gợi ý nhận xét */}
      {activeTab === 'aiFeedback' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Gợi ý nhận xét học bạ thông minh (AI Powered)</h4>
                <p className="text-xs text-slate-400">
                  Giáo viên duyệt, chỉnh sửa linh hoạt trước khi lưu vào hồ sơ chính thức
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateAiFeedback}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Tạo lại nhận xét mới
            </button>
          </div>

          {aiFeedback && (
            <div className="space-y-4">
              {/* Strengths & Weaknesses badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="font-bold text-xs text-emerald-900 block mb-2">Điểm mạnh nổi bật:</span>
                  <ul className="space-y-1.5 text-xs text-emerald-800">
                    {aiFeedback.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <span className="font-bold text-xs text-amber-900 block mb-2">Điểm cần rèn luyện thêm:</span>
                  <ul className="space-y-1.5 text-xs text-amber-800">
                    {aiFeedback.areasForImprovement.map((a, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Editable Remark */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Nội dung nhận xét chính thức (Giáo viên có thể sửa đổi tự do):
                  </label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Chế độ chỉnh sửa
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editableRemark}
                  onChange={(e) => setEditableRemark(e.target.value)}
                  className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleSaveRemark}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Duyệt và Lưu vào sổ học bạ
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
