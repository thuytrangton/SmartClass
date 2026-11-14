import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Send,
  FileText,
  Award,
  Paperclip,
  Calendar,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Upload,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, Modal, StatusChip, EmptyState } from '../../components/common/UIComponents';
import { Assignment, Submission } from '../../types';

type StudentFilterTab = 'all' | 'pending' | 'submitted' | 'late' | 'graded' | 'redo_requested';

export const StudentAssignments: React.FC = () => {
  const { showToast } = useToast();

  // Lấy học sinh hiện tại (mặc định std-1 thuộc Lớp 10A1)
  const student = db.getStudents()[0];

  const [filterTab, setFilterTab] = useState<StudentFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsn, setSelectedAsn] = useState<Assignment | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatDateTimeVN = (isoStr?: string) => {
    if (!isoStr) return 'Chưa thiết lập';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Chưa thiết lập';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} – ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Học sinh chỉ nhìn thấy bài tập ĐÃ PHÁT HÀNH (published) thuộc lớp của mình
  const studentAssignments = useMemo(() => {
    if (!student) return [];
    const allClassAssignments = db.getAssignments(student.classId);
    return allClassAssignments.filter((asn) => {
      if (asn.status !== 'published') return false;
      if (asn.assignedStudentIds && asn.assignedStudentIds.length > 0) {
        return asn.assignedStudentIds.includes(student.id);
      }
      return true;
    });
  }, [student, db.getAssignments()]);

  // Kết hợp bài tập với bài nộp của học sinh để xác định đúng trạng thái:
  // Chưa làm (pending), Đã nộp (submitted), Nộp muộn (late), Đã chấm (graded), Yêu cầu làm lại (redo_requested)
  const enrichedAssignments = useMemo(() => {
    return studentAssignments.map((asn) => {
      const sub: Submission | undefined = db
        .getSubmissions(asn.id)
        .find((s) => s.studentId === student?.id);

      const dueMs = asn.dueDate ? new Date(asn.dueDate).getTime() : Infinity;
      const isOverdueNow = Date.now() > dueMs;

      let status: 'pending' | 'submitted' | 'late' | 'graded' | 'redo_requested' = 'pending';
      let isLateSubmission = false;

      if (sub) {
        const subMs = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        isLateSubmission = sub.isLate ?? subMs > dueMs;

        if (sub.status === 'graded') {
          status = 'graded';
        } else if (sub.status === 'redo_requested') {
          status = 'redo_requested';
        } else if (sub.status === 'late' || isLateSubmission) {
          status = 'late';
        } else if (sub.status === 'submitted') {
          status = 'submitted';
        }
      }

      return {
        assignment: asn,
        submission: sub || null,
        status,
        isLateSubmission,
        isOverdueNow
      };
    });
  }, [studentAssignments, student]);

  const filteredList = useMemo(() => {
    return enrichedAssignments.filter(({ assignment, status }) => {
      if (filterTab !== 'all' && status !== filterTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          assignment.title.toLowerCase().includes(q) ||
          assignment.subject.toLowerCase().includes(q) ||
          assignment.teacherName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedAssignments, filterTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: enrichedAssignments.length,
      pending: enrichedAssignments.filter((x) => x.status === 'pending').length,
      submitted: enrichedAssignments.filter((x) => x.status === 'submitted').length,
      late: enrichedAssignments.filter((x) => x.status === 'late').length,
      graded: enrichedAssignments.filter((x) => x.status === 'graded').length,
      redo_requested: enrichedAssignments.filter((x) => x.status === 'redo_requested').length
    };
  }, [enrichedAssignments]);

  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  const handleOpenAssignmentModal = (asn: Assignment, existingSub: Submission | null) => {
    setSelectedAsn(asn);
    setAnswerContent(existingSub?.content || '');
    setAttachedFileName(existingSub?.fileName || '');
    setAttachedFileSize(existingSub?.fileSize || '');
    const initMap: Record<string, string> = {};
    if (existingSub?.answers) {
      existingSub.answers.forEach((a) => {
        if (a.selectedOptionLabels && a.selectedOptionLabels[0]) {
          initMap[a.questionId] = a.selectedOptionLabels[0];
        } else if (a.textAnswer) {
          initMap[a.questionId] = a.textAnswer;
        }
      });
    }
    setQuestionAnswers(initMap);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      const sizeKB = file.size / 1024;
      setAttachedFileSize(sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${Math.max(1, Math.round(sizeKB))} KB`);
    }
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsn || !student) return;

    const snapshots = selectedAsn.questionSnapshots || [];
    const hasSnapshots = snapshots.length > 0;

    if (!hasSnapshots && !answerContent.trim() && !attachedFileName) {
      showToast('Vui lòng nhập nội dung bài làm hoặc đính kèm tệp bài giải trước khi nộp.', 'error');
      return;
    }

    // Chấm tự động các câu trắc nghiệm trong Snapshot (nếu có)
    let objectiveScore = 0;
    const builtAnswers = snapshots.map((snap) => {
      const userVal = (questionAnswers[snap.questionId] || '').trim();
      if (snap.type !== 'essay') {
        const correctOpt = snap.options?.find((o) => o.isCorrect);
        const isCorrect = Boolean(correctOpt && correctOpt.label === userVal);
        const earned = isCorrect ? snap.points : 0;
        objectiveScore += earned;
        return {
          questionId: snap.questionId,
          selectedOptionLabels: userVal ? [userVal] : [],
          isCorrect,
          autoScore: earned
        };
      }
      return {
        questionId: snap.questionId,
        textAnswer: userVal
      };
    });

    const resultSub = db.submitAssignment(
      selectedAsn.id,
      student.id,
      student.fullName,
      answerContent.trim() || (hasSnapshots ? `Hoàn thành ${snapshots.length} câu hỏi trong đề.` : ''),
      attachedFileName || undefined,
      attachedFileSize || undefined,
      hasSnapshots ? builtAnswers : undefined,
      hasSnapshots ? Number(objectiveScore.toFixed(2)) : undefined
    );

    if (resultSub.status === 'late' || resultSub.isLate) {
      showToast(
        `Đã nộp bài "${selectedAsn.title}". Do nộp sau hạn (${formatDateTimeVN(selectedAsn.dueDate)}), bài được ghi nhận trạng thái "Nộp muộn".`,
        'info'
      );
    } else {
      showToast(`Nộp bài tập "${selectedAsn.title}" đúng hạn thành công!`, 'success');
    }

    setSelectedAsn(null);
    setAnswerContent('');
    setAttachedFileName('');
    setAttachedFileSize('');
    setQuestionAnswers({});
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bài tập của tôi"
        subtitle={`Học sinh: ${student?.fullName || 'Nguyễn Minh Anh'} • Lớp ${student?.className || '10A1'} • Theo dõi hạn nộp và kết quả chấm bài`}
        badge={`${counts.pending + counts.redo_requested} bài cần hoàn thành`}
      />

      {/* Bộ lọc trạng thái & Thanh tìm kiếm */}
      <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'all', label: 'Tất cả', count: counts.all },
            { id: 'pending', label: 'Chưa làm', count: counts.pending },
            { id: 'submitted', label: 'Đã nộp', count: counts.submitted },
            { id: 'late', label: 'Nộp muộn', count: counts.late },
            { id: 'graded', label: 'Đã chấm', count: counts.graded },
            { id: 'redo_requested', label: 'Yêu cầu làm lại', count: counts.redo_requested }
          ].map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as StudentFilterTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo môn học, tiêu đề bài tập..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Danh sách bài tập của học sinh */}
      {filteredList.length === 0 ? (
        <EmptyState
          title="Không có bài tập nào trong mục này"
          description="Bạn đã hoàn thành tốt các bài tập hoặc chưa có bài tập mới từ giáo viên."
          icon={BookOpen}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredList.map(({ assignment: asn, submission: sub, status, isLateSubmission, isOverdueNow }) => (
            <div
              key={asn.id}
              className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 hover:border-slate-700 shadow-lg flex flex-col justify-between transition-all"
            >
              <div>
                {/* Header thẻ: Môn học, Lớp & Trạng thái */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {asn.subject}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                      Lớp {asn.className}
                    </span>
                    {asn.questionSnapshots && asn.questionSnapshots.length > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                        {asn.questionSnapshots.length} câu hỏi
                      </span>
                    )}
                  </div>
                  <StatusChip status={status} />
                </div>

                {/* Tiêu đề bài tập */}
                <h3 className="text-lg font-extrabold text-slate-100 leading-snug">{asn.title}</h3>

                {/* Giáo viên giao & Ngày giao */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    GV giao: <strong className="text-slate-200">{asn.teacherName}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Ngày giao: {formatDateTimeVN(asn.assignedAt || asn.createdAt)}
                  </span>
                </div>

                {/* HẠN NỘP NỔI BẬT TRÊN GIAO DIỆN HỌC SINH */}
                <div
                  className={`mt-3 p-3 rounded-xl border flex items-center justify-between ${
                    status === 'pending' && isOverdueNow
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                      : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        Thời hạn làm bài đến
                      </p>
                      <p className="text-xs font-extrabold">{formatDateTimeVN(asn.dueDate)} (GMT+7)</p>
                    </div>
                  </div>
                  {status === 'pending' && isOverdueNow && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-600/30 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                      Đã quá hạn
                    </span>
                  )}
                </div>

                {/* Đề bài & Hướng dẫn */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-3 leading-relaxed">
                    {asn.description}
                  </p>
                  {asn.instructions && (
                    <p className="text-[11px] text-amber-300/90 pt-2 border-t border-slate-800">
                      <strong>Hướng dẫn:</strong> {asn.instructions}
                    </p>
                  )}
                  {asn.attachmentName && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Tệp đề bài: {asn.attachmentName}</span>
                    </div>
                  )}
                </div>

                {/* Kết quả chấm hoặc yêu cầu làm lại từ giáo viên */}
                {sub && status === 'graded' && (
                  <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4" /> Nhận xét của giáo viên:
                      </p>
                      <p className="text-xs text-slate-200 italic">"{sub.feedback || 'Hoàn thành tốt!'}"</p>
                      {isLateSubmission && (
                        <p className="text-[10px] text-amber-400">Ghi chú: Bài nộp muộn lúc {formatDateTimeVN(sub.submittedAt)}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block">Điểm số</span>
                      <span className="text-xl font-extrabold text-emerald-300">
                        {sub.score}/{asn.totalPoints}
                      </span>
                    </div>
                  </div>
                )}

                {sub && status === 'redo_requested' && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-1">
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Giáo viên yêu cầu làm lại bài:
                    </p>
                    <p className="text-xs text-slate-200">"{sub.feedback}"</p>
                  </div>
                )}
              </div>

              {/* Chân thẻ: Thời gian đã nộp & Nút hành động */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  {sub ? (
                    <span>
                      Đã nộp lúc: <strong className="text-slate-200">{formatDateTimeVN(sub.submittedAt)}</strong>
                    </span>
                  ) : (
                    <span>Thang điểm: <strong className="text-slate-200">{asn.totalPoints} điểm</strong></span>
                  )}
                </div>

                {status === 'pending' || status === 'redo_requested' ? (
                  <button
                    onClick={() => handleOpenAssignmentModal(asn, sub)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {status === 'redo_requested' ? 'Làm lại & Nộp bài' : isOverdueNow ? 'Nộp bài (Nộp muộn)' : 'Làm & Nộp bài'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAssignmentModal(asn, sub)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    {status === 'graded' ? 'Xem chi tiết bài làm' : 'Xem / Cập nhật bài nộp'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL CHI TIẾT BÀI TẬP & NỘP BÀI CHO HỌC SINH                         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!selectedAsn}
        onClose={() => setSelectedAsn(null)}
        title={selectedAsn ? selectedAsn.title : 'Chi tiết bài tập'}
        subtitle={
          selectedAsn
            ? `Môn ${selectedAsn.subject} • Lớp ${selectedAsn.className} • GV: ${selectedAsn.teacherName}`
            : ''
        }
        maxWidth="2xl"
      >
        {selectedAsn && (
          <form onSubmit={handleSubmitWork} className="space-y-4">
            {/* Hạn nộp nổi bật */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                new Date(selectedAsn.dueDate).getTime() < Date.now()
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Thời hạn làm bài đến (Deadline)</p>
                  <p className="text-sm font-extrabold">{formatDateTimeVN(selectedAsn.dueDate)} (GMT+7)</p>
                </div>
              </div>
              {new Date(selectedAsn.dueDate).getTime() < Date.now() && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-900/70 border border-rose-700 text-xs font-bold text-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Nộp lúc này sẽ tính Nộp muộn
                </span>
              )}
            </div>

            {/* Đề bài & Hướng dẫn */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div>
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Nội dung Đề bài:</p>
                <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{selectedAsn.description}</p>
              </div>
              {selectedAsn.instructions && (
                <div className="pt-2.5 border-t border-slate-800">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    Hướng dẫn làm bài / Ghi chú:
                  </p>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{selectedAsn.instructions}</p>
                </div>
              )}
            </div>

            {/* Danh sách câu hỏi Snapshot (nếu bài tập được tạo từ Ngân hàng câu hỏi theo chủ đề) */}
            {selectedAsn.questionSnapshots && selectedAsn.questionSnapshots.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                <p className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Phần câu hỏi trong đề ({selectedAsn.questionSnapshots.length} câu):
                </p>
                {selectedAsn.questionSnapshots.map((q, idx) => (
                  <div
                    key={q.questionId}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-cyan-300">
                        Câu {idx + 1} ({q.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'})
                      </span>
                      <span className="font-bold text-emerald-400">{q.points} điểm</span>
                    </div>
                    <p className="text-xs text-slate-100">{q.content}</p>

                    {q.type !== 'essay' && q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const chosen = questionAnswers[q.questionId] === opt.label;
                          return (
                            <label
                              key={opt.id}
                              className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer ${
                                chosen
                                  ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.questionId}`}
                                checked={chosen}
                                onChange={() =>
                                  setQuestionAnswers({ ...questionAnswers, [q.questionId]: opt.label })
                                }
                              />
                              <span>
                                {opt.label}. {opt.text}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={questionAnswers[q.questionId] || ''}
                        onChange={(e) =>
                          setQuestionAnswers({ ...questionAnswers, [q.questionId]: e.target.value })
                        }
                        placeholder="Nhập lời giải tự luận cho câu này..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Vùng nhập bài làm tổng hợp của học sinh */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Phần trình bày bài làm / Ghi chú bổ sung của em
              </label>
              <textarea
                rows={4}
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="Nhập lời giải chi tiết hoặc ghi chú cho giáo viên..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            {/* Đính kèm tệp bài làm */}
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Đính kèm tệp bài giải (PDF, Word, Ảnh chụp bài làm)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="p-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-between">
                {attachedFileName ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                    <FileText className="w-4 h-4" />
                    <span>{attachedFileName}</span>
                    {attachedFileSize && <span className="text-slate-400">({attachedFileSize})</span>}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Chưa chọn tệp đính kèm</span>
                )}
                <div className="flex items-center gap-2">
                  {attachedFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileName('');
                        setAttachedFileSize('');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" /> Tải tệp lên
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAsn(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" /> Gửi bài nộp
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
