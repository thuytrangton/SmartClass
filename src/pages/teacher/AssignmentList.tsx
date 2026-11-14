import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Calendar,
  AlertCircle,
  Search,
  Edit3,
  Eye,
  Upload,
  Paperclip,
  Users,
  X,
  RotateCcw,
  Save,
  Sparkles,
  FolderKanban,
  Layers,
  Filter,
  Trash2,
  Archive,
  Copy,
  BellRing,
  Lock,
  CheckSquare,
  Shuffle,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Download,
  Award,
  AlertTriangle,
  HelpCircle,
  ListChecks
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/db';
import {
  questionBankService,
  QuestionItem,
  QuestionType,
  QuestionDifficulty,
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LIST
} from '../../services/questionBankService';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, Modal, StatusChip, EmptyState } from '../../components/common/UIComponents';
import {
  Assignment,
  AssignmentTopic,
  AssignmentQuestionSnapshot,
  Submission
} from '../../types';

type SubModuleTab = 'topics' | 'create' | 'list';
type AssignmentListFilterTab = 'all' | 'ongoing' | 'ended' | 'draft';
type QuestionFormatOption = 'combined' | 'objective' | 'essay';

const COUNT_OPTIONS_1_TO_20 = Array.from({ length: 20 }, (_, i) => i + 1);

interface DelayedTooltipIconButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  icon: React.ReactNode;
  className?: string;
  delayMs?: number;
}

const DelayedTooltipIconButton: React.FC<DelayedTooltipIconButtonProps> = ({
  onClick,
  label,
  icon,
  className = '',
  delayMs = 2000
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setShowTooltip(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative inline-flex items-center justify-center">
      <button
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          handleMouseLeave();
          onClick(e);
        }}
        aria-label={label}
        className={className}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 z-50 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 border border-cyan-500/40 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {label}
        </div>
      )}
    </div>
  );
};

export const AssignmentList: React.FC = () => {
  const { selectedClass, classes: teacherClasses } = useClass();
  const { currentUser: user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Đồng bộ câu hỏi từ Ngân hàng câu hỏi chung
  const [allBankQuestions, setAllBankQuestions] = useState<QuestionItem[]>(() =>
    questionBankService.getAll()
  );
  const [, setDbTick] = useState(0);

  useEffect(() => {
    const unsubBank = questionBankService.subscribe(() => {
      setAllBankQuestions(questionBankService.getAll());
    });
    const unsubDb = db.subscribe(() => {
      setDbTick((t) => t + 1);
    });
    return () => {
      unsubBank();
      unsubDb();
    };
  }, []);

  // Quản lý 3 menu con chuẩn đặc tả: Quản lý chủ đề (topics) | Tạo bài tập (create) | Danh sách bài tập đã giao (list)
  const activeSubModule: SubModuleTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'topics' || tabParam === 'create' || tabParam === 'list') {
      return tabParam;
    }
    if (searchParams.get('openCreate') === '1') {
      return 'create';
    }
    return 'list';
  }, [searchParams]);

  const switchSubModule = (tab: SubModuleTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('openCreate');
    setSearchParams(next, { replace: true });
  };

  // Danh sách lớp giáo viên được phân công phụ trách
  const assignedClasses = useMemo(() => {
    return teacherClasses.length > 0 ? teacherClasses : db.getClasses();
  }, [teacherClasses]);

  // Danh sách môn học trong phạm vi phân công của giáo viên
  const assignedSubjects = useMemo(() => {
    const set = new Set<string>(['Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn', 'Tiếng Anh', 'Tin học']);
    assignedClasses.forEach((c) => {
      (c.subjectNames || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [assignedClasses]);

  const toDateTimeLocalValue = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDateTimeVN = (isoStr?: string) => {
    if (!isoStr) return 'Chưa thiết lập';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Chưa thiết lập';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} – ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ============================================================================
  // PHẦN 1: QUẢN LÝ CHỦ ĐỀ (SUB-MODULE 1: TOPICS)
  // ============================================================================
  const allTopics = db.getTopics();

  // Tính số câu trắc nghiệm & tự luận thực tế trong Ngân hàng câu hỏi cho từng chủ đề
  const topicStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        objectiveCount: number;
        essayCount: number;
        totalCount: number;
        isSufficient: boolean;
        questions: QuestionItem[];
      }
    > = {};

    allTopics.forEach((t) => {
      const matched = allBankQuestions.filter(
        (q) =>
          q.status !== 'archived' &&
          q.status !== 'rejected' &&
          q.topic.trim().toLowerCase() === t.name.trim().toLowerCase() &&
          (!t.subject || q.subject === t.subject)
      );
      const objectiveCount = matched.filter((q) => q.type !== 'essay').length;
      const essayCount = matched.filter((q) => q.type === 'essay').length;
      const targetObj = t.targetObjectiveCount ?? 3;
      const targetEss = t.targetEssayCount ?? 1;
      const isSufficient = objectiveCount >= targetObj && essayCount >= targetEss;

      map[t.id] = {
        objectiveCount,
        essayCount,
        totalCount: matched.length,
        isSufficient,
        questions: matched
      };
    });
    return map;
  }, [allTopics, allBankQuestions]);

  const [topicSearch, setTopicSearch] = useState('');
  const [topicSubjectFilter, setTopicSubjectFilter] = useState('all');
  const [topicClassFilter, setTopicClassFilter] = useState('all');
  const [topicStatusFilter, setTopicStatusFilter] = useState<'all' | 'sufficient' | 'insufficient' | 'archived'>('all');
  const [topicPage, setTopicPage] = useState(1);
  const TOPICS_PER_PAGE = 6;

  // Modal Tạo / Sửa / Xem / Nhân bản / Xóa chủ đề
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<AssignmentTopic | null>(null);
  const [viewingTopic, setViewingTopic] = useState<AssignmentTopic | null>(null);
  const [wordLessonContent, setWordLessonContent] = useState('');
  const [wordFontFamily, setWordFontFamily] = useState<'Times New Roman' | 'Arial' | 'Inter'>('Times New Roman');
  const [wordFontSize, setWordFontSize] = useState<number>(14);
  const [wordIncludeQuestions, setWordIncludeQuestions] = useState<boolean>(true);
  const [duplicatingTopic, setDuplicatingTopic] = useState<AssignmentTopic | null>(null);
  const [duplicateNewName, setDuplicateNewName] = useState('');
  const [duplicateIncludeQuestions, setDuplicateIncludeQuestions] = useState(true);
  const [deletingTopic, setDeletingTopic] = useState<AssignmentTopic | null>(null);
  const [forceHardDeleteTopic, setForceHardDeleteTopic] = useState(false);

  // Form state cho Chủ đề (Nội dung tối đa 8.000 ký tự có bộ đếm)
  const [topicFormName, setTopicFormName] = useState('');
  const [topicFormContent, setTopicFormContent] = useState('');
  const [topicFormSubject, setTopicFormSubject] = useState('Toán học');
  const [topicFormClassId, setTopicFormClassId] = useState(selectedClass?.id || 'cls-10a1');
  const [topicFormChapter, setTopicFormChapter] = useState('Chương 1: Mệnh đề và Tập hợp');
  const [topicFormSessionLabel, setTopicFormSessionLabel] = useState('');
  const [topicFormIsCurrentLesson, setTopicFormIsCurrentLesson] = useState(true);
  const [topicFormTargetObj, setTopicFormTargetObj] = useState(3);
  const [topicFormTargetEssay, setTopicFormTargetEssay] = useState(1);

  // Modal Quản lý câu hỏi theo chủ đề (Mở ngay tại màn hình Giao bài tập hoặc nhảy sang Ngân hàng câu hỏi)
  const [managingTopicQuestions, setManagingTopicQuestions] = useState<AssignmentTopic | null>(null);
  const [quickQuestionType, setQuickQuestionType] = useState<QuestionType>('single_choice');
  const [quickQuestionDifficulty, setQuickQuestionDifficulty] = useState<QuestionDifficulty>('Thông hiểu');
  const [quickQuestionContent, setQuickQuestionContent] = useState('');
  const [quickOptionA, setQuickOptionA] = useState('');
  const [quickOptionB, setQuickOptionB] = useState('');
  const [quickOptionC, setQuickOptionC] = useState('');
  const [quickOptionD, setQuickOptionD] = useState('');
  const [quickCorrectLabel, setQuickCorrectLabel] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [quickRubric, setQuickRubric] = useState('');
  const [quickExplanation, setQuickExplanation] = useState('');

  const filteredTopics = useMemo(() => {
    return allTopics.filter((t) => {
      if (topicStatusFilter === 'archived') {
        if (t.status !== 'archived') return false;
      } else {
        if (t.status === 'archived') return false;
        const stats = topicStatsMap[t.id];
        if (topicStatusFilter === 'sufficient' && !stats?.isSufficient) return false;
        if (topicStatusFilter === 'insufficient' && stats?.isSufficient) return false;
      }
      if (topicSubjectFilter !== 'all' && t.subject !== topicSubjectFilter) return false;
      if (topicClassFilter !== 'all' && t.classId !== topicClassFilter) return false;
      if (topicSearch.trim()) {
        const q = topicSearch.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.chapter || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTopics, topicStatusFilter, topicSubjectFilter, topicClassFilter, topicSearch, topicStatsMap]);

  const totalTopicPages = Math.max(1, Math.ceil(filteredTopics.length / TOPICS_PER_PAGE));
  const paginatedTopics = useMemo(() => {
    const start = (topicPage - 1) * TOPICS_PER_PAGE;
    return filteredTopics.slice(start, start + TOPICS_PER_PAGE);
  }, [filteredTopics, topicPage]);

  // Lấy danh sách buổi học từ Thời khóa biểu của lớp đang chọn trong form chủ đề
  const availableScheduleSessions = useMemo(() => {
    const schedules = db.getSchedules(topicFormClassId);
    const list = schedules.map(
      (s) => `Tiết ${s.period} (${s.startTime}-${s.endTime}) • Thứ ${s.dayOfWeek} - Môn ${s.subject}`
    );
    return [
      'Tiết 1-2 • Thứ 2 (Buổi học hiện tại)',
      'Tiết 3-4 • Thứ 4 (Buổi học hiện tại)',
      'Tiết 1-2 • Thứ 6 (Buổi học trong tuần)',
      'Bài học tuần trước (Ôn tập)',
      ...list
    ];
  }, [topicFormClassId]);

  const handleOpenCreateTopic = () => {
    setEditingTopic(null);
    setTopicFormName('');
    setTopicFormContent('');
    setTopicFormSubject('Toán học');
    setTopicFormClassId(selectedClass?.id || assignedClasses[0]?.id || 'cls-10a1');
    setTopicFormChapter('Chương 1: Mệnh đề và Tập hợp');
    setTopicFormSessionLabel('Tiết 1-2 • Thứ 2 (Buổi học hiện tại)');
    setTopicFormIsCurrentLesson(true);
    setTopicFormTargetObj(3);
    setTopicFormTargetEssay(1);
    setIsTopicModalOpen(true);
  };

  const handleOpenEditTopic = (topic: AssignmentTopic) => {
    setEditingTopic(topic);
    setTopicFormName(topic.name);
    setTopicFormContent(topic.content);
    setTopicFormSubject(topic.subject);
    setTopicFormClassId(topic.classId);
    setTopicFormChapter(topic.chapter || '');
    setTopicFormSessionLabel(topic.sessionLabel || '');
    setTopicFormIsCurrentLesson(Boolean(topic.isCurrentLesson));
    setTopicFormTargetObj(topic.targetObjectiveCount ?? 3);
    setTopicFormTargetEssay(topic.targetEssayCount ?? 1);
    setIsTopicModalOpen(true);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicFormName.trim()) {
      showToast('Vui lòng nhập Tên chủ đề (bắt buộc).', 'error');
      return;
    }
    if (topicFormContent.length > 8000) {
      showToast('Nội dung chủ đề không được vượt quá 8.000 ký tự.', 'error');
      return;
    }
    const targetCls = assignedClasses.find((c) => c.id === topicFormClassId) || assignedClasses[0];

    if (editingTopic) {
      db.updateTopic(editingTopic.id, {
        name: topicFormName.trim(),
        content: topicFormContent.slice(0, 8000),
        subject: topicFormSubject,
        classId: targetCls?.id || 'cls-10a1',
        className: targetCls?.name || '10A1',
        gradeLevel: targetCls?.gradeLevel || 10,
        chapter: topicFormChapter.trim() || 'Chương 1',
        sessionLabel: topicFormSessionLabel.trim() || 'Buổi học hiện tại',
        isCurrentLesson: topicFormIsCurrentLesson,
        targetObjectiveCount: Math.max(0, topicFormTargetObj),
        targetEssayCount: Math.max(0, topicFormTargetEssay)
      });
      showToast(`Đã cập nhật chủ đề "${topicFormName.trim()}".`, 'success');
    } else {
      db.addTopic({
        name: topicFormName.trim(),
        content: topicFormContent.slice(0, 8000),
        subject: topicFormSubject,
        classId: targetCls?.id || 'cls-10a1',
        className: targetCls?.name || '10A1',
        gradeLevel: targetCls?.gradeLevel || 10,
        chapter: topicFormChapter.trim() || 'Chương 1',
        sessionLabel: topicFormSessionLabel.trim() || 'Buổi học hiện tại',
        isCurrentLesson: topicFormIsCurrentLesson,
        targetObjectiveCount: Math.max(0, topicFormTargetObj),
        targetEssayCount: Math.max(0, topicFormTargetEssay),
        status: 'active',
        teacherId: user?.id || 'usr-t1',
        teacherName: user?.name || 'Thầy Nguyễn Văn An'
      });
      showToast(`Đã tạo chủ đề mới "${topicFormName.trim()}".`, 'success');
    }
    setIsTopicModalOpen(false);
  };

  const handleOpenWordLessonPlan = (topic: AssignmentTopic) => {
    setViewingTopic(topic);
    setWordLessonContent(topic.content || '');
  };

  const handleSaveWordLessonPlan = () => {
    if (!viewingTopic) return;
    const trimmed = wordLessonContent.slice(0, 8000);
    db.updateTopic(viewingTopic.id, { content: trimmed });
    setViewingTopic({ ...viewingTopic, content: trimmed });
    showToast(`Đã lưu nội dung Giáo án giảng dạy của chủ đề "${viewingTopic.name}"!`, 'success');
  };

  const handleExportWordDoc = () => {
    if (!viewingTopic) return;
    const stats = topicStatsMap[viewingTopic.id];
    const questionsHtml =
      wordIncludeQuestions && stats?.questions.length
        ? `<h3 style="margin-top:18pt;font-size:13pt;text-transform:uppercase;">III. HỆ THỐNG CÂU HỎI & BÀI TẬP THEO CHỦ ĐỀ (${stats.questions.length} CÂU)</h3>` +
          stats.questions
            .map(
              (q, idx) =>
                `<p style="margin:6pt 0;"><strong>Câu ${idx + 1} (${QUESTION_TYPE_LABELS[q.type]} - ${q.difficulty}):</strong> ${q.content}</p>` +
                (q.options?.length
                  ? `<ul style="margin:4pt 0 8pt 18pt;">${q.options
                      .map(
                        (opt) =>
                          `<li><strong>${opt.label}.</strong> ${opt.text} ${
                            opt.isCorrect ? '<em>(Đáp án đúng)</em>' : ''
                          }</li>`
                      )
                      .join('')}</ul>`
                  : q.rubric
                  ? `<p style="margin:2pt 0 8pt 12pt;font-style:italic;">Hướng dẫn chấm: ${q.rubric}</p>`
                  : '')
            )
            .join('')
        : '';

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Giáo án - ${viewingTopic.name}</title></head>
      <body style="font-family:'${wordFontFamily}',serif;font-size:${wordFontSize}pt;line-height:1.5;color:#111827;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:16pt;">
          <tr>
            <td style="width:45%;text-align:center;vertical-align:top;">
              <strong>TRƯỜNG THPT SMARTCLASS 4.0</strong><br/>
              <span>TỔ CHUYÊN MÔN: ${viewingTopic.subject.toUpperCase()}</span>
            </td>
            <td style="width:55%;text-align:center;vertical-align:top;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
              <strong>Độc lập - Tự do - Hạnh phúc</strong>
            </td>
          </tr>
        </table>
        <div style="text-align:center;margin-bottom:16pt;">
          <h2 style="margin:0;font-size:15pt;text-transform:uppercase;">KẾ HOẠCH BÀI DẠY (GIÁO ÁN GIẢNG DẠY)</h2>
          <h3 style="margin:6pt 0;font-size:13pt;">CHỦ ĐỀ: ${viewingTopic.name.toUpperCase()}</h3>
          <p style="margin:0;font-style:italic;">Môn học: ${viewingTopic.subject} | Lớp: ${viewingTopic.className} (Khối ${viewingTopic.gradeLevel}) | Phân phối: ${viewingTopic.sessionLabel || viewingTopic.chapter || '2 tiết'}</p>
        </div>
        <h3 style="font-size:13pt;text-transform:uppercase;">I. MỤC TIÊU BÀI HỌC & YÊU CẦU CẦN ĐẠT</h3>
        <p>- Nắm vững kiến thức trọng tâm thuộc chủ đề <strong>${viewingTopic.name}</strong> (${viewingTopic.chapter || viewingTopic.subject}).<br/>
        - Vận dụng giải quyết bài tập trắc nghiệm (${viewingTopic.targetObjectiveCount || 3} câu) và tự luận (${viewingTopic.targetEssayCount || 1} câu).</p>
        <h3 style="font-size:13pt;text-transform:uppercase;">II. NỘI DUNG BÀI GIẢNG & TIẾN TRÌNH DẠY HỌC</h3>
        <div style="white-space:pre-line;">${wordLessonContent}</div>
        ${questionsHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Giao_An_${viewingTopic.name.replace(/\s+/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file Giáo án Word (.doc) thành công!', 'success');
  };

  const handleOpenDuplicateTopic = (topic: AssignmentTopic) => {
    setDuplicatingTopic(topic);
    setDuplicateNewName(`${topic.name} (Bản sao)`);
    setDuplicateIncludeQuestions(true);
  };

  const handleConfirmDuplicateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicatingTopic) return;
    const finalName = duplicateNewName.trim() || `${duplicatingTopic.name} (Bản sao)`;
    const clonedTopic = db.duplicateTopic(duplicatingTopic.id, finalName);
    if (!clonedTopic) return;

    let copiedQCount = 0;
    if (duplicateIncludeQuestions) {
      const sourceQuestions = topicStatsMap[duplicatingTopic.id]?.questions || [];
      if (sourceQuestions.length > 0) {
        const batchPayload = sourceQuestions.map((q) => ({
          ...q,
          topic: clonedTopic.name,
          subject: clonedTopic.subject,
          gradeLevel: clonedTopic.gradeLevel,
          className: clonedTopic.className,
          chapter: clonedTopic.chapter || q.chapter,
          sourceNote: `Nhân bản từ chủ đề "${duplicatingTopic.name}"`
        }));
        const createdQs = questionBankService.createBatch(batchPayload);
        copiedQCount = createdQs.length;
      }
    }

    showToast(
      duplicateIncludeQuestions && copiedQCount > 0
        ? `Đã nhân bản chủ đề "${clonedTopic.name}" kèm ${copiedQCount} câu hỏi thành công!`
        : `Đã nhân bản chủ đề "${clonedTopic.name}" thành công!`,
      'success'
    );
    setDuplicatingTopic(null);
  };

  const handleConfirmDeleteTopic = () => {
    if (!deletingTopic) return;
    const result = db.deleteOrArchiveTopic(deletingTopic.id, forceHardDeleteTopic);
    if (result.mode === 'archived') {
      showToast(
        `Chủ đề "${deletingTopic.name}" đang được bài tập tham chiếu nên hệ thống đã chuyển sang Lưu trữ/Ẩn để bảo toàn lịch sử.`,
        'info'
      );
    } else {
      showToast(`Đã xóa chủ đề "${deletingTopic.name}".`, 'success');
    }
    setDeletingTopic(null);
    setForceHardDeleteTopic(false);
  };

  // Thêm câu hỏi trực tiếp vào Ngân hàng câu hỏi chung và tự động gắn Chủ đề đang chọn
  const handleQuickAddQuestionToTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTopicQuestions) return;
    if (!quickQuestionContent.trim()) {
      showToast('Vui lòng nhập nội dung câu hỏi.', 'error');
      return;
    }

    const isEssay = quickQuestionType === 'essay';
    if (!isEssay && (!quickOptionA.trim() || !quickOptionB.trim())) {
      showToast('Vui lòng nhập tối thiểu phương án A và B cho câu trắc nghiệm.', 'error');
      return;
    }

    questionBankService.create({
      subject: managingTopicQuestions.subject || 'Toán học',
      gradeLevel: managingTopicQuestions.gradeLevel || 10,
      className: managingTopicQuestions.className || '10A1',
      chapter: managingTopicQuestions.chapter || 'Chương 1: Mệnh đề và Tập hợp',
      topic: managingTopicQuestions.name,
      type: quickQuestionType,
      difficulty: quickQuestionDifficulty,
      status: 'approved',
      content: quickQuestionContent.trim(),
      options: isEssay
        ? []
        : [
            { id: 'opt-a', label: 'A', text: quickOptionA.trim(), isCorrect: quickCorrectLabel === 'A' },
            { id: 'opt-b', label: 'B', text: quickOptionB.trim(), isCorrect: quickCorrectLabel === 'B' },
            { id: 'opt-c', label: 'C', text: quickOptionC.trim() || 'Phương án C', isCorrect: quickCorrectLabel === 'C' },
            { id: 'opt-d', label: 'D', text: quickOptionD.trim() || 'Phương án D', isCorrect: quickCorrectLabel === 'D' }
          ],
      statements: [],
      acceptedAnswers: [],
      rubric: isEssay ? quickRubric.trim() || 'Trình bày rõ lập luận và kết quả chính xác.' : '',
      maxPoints: isEssay ? 2 : 1,
      explanation: quickExplanation.trim() || 'Áp dụng kiến thức trọng tâm của chủ đề.',
      tags: [managingTopicQuestions.name, managingTopicQuestions.subject],
      source: 'manual',
      authorName: user?.name || 'Thầy Nguyễn Văn An'
    });

    setQuickQuestionContent('');
    setQuickOptionA('');
    setQuickOptionB('');
    setQuickOptionC('');
    setQuickOptionD('');
    setQuickRubric('');
    setQuickExplanation('');
    showToast(
      `Đã thêm câu hỏi mới vào Ngân hàng chung và gắn chủ đề "${managingTopicQuestions.name}"!`,
      'success'
    );
  };

  // ============================================================================
  // PHẦN 2: TẠO BÀI TẬP 4 BƯỚC (SUB-MODULE 2: CREATE WIZARD)
  // ============================================================================
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Bước 1: Chọn nguồn
  const [assignmentType, setAssignmentType] = useState<'homework' | 'test'>('homework');
  const [wizardSubject, setWizardSubject] = useState<string>('Toán học');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(['top-1']);
  const [showOldTopics, setShowOldTopics] = useState<boolean>(true);

  // Bước 2: Cấu hình câu hỏi
  const [questionFormat, setQuestionFormat] = useState<QuestionFormatOption>('combined');
  const [objectiveCount, setObjectiveCount] = useState<number>(3);
  const [essayCount, setEssayCount] = useState<number>(1);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectionMode, setSelectionMode] = useState<'random' | 'manual'>('random');
  const [manualSelectedQuestionIds, setManualSelectedQuestionIds] = useState<string[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [extraRequirementTarget, setExtraRequirementTarget] = useState<'student_instruction' | 'question_filter'>(
    'student_instruction'
  );
  const [extraRequirementNote, setExtraRequirementNote] = useState<string>('');

  // Bước 3: Giao bài
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [wizardDescription, setWizardDescription] = useState<string>('');
  const [targetClassIds, setTargetClassIds] = useState<string[]>(() =>
    selectedClass?.id ? [selectedClass.id] : [assignedClasses[0]?.id || 'cls-10a1']
  );
  const [openAtLocal, setOpenAtLocal] = useState<string>(() => toDateTimeLocalValue(new Date().toISOString()));
  const [dueDateLocal, setDueDateLocal] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [maxAttempts, setMaxAttempts] = useState<number>(1);
  const [latePolicy, setLatePolicy] = useState<'allow_marked_late' | 'disallow_after_due' | 'deduct_points'>(
    'allow_marked_late'
  );
  const [latePenaltyPercent, setLatePenaltyPercent] = useState<number>(10);
  const [totalPoints, setTotalPoints] = useState<number>(10);
  const [showResultPolicy, setShowResultPolicy] = useState<'immediately' | 'after_due' | 'after_grading'>(
    'after_grading'
  );
  const [customPointsMap, setCustomPointsMap] = useState<Record<string, number>>({});
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Bước 4: Xem trước & Modal xác nhận phát hành
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState<boolean>(false);

  // Tự động chọn lớp nếu mở từ trang chi tiết lớp (?classId=...)
  useEffect(() => {
    const classIdParam = searchParams.get('classId');
    if (classIdParam && assignedClasses.some((c) => c.id === classIdParam)) {
      setTargetClassIds([classIdParam]);
    }
  }, [searchParams, assignedClasses]);

  // Danh sách chủ đề khả dụng trong Bước 1 (ưu tiên bài học hiện tại, cho phép chọn bài cũ để ôn tập)
  const availableWizardTopics = useMemo(() => {
    return allTopics
      .filter((t) => t.status === 'active' && (!wizardSubject || t.subject === wizardSubject))
      .sort((a, b) => Number(Boolean(b.isCurrentLesson)) - Number(Boolean(a.isCurrentLesson)));
  }, [allTopics, wizardSubject]);

  const selectedTopicObjects = useMemo(() => {
    return allTopics.filter((t) => selectedTopicIds.includes(t.id));
  }, [allTopics, selectedTopicIds]);

  // Các câu hỏi khả dụng từ Ngân hàng câu hỏi theo Chủ đề đã chọn + Độ khó + Tiêu chí lọc (nếu có)
  const matchingBankQuestions = useMemo(() => {
    const topicNamesLower = selectedTopicObjects.map((t) => t.name.trim().toLowerCase());
    return allBankQuestions.filter((q) => {
      if (q.status === 'archived' || q.status === 'rejected') return false;
      if ( !topicNamesLower.includes(q.topic.trim().toLowerCase())) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (
        extraRequirementTarget === 'question_filter' &&
        extraRequirementNote.trim()
      ) {
        const kw = extraRequirementNote.trim().toLowerCase();
        const inContent = q.content.toLowerCase().includes(kw);
        const inTags = q.tags.some((tg) => tg.toLowerCase().includes(kw));
        if (!inContent && !inTags) return false;
      }
      return true;
    });
  }, [allBankQuestions, selectedTopicObjects, difficultyFilter, extraRequirementTarget, extraRequirementNote]);

  const availableObjectiveQuestions = useMemo(
    () => matchingBankQuestions.filter((q) => q.type !== 'essay'),
    [matchingBankQuestions]
  );

  const availableEssayQuestions = useMemo(
    () => matchingBankQuestions.filter((q) => q.type === 'essay'),
    [matchingBankQuestions]
  );

  // Số câu yêu cầu thực tế theo Dạng bài đang chọn
  const effectiveObjectiveNeed = questionFormat === 'essay' ? 0 : objectiveCount;
  const effectiveEssayNeed = questionFormat === 'objective' ? 0 : essayCount;

  const isObjectiveShortage = effectiveObjectiveNeed > availableObjectiveQuestions.length;
  const isEssayShortage = effectiveEssayNeed > availableEssayQuestions.length;
  const hasQuestionShortage = isObjectiveShortage || isEssayShortage;

  // Danh sách câu hỏi được chọn để tạo Snapshot
  const selectedQuestionsForAssignment = useMemo(() => {
    if (selectionMode === 'manual' && manualSelectedQuestionIds.length > 0) {
      return matchingBankQuestions.filter((q) => manualSelectedQuestionIds.includes(q.id));
    }
    const chosenObj = availableObjectiveQuestions.slice(0, effectiveObjectiveNeed);
    const chosenEss = availableEssayQuestions.slice(0, effectiveEssayNeed);
    return [...chosenObj, ...chosenEss];
  }, [
    selectionMode,
    manualSelectedQuestionIds,
    matchingBankQuestions,
    availableObjectiveQuestions,
    availableEssayQuestions,
    effectiveObjectiveNeed,
    effectiveEssayNeed
  ]);

  // Xây dựng Snapshot câu hỏi + điểm từng câu
  const builtSnapshots: AssignmentQuestionSnapshot[] = useMemo(() => {
    const count = selectedQuestionsForAssignment.length;
    if (count === 0) return [];
    const defaultPointPerQ = Number((totalPoints / count).toFixed(2));

    return selectedQuestionsForAssignment.map((q) => ({
      questionId: q.id,
      code: q.code,
      topic: q.topic,
      chapter: q.chapter,
      type: q.type,
      difficulty: q.difficulty,
      content: q.content,
      options: q.options ? q.options.map((o) => ({ ...o })) : [],
      statements: q.statements ? q.statements.map((s) => ({ ...s })) : [],
      acceptedAnswers: q.acceptedAnswers ? [...q.acceptedAnswers] : [],
      rubric: q.rubric,
      points: customPointsMap[q.id] !== undefined ? customPointsMap[q.id] : defaultPointPerQ,
      explanation: q.explanation
    }));
  }, [selectedQuestionsForAssignment, totalPoints, customPointsMap]);

  const snapshotPointsSum = useMemo(() => {
    return Number(builtSnapshots.reduce((acc, s) => acc + (s.points || 0), 0).toFixed(2));
  }, [builtSnapshots]);

  const toggleSelectTopicInWizard = (topicId: string) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleTargetClass = (clsId: string) => {
    setTargetClassIds((prev) =>
      prev.includes(clsId) ? (prev.length > 1 ? prev.filter((id) => id !== clsId) : prev) : [...prev, clsId]
    );
  };

  const handleValidateStep = (step: 1 | 2 | 3): boolean => {
    if (step === 1) {
      if (selectedTopicIds.length === 0) {
        showToast('Bước 1: Vui lòng chọn ít nhất 1 chủ đề bài học để tạo bài tập.', 'error');
        return false;
      }
      // Tự động gợi ý tên bài tập nếu đang trống
      if (!wizardTitle.trim() && selectedTopicObjects.length > 0) {
        const prefix = assignmentType === 'test' ? 'Bài kiểm tra' : 'Bài tập về nhà';
        setWizardTitle(`${prefix}: ${selectedTopicObjects.map((t) => t.name).join(' & ')}`);
      }
      if (!wizardDescription.trim() && selectedTopicObjects.length > 0) {
        setWizardDescription(
          selectedTopicObjects.map((t) => `• ${t.name}: ${t.content}`).join('\n')
        );
      }
      return true;
    }

    if (step === 2) {
      if (hasQuestionShortage) {
        showToast(
          'Số câu hỏi được chọn đang vượt quá số câu khả dụng trong Ngân hàng của chủ đề. Vui lòng bổ sung câu hỏi hoặc giảm số câu.',
          'error'
        );
        return false;
      }
      if (selectedQuestionsForAssignment.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 câu hỏi cho bài tập.', 'error');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!wizardTitle.trim()) {
        showToast('Vui lòng nhập Tên bài tập.', 'error');
        return false;
      }
      if (targetClassIds.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 lớp nhận bài.', 'error');
        return false;
      }
      if (!dueDateLocal) {
        showToast('Vui lòng thiết lập Hạn nộp bài (Ngày & Giờ).', 'error');
        return false;
      }
      const openMs = openAtLocal ? new Date(openAtLocal).getTime() : Date.now();
      const dueMs = new Date(dueDateLocal).getTime();
      if (dueMs <= openMs) {
        showToast('Hạn nộp bài phải diễn ra sau Thời điểm mở bài.', 'error');
        return false;
      }
      if (totalPoints <= 0) {
        showToast('Tổng điểm bài tập phải lớn hơn 0.', 'error');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSaveOrPublishWizard = (targetStatus: 'draft' | 'published') => {
    if (targetStatus === 'published') {
      if (!handleValidateStep(1) || !handleValidateStep(2) || !handleValidateStep(3)) return;
    } else if (!wizardTitle.trim()) {
      showToast('Vui lòng nhập Tên bài tập trước khi lưu bản nháp.', 'error');
      return;
    }

    const chosenClasses = assignedClasses.filter((c) => targetClassIds.includes(c.id));
    const primaryClass = chosenClasses[0] || assignedClasses[0];
    const openIso = openAtLocal ? new Date(openAtLocal).toISOString() : new Date().toISOString();
    const dueIso = dueDateLocal ? new Date(dueDateLocal).toISOString() : '';

    const instructionsText =
      extraRequirementTarget === 'student_instruction' && extraRequirementNote.trim()
        ? extraRequirementNote.trim()
        : undefined;

    const created = db.addAssignment({
      title: wizardTitle.trim(),
      description:
        wizardDescription.trim() ||
        `Bài tập theo chủ đề: ${selectedTopicObjects.map((t) => t.name).join(', ')}`,
      instructions: instructionsText,
      subject: wizardSubject,
      classId: primaryClass?.id || 'cls-10a1',
      className: chosenClasses.map((c) => c.name).join(', ') || '10A1',
      targetClassIds: chosenClasses.map((c) => c.id),
      targetClassNames: chosenClasses.map((c) => c.name),
      teacherId: user?.id || 'usr-t1',
      teacherName: user?.name || 'Thầy Nguyễn Văn An',
      openAt: openIso,
      dueDate: dueIso,
      durationMinutes,
      maxAttempts,
      latePolicy,
      latePenaltyPercent: latePolicy === 'deduct_points' ? latePenaltyPercent : 0,
      showResultPolicy,
      assignmentType,
      topicIds: selectedTopicObjects.map((t) => t.id),
      topicNames: selectedTopicObjects.map((t) => t.name),
      questionFormat,
      objectiveCount: effectiveObjectiveNeed,
      essayCount: effectiveEssayNeed,
      difficultyFilter,
      selectionMode,
      shuffleQuestions,
      shuffleOptions,
      extraRequirementNote: extraRequirementNote.trim(),
      extraRequirementTarget,
      questionSnapshots: builtSnapshots,
      totalPoints,
      status: targetStatus,
      totalStudents: chosenClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0),
      attachmentName: attachmentName || undefined,
      attachmentSize: attachmentSize || undefined
    });

    setIsPublishConfirmOpen(false);

    if (targetStatus === 'published') {
      showToast(
        `Đã phát hành "${created.title}" kèm Snapshot ${builtSnapshots.length} câu hỏi tới lớp ${created.className} (${created.totalStudents} học sinh)!`,
        'success'
      );
    } else {
      showToast(`Đã lưu bản nháp "${created.title}".`, 'info');
    }

    // Chuyển sang Danh sách bài tập đã giao
    setWizardStep(1);
    switchSubModule('list');
  };

  // ============================================================================
  // PHẦN 3: DANH SÁCH BÀI TẬP ĐÃ GIAO (SUB-MODULE 3: LIST & GRADING)
  // ============================================================================
  const [listFilterTab, setListFilterTab] = useState<AssignmentListFilterTab>('all');
  const [listClassFilter, setListClassFilter] = useState<string>('all');
  const [listSubjectFilter, setListSubjectFilter] = useState<string>('all');
  const [listTopicFilter, setListTopicFilter] = useState<string>('all');
  const [listDateFrom, setListDateFrom] = useState<string>('');
  const [listDateTo, setListDateTo] = useState<string>('');
  const [listSearchQuery, setListSearchQuery] = useState<string>('');

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [studentFilterInDetail, setStudentFilterInDetail] = useState<
    'all' | 'submitted' | 'late' | 'unsubmitted' | 'graded'
  >('all');
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});
  const [editingFeedbacks, setEditingFeedbacks] = useState<Record<string, string>>({});

  // Modal chỉnh sửa thông tin bài tập đã giao (khóa sửa câu hỏi ngầm nếu đã có học sinh nộp)
  const [editingMetaAsn, setEditingMetaAsn] = useState<Assignment | null>(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDueDateLocal, setMetaDueDateLocal] = useState('');
  const [metaInstructions, setMetaInstructions] = useState('');

  const allAssignments = db.getAssignments();

  const filteredAssignments = useMemo(() => {
    const nowMs = Date.now();
    return allAssignments.filter((asn) => {
      // Tab filter: Tất cả | Đang diễn ra | Đã kết thúc | Bản nháp
      if (listFilterTab === 'draft' && asn.status !== 'draft') return false;
      if (listFilterTab === 'ongoing') {
        const isClosed = asn.status === 'closed' || (asn.dueDate && new Date(asn.dueDate).getTime() < nowMs);
        if (asn.status !== 'published' || isClosed) return false;
      }
      if (listFilterTab === 'ended') {
        const isEnded = asn.status === 'closed' || (asn.status === 'published' && asn.dueDate && new Date(asn.dueDate).getTime() < nowMs);
        if (!isEnded) return false;
      }

      if (listClassFilter !== 'all') {
        const inClass =
          asn.classId === listClassFilter ||
          (asn.targetClassIds && asn.targetClassIds.includes(listClassFilter));
        if (!inClass) return false;
      }
      if (listSubjectFilter !== 'all' && asn.subject !== listSubjectFilter) return false;
      if (listTopicFilter !== 'all') {
        const hasTopic =
          (asn.topicIds && asn.topicIds.includes(listTopicFilter)) ||
          (asn.topicNames && asn.topicNames.includes(listTopicFilter));
        if (!hasTopic) return false;
      }
      if (listDateFrom) {
        const fromMs = new Date(listDateFrom).getTime();
        const asnMs = new Date(asn.assignedAt || asn.createdAt).getTime();
        if (asnMs < fromMs) return false;
      }
      if (listDateTo) {
        const toMs = new Date(listDateTo).getTime() + 86400000;
        const asnMs = new Date(asn.assignedAt || asn.createdAt).getTime();
        if (asnMs > toMs) return false;
      }
      if (listSearchQuery.trim()) {
        const q = listSearchQuery.toLowerCase();
        return (
          asn.title.toLowerCase().includes(q) ||
          asn.subject.toLowerCase().includes(q) ||
          asn.className.toLowerCase().includes(q) ||
          (asn.topicNames || []).some((tn) => tn.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [
    allAssignments,
    listFilterTab,
    listClassFilter,
    listSubjectFilter,
    listTopicFilter,
    listDateFrom,
    listDateTo,
    listSearchQuery
  ]);

  // Danh sách học sinh của bài tập đang xem chi tiết
  const assignmentStudentRows = useMemo(() => {
    if (!selectedAssignment) return [];
    const targetIds =
      selectedAssignment.targetClassIds && selectedAssignment.targetClassIds.length > 0
        ? selectedAssignment.targetClassIds
        : [selectedAssignment.classId];

    const classStudents = db
      .getStudents()
      .filter((s) => targetIds.includes(s.classId) && s.status === 'active');
    const existingSubmissions = db.getSubmissions(selectedAssignment.id);
    const dueMs = selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).getTime() : Infinity;

    return classStudents.map((student) => {
      const sub = existingSubmissions.find((s) => s.studentId === student.id);
      let derivedStatus: 'submitted' | 'late' | 'graded' | 'redo_requested' | 'unsubmitted' = 'unsubmitted';
      let isLate = false;

      if (sub) {
        const subMs = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        isLate = sub.isLate ?? subMs > dueMs;
        if (sub.status === 'graded') derivedStatus = 'graded';
        else if (sub.status === 'redo_requested') derivedStatus = 'redo_requested';
        else if (sub.status === 'late' || isLate) derivedStatus = 'late';
        else if (sub.status === 'submitted') derivedStatus = 'submitted';
      }

      return {
        student,
        submission: sub || null,
        derivedStatus,
        isLate
      };
    });
  }, [selectedAssignment, allAssignments]);

  const filteredStudentRows = useMemo(() => {
    return assignmentStudentRows.filter((row) => {
      if (studentFilterInDetail === 'all') return true;
      if (studentFilterInDetail === 'unsubmitted') return row.derivedStatus === 'unsubmitted';
      if (studentFilterInDetail === 'late') return row.isLate || row.derivedStatus === 'late';
      if (studentFilterInDetail === 'graded') return row.derivedStatus === 'graded';
      if (studentFilterInDetail === 'submitted') {
        return row.derivedStatus === 'submitted' || row.derivedStatus === 'late' || row.derivedStatus === 'graded';
      }
      return true;
    });
  }, [assignmentStudentRows, studentFilterInDetail]);

  const handleExportResultsExcel = (asn: Assignment) => {
    const rows = assignmentStudentRows.map((r, index) => ({
      STT: index + 1,
      'Mã HS': r.student.code,
      'Họ và tên': r.student.fullName,
      Lớp: r.student.className,
      'Trạng thái nộp':
        r.derivedStatus === 'graded'
          ? 'Đã chấm'
          : r.derivedStatus === 'late'
          ? 'Nộp muộn'
          : r.derivedStatus === 'submitted'
          ? 'Đã nộp đúng hạn'
          : 'Chưa nộp',
      'Thời gian nộp': r.submission ? formatDateTimeVN(r.submission.submittedAt) : '-',
      'Điểm trắc nghiệm': r.submission?.objectiveScore ?? '-',
      'Tổng điểm': r.submission?.score !== undefined ? `${r.submission.score}/${asn.totalPoints}` : '-',
      'Nhận xét của GV': r.submission?.feedback || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KetQuaBaiTap');
    XLSX.writeFile(wb, `KetQua_${asn.title.replace(/\s+/g, '_')}.xlsx`);
    showToast(`Đã xuất file Excel kết quả bài tập "${asn.title}"!`, 'success');
  };

  const handleOpenEditMeta = (asn: Assignment) => {
    setEditingMetaAsn(asn);
    setMetaTitle(asn.title);
    setMetaDueDateLocal(toDateTimeLocalValue(asn.dueDate));
    setMetaInstructions(asn.instructions || '');
  };

  const handleSaveMetaEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetaAsn) return;
    if (!metaTitle.trim() || !metaDueDateLocal) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và hạn nộp mới.', 'error');
      return;
    }
    const newDueIso = new Date(metaDueDateLocal).toISOString();
    db.updateAssignment(editingMetaAsn.id, {
      title: metaTitle.trim(),
      instructions: metaInstructions.trim() || undefined
    });
    if (newDueIso !== editingMetaAsn.dueDate) {
      db.updateAssignmentDeadline(editingMetaAsn.id, newDueIso, user?.name || 'Thầy Nguyễn Văn An');
    }
    showToast(`Đã cập nhật thông tin bài tập "${metaTitle.trim()}".`, 'success');
    setEditingMetaAsn(null);
  };

  const handleSaveGrade = (sub: Submission, maxPoints: number, status: 'graded' | 'redo_requested' = 'graded') => {
    const rawScore = editingScores[sub.id] !== undefined ? editingScores[sub.id] : String(sub.score ?? '');
    const feedback =
      editingFeedbacks[sub.id] !== undefined
        ? editingFeedbacks[sub.id]
        : sub.feedback || (status === 'graded' ? 'Hoàn thành tốt yêu cầu bài tập!' : 'Em cần bổ sung và làm lại bài.');

    let numericScore: number | undefined = undefined;
    if (status === 'graded') {
      numericScore = parseFloat(rawScore);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > maxPoints) {
        showToast(`Vui lòng nhập điểm hợp lệ từ 0 đến ${maxPoints}.`, 'error');
        return;
      }
    }

    db.gradeSubmission(sub.id, numericScore, feedback, user?.name || 'Thầy Nguyễn Văn An', status);
    showToast(
      status === 'graded'
        ? `Đã lưu điểm (${numericScore}/${maxPoints}) cho học sinh ${sub.studentName}.`
        : `Đã gửi yêu cầu làm lại bài cho học sinh ${sub.studentName}.`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Giao Bài Tập Thông Minh (SmartClass 4.0)"
        subtitle="Quản lý chủ đề bài học, cấu hình đề kết hợp Trắc nghiệm & Tự luận từ Ngân hàng câu hỏi chung và theo dõi tiến độ nộp bài"
        badge={
          activeSubModule === 'topics'
            ? '1. Quản lý chủ đề'
            : activeSubModule === 'create'
            ? '2. Tạo bài tập (4 bước)'
            : '3. Danh sách bài tập đã giao'
        }
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/teacher/quizzes?manageTopic=1')}
            title="[Quản lý câu hỏi theo chủ đề] Mở Ngân hàng câu hỏi theo chủ đề"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
          >
            <FolderKanban className="w-4 h-4 text-cyan-400" />
            <span>Quản lý câu hỏi theo chủ đề</span>
          </button>
          {activeSubModule !== 'create' && (
            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                switchSubModule('create');
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tạo bài tập mới
            </button>
          )}
        </div>
      </PageHeader>

      {/* Thanh điều hướng 3 Menu con & Bộ lọc tìm kiếm Chủ đề ngay tại vị trí đầu trang */}
      <div className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => switchSubModule('topics')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubModule === 'topics'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>1. Quản lý chủ đề</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                {allTopics.filter((t) => t.status === 'active').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchSubModule('create')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubModule === 'create'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>2. Tạo bài tập (Quy trình 4 bước)</span>
            </button>

            <button
              type="button"
              onClick={() => switchSubModule('list')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubModule === 'list'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>3. Danh sách bài tập đã giao</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20">
                {allAssignments.length}
              </span>
            </button>
          </div>

          {activeSubModule === 'topics' ? (
            <button
              type="button"
              onClick={handleOpenCreateTopic}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm chủ đề mới
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Liên kết trực tiếp Ngân hàng câu hỏi chung ({allBankQuestions.length} câu)</span>
            </div>
          )}
        </div>

        {/* Hàng tìm kiếm & lọc chủ đề: 1. Textbox tìm kiếm chủ đề -> 2. Combobox Tất cả các lớp -> 3. Combobox môn học -> 4. Combobox trạng thái */}
        {activeSubModule === 'topics' && (
          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Textbox tìm kiếm chủ đề */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => {
                  setTopicSearch(e.target.value);
                  setTopicPage(1);
                }}
                placeholder="Tìm kiếm chủ đề..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* 2. Combobox Tất cả các lớp */}
            <select
              value={topicClassFilter}
              onChange={(e) => {
                setTopicClassFilter(e.target.value);
                setTopicPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Tất cả các lớp</option>
              {assignedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  Lớp {c.name}
                </option>
              ))}
            </select>

            {/* 3. Combobox Môn học */}
            <select
              value={topicSubjectFilter}
              onChange={(e) => {
                setTopicSubjectFilter(e.target.value);
                setTopicPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Tất cả môn học</option>
              {assignedSubjects.map((s) => (
                <option key={s} value={s}>
                  Môn: {s}
                </option>
              ))}
            </select>

            {/* 4. Combobox Trạng thái */}
            <select
              value={topicStatusFilter}
              onChange={(e) => {
                setTopicStatusFilter(e.target.value as any);
                setTopicPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="sufficient">Đủ câu hỏi</option>
              <option value="insufficient">Thiếu câu hỏi</option>
              <option value="archived">Đã lưu trữ / Ẩn</option>
            </select>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MÀN HÌNH 1: QUẢN LÝ CHỦ ĐỀ (TOPICS)                                   */}
      {/* ===================================================================== */}
      {activeSubModule === 'topics' && (
        <div className="space-y-5">

          {/* Bảng danh sách chủ đề */}
          {paginatedTopics.length === 0 ? (
            <EmptyState
              title="Chưa có chủ đề nào phù hợp bộ lọc"
              description="Hãy tạo chủ đề bài học mới và gắn câu hỏi từ Ngân hàng câu hỏi để sử dụng cho nhiều bài tập."
              icon={FolderKanban}
              actionText="+ Tạo chủ đề đầu tiên"
              onAction={handleOpenCreateTopic}
            />
          ) : (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Tên chủ đề & Icon Quản lý câu hỏi</th>
                      <th className="py-3.5 px-3">Môn học</th>
                      <th className="py-3.5 px-3">Lớp / Buổi học</th>
                      <th className="py-3.5 px-3 text-center">Số câu Trắc nghiệm</th>
                      <th className="py-3.5 px-3 text-center">Số câu Tự luận</th>
                      <th className="py-3.5 px-3 text-center">Trạng thái câu hỏi</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {paginatedTopics.map((topic) => {
                      const stats = topicStatsMap[topic.id] || {
                        objectiveCount: 0,
                        essayCount: 0,
                        totalCount: 0,
                        isSufficient: false,
                        questions: []
                      };
                      const isReferenced = db.isTopicReferencedByAssignments(topic.id, topic.name);

                      return (
                        <tr key={topic.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4 max-w-md">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-slate-100 text-sm">
                                    {topic.name}
                                  </span>
                                  {topic.isCurrentLesson && (
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/50 text-[10px] font-bold">
                                      Bài học hiện tại
                                    </span>
                                  )}
                                  {topic.status === 'archived' && (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">
                                      Đã lưu trữ
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                                  {topic.content}
                                </p>
                              </div>

                              {/* Icon [Quản lý câu hỏi theo chủ đề] cạnh tên chủ đề (Chỉ hiện icon, giữ chuột 2s hiện tên) */}
                              <div className="flex items-center gap-1 shrink-0">
                                <DelayedTooltipIconButton
                                  onClick={() => setManagingTopicQuestions(topic)}
                                  label="Quản lý câu hỏi theo chủ đề"
                                  icon={<FolderKanban className="w-4 h-4 text-cyan-400" />}
                                  className="p-2 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 cursor-pointer shadow-xs transition-all"
                                />
                                <DelayedTooltipIconButton
                                  onClick={() =>
                                    navigate(
                                      `/teacher/quizzes?topic=${encodeURIComponent(topic.name)}&manageTopic=1`
                                    )
                                  }
                                  label="Mở Ngân hàng câu hỏi đầy đủ"
                                  icon={<Sparkles className="w-4 h-4 text-amber-400" />}
                                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-all"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 font-bold">
                              {topic.subject}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <p className="font-bold text-slate-200">Lớp {topic.className}</p>
                            <p className="text-[11px] text-slate-400">{topic.sessionLabel || topic.chapter}</p>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-extrabold ${
                                stats.objectiveCount >= (topic.targetObjectiveCount || 3)
                                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                                  : 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                              }`}
                            >
                              {stats.objectiveCount} / {topic.targetObjectiveCount || 3} câu
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg font-extrabold ${
                                stats.essayCount >= (topic.targetEssayCount || 1)
                                  ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                                  : 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                              }`}
                            >
                              {stats.essayCount} / {topic.targetEssayCount || 1} câu
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {stats.isSufficient ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Đủ câu hỏi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/70 text-rose-300 border border-rose-700/50 text-[11px] font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> Thiếu câu hỏi
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1. Quản lý câu hỏi theo chủ đề */}
                              <DelayedTooltipIconButton
                                onClick={() => setManagingTopicQuestions(topic)}
                                label="Quản lý câu hỏi theo chủ đề"
                                icon={<FolderKanban className="w-4 h-4 text-cyan-400" />}
                                className="p-2 rounded-lg bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 cursor-pointer transition-all"
                              />

                              {/* 2. Mở giáo án giảng dạy như trang Word */}
                              <DelayedTooltipIconButton
                                onClick={() => handleOpenWordLessonPlan(topic)}
                                label="Mở giáo án giảng dạy như trang Word"
                                icon={<Eye className="w-4 h-4 text-cyan-400" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-all"
                              />

                              {/* 3. Nhân bản */}
                              <DelayedTooltipIconButton
                                onClick={() => handleOpenDuplicateTopic(topic)}
                                label="Nhân bản"
                                icon={<Copy className="w-4 h-4 text-emerald-300" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer transition-all"
                              />

                              {/* 4. Edit */}
                              <DelayedTooltipIconButton
                                onClick={() => handleOpenEditTopic(topic)}
                                label="Edit"
                                icon={<Edit3 className="w-4 h-4 text-amber-300" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition-all"
                              />

                              {/* 5. Delete */}
                              <DelayedTooltipIconButton
                                onClick={() => {
                                  setForceHardDeleteTopic(false);
                                  setDeletingTopic(topic);
                                }}
                                label="Delete"
                                icon={<Trash2 className="w-4 h-4 text-rose-400" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 cursor-pointer transition-all"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân trang danh sách chủ đề */}
              <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Hiển thị {paginatedTopics.length} / {filteredTopics.length} chủ đề
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={topicPage <= 1}
                    onClick={() => setTopicPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200 cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="px-2.5 py-1 font-bold text-cyan-400">
                    Trang {topicPage}/{totalTopicPages}
                  </span>
                  <button
                    type="button"
                    disabled={topicPage >= totalTopicPages}
                    onClick={() => setTopicPage((p) => Math.min(totalTopicPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÀN HÌNH 2: TẠO BÀI TẬP 4 BƯỚC (CREATE WIZARD)                        */}
      {/* ===================================================================== */}
      {activeSubModule === 'create' && (
        <div className="space-y-6">
          {/* Thanh Stepper 4 bước */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { step: 1, title: 'Bước 1: Chọn nguồn', desc: 'Loại bài & Chủ đề bài học' },
              { step: 2, title: 'Bước 2: Cấu hình câu hỏi', desc: 'Dạng bài, số câu (1–20) & độ khó' },
              { step: 3, title: 'Bước 3: Giao bài', desc: 'Lớp nhận, hạn nộp & thang điểm' },
              { step: 4, title: 'Bước 4: Xem trước & Giao', desc: 'Kiểm tra đề & đóng băng Snapshot' }
            ].map((item) => {
              const isCurrent = wizardStep === item.step;
              const isDone = wizardStep > item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    if (item.step < wizardStep) {
                      setWizardStep(item.step as 1 | 2 | 3 | 4);
                    } else if (item.step === wizardStep + 1 && handleValidateStep(wizardStep as 1 | 2 | 3)) {
                      setWizardStep(item.step as 1 | 2 | 3 | 4);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isCurrent
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : isDone
                      ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : item.step}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold truncate">{item.title}</p>
                    <p className="text-[11px] opacity-80 truncate">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* NỘI DUNG BƯỚC 1: CHỌN NGUỒN */}
          {wizardStep === 1 && (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2">
                    1. Chọn loại nhiệm vụ học tập <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAssignmentType('homework')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        assignmentType === 'homework'
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-white">Bài tập về nhà</p>
                      <p className="text-[11px] mt-0.5 opacity-80">Luyện tập củng cố sau buổi học</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignmentType('test')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        assignmentType === 'test'
                          ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-xs font-extrabold text-white">Bài kiểm tra</p>
                      <p className="text-[11px] mt-0.5 opacity-80">Đánh giá định kỳ có tính giờ</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2">
                    2. Môn học trong phạm vi phân công <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={wizardSubject}
                    onChange={(e) => {
                      setWizardSubject(e.target.value);
                      const matching = allTopics.filter(
                        (t) => t.status === 'active' && t.subject === e.target.value
                      );
                      setSelectedTopicIds(matching[0] ? [matching[0].id] : []);
                    }}
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-slate-100 outline-none focus:border-cyan-500"
                  >
                    {assignedSubjects.map((subj) => (
                      <option key={subj} value={subj}>
                        Môn {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chọn 1 hoặc nhiều chủ đề (ưu tiên bài học hiện tại, cho phép chọn bài cũ ôn tập) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>3. Chọn Chủ đề bài học (Có thể chọn nhiều chủ đề để ôn tập tổng hợp)</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 text-[11px]">
                        Đã chọn {selectedTopicIds.length} chủ đề
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ưu tiên hiển thị các bài học hiện tại. Nhấn biểu tượng{' '}
                      <strong className="text-cyan-300">[Quản lý câu hỏi theo chủ đề]</strong> cạnh tên chủ đề để xem/thêm câu hỏi.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOldTopics}
                        onChange={(e) => setShowOldTopics(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500"
                      />
                      <span>Hiển thị cả bài học cũ để ôn tập</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenCreateTopic}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      + Tạo chủ đề mới
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableWizardTopics
                    .filter((t) => showOldTopics || t.isCurrentLesson)
                    .map((topic) => {
                      const isSelected = selectedTopicIds.includes(topic.id);
                      const stats = topicStatsMap[topic.id] || {
                        objectiveCount: 0,
                        essayCount: 0,
                        totalCount: 0,
                        isSufficient: false
                      };

                      return (
                        <div
                          key={topic.id}
                          onClick={() => toggleSelectTopicInWizard(topic.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="mt-1 rounded border-slate-600 text-cyan-500"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-extrabold text-slate-100">
                                    {topic.name}
                                  </span>
                                  {topic.isCurrentLesson ? (
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-900/70 text-cyan-200 text-[10px] font-bold">
                                      Bài học hiện tại
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold">
                                      Bài cũ (Ôn tập)
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                  {topic.content}
                                </p>
                              </div>
                            </div>

                            {/* Icon [Quản lý câu hỏi theo chủ đề] ngay cạnh chủ đề */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setManagingTopicQuestions(topic);
                              }}
                              title={`[Quản lý câu hỏi theo chủ đề] Mở quản lý câu hỏi của chủ đề "${topic.name}"`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Câu hỏi ({stats.totalCount})</span>
                            </button>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                            <span>
                              Lớp {topic.className} • {topic.sessionLabel || topic.chapter}
                            </span>
                            <div className="flex items-center gap-2 font-bold">
                              <span className="text-cyan-300">TN: {stats.objectiveCount}</span>
                              <span>•</span>
                              <span className="text-amber-300">TL: {stats.essayCount}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (handleValidateStep(1)) setWizardStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>Tiếp tục Bước 2: Cấu hình câu hỏi</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* NỘI DUNG BƯỚC 2: CẤU HÌNH CÂU HỎI */}
          {wizardStep === 2 && (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 space-y-6">
              {/* Combobox Dạng bài & Số câu (1-20) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Dạng bài tập <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={questionFormat}
                    onChange={(e) => setQuestionFormat(e.target.value as QuestionFormatOption)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="combined">Trắc nghiệm và tự luận</option>
                    <option value="objective">Trắc nghiệm</option>
                    <option value="essay">Tự luận</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Khi đổi dạng bài, hệ thống tự động hiển thị combobox số lượng tương ứng.
                  </p>
                </div>

                {/* Combobox Số câu trắc nghiệm (1-20) - hiện khi Dạng kết hợp hoặc Trắc nghiệm */}
                {(questionFormat === 'combined' || questionFormat === 'objective') && (
                  <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-1.5">
                      Số câu Trắc nghiệm (1–20 câu) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={objectiveCount}
                      onChange={(e) => setObjectiveCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-xs font-bold text-slate-100 outline-none focus:border-cyan-400"
                    >
                      {COUNT_OPTIONS_1_TO_20.map((num) => (
                        <option key={num} value={num}>
                          {num} câu trắc nghiệm (Khả dụng: {availableObjectiveQuestions.length} câu)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Combobox Số câu tự luận (1-20) - hiện khi Dạng kết hợp hoặc Tự luận */}
                {(questionFormat === 'combined' || questionFormat === 'essay') && (
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1.5">
                      Số câu Tự luận (1–20 câu) <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={essayCount}
                      onChange={(e) => setEssayCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/50 text-xs font-bold text-slate-100 outline-none focus:border-amber-400"
                    >
                      {COUNT_OPTIONS_1_TO_20.map((num) => (
                        <option key={num} value={num}>
                          {num} câu tự luận (Khả dụng: {availableEssayQuestions.length} câu)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Cảnh báo khi thiếu câu hỏi khả dụng */}
              {hasQuestionShortage && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-200 space-y-1">
                      <p className="font-extrabold text-rose-300">
                        Cảnh báo: Số câu được chọn vượt quá số câu khả dụng của chủ đề!
                      </p>
                      <p>
                        Hiện có <strong>{availableObjectiveQuestions.length}</strong> câu Trắc nghiệm (yêu cầu{' '}
                        <strong>{effectiveObjectiveNeed}</strong>) và{' '}
                        <strong>{availableEssayQuestions.length}</strong> câu Tự luận (yêu cầu{' '}
                        <strong>{effectiveEssayNeed}</strong>).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedTopicObjects[0] && (
                      <button
                        type="button"
                        onClick={() => setManagingTopicQuestions(selectedTopicObjects[0])}
                        className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                      >
                        + Bổ sung câu hỏi vào chủ đề
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (effectiveObjectiveNeed > availableObjectiveQuestions.length) {
                          setObjectiveCount(Math.max(1, availableObjectiveQuestions.length));
                        }
                        if (effectiveEssayNeed > availableEssayQuestions.length) {
                          setEssayCount(Math.max(1, availableEssayQuestions.length));
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Điều chỉnh về mức khả dụng
                    </button>
                  </div>
                </div>
              )}

              {/* Bộ lọc Độ khó, Chế độ chọn (Ngẫu nhiên / Tự chọn), Trộn câu / Đáp án */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Mức độ nhận thức / Độ khó
                  </label>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="all">Tất cả mức độ (Tổng hợp)</option>
                    {DIFFICULTY_LIST.map((d) => (
                      <option key={d} value={d}>
                        Chỉ lấy mức: {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Phương thức lấy câu hỏi
                  </label>
                  <select
                    value={selectionMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'random' | 'manual';
                      setSelectionMode(mode);
                      if (mode === 'manual' && manualSelectedQuestionIds.length === 0) {
                        setManualSelectedQuestionIds(selectedQuestionsForAssignment.map((q) => q.id));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 outline-none focus:border-cyan-500"
                  >
                    <option value="random">Chọn ngẫu nhiên từ chủ đề</option>
                    <option value="manual">Giáo viên tự tích chọn từng câu</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center gap-2 pt-4">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded border-slate-600 text-cyan-500"
                    />
                    <span>Trộn thứ tự câu hỏi khi giao</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="rounded border-slate-600 text-cyan-500"
                    />
                    <span>Trộn thứ tự đáp án trắc nghiệm (A, B, C, D)</span>
                  </label>
                </div>
              </div>

              {/* Nếu giáo viên chọn Tự chọn câu hỏi (manual) */}
              {selectionMode === 'manual' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 max-h-64 overflow-y-auto">
                  <p className="text-xs font-bold text-cyan-300">
                    Tích chọn các câu hỏi đưa vào đề ({manualSelectedQuestionIds.length} câu đã chọn):
                  </p>
                  {matchingBankQuestions.map((q) => {
                    const checked = manualSelectedQuestionIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs cursor-pointer hover:border-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setManualSelectedQuestionIds((prev) =>
                              prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                            );
                          }}
                          className="mt-0.5 rounded border-slate-600 text-cyan-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-cyan-400">{q.code}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                              {QUESTION_TYPE_LABELS[q.type]}
                            </span>
                            <span className="text-[10px] text-slate-400">{q.difficulty}</span>
                          </div>
                          <p className="text-slate-200 mt-1">{q.content}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Textarea Yêu cầu thêm: nêu rõ là Hướng dẫn cho học sinh hay Tiêu chí lọc câu hỏi */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200">
                    Yêu cầu thêm (Phân biệt rõ vai trò để không nhầm với prompt AI):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtraRequirementTarget('student_instruction')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        extraRequirementTarget === 'student_instruction'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Dùng làm Hướng dẫn cho Học sinh
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtraRequirementTarget('question_filter')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        extraRequirementTarget === 'question_filter'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Dùng làm Từ khóa lọc câu hỏi
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={extraRequirementNote}
                  onChange={(e) => setExtraRequirementNote(e.target.value)}
                  placeholder={
                    extraRequirementTarget === 'student_instruction'
                      ? 'Nhập hướng dẫn làm bài cho học sinh (VD: Trình bày rõ các bước biến đổi, không dùng máy tính bỏ túi...)'
                      : 'Nhập từ khóa lọc câu hỏi trong ngân hàng (VD: mệnh đề kéo theo, parabol...)'
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại Bước 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (handleValidateStep(2)) setWizardStep(3);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>Tiếp tục Bước 3: Giao bài</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* NỘI DUNG BƯỚC 3: GIAO BÀI */}
          {wizardStep === 3 && (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Tên bài tập / Bài kiểm tra <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={wizardTitle}
                    onChange={(e) => setWizardTitle(e.target.value)}
                    placeholder="VD: Bài tập chương 1 - Mệnh đề & Tập hợp"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Chọn lớp nhận bài (Một hoặc nhiều lớp phụ trách) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-700">
                    {assignedClasses.map((cls) => {
                      const active = targetClassIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleTargetClass(cls.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            active
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Lớp {cls.name} ({cls.studentCount} HS)
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Thời điểm mở bài & Hạn nộp đặt cạnh nhau */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Thời điểm mở bài (Ngày & Giờ) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={openAtLocal}
                    onChange={(e) => setOpenAtLocal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1.5">
                    Thời hạn làm bài đến (Hạn nộp) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDateLocal}
                    onChange={(e) => setDueDateLocal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-amber-500/50 text-xs font-bold text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Thời lượng, Số lần làm, Chính sách nộp muộn, Thang điểm & Quy định xem kết quả */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Thời lượng làm bài (Phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Số lần làm bài tối đa
                  </label>
                  <select
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
                  >
                    <option value={1}>1 lần duy nhất</option>
                    <option value={2}>Tối đa 2 lần</option>
                    <option value={3}>Tối đa 3 lần</option>
                    <option value={99}>Không giới hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Chính sách nộp muộn
                  </label>
                  <select
                    value={latePolicy}
                    onChange={(e) => setLatePolicy(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
                  >
                    <option value="allow_marked_late">Cho phép nộp & đánh dấu Nộp muộn</option>
                    <option value="deduct_points">Cho phép nộp & trừ % điểm</option>
                    <option value="disallow_after_due">Đóng cổng sau khi hết hạn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Quy định xem đáp án & điểm
                  </label>
                  <select
                    value={showResultPolicy}
                    onChange={(e) => setShowResultPolicy(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
                  >
                    <option value="immediately">Xem ngay sau khi nộp bài</option>
                    <option value="after_due">Xem sau khi hết hạn nộp</option>
                    <option value="after_grading">Xem sau khi giáo viên chấm xong</option>
                  </select>
                </div>
              </div>

              {/* Cấu hình Tổng điểm & Điểm từng câu */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-200">Tổng điểm toàn bài:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={totalPoints}
                      onChange={(e) => {
                        setTotalPoints(Number(e.target.value));
                        setCustomPointsMap({});
                      }}
                      className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-cyan-500/50 text-xs font-extrabold text-cyan-300"
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    Tổng điểm các câu hiện tại: <strong className="text-emerald-300">{snapshotPointsSum}</strong> /{' '}
                    {totalPoints} điểm
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại Bước 2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (handleValidateStep(3)) setWizardStep(4);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <span>Tiếp tục Bước 4: Xem trước & Giao bài</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* NỘI DUNG BƯỚC 4: XEM TRƯỚC & SNAPSHOT */}
          {wizardStep === 4 && (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    Bản xem trước Đề bài & Snapshot câu hỏi (Chỉ Giáo viên thấy đáp án)
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">{wizardTitle}</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Môn: <strong>{wizardSubject}</strong> • Lớp nhận:{' '}
                    <strong>
                      {assignedClasses
                        .filter((c) => targetClassIds.includes(c.id))
                        .map((c) => c.name)
                        .join(', ')}
                    </strong>{' '}
                    • Mở: <strong>{formatDateTimeVN(new Date(openAtLocal).toISOString())}</strong> • Hạn nộp:{' '}
                    <strong className="text-amber-300">
                      {formatDateTimeVN(new Date(dueDateLocal).toISOString())}
                    </strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-extrabold text-emerald-300 block">
                    {builtSnapshots.length} câu hỏi • Tổng {totalPoints} điểm
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Trắc nghiệm: {builtSnapshots.filter((q) => q.type !== 'essay').length} • Tự luận:{' '}
                    {builtSnapshots.filter((q) => q.type === 'essay').length}
                  </span>
                </div>
              </div>

              {/* Danh sách câu hỏi Snapshot kèm đáp án (Teacher-only preview) */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {builtSnapshots.map((snap, idx) => (
                  <div
                    key={snap.questionId}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-extrabold text-xs">
                          Câu {idx + 1}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{snap.code}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-bold text-slate-300">
                          {QUESTION_TYPE_LABELS[snap.type]}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-amber-300">
                          {snap.difficulty}
                        </span>
                        <span className="text-[11px] text-slate-400">Chủ đề: {snap.topic}</span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-400">{snap.points} điểm</span>
                    </div>

                    <p className="text-sm text-slate-100 font-medium">{snap.content}</p>

                    {snap.options && snap.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {snap.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between ${
                              opt.isCorrect
                                ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200 font-bold'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span>
                              {opt.label}. {opt.text}
                            </span>
                            {opt.isCorrect && <span className="text-[10px] text-emerald-400">✓ Đáp án đúng</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {snap.rubric && (
                      <p className="text-xs text-amber-300/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/50">
                        <strong>Hướng dẫn chấm (Chỉ GV thấy):</strong> {snap.rubric}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* 3 Nút hành động: Lưu nháp | Quay lại chỉnh sửa | Giao bài */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Quay lại chỉnh sửa
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveOrPublishWizard('draft')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-cyan-400" /> Lưu nháp
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublishConfirmOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Giao bài chính thức
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MÀN HÌNH 3: DANH SÁCH BÀI TẬP ĐÃ GIAO (LIST & GRADING)                */}
      {/* ===================================================================== */}
      {activeSubModule === 'list' && (
        <div className="space-y-5">
          {/* Tabs: Tất cả | Đang diễn ra | Đã kết thúc | Bản nháp + Bộ lọc */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'ongoing', label: 'Đang diễn ra' },
                  { id: 'ended', label: 'Đã kết thúc' },
                  { id: 'draft', label: 'Bản nháp' }
                ].map((tab) => {
                  const active = listFilterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setListFilterTab(tab.id as AssignmentListFilterTab)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder="Tìm tên bài, môn, lớp, chủ đề..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Hàng bộ lọc chi tiết: Lớp, Môn, Chủ đề, Khoảng ngày */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
              <select
                value={listClassFilter}
                onChange={(e) => setListClassFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200"
              >
                <option value="all">Lọc theo Lớp: Tất cả lớp</option>
                {assignedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name}
                  </option>
                ))}
              </select>

              <select
                value={listSubjectFilter}
                onChange={(e) => setListSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200"
              >
                <option value="all">Lọc theo Môn: Tất cả môn</option>
                {assignedSubjects.map((s) => (
                  <option key={s} value={s}>
                    Môn {s}
                  </option>
                ))}
              </select>

              <select
                value={listTopicFilter}
                onChange={(e) => setListTopicFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200"
              >
                <option value="all">Lọc theo Chủ đề: Tất cả</option>
                {allTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={listDateFrom}
                  onChange={(e) => setListDateFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                  title="Từ ngày"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="date"
                  value={listDateTo}
                  onChange={(e) => setListDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-200"
                  title="Đến ngày"
                />
              </div>
            </div>
          </div>

          {/* Bảng danh sách bài tập đã giao */}
          {filteredAssignments.length === 0 ? (
            <EmptyState
              title="Không có bài tập nào phù hợp bộ lọc"
              description="Hãy chuyển sang tab Tạo bài tập (4 bước) để giao bài mới từ chủ đề."
              icon={BookOpen}
            />
          ) : (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Tên bài tập & Chủ đề</th>
                      <th className="py-3.5 px-3">Loại</th>
                      <th className="py-3.5 px-3">Lớp</th>
                      <th className="py-3.5 px-3">Ngày giao</th>
                      <th className="py-3.5 px-3">Hạn nộp</th>
                      <th className="py-3.5 px-3 text-center">Đã nộp / Chưa nộp</th>
                      <th className="py-3.5 px-3 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredAssignments.map((asn) => {
                      const isOverdue = asn.dueDate && new Date(asn.dueDate).getTime() < Date.now();
                      const unsubmittedCount = Math.max(0, (asn.totalStudents || 0) - (asn.submissionCount || 0));

                      return (
                        <tr key={asn.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className="font-extrabold text-slate-100 text-sm">{asn.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-slate-400">
                              <span className="text-cyan-400 font-semibold">{asn.subject}</span>
                              {asn.topicNames && asn.topicNames.length > 0 && (
                                <span>• Chủ đề: {asn.topicNames.join(', ')}</span>
                              )}
                              {asn.questionSnapshots && asn.questionSnapshots.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold">
                                  {asn.questionSnapshots.length} câu Snapshot
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold">
                              {asn.assignmentType === 'test' ? 'Bài kiểm tra' : 'Bài tập về nhà'}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-cyan-300">
                            Lớp {asn.className}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {asn.totalStudents} học sinh
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-slate-300">
                            {formatDateTimeVN(asn.assignedAt || asn.createdAt)}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className={`font-bold ${isOverdue ? 'text-rose-400' : 'text-amber-300'}`}>
                              {formatDateTimeVN(asn.dueDate)}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold">
                              <strong className="text-emerald-400">{asn.submissionCount}</strong> đã nộp /{' '}
                              <strong className="text-amber-400">{unsubmittedCount}</strong> chưa nộp
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <StatusChip
                              status={
                                asn.status === 'draft'
                                  ? 'draft'
                                  : asn.status === 'closed' || isOverdue
                                  ? 'closed'
                                  : 'published'
                              }
                            />
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <DelayedTooltipIconButton
                                onClick={() => setSelectedAssignment(asn)}
                                label={`Xem chi tiết & Chấm bài (${asn.submissionCount})`}
                                icon={<Eye className="w-4 h-4 text-cyan-400" />}
                                className="p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                              />

                              <DelayedTooltipIconButton
                                onClick={() => handleOpenEditMeta(asn)}
                                label="Chỉnh sửa thông tin được phép"
                                icon={<Edit3 className="w-4 h-4 text-amber-300" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
                              />

                              <DelayedTooltipIconButton
                                onClick={() => {
                                  const copied = db.copyAssignment(asn.id);
                                  if (copied) {
                                    showToast(`Đã sao chép thành bản nháp "${copied.title}".`, 'success');
                                  }
                                }}
                                label="Nhân bản bài tập"
                                icon={<Copy className="w-4 h-4 text-emerald-300" />}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
                              />

                              {asn.status === 'published' && (
                                <>
                                  <DelayedTooltipIconButton
                                    onClick={() => {
                                      const count = db.remindUnsubmittedStudents(
                                        asn.id,
                                        user?.name || 'Thầy Nguyễn Văn An'
                                      );
                                      showToast(
                                        count > 0
                                          ? `Đã gửi thông báo nhắc nộp bài tới ${count} học sinh chưa nộp!`
                                          : 'Tất cả học sinh trong lớp đều đã nộp bài!',
                                        'info'
                                      );
                                    }}
                                    label="Nhắc học sinh chưa nộp"
                                    icon={<BellRing className="w-4 h-4 text-cyan-400" />}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 cursor-pointer"
                                  />

                                  <DelayedTooltipIconButton
                                    onClick={() => {
                                      db.closeAssignment(asn.id, user?.name || 'Thầy Nguyễn Văn An');
                                      showToast(`Đã đóng nhận bài cho "${asn.title}".`, 'info');
                                    }}
                                    label="Đóng bài tập"
                                    icon={<Lock className="w-4 h-4 text-rose-400" />}
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 cursor-pointer"
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: TẠO / SỬA CHỦ ĐỀ (NỘI DUNG TỐI ĐA 8.000 KÝ TỰ CÓ BỘ ĐẾM)     */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        title={editingTopic ? `Chỉnh sửa chủ đề: ${editingTopic.name}` : 'Thêm Chủ đề bài học mới'}
        subtitle="Chủ đề được dùng chung cho nhiều bài tập và liên kết trực tiếp với Ngân hàng câu hỏi"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTopic} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Tên chủ đề <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={topicFormName}
                onChange={(e) => setTopicFormName(e.target.value)}
                placeholder="VD: Mệnh đề toán học / Hàm số bậc hai..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Môn học <span className="text-rose-400">*</span>
              </label>
              <select
                value={topicFormSubject}
                onChange={(e) => setTopicFormSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
              >
                {assignedSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Lớp phụ trách <span className="text-rose-400">*</span>
              </label>
              <select
                value={topicFormClassId}
                onChange={(e) => setTopicFormClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100"
              >
                {assignedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} (Khối {c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Buổi học / Tiết học từ Thời khóa biểu
              </label>
              <select
                value={topicFormSessionLabel}
                onChange={(e) => setTopicFormSessionLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
              >
                {availableScheduleSessions.map((sess, i) => (
                  <option key={i} value={sess}>
                    {sess}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">Chương / Bài</label>
              <input
                type="text"
                value={topicFormChapter}
                onChange={(e) => setTopicFormChapter(e.target.value)}
                placeholder="VD: Chương 1: Mệnh đề và Tập hợp"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Định mức câu Trắc nghiệm
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={topicFormTargetObj}
                onChange={(e) => setTopicFormTargetObj(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Định mức câu Tự luận
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={topicFormTargetEssay}
                onChange={(e) => setTopicFormTargetEssay(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Nội dung chủ đề tối đa 8.000 ký tự có bộ đếm */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200">
                Nội dung chi tiết / Chuẩn kiến thức kỹ năng của chủ đề
              </label>
              <span
                className={`text-[11px] font-mono font-bold ${
                  topicFormContent.length >= 8000 ? 'text-rose-400' : 'text-cyan-400'
                }`}
              >
                {topicFormContent.length.toLocaleString('vi-VN')} / 8.000 ký tự
              </span>
            </div>
            <textarea
              rows={5}
              maxLength={8000}
              value={topicFormContent}
              onChange={(e) => setTopicFormContent(e.target.value.slice(0, 8000))}
              placeholder="Nhập tóm tắt lý thuyết, mục tiêu bài học, các dạng toán trọng tâm của chủ đề (tối đa 8.000 ký tự)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={topicFormIsCurrentLesson}
              onChange={(e) => setTopicFormIsCurrentLesson(e.target.checked)}
              className="rounded border-slate-600 text-cyan-500"
            />
            <span>Đánh dấu là Bài học hiện tại (Ưu tiên hiển thị đầu danh sách khi tạo bài tập)</span>
          </label>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold cursor-pointer"
            >
              {editingTopic ? 'Lưu cập nhật chủ đề' : 'Tạo chủ đề'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 2: [QUẢN LÝ CÂU HỎI THEO CHỦ ĐỀ] (XEM & THÊM NHANH CÂU HỎI)     */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!managingTopicQuestions}
        onClose={() => setManagingTopicQuestions(null)}
        title={
          managingTopicQuestions
            ? `Quản lý câu hỏi theo chủ đề: ${managingTopicQuestions.name}`
            : 'Quản lý câu hỏi theo chủ đề'
        }
        subtitle="Câu hỏi tạo mới được lưu trực tiếp vào Ngân hàng câu hỏi chung và tự động gắn chủ đề này"
        maxWidth="2xl"
      >
        {managingTopicQuestions && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Môn: <strong className="text-cyan-300">{managingTopicQuestions.subject}</strong> • Lớp:{' '}
                <strong>{managingTopicQuestions.className}</strong> • Hiện có:{' '}
                <strong className="text-emerald-400">
                  {topicStatsMap[managingTopicQuestions.id]?.objectiveCount || 0} câu TN
                </strong>{' '}
                &{' '}
                <strong className="text-amber-400">
                  {topicStatsMap[managingTopicQuestions.id]?.essayCount || 0} câu TL
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  const name = managingTopicQuestions.name;
                  setManagingTopicQuestions(null);
                  navigate(`/teacher/quizzes?topic=${encodeURIComponent(name)}&manageTopic=1`);
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-600/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Mở trong Ngân hàng câu hỏi đầy đủ
              </button>
            </div>

            {/* Form thêm nhanh câu hỏi gắn chủ đề */}
            <form
              onSubmit={handleQuickAddQuestionToTopic}
              className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3"
            >
              <p className="text-xs font-extrabold text-cyan-300">
                + Thêm nhanh câu hỏi mới vào chủ đề "{managingTopicQuestions.name}"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Loại câu hỏi</label>
                  <select
                    value={quickQuestionType}
                    onChange={(e) => setQuickQuestionType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-100"
                  >
                    <option value="single_choice">Trắc nghiệm 1 đáp án</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Độ khó</label>
                  <select
                    value={quickQuestionDifficulty}
                    onChange={(e) => setQuickQuestionDifficulty(e.target.value as QuestionDifficulty)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-slate-100"
                  >
                    {DIFFICULTY_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nội dung câu hỏi <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={quickQuestionContent}
                  onChange={(e) => setQuickQuestionContent(e.target.value)}
                  placeholder="Nhập đề bài câu hỏi..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                />
              </div>

              {quickQuestionType !== 'essay' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['A', 'B', 'C', 'D'] as const).map((lbl) => {
                    const val =
                      lbl === 'A'
                        ? quickOptionA
                        : lbl === 'B'
                        ? quickOptionB
                        : lbl === 'C'
                        ? quickOptionC
                        : quickOptionD;
                    const setter =
                      lbl === 'A'
                        ? setQuickOptionA
                        : lbl === 'B'
                        ? setQuickOptionB
                        : lbl === 'C'
                        ? setQuickOptionC
                        : setQuickOptionD;
                    return (
                      <div key={lbl} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="quickCorrect"
                          checked={quickCorrectLabel === lbl}
                          onChange={() => setQuickCorrectLabel(lbl)}
                          title="Chọn làm đáp án đúng"
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setter(e.target.value)}
                          placeholder={`Đáp án ${lbl}...`}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Hướng dẫn chấm / Đáp án mẫu tự luận
                  </label>
                  <input
                    type="text"
                    value={quickRubric}
                    onChange={(e) => setQuickRubric(e.target.value)}
                    placeholder="Nhập biểu điểm và hướng dẫn chấm..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100"
                  />
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                >
                  + Lưu câu hỏi vào chủ đề
                </button>
              </div>
            </form>

            {/* Danh sách câu hỏi hiện có của chủ đề */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs font-bold text-slate-300">
                Danh sách câu hỏi thuộc chủ đề ({topicStatsMap[managingTopicQuestions.id]?.questions.length || 0} câu):
              </p>
              {(topicStatsMap[managingTopicQuestions.id]?.questions || []).map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-400">#{idx + 1}</span>
                      <span className="font-mono text-[10px] text-slate-400">{q.code}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                        {QUESTION_TYPE_LABELS[q.type]}
                      </span>
                      <span className="text-[10px] text-amber-300">{q.difficulty}</span>
                    </div>
                    <p className="text-slate-200 mt-1">{q.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      questionBankService.delete(q.id);
                      showToast(`Đã xóa câu hỏi ${q.code}.`, 'info');
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-rose-400 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3: MỞ GIÁO ÁN GIẢNG DẠY NHƯ TRANG WORD (A4 DOCUMENT EDITOR)    */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!viewingTopic}
        onClose={() => setViewingTopic(null)}
        title={
          viewingTopic
            ? `Giáo án giảng dạy (Trang Word A4): ${viewingTopic.name}`
            : 'Giáo án giảng dạy'
        }
        subtitle={
          viewingTopic
            ? `Tệp: Giao_An_${viewingTopic.name.replace(/\s+/g, '_')}.docx • Môn ${viewingTopic.subject} • Lớp ${viewingTopic.className}`
            : ''
        }
        maxWidth="2xl"
      >
        {viewingTopic && (() => {
          const stats = topicStatsMap[viewingTopic.id] || {
            objectiveCount: 0,
            essayCount: 0,
            totalCount: 0,
            isSufficient: false,
            questions: []
          };
          return (
            <div className="space-y-3 text-xs">
              {/* Thanh công cụ Ribbon kiểu Microsoft Word */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/40 font-extrabold flex items-center gap-1.5 text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Word A4
                  </span>

                  <select
                    value={wordFontFamily}
                    onChange={(e) => setWordFontFamily(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-200 outline-none"
                  >
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Arial">Arial</option>
                    <option value="Inter">Inter</option>
                  </select>

                  <select
                    value={wordFontSize}
                    onChange={(e) => setWordFontSize(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-200 outline-none"
                  >
                    <option value={12}>Cỡ chữ 12pt</option>
                    <option value={13}>Cỡ chữ 13pt</option>
                    <option value={14}>Cỡ chữ 14pt</option>
                    <option value={16}>Cỡ chữ 16pt</option>
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setWordLessonContent((prev) =>
                        `${prev}\n\nHOẠT ĐỘNG KHỞI ĐỘNG:\n- Mục tiêu: Tạo tâm thế hứng thú cho học sinh trước khi vào bài.\n- Nội dung: Giáo viên nêu tình huống thực tế gắn với chủ đề ${viewingTopic.name}.\n- Sản phẩm: Học sinh trả lời câu hỏi dẫn dắt.`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-[11px] cursor-pointer"
                  >
                    + Chèn mẫu Hoạt động dạy học
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveWordLessonPlan}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu giáo án
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWordDoc}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải file Word (.doc)
                  </button>
                </div>
              </div>

              {/* Không gian bàn làm việc chứa tờ giấy trắng A4 chuẩn Microsoft Word */}
              <div className="bg-slate-800/90 p-3 sm:p-6 rounded-xl border border-slate-700 max-h-[65vh] overflow-y-auto flex justify-center">
                <div
                  style={{
                    fontFamily:
                      wordFontFamily === 'Times New Roman'
                        ? '"Times New Roman", Times, serif'
                        : wordFontFamily === 'Arial'
                        ? 'Arial, Helvetica, sans-serif'
                        : 'Inter, sans-serif',
                    fontSize: `${wordFontSize}px`
                  }}
                  className="bg-white text-slate-900 w-full max-w-[760px] min-h-[840px] p-6 sm:p-10 shadow-2xl border border-slate-300 rounded-xs space-y-5"
                >
                  {/* Quốc hiệu & Tiêu đề trường kiểu văn bản Word chuẩn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-300 text-center">
                    <div>
                      <p className="font-bold uppercase text-xs sm:text-sm text-slate-900">
                        TRƯỜNG THPT SMARTCLASS 4.0
                      </p>
                      <p className="font-semibold text-xs text-slate-700">
                        TỔ CHUYÊN MÔN: {viewingTopic.subject.toUpperCase()}
                      </p>
                      <div className="w-20 h-[1px] bg-slate-400 mx-auto mt-1" />
                    </div>
                    <div>
                      <p className="font-bold uppercase text-xs sm:text-sm text-slate-900">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </p>
                      <p className="font-bold text-xs text-slate-800">
                        Độc lập - Tự do - Hạnh phúc
                      </p>
                      <div className="w-28 h-[1px] bg-slate-800 mx-auto mt-1" />
                    </div>
                  </div>

                  {/* Tên kế hoạch bài dạy / giáo án */}
                  <div className="text-center space-y-1 py-1">
                    <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
                      KẾ HOẠCH BÀI DẠY (GIÁO ÁN GIẢNG DẠY)
                    </h2>
                    <h3 className="text-sm sm:text-base font-bold uppercase text-blue-900">
                      CHỦ ĐỀ / BÀI HỌC: {viewingTopic.name}
                    </h3>
                    <p className="text-xs italic text-slate-700">
                      Môn học: <strong>{viewingTopic.subject}</strong> &nbsp;|&nbsp; Lớp:{' '}
                      <strong>{viewingTopic.className}</strong> (Khối {viewingTopic.gradeLevel}) &nbsp;|&nbsp; Phân phối:{' '}
                      <strong>{viewingTopic.sessionLabel || viewingTopic.chapter || 'Buổi học hiện tại'}</strong>
                    </p>
                  </div>

                  {/* Mục I: Mục tiêu & Chuẩn kiến thức */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold uppercase text-xs sm:text-sm text-slate-900">
                      I. MỤC TIÊU BÀI HỌC & HỌC LIỆU CHUẨN BỊ
                    </h4>
                    <div className="text-xs sm:text-sm text-slate-800 space-y-1 pl-2">
                      <p>
                        • <strong> Chương / Phần học:</strong> {viewingTopic.chapter || 'Chương trình chuẩn'}
                      </p>
                      <p>
                        • <strong>Cấu trúc câu hỏi gắn với chủ đề:</strong> {stats.objectiveCount}/
                        {viewingTopic.targetObjectiveCount || 3} câu Trắc nghiệm &amp; {stats.essayCount}/
                        {viewingTopic.targetEssayCount || 1} câu Tự luận ({stats.isSufficient ? 'Đủ câu hỏi' : 'Cần bổ sung câu hỏi'}).
                      </p>
                    </div>
                  </div>

                  {/* Mục II: Nội dung bài giảng soạn thảo trực tiếp như trang Word */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold uppercase text-xs sm:text-sm text-slate-900">
                        II. NỘI DUNG BÀI GIẢNG &amp; TIẾN TRÌNH TỔ CHỨC HOẠT ĐỘNG DẠY HỌC
                      </h4>
                      <span className="text-[11px] font-sans text-slate-500">
                        {wordLessonContent.length.toLocaleString('vi-VN')} / 8.000 ký tự
                      </span>
                    </div>
                    <textarea
                      rows={11}
                      maxLength={8000}
                      value={wordLessonContent}
                      onChange={(e) => setWordLessonContent(e.target.value.slice(0, 8000))}
                      placeholder="Nhập trực tiếp nội dung giáo án giảng dạy, lý thuyết trọng tâm, các hoạt động của GV và HS trên trang Word này..."
                      className="w-full p-3 rounded-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-300 focus:border-blue-600 text-slate-900 outline-none leading-relaxed resize-y"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit'
                      }}
                    />
                  </div>

                  {/* Mục III: Hệ thống câu hỏi thuộc chủ đề trên trang Word */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold uppercase text-xs sm:text-sm text-slate-900">
                        III. HỆ THỐNG CÂU HỎI &amp; BÀI TẬP LUYỆN TẬP ({stats.questions.length} CÂU)
                      </h4>
                      <label className="flex items-center gap-1.5 text-[11px] font-sans text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wordIncludeQuestions}
                          onChange={(e) => setWordIncludeQuestions(e.target.checked)}
                        />
                        <span>Hiển thị câu hỏi trên trang giáo án</span>
                      </label>
                    </div>

                    {wordIncludeQuestions && (
                      <div className="space-y-3 pl-1">
                        {stats.questions.length === 0 ? (
                          <p className="text-xs italic text-slate-500">
                            Chưa có câu hỏi nào gắn với chủ đề này trong Ngân hàng câu hỏi.
                          </p>
                        ) : (
                          stats.questions.map((q, idx) => (
                            <div key={q.id} className="space-y-1 text-slate-900">
                              <p className="font-semibold">
                                Câu {idx + 1} ({QUESTION_TYPE_LABELS[q.type]} – Mức độ: {q.difficulty}):{' '}
                                <span className="font-normal">{q.content}</span>
                              </p>
                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4 text-xs sm:text-sm">
                                  {q.options.map((opt) => (
                                    <p
                                      key={opt.id}
                                      className={opt.isCorrect ? 'font-bold underline text-blue-900' : ''}
                                    >
                                      {opt.label}. {opt.text} {opt.isCorrect ? '(Đáp án đúng)' : ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {q.rubric && (
                                <p className="pl-4 text-xs italic text-slate-700">
                                  → Hướng dẫn chấm / Đáp án: {q.rubric}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chữ ký cuối trang giáo án A4 */}
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-300 text-center text-xs text-slate-800">
                    <div>
                      <p className="font-bold uppercase">DUYỆT CỦA TỔ CHUYÊN MÔN</p>
                      <p className="italic text-slate-500 mt-8">(Ký và ghi rõ họ tên)</p>
                    </div>
                    <div>
                      <p className="italic">Ngày ..... tháng ..... năm 2026</p>
                      <p className="font-bold uppercase mt-0.5">GIÁO VIÊN SOẠN GIẢNG</p>
                      <p className="font-bold mt-8">{viewingTopic.teacherName || user?.name || 'Thầy Nguyễn Văn An'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thanh 4 chức năng khác của Chủ đề ở chân Modal (Chỉ hiện icon, giữ chuột 2s hiện tên) */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Mẹo: Bạn có thể gõ chỉnh sửa trực tiếp trên trang giấy trắng A4 và nhấn <strong>Lưu giáo án</strong>.
                </span>
                <div className="flex items-center gap-2">
                  <DelayedTooltipIconButton
                    onClick={() => {
                      const t = viewingTopic;
                      setViewingTopic(null);
                      setManagingTopicQuestions(t);
                    }}
                    label="Quản lý câu hỏi theo chủ đề"
                    icon={<FolderKanban className="w-4 h-4 text-cyan-300" />}
                    className="p-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 cursor-pointer transition-all"
                  />
                  <DelayedTooltipIconButton
                    onClick={() => {
                      const t = viewingTopic;
                      setViewingTopic(null);
                      handleOpenDuplicateTopic(t);
                    }}
                    label="Nhân bản"
                    icon={<Copy className="w-4 h-4 text-emerald-300" />}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer transition-all"
                  />
                  <DelayedTooltipIconButton
                    onClick={() => {
                      const t = viewingTopic;
                      setViewingTopic(null);
                      handleOpenEditTopic(t);
                    }}
                    label="Edit"
                    icon={<Edit3 className="w-4 h-4 text-amber-300" />}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition-all"
                  />
                  <DelayedTooltipIconButton
                    onClick={() => {
                      const t = viewingTopic;
                      setViewingTopic(null);
                      setForceHardDeleteTopic(false);
                      setDeletingTopic(t);
                    }}
                    label="Delete"
                    icon={<Trash2 className="w-4 h-4 text-rose-400" />}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-400 border border-slate-700 cursor-pointer transition-all"
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 3B: NHÂN BẢN CHỦ ĐỀ (SAO CHÉP CHỦ ĐỀ & CÂU HỎI)                 */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!duplicatingTopic}
        onClose={() => setDuplicatingTopic(null)}
        title={duplicatingTopic ? `Nhân bản chủ đề: ${duplicatingTopic.name}` : 'Nhân bản chủ đề'}
        subtitle="Tạo nhanh chủ đề mới từ chủ đề gốc và tùy chọn sao chép toàn bộ câu hỏi đi kèm"
        maxWidth="md"
      >
        {duplicatingTopic && (
          <form onSubmit={handleConfirmDuplicateTopic} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-200 mb-1.5">
                Tên chủ đề bản sao mới <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>

            <label className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={duplicateIncludeQuestions}
                onChange={(e) => setDuplicateIncludeQuestions(e.target.checked)}
                className="mt-0.5 rounded border-slate-600 text-cyan-500"
              />
              <div>
                <p className="font-bold text-cyan-300">
                  Nhân bản kèm toàn bộ câu hỏi của chủ đề gốc ({topicStatsMap[duplicatingTopic.id]?.totalCount || 0} câu)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Các câu hỏi được nhân bản sẽ tự động gắn vào chủ đề mới trong Ngân hàng câu hỏi chung.
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicatingTopic(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Xác nhận Nhân bản
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 4: XÁC NHẬN XÓA / LƯU TRỮ CHỦ ĐỀ                                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!deletingTopic}
        onClose={() => setDeletingTopic(null)}
        title="Xác nhận xóa chủ đề"
        maxWidth="md"
      >
        {deletingTopic && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-200 leading-relaxed">
              {db.isTopicReferencedByAssignments(deletingTopic.id, deletingTopic.name)
                ? `Chủ đề "${deletingTopic.name}" đang được tham chiếu bởi bài tập đã tạo. Mặc định hệ thống sẽ chuyển sang Lưu trữ/Ẩn để bảo toàn lịch sử, hoặc bạn có thể tích chọn xóa vĩnh viễn bên dưới.`
                : `Bạn có chắc chắn muốn xóa chủ đề "${deletingTopic.name}" không? Các câu hỏi trong Ngân hàng câu hỏi chung vẫn được giữ nguyên.`}
            </p>
            {db.isTopicReferencedByAssignments(deletingTopic.id, deletingTopic.name) && (
              <label className="flex items-center gap-2 text-rose-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceHardDeleteTopic}
                  onChange={(e) => setForceHardDeleteTopic(e.target.checked)}
                  className="rounded border-rose-500 text-rose-600"
                />
                <span>Xóa vĩnh viễn chủ đề này thay vì chuyển sang Lưu trữ/Ẩn</span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTopic(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTopic}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 5: XÁC NHẬN PHÁT HÀNH BÀI TẬP Ở BƯỚC 4                          */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPublishConfirmOpen}
        onClose={() => setIsPublishConfirmOpen(false)}
        title="Xác nhận phát hành bài tập & đóng băng Snapshot"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-200 leading-relaxed">
            Hệ thống sẽ phát hành bài tập <strong>"{wizardTitle}"</strong> tới học sinh các lớp đã chọn và lưu{' '}
            <strong>Snapshot {builtSnapshots.length} câu hỏi</strong> độc lập để mọi chỉnh sửa Ngân hàng câu hỏi về sau không làm lệch lịch sử bài đã giao.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPublishConfirmOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Kiểm tra lại
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrPublishWizard('published')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold cursor-pointer"
            >
              Xác nhận Giao bài ngay
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 6: CHỈNH SỬA THÔNG TIN ĐƯỢC PHÉP (KHÓA SỬA NGẦM KHI ĐÃ CÓ NỘP)  */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!editingMetaAsn}
        onClose={() => setEditingMetaAsn(null)}
        title={editingMetaAsn ? `Chỉnh sửa bài tập: ${editingMetaAsn.title}` : ''}
        maxWidth="lg"
      >
        {editingMetaAsn && (
          <form onSubmit={handleSaveMetaEdit} className="space-y-4 text-xs">
            {editingMetaAsn.submissionCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Bài tập này đã có <strong>{editingMetaAsn.submissionCount} học sinh nộp bài</strong>. Hệ thống khóa chỉnh sửa danh sách câu hỏi Snapshot để đảm bảo công bằng; bạn chỉ có thể điều chỉnh tiêu đề, hạn nộp hoặc hướng dẫn.
                </span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-200 mb-1">Tên bài tập</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-amber-300 mb-1">Gia hạn / Đổi hạn nộp</label>
              <input
                type="datetime-local"
                value={metaDueDateLocal}
                onChange={(e) => setMetaDueDateLocal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/50 text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1">Hướng dẫn bổ sung</label>
              <textarea
                rows={3}
                value={metaInstructions}
                onChange={(e) => setMetaInstructions(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMetaAsn(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 7: CHI TIẾT BÀI TẬP, CHẤM TỰ LUẬN & XUẤT KẾT QUẢ EXCEL         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        title={selectedAssignment ? `Chi tiết & Chấm bài: ${selectedAssignment.title}` : ''}
        subtitle={
          selectedAssignment
            ? `Lớp ${selectedAssignment.className} • Hạn nộp: ${formatDateTimeVN(selectedAssignment.dueDate)}`
            : ''
        }
        maxWidth="2xl"
      >
        {selectedAssignment && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'all', label: `Tất cả (${assignmentStudentRows.length})` },
                  {
                    id: 'submitted',
                    label: `Đã nộp (${assignmentStudentRows.filter((r) => r.derivedStatus !== 'unsubmitted').length})`
                  },
                  {
                    id: 'late',
                    label: `Nộp muộn (${assignmentStudentRows.filter((r) => r.isLate).length})`
                  },
                  {
                    id: 'unsubmitted',
                    label: `Chưa nộp (${assignmentStudentRows.filter((r) => r.derivedStatus === 'unsubmitted').length})`
                  },
                  {
                    id: 'graded',
                    label: `Đã chấm (${assignmentStudentRows.filter((r) => r.derivedStatus === 'graded').length})`
                  }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStudentFilterInDetail(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      studentFilterInDetail === t.id
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleExportResultsExcel(selectedAssignment)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Xuất kết quả Excel
              </button>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {filteredStudentRows.map(({ student, submission: sub, derivedStatus, isLate }) => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-slate-100">
                        {student.fullName}{' '}
                        <span className="text-xs font-mono text-slate-400">({student.code})</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {sub ? `Nộp lúc: ${formatDateTimeVN(sub.submittedAt)}` : 'Chưa nộp bài'}
                        {sub?.objectiveScore !== undefined && (
                          <span className="ml-2 text-cyan-300 font-bold">
                            • Điểm TN tự động: {sub.objectiveScore} đ
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusChip
                      status={
                        derivedStatus === 'unsubmitted'
                          ? 'missing'
                          : isLate && derivedStatus !== 'graded'
                          ? 'late'
                          : derivedStatus
                      }
                    />
                  </div>

                  {sub && (
                    <>
                      {sub.content && (
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-line">
                          {sub.content}
                        </div>
                      )}

                      {sub.answers && sub.answers.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                          <p className="font-bold text-cyan-400">Chi tiết trả lời theo Snapshot câu hỏi:</p>
                          {sub.answers.map((ans, i) => {
                            const snapQ = selectedAssignment.questionSnapshots?.find(
                              (q) => q.questionId === ans.questionId
                            );
                            return (
                              <div key={ans.questionId} className="text-slate-300">
                                <strong>Câu {i + 1}:</strong>{' '}
                                {ans.selectedOptionLabels?.length
                                  ? `Chọn đáp án ${ans.selectedOptionLabels.join(', ')}`
                                  : ans.textAnswer || '(Trống)'}{' '}
                                {snapQ?.type !== 'essay' && (
                                  <span className={ans.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                                    ({ans.isCorrect ? `+${ans.autoScore} đ` : '0 đ'})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-800">
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            step="0.25"
                            min={0}
                            max={selectedAssignment.totalPoints}
                            value={
                              editingScores[sub.id] !== undefined
                                ? editingScores[sub.id]
                                : sub.score !== undefined
                                ? String(sub.score)
                                : sub.objectiveScore !== undefined
                                ? String(sub.objectiveScore)
                                : ''
                            }
                            onChange={(e) =>
                              setEditingScores({ ...editingScores, [sub.id]: e.target.value })
                            }
                            placeholder={`Điểm / ${selectedAssignment.totalPoints}`}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-emerald-300"
                          />
                        </div>
                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            value={
                              editingFeedbacks[sub.id] !== undefined
                                ? editingFeedbacks[sub.id]
                                : sub.feedback || ''
                            }
                            onChange={(e) =>
                              setEditingFeedbacks({ ...editingFeedbacks, [sub.id]: e.target.value })
                            }
                            placeholder="Nhận xét bài làm..."
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                          />
                        </div>
                        <div className="sm:col-span-3 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveGrade(sub, selectedAssignment.totalPoints, 'graded')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Lưu điểm
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSaveGrade(sub, selectedAssignment.totalPoints, 'redo_requested')
                            }
                            title="Yêu cầu học sinh làm lại"
                            className="p-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
