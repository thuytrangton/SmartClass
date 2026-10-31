import React, { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  FileText,
  Clock,
  Download,
  Award,
  Check,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { Submission } from '../../types';
import { PageHeader, Modal, StatusChip } from '../../components/common/UIComponents';

export const AutoGrading: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { currentUser } = useAuth();
  const { success } = useToast();

  const [refreshTick, setRefreshTick] = useState(0);
  const assignments = db.getAssignments(selectedClassId);
  const quizzes = db.getQuizzes(selectedClassId);

  // Only one assignment accordion open at a time (null by default)
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [isAutoGradingAll, setIsAutoGradingAll] = useState(false);

  // Manual / Review grading modal state
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(9);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Collect all submissions across class assignments
  const allSubmissions = assignments.flatMap((a) =>
    db.getSubmissions(a.id).map((s) => ({ ...s, assignmentTitle: a.title, subject: a.subject }))
  );
  const ungradedCount = allSubmissions.filter((s) => s.score === undefined).length;
  const gradedCount = allSubmissions.filter((s) => s.score !== undefined).length;

  const generateAutoEvaluation = (content: string) => {
    const length = content.trim().length;
    if (length > 60) {
      return {
        score: 9.5,
        feedback: 'Chấm tự động: Bài làm đầy đủ các bước giải, lập luận chặt chẽ và kết quả chính xác.'
      };
    }
    if (length > 30) {
      return {
        score: 8.5,
        feedback: 'Chấm tự động: Nắm vững kiến thức cơ bản, trình bày rõ ràng, cần bổ sung thêm phần kết luận.'
      };
    }
    return {
      score: 7.5,
      feedback: 'Chấm tự động: Đã hoàn thành yêu cầu trọng tâm, cần trình bày chi tiết hơn các bước biến đổi.'
    };
  };

  const handleAutoGradeAll = () => {
    setIsAutoGradingAll(true);
    setTimeout(() => {
      let count = 0;
      assignments.forEach((asn) => {
        const subs = db.getSubmissions(asn.id);
        subs.forEach((sub) => {
          if (sub.score === undefined) {
            const evalResult = generateAutoEvaluation(sub.content || '');
            db.gradeSubmission(
              sub.id,
              evalResult.score,
              evalResult.feedback,
              currentUser?.name || 'Hệ thống Chấm tự động'
            );
            count++;
          }
        });
      });

      setIsAutoGradingAll(false);
      setRefreshTick((t) => t + 1);
      if (count > 0) {
        success(
          'Chấm bài tự động hoàn tất!',
          `Đã tự động chấm điểm và nhận xét cho ${count} bài nộp chưa chấm.`
        );
      } else {
        success(
          'Tất cả bài nộp đã được chấm!',
          'Hiện tại không còn bài nộp nào đang chờ chấm tự động.'
        );
      }
    }, 500);
  };

  const handleAutoGradeSingle = (sub: Submission) => {
    const evalResult = generateAutoEvaluation(sub.content || '');
    db.gradeSubmission(
      sub.id,
      evalResult.score,
      evalResult.feedback,
      currentUser?.name || 'Hệ thống Chấm tự động'
    );
    setRefreshTick((t) => t + 1);
    success(
      'Đã chấm tự động!',
      `Học sinh ${sub.studentName} đạt ${evalResult.score}/10 điểm.`
    );
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

    setRefreshTick((t) => t + 1);
    success(
      'Đã cập nhật kết quả chấm!',
      `Điểm: ${gradeScore}/10 đã được lưu cho học sinh ${activeSubmission.studentName}.`
    );
    setActiveSubmission(null);
  };

  return (
    <div className="space-y-6" data-tick={refreshTick}>
      <PageHeader
        title={`Chấm bài tự động - Lớp ${selectedClass?.name || '10A1'}`}
        subtitle="Hệ thống tự động chấm điểm trắc nghiệm và gợi ý điểm số, lời phê thông minh cho bài tập tự luận"
      >
        <button
          onClick={handleAutoGradeAll}
          disabled={isAutoGradingAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Wand2 className="w-4 h-4" />
          <span>
            {isAutoGradingAll
              ? 'Đang chấm tự động...'
              : `Chấm tự động tất cả (${ungradedCount} bài chờ)`}
          </span>
        </button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng bài nộp tự luận</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allSubmissions.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Đã chấm hoàn tất</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{gradedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Đề trắc nghiệm chấm tự động 100%</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{quizzes.length} đề</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Section: Danh sách bài tập cần chấm */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900">
          Danh sách bài nộp theo đợt giao bài (Click vào từng mục để mở/đóng)
        </h3>

        {assignments.map((asn) => {
          const isOpen = openAssignmentId === asn.id;
          const submissions = db.getSubmissions(asn.id);
          const pendingSubs = submissions.filter((s) => s.score === undefined).length;

          return (
            <div
              key={asn.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
            >
              <div
                onClick={() => setOpenAssignmentId((prev) => (prev === asn.id ? null : asn.id))}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-[240px]">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {asn.subject}
                      </span>
                      <StatusChip status={asn.status} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Hạn: {new Date(asn.dueDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 mt-1 truncate">
                      {asn.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bài đã nộp</span>
                    <span className="font-bold text-slate-800">{submissions.length} bài</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Trạng thái chấm</span>
                    {pendingSubs > 0 ? (
                      <span className="font-bold text-amber-600">{pendingSubs} bài chờ chấm</span>
                    ) : (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã chấm hết
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4 md:p-5 space-y-3">
                  {submissions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                      Chưa có học sinh nào nộp bài tập này.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {submissions.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900">{sub.studentName}</h5>
                              <span className="text-[10px] text-slate-400">
                                {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 italic">"{sub.content}"</p>
                            {sub.fileName && (
                              <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                                <Download className="w-3 h-3" /> Đính kèm: {sub.fileName}
                              </p>
                            )}
                            {sub.feedback && (
                              <p className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                                <strong>Nhận xét:</strong> {sub.feedback}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {sub.score !== undefined ? (
                              <span className="font-black text-sm text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                                {sub.score} / 10
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAutoGradeSingle(sub)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                                Chấm tự động ngay
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveSubmission(sub);
                                setGradeScore(sub.score ?? 9);
                                setGradeFeedback(
                                  sub.feedback ||
                                    'Bài làm tốt, trình bày rõ ràng và nắm vững phương pháp giải.'
                                );
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              {sub.score !== undefined ? 'Điều chỉnh điểm' : 'Chấm thủ công'}
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

      {/* Modal điều chỉnh điểm / lời phê */}
      <Modal
        isOpen={!!activeSubmission}
        onClose={() => setActiveSubmission(null)}
        title="Chấm điểm & Nhận xét bài nộp"
        subtitle={`Học sinh: ${activeSubmission?.studentName}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveGrading} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700">Nội dung học sinh nộp:</p>
            <p className="text-slate-600 mt-1 italic leading-relaxed">"{activeSubmission?.content}"</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Điểm số (Thang 10) *
            </label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lời nhận xét của giáo viên
            </label>
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
              Lưu điểm & Trả bài
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
