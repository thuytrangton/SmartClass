import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  User,
  Send,
  Calendar,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { Assignment, Submission } from '../../types';
import { PageHeader, Modal, StatusChip } from '../../components/common/UIComponents';

export const AssignmentList: React.FC = () => {
  const { selectedClassId, selectedClass, selectedSubject, allSubjects, addSubject } = useClass();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const assignments = db.getAssignments(selectedClassId);

  // Only 1 assignment open at a time (closed by default)
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);

  const toggleAssignmentOpen = (id: string) => {
    setOpenAssignmentId((prev) => (prev === id ? null : id));
  };

  // Create Assignment modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(selectedSubject || 'Toán học');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [newDesc, setNewDesc] = useState('');

  // Grading modal state
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(9);
  const [gradeFeedback, setGradeFeedback] = useState<string>('Bài làm rất tốt, cách giải rõ ràng và đồ thị chuẩn xác.');

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      error('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề bài tập.');
      return;
    }

    const created = db.addAssignment({
      title: newTitle,
      description: newDesc,
      subject: newSubject,
      classId: selectedClassId,
      className: selectedClass?.name || '10A1',
      teacherId: currentUser?.id || 'usr-teacher-01',
      teacherName: currentUser?.name || 'Cô Trần Thị Mai',
      dueDate: newDueDate,
      totalPoints: 10,
      status: 'published',
      totalStudents: selectedClass?.studentCount || 22,
      attachmentName: 'Tai_Lieu_Huong_Dan.pdf',
      attachmentSize: '1.2 MB'
    });

    success('Giao bài tập thành công!', `Đã giao "${newTitle}" cho lớp ${selectedClass?.name}.`);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setOpenAssignmentId(created.id);
  };

  const handleSaveGrading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    db.gradeSubmission(
      activeSubmission.id,
      gradeScore,
      gradeFeedback,
      currentUser?.name || 'Cô Trần Thị Mai'
    );

    success('Đã chấm bài xong!', `Điểm: ${gradeScore} đã được gửi đến học sinh ${activeSubmission.studentName}.`);
    setActiveSubmission(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Giao bài tập - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle="Thiết lập nhiệm vụ học tập, hạn nộp bài và theo dõi tiến độ hoàn thành của học sinh"
      >
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Giao bài tập mới
        </button>
      </PageHeader>

      {/* Assignment List with Open/Close nested screens */}
      <div className="space-y-4">
        {assignments.map((asn) => {
          const isOpen = openAssignmentId === asn.id;
          const submissions = db.getSubmissions(asn.id);
          const progressPercent = Math.round((asn.submissionCount / (asn.totalStudents || 1)) * 100);

          return (
            <div
              key={asn.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
            >
              {/* COMPACT ASSIGNMENT HEADER ROW */}
              <div
                onClick={() => toggleAssignmentOpen(asn.id)}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors select-none"
              >
                {/* Left */}
                <div className="flex items-center gap-3.5 flex-1 min-w-[260px]">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {asn.subject}
                      </span>
                      <StatusChip status={asn.status} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Hạn: {new Date(asn.dueDate).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 mt-1 truncate">{asn.title}</h3>
                  </div>
                </div>

                {/* Center: Submission Progress */}
                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tiến độ nộp</span>
                    <span className="font-bold text-slate-800">
                      {asn.submissionCount}/{asn.totalStudents} ({progressPercent}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Đã chấm</span>
                    <span className="font-bold text-emerald-600">{asn.gradedCount} bài</span>
                  </div>
                </div>

                {/* Right: Open / Close Button */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => toggleAssignmentOpen(asn.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      isOpen
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    <span>{isOpen ? 'Đóng bài nộp' : `Mở bài nộp (${submissions.length})`}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* NESTED SCREEN: SUBMISSIONS & GRADING (Opens on Click 1, Closes on Click 2) */}
              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4 md:p-6 animate-in slide-in-from-top-1 fade-in duration-150 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">
                      Danh sách học sinh đã nộp bài ({submissions.length} bài)
                    </span>
                    <button
                      onClick={() => toggleAssignmentOpen(asn.id)}
                      className="text-slate-500 hover:text-rose-600 font-bold"
                    >
                      ✕ Đóng màn hình này
                    </button>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      Chưa có học sinh nào nộp bài tập này.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900">{sub.studentName}</h5>
                              <span className="text-[10px] text-slate-400">
                                {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 italic">"{sub.content}"</p>
                            {sub.fileName && (
                              <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
                                <Download className="w-3 h-3" /> File đính kèm: {sub.fileName}
                              </p>
                            )}
                            {sub.feedback && (
                              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg mt-1 border border-emerald-100">
                                <strong>Lời phê:</strong> {sub.feedback}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                            {sub.score !== undefined ? (
                              <span className="font-black text-sm text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                                {sub.score} / 10
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-200">
                                Chưa chấm
                              </span>
                            )}

                            <button
                              onClick={() => {
                                setActiveSubmission(sub);
                                setGradeScore(sub.score ?? 9);
                                setGradeFeedback(sub.feedback || 'Bài làm rất tốt, cách giải mạch lạc.');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
                            >
                              {sub.score !== undefined ? 'Chấm lại' : 'Chấm điểm'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Giao bài tập mới */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Giao bài tập mới cho học sinh"
        subtitle={`Lớp: ${selectedClass?.name}`}
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học *</label>
            <div className="flex gap-2">
              <select
                value={newSubject}
                onChange={(e) => {
                  if (e.target.value === '__add__') {
                    const promptVal = prompt('Nhập tên môn học mới cho bài tập:');
                    if (promptVal && promptVal.trim()) {
                      addSubject(promptVal.trim());
                      setNewSubject(promptVal.trim());
                    }
                  } else {
                    setNewSubject(e.target.value);
                  }
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
              >
                {allSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__add__" className="text-blue-600 font-bold">
                  + Thêm môn học khác...
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề bài tập *</label>
            <input
              type="text"
              required
              placeholder="VD: Bài tập tuần 5 - Khảo sát đồ thị hàm số"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn nộp bài *</label>
            <input
              type="datetime-local"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng dẫn / Yêu cầu làm bài</label>
            <textarea
              rows={3}
              placeholder="Nội dung bài tập hoặc yêu cầu học sinh làm trang số mấy..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs"
            >
              Xuất bản bài tập
            </button>
          </div>
        </form>
      </Modal>

      {/* Sub-modal: Form chấm bài */}
      <Modal
        isOpen={!!activeSubmission}
        onClose={() => setActiveSubmission(null)}
        title="Chấm bài học sinh"
        subtitle={`Học sinh: ${activeSubmission?.studentName}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveGrading} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700">Nội dung học sinh nộp:</p>
            <p className="text-slate-600 mt-1 italic leading-relaxed">"{activeSubmission?.content}"</p>
            <p className="text-blue-600 font-bold mt-2 flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> File đính kèm: {activeSubmission?.fileName}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm số (Thang 10) *</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="10"
              required
              value={gradeScore}
              onChange={(e) => setGradeScore(parseFloat(e.target.value))}
              className="w-full text-base font-bold text-blue-600 px-3 py-2 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lời nhận xét / Nhắc nhở của giáo viên</label>
            <textarea
              rows={3}
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveSubmission(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-xs"
            >
              Lưu & Trả bài cho học sinh
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
