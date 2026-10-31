import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  AlertCircle
} from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { Assignment } from '../../types';
import { PageHeader, Modal } from '../../components/common/UIComponents';

export const StudentAssignments: React.FC = () => {
  const { success, error } = useToast();

  const student = db.getStudentById('std-10a1-01') || db.getStudents()[0];
  const assignments = db.getAssignments(student.classId);

  // Submit Modal state
  const [submittingAsn, setSubmittingAsn] = useState<Assignment | null>(null);
  const [submitContent, setSubmitContent] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('NguyenMinhQuan_BaiLam.pdf');

  const handleDoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAsn) return;
    if (!submitContent.trim()) {
      error('Thiếu nội dung', 'Vui lòng nhập phần trả lời hoặc ghi chú bài làm.');
      return;
    }

    db.submitAssignment(
      submittingAsn.id,
      student.id,
      student.fullName,
      submitContent,
      attachedFileName
    );

    success('Nộp bài thành công!', `Bài tập "${submittingAsn.title}" đã được nộp cho giáo viên.`);
    setSubmittingAsn(null);
    setSubmitContent('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bài tập & Nhiệm vụ của Em"
        subtitle="Theo dõi hạn nộp, nộp bài trực tuyến và nhận nhận xét từ giáo viên"
      />

      <div className="space-y-4">
        {assignments.map((asn) => {
          const submissions = db.getSubmissions(asn.id);
          const mySub = submissions.find((s) => s.studentId === student.id);

          return (
            <div
              key={asn.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {asn.subject}
                  </span>
                  <span className="text-xs text-slate-400">Giáo viên: {asn.teacherName}</span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">{asn.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{asn.description}</p>

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Hạn nộp: {new Date(asn.dueDate).toLocaleString('vi-VN')}
                  </span>
                  {asn.attachmentName && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <FileText className="w-3.5 h-3.5" /> {asn.attachmentName}
                    </span>
                  )}
                </div>

                {mySub?.feedback && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>Lời nhận xét của giáo viên:</span>
                      <span className="text-emerald-700 font-extrabold text-sm">Điểm: {mySub.score} / 10</span>
                    </div>
                    <p className="text-emerald-800">{mySub.feedback}</p>
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                {mySub ? (
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {mySub.status === 'graded' ? `Đã chấm (${mySub.score} đ)` : 'Đã nộp bài'}
                    </span>
                    <button
                      onClick={() => setSubmittingAsn(asn)}
                      className="block mt-2 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Nộp lại bài
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSubmittingAsn(asn)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Nộp bài làm
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Nộp bài tập */}
      <Modal
        isOpen={!!submittingAsn}
        onClose={() => setSubmittingAsn(null)}
        title="Nộp bài tập trực tuyến"
        subtitle={`Bài tập: ${submittingAsn?.title}`}
      >
        <form onSubmit={handleDoSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Câu trả lời hoặc Ghi chú bài làm *
            </label>
            <textarea
              rows={4}
              required
              value={submitContent}
              onChange={(e) => setSubmitContent(e.target.value)}
              placeholder="Nhập nội dung bài giải hoặc thông tin file đính kèm em đã hoàn thành..."
              className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tệp đính kèm (PDF / Ảnh bài làm trong vở)</label>
            <div className="p-3 border border-dashed border-slate-300 rounded-2xl bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate max-w-xs">{attachedFileName}</span>
              <button
                type="button"
                onClick={() => setAttachedFileName('NguyenMinhQuan_BaiLam_Moi.pdf')}
                className="text-blue-600 font-bold hover:underline"
              >
                Đổi tệp khác
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSubmittingAsn(null)}
              className="px-4 py-2 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Xác nhận nộp bài
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
