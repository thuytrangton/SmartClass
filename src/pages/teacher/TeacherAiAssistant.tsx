import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileQuestion,
  BookOpen,
  FileText,
  Copy,
  Check,
  Save,
  Plus,
  ArrowRight,
  Send,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import { aiService, LessonPlanResult } from '../../services/aiService';
import { QuizQuestion } from '../../types';
import { PageHeader } from '../../components/common/UIComponents';

export const TeacherAiAssistant: React.FC = () => {
  const { selectedClassId, selectedClass, selectedSubject } = useClass();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'quiz' | 'lessonPlan' | 'feedback'>('quiz');

  /* 1. QUIZ GENERATOR STATE */
  const [quizTopic, setQuizTopic] = useState('Đồ thị và tính đơn điệu hàm số bậc hai');
  const [quizSubject, setQuizSubject] = useState('Toán học');
  const [quizCount, setQuizCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>('Trung bình');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim()) {
      error('Thiếu chủ đề', 'Vui lòng nhập chủ đề câu hỏi.');
      return;
    }
    setIsGeneratingQuiz(true);
    try {
      const res = await aiService.generateQuizQuestions(
        quizSubject,
        quizTopic,
        selectedClass?.gradeLevel || 10,
        quizCount,
        quizDifficulty
      );
      setGeneratedQuestions(res);
      success('AI đã tạo câu hỏi thành công!', 'Bạn có thể chỉnh sửa nội dung bên dưới trước khi xuất bản.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handlePublishQuiz = () => {
    if (generatedQuestions.length === 0) return;

    db.addQuiz({
      title: `Kiểm tra 15 phút: ${quizTopic}`,
      subject: quizSubject,
      classId: selectedClassId,
      className: selectedClass?.name || '10A1',
      teacherId: 'usr-teacher-01',
      durationMinutes: 15,
      questions: generatedQuestions,
      shuffleQuestions: true,
      shuffleOptions: true,
      totalPoints: 10,
      status: 'active',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString()
    });

    success('Xuất bản thành công!', 'Đề kiểm tra trắc nghiệm đã được giao cho học sinh làm bài.');
    navigate('/teacher/quizzes');
  };

  /* 2. LESSON PLAN STATE */
  const [lpTopic, setLpTopic] = useState('Hàm số bậc hai và ứng dụng thực tiễn');
  const [lpSubject, setLpSubject] = useState('Toán học');
  const [isGeneratingLp, setIsGeneratingLp] = useState(false);
  const [generatedLp, setGeneratedLp] = useState<LessonPlanResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateLp = async () => {
    setIsGeneratingLp(true);
    try {
      const res = await aiService.generateLessonPlan(lpSubject, lpTopic, selectedClass?.gradeLevel || 10);
      setGeneratedLp(res);
      success('Soạn giáo án thành công!', 'Kế hoạch bài dạy chuẩn CV 5512 đã hoàn thành.');
    } finally {
      setIsGeneratingLp(false);
    }
  };

  const handleCopyLp = () => {
    if (!generatedLp) return;
    const text = `
${generatedLp.title}
Môn: ${generatedLp.subject} - Khối: ${generatedLp.gradeLevel} - Thời lượng: ${generatedLp.duration}

I. MỤC TIÊU
1. Kiến thức:
${generatedLp.objectives.knowledge.map((k) => `- ${k}`).join('\n')}
2. Kỹ năng:
${generatedLp.objectives.skills.map((s) => `- ${s}`).join('\n')}

II. TIẾN TRÌNH DẠY HỌC
${generatedLp.activities.map((a) => `${a.phase} (${a.duration}):\n- GV: ${a.teacherActivity}\n- HS: ${a.studentActivity}`).join('\n\n')}

III. ĐÁNH GIÁ & DẶN DÒ:
${generatedLp.assessment}
BTVN: ${generatedLp.homework}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    success('Đã sao chép vào bộ nhớ tạm!', 'Bạn có thể dán vào file Word hoặc Google Docs.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Hỗ trợ Giảng dạy"
        subtitle="Hỗ trợ giáo viên soạn đề kiểm tra, thiết kế kế hoạch bài dạy chuẩn và nhận xét học bạ tự động"
      >
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Giáo viên toàn quyền duyệt & sửa trước khi áp dụng
        </span>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'quiz' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileQuestion className="w-4 h-4 text-blue-600" />
          Soạn đề kiểm tra trắc nghiệm
        </button>
        <button
          onClick={() => setActiveTab('lessonPlan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'lessonPlan' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-purple-600" />
          Soạn Giáo án chuẩn CV 5512
        </button>
      </div>

      {/* TAB 1: QUIZ GENERATOR */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Thiết lập thông số đề kiểm tra
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học</label>
              <select
                value={quizSubject}
                onChange={(e) => setQuizSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
              >
                <option value="Toán học">Toán học</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chủ đề / Chuyên đề kiến thức *</label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="VD: Đồ thị hàm số bậc hai, Quang hợp ở thực vật..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số câu hỏi</label>
                <select
                  value={quizCount}
                  onChange={(e) => setQuizCount(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
                >
                  <option value={3}>3 câu</option>
                  <option value={5}>5 câu</option>
                  <option value={10}>10 câu</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Độ khó</label>
                <select
                  value={quizDifficulty}
                  onChange={(e) => setQuizDifficulty(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
                >
                  <option value="Dễ">Dễ (Nhận biết)</option>
                  <option value="Trung bình">Trung bình (Thông hiểu)</option>
                  <option value="Khó">Khó (Vận dụng cao)</option>
                </select>
              </div>
            </div>

            <button
              disabled={isGeneratingQuiz}
              onClick={handleGenerateQuiz}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {isGeneratingQuiz ? 'AI đang biên soạn câu hỏi...' : 'Tạo đề kiểm tra tự động'}
            </button>
          </div>

          {/* Right Results & Approval */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Xem trước và Biên tập ({generatedQuestions.length} câu hỏi)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Nhấn vào phương án đúng hoặc chỉnh sửa câu hỏi trực tiếp
                </p>
              </div>

              {generatedQuestions.length > 0 && (
                <button
                  onClick={handlePublishQuiz}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Duyệt & Giao cho lớp {selectedClass?.name}
                </button>
              )}
            </div>

            {generatedQuestions.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400">
                Nhập chủ đề ở bên trái và bấm "Tạo đề kiểm tra tự động" để bắt đầu
              </div>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {generatedQuestions.map((q, qIndex) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-blue-700 block mb-1">
                          Câu {qIndex + 1}:
                        </span>
                        <textarea
                          rows={2}
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...generatedQuestions];
                            updated[qIndex].question = e.target.value;
                            setGeneratedQuestions(updated);
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== qIndex));
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Xóa câu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options */}
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs border transition-colors ${
                            q.correctAnswerIndex === optIndex
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswerIndex === optIndex}
                            onChange={() => {
                              const updated = [...generatedQuestions];
                              updated[qIndex].correctAnswerIndex = optIndex;
                              setGeneratedQuestions(updated);
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...generatedQuestions];
                              updated[qIndex].options[optIndex] = e.target.value;
                              setGeneratedQuestions(updated);
                            }}
                            className="flex-1 bg-transparent outline-none"
                          />
                          {q.correctAnswerIndex === optIndex && (
                            <span className="text-[10px] uppercase font-bold text-emerald-600">Đáp án đúng</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="text-[11px] text-slate-500 bg-white/70 p-2 rounded-lg border border-slate-100">
                        <strong>Giải thích:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LESSON PLAN GENERATOR */}
      {activeTab === 'lessonPlan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Thông tin Bài dạy cần soạn
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Môn học</label>
              <input
                type="text"
                value={lpSubject}
                onChange={(e) => setLpSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bài dạy / Chủ đề *</label>
              <input
                type="text"
                value={lpTopic}
                onChange={(e) => setLpTopic(e.target.value)}
                placeholder="VD: Cảm nhận đoạn trích Đất Nước, Định luật Ôm..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
              />
            </div>

            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900">
              Cấu trúc tạo tự động tuân thủ chuẩn Công văn 5512/BGDĐT:
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-purple-800">
                <li>Mục tiêu: Kiến thức, Năng lực, Phẩm chất</li>
                <li>4 hoạt động: Khởi động, Khám phá, Luyện tập, Vận dụng</li>
                <li>Đánh giá & Dặn dò về nhà</li>
              </ul>
            </div>

            <button
              disabled={isGeneratingLp}
              onClick={handleGenerateLp}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {isGeneratingLp ? 'AI đang soạn giáo án...' : 'Bắt đầu soạn kế hoạch bài dạy'}
            </button>
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900">Kế hoạch bài dạy đã tạo</h4>
              {generatedLp && (
                <button
                  onClick={handleCopyLp}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
                </button>
              )}
            </div>

            {!generatedLp ? (
              <div className="text-center py-20 text-xs text-slate-400">
                Nhấn "Bắt đầu soạn kế hoạch bài dạy" để tạo giáo án mẫu hoàn chỉnh
              </div>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1 text-xs text-slate-700 leading-relaxed">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <h3 className="font-extrabold text-base text-slate-900">{generatedLp.title}</h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Môn: {generatedLp.subject} • Khối: {generatedLp.gradeLevel} • Thời lượng: {generatedLp.duration}
                  </p>
                </div>

                {/* Objectives */}
                <div className="space-y-2">
                  <h5 className="font-extrabold text-sm text-slate-900 text-purple-700">I. MỤC TIÊU BÀI DẠY</h5>
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 space-y-2">
                    <p className="font-bold">1. Kiến thức:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {generatedLp.objectives.knowledge.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                    <p className="font-bold mt-2">2. Năng lực & Phẩm chất:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {generatedLp.objectives.skills.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Activities */}
                <div className="space-y-2">
                  <h5 className="font-extrabold text-sm text-slate-900 text-purple-700">II. TIẾN TRÌNH DẠY HỌC</h5>
                  <div className="space-y-2.5">
                    {generatedLp.activities.map((act, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex justify-between font-bold text-slate-900 mb-1">
                          <span>{act.phase}</span>
                          <span className="text-slate-400 font-normal">{act.duration}</span>
                        </div>
                        <p className="mt-1">
                          <strong>Hoạt động GV:</strong> {act.teacherActivity}
                        </p>
                        <p className="mt-1">
                          <strong>Hoạt động HS:</strong> {act.studentActivity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p>
                    <strong>Đánh giá:</strong> {generatedLp.assessment}
                  </p>
                  <p className="mt-1">
                    <strong>Nhiệm vụ về nhà:</strong> {generatedLp.homework}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
