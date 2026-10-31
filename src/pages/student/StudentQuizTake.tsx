import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Award,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { Quiz, QuizQuestion } from '../../types';
import { PageHeader } from '../../components/common/UIComponents';

export const StudentQuizTake: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const student = db.getStudentById('std-10a1-01') || db.getStudents()[0];
  const quizzes = db.getQuizzes(student.classId);
  const activeQuiz = quizzes[0]; // Take first active quiz

  // Quiz state
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(activeQuiz ? activeQuiz.durationMinutes * 60 : 900);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let timer: any = null;
    if (hasStarted && !isSubmitted && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && !isSubmitted && hasStarted) {
      handleSubmitQuiz();
    }
    return () => clearInterval(timer);
  }, [hasStarted, isSubmitted, secondsLeft]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let correctCount = 0;

    activeQuiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    const calculatedScore = parseFloat(((correctCount / activeQuiz.questions.length) * 10).toFixed(1));
    setScore(calculatedScore);
    setIsSubmitted(true);

    db.submitQuizAttempt({
      quizId: activeQuiz.id,
      studentId: student.id,
      studentName: student.fullName,
      startedAt: new Date(Date.now() - (activeQuiz.durationMinutes * 60 - secondsLeft) * 1000).toISOString(),
      score: calculatedScore,
      totalQuestions: activeQuiz.questions.length,
      correctAnswers: correctCount,
      answers: activeQuiz.questions.map((q) => ({
        questionId: q.id,
        selectedIndex: selectedAnswers[q.id] ?? -1,
        isCorrect: selectedAnswers[q.id] === q.correctAnswerIndex
      }))
    });

    if (calculatedScore >= 8) {
      confetti({ particleCount: 80, spread: 70 });
    }
    success('Đã nộp bài kiểm tra!', `Điểm của em: ${calculatedScore} / 10.`);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeQuiz) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
        <p className="text-xs text-slate-500">Hiện tại chưa có đề kiểm tra nào mở cho lớp của em.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Về cổng học tập
        </button>

        {hasStarted && !isSubmitted && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-1.5 rounded-2xl text-xs font-black font-mono">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Thời gian còn lại: {formatTimer(secondsLeft)}</span>
          </div>
        )}
      </div>

      {/* Intro Card (Before start) */}
      {!hasStarted && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full uppercase">
              {activeQuiz.subject}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">{activeQuiz.title}</h2>
            <p className="text-xs text-slate-500 mt-1">Giáo viên ra đề: {activeQuiz.className}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Thời gian</span>
              <strong className="text-slate-800 font-extrabold">{activeQuiz.durationMinutes} phút</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Số câu</span>
              <strong className="text-slate-800 font-extrabold">{activeQuiz.questions.length} câu</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[10px]">Thang điểm</span>
              <strong className="text-slate-800 font-extrabold">10 điểm</strong>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Hệ thống sẽ tự động tính giờ và nộp bài khi hết thời gian quy định. Em hãy chuẩn bị giấy nháp và bấm bắt đầu.
          </p>

          <button
            onClick={() => setHasStarted(true)}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-purple-500/25 transition-all"
          >
            BẮT ĐẦU LÀM BÀI THI
          </button>
        </div>
      )}

      {/* Taking Quiz View */}
      {hasStarted && (
        <div className="space-y-6">
          {/* Result Banner if submitted */}
          {isSubmitted && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg text-center space-y-2 animate-in zoom-in-95 duration-200">
              <Award className="w-10 h-10 mx-auto text-yellow-200" />
              <h3 className="text-2xl font-black">KẾT QUẢ BÀI THI CỦA EM</h3>
              <p className="text-4xl font-black text-yellow-200">{score} / 10 Điểm</p>
              <p className="text-xs text-emerald-100">
                Đúng {Object.values(selectedAnswers).filter((ans, idx) => ans === activeQuiz.questions[idx]?.correctAnswerIndex).length} / {activeQuiz.questions.length} câu hỏi.
              </p>
            </div>
          )}

          {/* Question List */}
          <div className="space-y-5">
            {activeQuiz.questions.map((q, qIndex) => {
              const userSelected = selectedAnswers[q.id];
              const isCorrect = userSelected === q.correctAnswerIndex;

              return (
                <div
                  key={q.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                      <span className="text-blue-600 mr-2">Câu {qIndex + 1}:</span>
                      {q.question}
                    </h4>
                    {isSubmitted && (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                          isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCorrect ? 'Chính xác' : 'Chưa đúng'}
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isOptionSelected = userSelected === optIndex;
                      const isOptionCorrect = q.correctAnswerIndex === optIndex;

                      let optionStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50/50';
                      if (isOptionSelected) {
                        optionStyle = 'bg-blue-50 border-blue-500 text-blue-900 font-bold';
                      }
                      if (isSubmitted) {
                        if (isOptionCorrect) {
                          optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                        } else if (isOptionSelected && !isCorrect) {
                          optionStyle = 'bg-rose-50 border-rose-300 text-rose-800 line-through';
                        }
                      }

                      return (
                        <div
                          key={optIndex}
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${optionStyle}`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isOptionSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {String.fromCharCode(65 + optIndex)}
                          </div>
                          <span className="flex-1">{opt}</span>
                          {isSubmitted && isOptionCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {isSubmitted && q.explanation && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-900">
                      <strong>Lời giải chi tiết:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action */}
          {!isSubmitted ? (
            <div className="text-center py-4">
              <button
                onClick={handleSubmitQuiz}
                className="px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all"
              >
                NỘP BÀI KIỂM TRA
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <button
                onClick={() => navigate('/student/dashboard')}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Hoàn tất & Quay về Trang chủ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
