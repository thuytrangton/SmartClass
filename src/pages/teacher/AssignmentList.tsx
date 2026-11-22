import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronDown,
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
import { AssignedAssignmentsSplitView } from '../../components/teacher/AssignedAssignmentsSplitView';
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

  const location = useLocation();

  // Quản lý 3 menu con chuẩn đặc tả: Quản lý chủ đề (topics) | Tạo bài tập (create) | Danh sách bài tập đã giao (list)
  const activeSubModule: SubModuleTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'topics' || tabParam === 'create' || tabParam === 'list') {
      return tabParam;
    }
    if (searchParams.get('openCreate') === '1' || location.pathname.endsWith('/assignments/new')) {
      return 'create';
    }
    return 'list';
  }, [searchParams, location.pathname]);

  const switchSubModule = (tab: SubModuleTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('openCreate');
    if (location.pathname !== '/teacher/assignments') {
      navigate(`/teacher/assignments?${next.toString()}`, { replace: true });
    } else {
      setSearchParams(next, { replace: true });
    }
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
  // PHẦN 2: TẠO BÀI TẬP (SUB-MODULE 2: UNIFIED CREATE FORM)
  // ============================================================================
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Loại bài tập & Môn học & Chủ đề
  const [assignmentType, setAssignmentType] = useState<'homework' | 'test'>('homework');
  const [assignmentTypeLabel, setAssignmentTypeLabel] = useState<string>('homework');
  const [wizardSubject, setWizardSubject] = useState<string>('Toán học');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(['top-1']);
  const [showOldTopics, setShowOldTopics] = useState<boolean>(true);

  // Cấu hình câu hỏi (Mặc định 5 câu TN & 1 câu TL theo ảnh giao diện)
  const [questionFormat, setQuestionFormat] = useState<QuestionFormatOption>('combined');
  const [objectiveCount, setObjectiveCount] = useState<number>(5);
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

  // Thông tin giao bài, Hạn nộp, Giờ khóa đề & Thời gian làm bài (hiển thị dạng Combobox khi click)
  const [wizardTitle, setWizardTitle] = useState<string>('');
  const [wizardDescription, setWizardDescription] = useState<string>('');
  const [targetClassIds, setTargetClassIds] = useState<string[]>(() =>
    selectedClass?.id ? [selectedClass.id] : [assignedClasses[0]?.id || 'cls-10a1']
  );
  const [openAtLocal, setOpenAtLocal] = useState<string>(() => toDateTimeLocalValue(new Date().toISOString()));

  // Khởi tạo ngày hạn nộp mặc định là ngày mai (YYYY-MM-DD) và giờ khóa đề mặc định 22:00
  const [dueDateDay, setDueDateDay] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  });
  const [lockTimeHour, setLockTimeHour] = useState<string>('22:00');
  const [dueDateLocal, setDueDateLocal] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T22:00`;
  });

  useEffect(() => {
    if (dueDateDay && lockTimeHour) {
      setDueDateLocal(`${dueDateDay}T${lockTimeHour}`);
    }
  }, [dueDateDay, lockTimeHour]);

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

  // Quản lý trạng thái mở Combobox tùy chỉnh (chỉ mở tối đa 1 combobox tại một thời điểm)
  const [activeCreateDropdown, setActiveCreateDropdown] = useState<
    'classes' | 'dueDate' | 'lockTime' | 'duration' | null
  >(null);
  const createFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!activeCreateDropdown) return;
      const target = event.target as HTMLElement | null;
      if (!target || !target.closest('[data-create-combobox]')) {
        setActiveCreateDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCreateDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCreateDropdown]);

  // Danh sách tùy chọn cho 3 Combobox ở dòng cuối: Hạn nộp, Giờ khóa đề, Thời gian làm bài
  const dueDateComboboxOptions = useMemo(() => {
    const offsets = [
      { days: 0, tag: 'Hôm nay' },
      { days: 1, tag: 'Ngày mai' },
      { days: 2, tag: 'Sau 2 ngày' },
      { days: 3, tag: 'Sau 3 ngày' },
      { days: 4, tag: 'Sau 4 ngày' },
      { days: 5, tag: 'Sau 5 ngày' },
      { days: 7, tag: 'Sau 1 tuần' },
      { days: 10, tag: 'Sau 10 ngày' },
      { days: 14, tag: 'Sau 2 tuần' }
    ];
    const pad = (n: number) => String(n).padStart(2, '0');
    return offsets.map((o) => {
      const d = new Date(Date.now() + o.days * 86400000);
      const value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const displayDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      return {
        value,
        displayDate,
        tag: o.tag,
        label: `${displayDate} (${o.tag})`
      };
    });
  }, []);

  const formatDateDisplayVN = (yyyyMmDd: string) => {
    if (!yyyyMmDd) return 'Chọn ngày hạn nộp';
    const matched = dueDateComboboxOptions.find((o) => o.value === yyyyMmDd);
    if (matched) return `${matched.displayDate} (${matched.tag})`;
    const parts = yyyyMmDd.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return yyyyMmDd;
  };

  const lockTimeComboboxOptions = useMemo(
    () => [
      { value: '07:00', label: '07:00 (Đầu giờ sáng)' },
      { value: '08:00', label: '08:00 (Ca sáng - Tiết 1)' },
      { value: '09:00', label: '09:00 (Ca sáng - Tiết 2)' },
      { value: '10:00', label: '10:00 (Ca sáng - Tiết 3)' },
      { value: '11:30', label: '11:30 (Cuối buổi sáng)' },
      { value: '12:00', label: '12:00 (12h00 trưa)' },
      { value: '14:00', label: '14:00 (Đầu giờ chiều)' },
      { value: '15:00', label: '15:00 (Ca chiều - Tiết 2)' },
      { value: '16:00', label: '16:00 (Ca chiều - Tiết 3)' },
      { value: '17:30', label: '17:30 (Cuối buổi chiều)' },
      { value: '19:00', label: '19:00 (19h00 tối)' },
      { value: '20:00', label: '20:00 (20h00 tối)' },
      { value: '21:00', label: '21:00 (21h00 tối)' },
      { value: '22:00', label: '22:00 (22h00 đêm)' },
      { value: '23:59', label: '23:59 (Cuối ngày)' }
    ],
    []
  );

  const durationComboboxOptions = useMemo(
    () => [
      { value: 15, label: '15 phút (Kiểm tra 15 phút)' },
      { value: 20, label: '20 phút' },
      { value: 30, label: '30 phút' },
      { value: 45, label: '45 phút (1 tiết tiêu chuẩn)' },
      { value: 60, label: '60 phút' },
      { value: 90, label: '90 phút (2 tiết / Tổng hợp)' },
      { value: 120, label: '120 phút' },
      { value: 180, label: '180 phút' }
    ],
    []
  );

  // Xem trước đề & Modal xác nhận phát hành
  const [isPreviewExamModalOpen, setIsPreviewExamModalOpen] = useState<boolean>(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState<boolean>(false);
  const [isAutoGeneratingAi, setIsAutoGeneratingAi] = useState<boolean>(false);

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

  // Tỷ lệ đóng góp mỗi chủ đề (VD: 1 chủ đề -> 100%, 2 chủ đề -> 50%, 4 chủ đề -> 25%)
  const sharePercentPerTopic = useMemo(() => {
    const count = selectedTopicObjects.length;
    if (count === 0) return 0;
    return Number((100 / count).toFixed(1));
  }, [selectedTopicObjects.length]);

  // Kế hoạch phân bổ câu hỏi Trắc nghiệm & Tự luận chia đều theo đúng tỷ lệ 100% / N chủ đề đã chọn
  const topicAllocationPlan = useMemo(() => {
    const n = selectedTopicObjects.length;
    if (n === 0) return [];

    const baseObj = Math.floor(effectiveObjectiveNeed / n);
    const remObj = effectiveObjectiveNeed % n;
    const baseEss = Math.floor(effectiveEssayNeed / n);
    const remEss = effectiveEssayNeed % n;

    return selectedTopicObjects.map((topic, index) => {
      const quotaObj = baseObj + (index < remObj ? 1 : 0);
      const quotaEss = baseEss + (index < remEss ? 1 : 0);
      const topicNameLower = topic.name.trim().toLowerCase();

      const topicObjPool = matchingBankQuestions.filter(
        (q) => q.type !== 'essay' && q.topic.trim().toLowerCase() === topicNameLower
      );
      const topicEssPool = matchingBankQuestions.filter(
        (q) => q.type === 'essay' && q.topic.trim().toLowerCase() === topicNameLower
      );

      const pickedObj = topicObjPool.slice(0, quotaObj);
      const pickedEss = topicEssPool.slice(0, quotaEss);

      const missingObj = Math.max(0, quotaObj - topicObjPool.length);
      const missingEss = Math.max(0, quotaEss - topicEssPool.length);

      return {
        topic,
        sharePercent: Number((100 / n).toFixed(1)),
        quotaObj,
        quotaEss,
        availObj: topicObjPool.length,
        availEss: topicEssPool.length,
        pickedObj,
        pickedEss,
        missingObj,
        missingEss
      };
    });
  }, [selectedTopicObjects, effectiveObjectiveNeed, effectiveEssayNeed, matchingBankQuestions]);

  const topicAllocationMap = useMemo(() => {
    const map: Record<string, (typeof topicAllocationPlan)[number]> = {};
    topicAllocationPlan.forEach((item) => {
      map[item.topic.id] = item;
    });
    return map;
  }, [topicAllocationPlan]);

  const totalMissingObjByQuota = useMemo(
    () => topicAllocationPlan.reduce((sum, item) => sum + item.missingObj, 0),
    [topicAllocationPlan]
  );

  const totalMissingEssByQuota = useMemo(
    () => topicAllocationPlan.reduce((sum, item) => sum + item.missingEss, 0),
    [topicAllocationPlan]
  );

  const isObjectiveShortage = totalMissingObjByQuota > 0;
  const isEssayShortage = totalMissingEssByQuota > 0;
  const hasQuestionShortage = isObjectiveShortage || isEssayShortage;

  // Danh sách câu hỏi được chọn để tạo Snapshot (Chia đều theo đúng tỷ lệ 100%/N chủ đề)
  const selectedQuestionsForAssignment = useMemo(() => {
    if (selectionMode === 'manual' && manualSelectedQuestionIds.length > 0) {
      return matchingBankQuestions.filter((q) => manualSelectedQuestionIds.includes(q.id));
    }
    const chosenObj = topicAllocationPlan.flatMap((item) => item.pickedObj);
    const chosenEss = topicAllocationPlan.flatMap((item) => item.pickedEss);
    return [...chosenObj, ...chosenEss];
  }, [
    selectionMode,
    manualSelectedQuestionIds,
    matchingBankQuestions,
    topicAllocationPlan
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

  // Gọi API thực tế từ Gemini AI (gemini-4-hydrogen) qua backend server khi bấm [Auto Tạo câu hỏi]
  // Tự động tạo và phân bổ câu hỏi theo đúng tỷ lệ 100%/N chủ đề đã chọn
  const handleAutoGenerateQuestionsWithGemini = async () => {
    if (selectedTopicObjects.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 chủ đề môn học trước khi tạo câu hỏi AI.', 'error');
      return;
    }

    const objToCreate = hasQuestionShortage ? totalMissingObjByQuota : effectiveObjectiveNeed;
    const essToCreate = hasQuestionShortage ? totalMissingEssByQuota : effectiveEssayNeed;

    if (objToCreate + essToCreate === 0) {
      showToast('Vui lòng chọn số lượng câu hỏi lớn hơn 0.', 'error');
      return;
    }

    setIsAutoGeneratingAi(true);
    try {
      const targetClassObj =
        assignedClasses.find((c) => targetClassIds.includes(c.id)) ||
        selectedClass ||
        assignedClasses[0];

      const topicsPayload = topicAllocationPlan.map((item) => ({
        id: item.topic.id,
        name: item.topic.name,
        content: item.topic.content,
        chapter: item.topic.chapter,
        sessionLabel: item.topic.sessionLabel,
        sharePercent: item.sharePercent,
        objectiveQuota: hasQuestionShortage ? item.missingObj : item.quotaObj,
        essayQuota: hasQuestionShortage ? item.missingEss : item.quotaEss
      }));

      const { createdQuestions, model } = await questionBankService.autoGenerateQuestionsForTopics({
        subject: wizardSubject,
        gradeLevel: targetClassObj?.gradeLevel || 10,
        className: targetClassObj?.name || '10A1',
        topics: topicsPayload,
        objectiveNeeded: objToCreate,
        essayNeeded: essToCreate,
        difficulty: difficultyFilter,
        extraInstruction: extraRequirementNote.trim(),
        authorName: user?.name || 'Cô Nguyễn Thị Mai'
      });

      if (selectionMode === 'manual') {
        setManualSelectedQuestionIds((prev) =>
          Array.from(new Set([...prev, ...createdQuestions.map((q) => q.id)]))
        );
      }

      showToast(
        `Đã tự động tạo ${createdQuestions.length} câu hỏi từ Gemini AI (${model}) chia đều theo tỷ lệ ${sharePercentPerTopic}%/chủ đề cho ${selectedTopicObjects.length} chủ đề!`,
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          'Lỗi khi gọi Gemini AI (gemini-4-hydrogen). Vui lòng kiểm tra cấu hình khóa API trong Settings > Secrets.',
        'error'
      );
    } finally {
      setIsAutoGeneratingAi(false);
    }
  };

  const handleValidateStep = (step: 1 | 2 | 3): boolean => {
    if (step === 1) {
      if (selectedTopicIds.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 chủ đề môn học để tạo bài tập.', 'error');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (hasQuestionShortage) {
        showToast(
          'Ngân hàng câu hỏi trong các chủ đề được chọn chưa đủ số lượng yêu cầu. Vui lòng nhấn [Auto Tạo câu hỏi] hoặc giảm số câu.',
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
      if (targetClassIds.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 lớp nhận bài.', 'error');
        return false;
      }
      if (!dueDateLocal) {
        showToast('Vui lòng chọn Hạn nộp bài và Giờ khóa đề.', 'error');
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
    const fallbackTitle =
      selectedTopicObjects.length > 0
        ? `${assignmentType === 'test' ? 'Kiểm tra' : 'Bài tập về nhà'} – ${selectedTopicObjects
            .map((t) => t.name)
            .join(' & ')}`
        : '';
    const finalTitle = wizardTitle.trim() || fallbackTitle;

    if (!finalTitle) {
      showToast('Vui lòng nhập Tiêu đề bài tập / Kiểm tra.', 'error');
      return;
    }

    if (targetStatus === 'published') {
      if (!handleValidateStep(1) || !handleValidateStep(2) || !handleValidateStep(3)) return;
    }

    if (!wizardTitle.trim()) {
      setWizardTitle(finalTitle);
    }

    const chosenClasses = assignedClasses.filter((c) => targetClassIds.includes(c.id));
    const primaryClass = chosenClasses[0] || assignedClasses[0];
    const openIso = openAtLocal ? new Date(openAtLocal).toISOString() : new Date().toISOString();
    const dueIso = dueDateLocal ? new Date(dueDateLocal).toISOString() : new Date(Date.now() + 86400000).toISOString();

    const instructionsText =
      extraRequirementTarget === 'student_instruction' && extraRequirementNote.trim()
        ? extraRequirementNote.trim()
        : undefined;

    const created = db.addAssignment({
      title: finalTitle,
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
      teacherName: user?.name || 'Cô Nguyễn Thị Mai',
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
    setIsPreviewExamModalOpen(false);

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
      {activeSubModule !== 'list' && (
        <PageHeader
          title={activeSubModule === 'topics' ? 'Quản lý chủ đề' : 'Tạo bài tập'}
          subtitle={
            activeSubModule === 'topics'
              ? 'Quản lý chủ đề bài học, giáo án giảng dạy và câu hỏi theo từng chủ đề'
              : 'Thiết lập bài tập về nhà hoặc bài kiểm tra theo chủ đề môn học và tự động phân bổ câu hỏi'
          }
        >
          {activeSubModule === 'topics' && (
            <button
              type="button"
              onClick={handleOpenCreateTopic}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm chủ đề mới
            </button>
          )}
        </PageHeader>
      )}

      {/* ===================================================================== */}
      {/* MÀN HÌNH 1: QUẢN LÝ CHỦ ĐỀ (TOPICS)                                   */}
      {/* ===================================================================== */}
      {activeSubModule === 'topics' && (
        <div className="space-y-5">
          {/* Thanh tìm kiếm & lọc chủ đề: 1. Textbox tìm kiếm chủ đề -> 2. Combobox Tất cả các lớp -> 3. Combobox môn học -> 4. Combobox trạng thái */}
          <div className="bg-[#0f172a] p-3.5 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                      <th className="py-3.5 px-4">Tên chủ đề</th>
                      <th className="py-3.5 px-3">Môn học</th>
                      <th className="py-3.5 px-3">Lớp / Buổi học</th>
                      <th className="py-3.5 px-3 text-center">Trắc nghiệm</th>
                      <th className="py-3.5 px-3 text-center">Tự luận</th>
                      <th className="py-3.5 px-3 text-center">Trạng thái</th>
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
      {/* MÀN HÌNH 2: TẠO BÀI TẬP (GIAO DIỆN ĐỒNG NHẤT THEO MẪU THAM CHIẾU)     */}
      {/* ===================================================================== */}
      {activeSubModule === 'create' && (() => {
        const chosenClasses = assignedClasses.filter((c) => targetClassIds.includes(c.id));
        const totalSelectedStudents = chosenClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
        const primarySelectedClass = chosenClasses[0] || assignedClasses[0];
        const COUNT_OPTIONS_1_TO_10 = Array.from({ length: 10 }, (_, i) => i + 1);

        const missingObjDisplay = Math.max(
          totalMissingObjByQuota,
          Math.max(0, effectiveObjectiveNeed - availableObjectiveQuestions.length)
        );
        const missingEssDisplay = Math.max(
          totalMissingEssByQuota,
          Math.max(0, effectiveEssayNeed - availableEssayQuestions.length)
        );

        return (
          <div
            ref={createFormRef}
            className="bg-[#040914] p-5 sm:p-6 rounded-2xl border border-[#164452] space-y-5 shadow-2xl"
          >
            {/* DÒNG 1: Loại bài tập * | Lớp nhận bài * (Chọn nhiều lớp) | Môn học * */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Loại bài tập * */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Loại bài tập <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={assignmentTypeLabel}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignmentTypeLabel(val);
                      if (val === 'quiz_15' || val === 'test_45') {
                        setAssignmentType('test');
                        if (val === 'quiz_15') setDurationMinutes(15);
                        if (val === 'test_45') setDurationMinutes(45);
                      } else {
                        setAssignmentType('homework');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                  >
                    <option value="homework">Bài tập về nhà (Homework)</option>
                    <option value="quiz_15">Kiểm tra 15 phút (Quiz)</option>
                    <option value="test_45">Kiểm tra 45 phút - 1 tiết (Test)</option>
                    <option value="review">Bài tập ôn tập chuyên đề</option>
                  </select>
                </div>
              </div>

              {/* 2. Lớp nhận bài * (Chọn nhiều lớp) - Combobox chọn nhiều lớp */}
              <div className="relative" data-create-combobox>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Lớp nhận bài <span className="text-rose-400">*</span>{' '}
                    <span className="text-[#00E5F0] font-normal">(Chọn nhiều lớp)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-[#00E5F0]">
                    {targetClassIds.length}/{assignedClasses.length} lớp
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveCreateDropdown((prev) => (prev === 'classes' ? null : 'classes'))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] hover:border-[#00E5F0]/60 text-xs sm:text-sm font-bold text-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Users className="w-4 h-4 text-[#00E5F0] shrink-0" />
                    <span className="truncate">
                      {primarySelectedClass ? `Lớp ${primarySelectedClass.name}` : 'Chọn lớp nhận bài'}
                      {chosenClasses.length > 1 ? ` (+${chosenClasses.length - 1} lớp)` : ''}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      activeCreateDropdown === 'classes' ? 'rotate-180 text-[#00E5F0]' : ''
                    }`}
                  />
                </button>

                {activeCreateDropdown === 'classes' && (
                  <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-[#071020] border border-[#00E5F0]/50 shadow-2xl z-30 p-3 space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-[#164452] text-[11px]">
                      <span className="font-mono font-bold text-[#00E5F0]">
                        CHỌN LỚP NHẬN BÀI ({targetClassIds.length}/{assignedClasses.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (targetClassIds.length === assignedClasses.length) {
                            setTargetClassIds([assignedClasses[0]?.id || 'cls-10a1']);
                          } else {
                            setTargetClassIds(assignedClasses.map((c) => c.id));
                          }
                        }}
                        className="text-xs font-bold text-[#00E5F0] hover:underline cursor-pointer"
                      >
                        {targetClassIds.length === assignedClasses.length
                          ? 'Chỉ chọn 1 lớp'
                          : 'Chọn tất cả'}
                      </button>
                    </div>

                    {assignedClasses.map((cls) => {
                      const isChecked = targetClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          onClick={() => toggleTargetClass(cls.id)}
                          className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                            isChecked
                              ? 'bg-[#072235] border-[#00E5F0]/60 text-white font-bold'
                              : 'bg-[#050B16] border-[#164452]/60 text-slate-300 hover:border-[#00E5F0]/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-slate-500 accent-[#00E5F0]"
                            />
                            <span>Lớp {cls.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#00E5F0]">
                            ({cls.studentCount || 0} HS)
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Môn học * */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Môn học <span className="text-rose-400">*</span>
                </label>
                <select
                  value={wizardSubject}
                  onChange={(e) => {
                    const nextSubj = e.target.value;
                    setWizardSubject(nextSubj);
                    const matching = allTopics.filter(
                      (t) => t.status === 'active' && t.subject === nextSubj
                    );
                    setSelectedTopicIds(matching[0] ? [matching[0].id] : []);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                >
                  {assignedSubjects.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DÒNG 2: Khung hiển thị Lớp được phân phối */}
            <div className="px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="w-4 h-4 text-[#00E5F0] shrink-0" />
                <span>
                  Lớp được phân phối ({chosenClasses.length} lớp · {totalSelectedStudents} HS):
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {chosenClasses.map((cls) => (
                  <span
                    key={cls.id}
                    onClick={() => toggleTargetClass(cls.id)}
                    title="Nhấn để bỏ chọn lớp này (cần tối thiểu 1 lớp)"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#062436] border border-[#00E5F0]/40 text-xs font-extrabold text-slate-100 cursor-pointer hover:border-[#00E5F0] transition-colors"
                  >
                    <span>Lớp {cls.name}</span>
                    <span className="text-[#00E5F0] font-mono">({cls.studentCount || 0} HS)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* DÒNG 3: Tiêu đề bài tập / Kiểm tra * */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Tiêu đề bài tập / Kiểm tra <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={wizardTitle}
                onChange={(e) => setWizardTitle(e.target.value)}
                placeholder="Ví dụ: Kiểm tra 15 phút – Hệ phương trình bậc nhất..."
                className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#00E5F0] transition-colors"
              />
            </div>

            {/* DÒNG 4: Những chủ đề thuộc môn học & phân bổ tỷ lệ câu hỏi */}
            <div className="p-4 rounded-2xl bg-[#050B16] border border-[#164452] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#00E5F0]">
                  Những chủ đề thuộc môn {wizardSubject}
                </span>
                <span className="text-xs font-mono font-bold text-[#00E5F0]">
                  Đã chọn {selectedTopicIds.length} chủ đề (Phân bổ: {sharePercentPerTopic}% mỗi chủ đề)
                </span>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {availableWizardTopics.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#040914] border border-[#164452]/60 text-xs text-slate-400 flex items-center justify-between">
                    <span>Chưa có chủ đề nào thuộc môn {wizardSubject}.</span>
                    <button
                      type="button"
                      onClick={handleOpenCreateTopic}
                      className="px-3 py-1.5 rounded-xl bg-cyan-950 text-[#00E5F0] border border-[#00E5F0]/40 font-bold cursor-pointer"
                    >
                      + Tạo chủ đề mới
                    </button>
                  </div>
                ) : (
                  availableWizardTopics.map((topic) => {
                    const isSelected = selectedTopicIds.includes(topic.id);
                    const stats = topicStatsMap[topic.id] || {
                      objectiveCount: 0,
                      essayCount: 0,
                      totalCount: 0
                    };

                    return (
                      <div
                        key={topic.id}
                        onClick={() => toggleSelectTopicInWizard(topic.id)}
                        className={`px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#071D2E] border-[#00E5F0] text-white shadow-[0_0_14px_rgba(0,229,240,0.12)]'
                            : 'bg-[#060D1A] border-[#164452]/80 text-slate-200 hover:border-[#00E5F0]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-slate-500 accent-[#00E5F0] shrink-0"
                          />
                          <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                            {topic.name}
                          </span>
                          <span className="text-xs font-mono font-semibold text-[#00E5F0] shrink-0">
                            ({stats.objectiveCount} TN
                            {stats.essayCount > 0 ? ` · ${stats.essayCount} TL` : ''})
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-xs font-mono font-semibold text-[#00E5F0]">
                            Buổi: {topic.sessionLabel || 'Buổi 1'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* DÒNG 5: Dạng bài / Hình thức câu hỏi * & Độ khó câu hỏi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Dạng bài / Hình thức câu hỏi <span className="text-rose-400">*</span>
                </label>
                <select
                  value={questionFormat}
                  onChange={(e) => setQuestionFormat(e.target.value as QuestionFormatOption)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                >
                  <option value="combined">Kết hợp Trắc nghiệm &amp; Tự luận</option>
                  <option value="objective">Chỉ Trắc nghiệm</option>
                  <option value="essay">Chỉ Tự luận</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Độ khó câu hỏi
                </label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                >
                  <option value="all">Tất cả mức độ</option>
                  {DIFFICULTY_LIST.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DÒNG 6: Số câu Trắc nghiệm (1–20) & Số câu Tự luận (1–10) */}
            <div className="p-4 rounded-2xl bg-[#050B16] border border-[#164452] grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Số câu Trắc nghiệm (1–20) */}
              <div className={questionFormat === 'essay' ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    Số câu Trắc nghiệm (1–20)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#00E5F0]">
                    Có: {availableObjectiveQuestions.length} / Cần: {effectiveObjectiveNeed}
                  </span>
                </div>
                <select
                  value={objectiveCount}
                  onChange={(e) => setObjectiveCount(Number(e.target.value))}
                  disabled={questionFormat === 'essay'}
                  className="w-full px-4 py-3 rounded-2xl bg-[#071020] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                >
                  {COUNT_OPTIONS_1_TO_20.map((num) => (
                    <option key={num} value={num}>
                      {num} câu trắc nghiệm
                    </option>
                  ))}
                </select>
                {questionFormat !== 'essay' && (isObjectiveShortage || missingObjDisplay > 0) && (
                  <p className="text-xs font-semibold text-rose-400 mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Thiếu {missingObjDisplay} câu trắc nghiệm!</span>
                  </p>
                )}
              </div>

              {/* Số câu Tự luận (1–10) */}
              <div className={questionFormat === 'objective' ? 'opacity-50 pointer-events-none' : ''}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200">
                    Số câu Tự luận (1–10)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#00E5F0]">
                    Có: {availableEssayQuestions.length} / Cần: {effectiveEssayNeed}
                  </span>
                </div>
                <select
                  value={essayCount > 10 ? 10 : essayCount}
                  onChange={(e) => setEssayCount(Number(e.target.value))}
                  disabled={questionFormat === 'objective'}
                  className="w-full px-4 py-3 rounded-2xl bg-[#071020] border border-[#164452] text-xs sm:text-sm font-bold text-slate-100 outline-none focus:border-[#00E5F0] transition-colors cursor-pointer"
                >
                  {COUNT_OPTIONS_1_TO_10.map((num) => (
                    <option key={num} value={num}>
                      {num} câu tự luận
                    </option>
                  ))}
                </select>
                {questionFormat !== 'objective' && (isEssayShortage || missingEssDisplay > 0) && (
                  <p className="text-xs font-semibold text-rose-400 mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Thiếu {missingEssDisplay} câu tự luận!</span>
                  </p>
                )}
              </div>
            </div>

            {/* DÒNG 7: Khung [Auto Tạo câu hỏi] bằng Gemini AI */}
            <div className="p-4 rounded-2xl bg-[#061826] border border-[#164452] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#00E5F0] shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-xs text-[#96A3B8] leading-relaxed">
                  {hasQuestionShortage ? (
                    <>
                      Ngân hàng câu hỏi trong các chủ đề được chọn chưa đủ số lượng yêu cầu. Nhấn nút để hệ thống tự động tạo và phân bổ câu hỏi.
                    </>
                  ) : (
                    <>
                      Hệ thống đã chọn lọc đủ{' '}
                      <strong className="text-[#00E5F0]">{selectedQuestionsForAssignment.length} câu hỏi</strong>{' '}
                      theo tỷ lệ <strong className="text-[#00E5F0]">{sharePercentPerTopic}%/chủ đề</strong>. Bạn vẫn có thể nhấn nút để tự động tạo và phân bổ thêm câu hỏi mới.
                    </>
                  )}
                </p>
              </div>

              <button
                type="button"
                disabled={isAutoGeneratingAi}
                onClick={handleAutoGenerateQuestionsWithGemini}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00B8D9] to-[#2563EB] hover:from-[#00E5F0] hover:to-[#3B82F6] disabled:opacity-60 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,240,0.25)] shrink-0 cursor-pointer transition-all"
              >
                <Sparkles className={`w-4 h-4 ${isAutoGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isAutoGeneratingAi ? 'Đang gọi Gemini AI...' : '[Auto Tạo câu hỏi]'}</span>
              </button>
            </div>

            {/* DÒNG 8 (DÒNG CUỐI): Hạn nộp bài * | Giờ khóa đề * | Thời gian làm bài (phút) - Khi click vào hiển thị như Combobox */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Hạn nộp bài * (Combobox khi click) */}
              <div className="relative" data-create-combobox>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Hạn nộp bài <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCreateDropdown((prev) => (prev === 'dueDate' ? null : 'dueDate'))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] hover:border-[#00E5F0]/60 text-xs sm:text-sm font-bold text-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Calendar className="w-4 h-4 text-[#00E5F0] shrink-0" />
                    <span className="truncate">{formatDateDisplayVN(dueDateDay)}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      activeCreateDropdown === 'dueDate' ? 'rotate-180 text-[#00E5F0]' : ''
                    }`}
                  />
                </button>

                {activeCreateDropdown === 'dueDate' && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 rounded-2xl bg-[#071020] border border-[#00E5F0]/50 shadow-2xl z-30 p-2.5 space-y-1.5 max-h-72 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5F0] border-b border-[#164452]">
                      Chọn nhanh hạn nộp bài
                    </div>
                    {dueDateComboboxOptions.map((opt) => {
                      const isActive = dueDateDay === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDueDateDay(opt.value);
                            setActiveCreateDropdown(null);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#072235] text-[#00E5F0] font-bold border border-[#00E5F0]/40'
                              : 'text-slate-200 hover:bg-[#101827]'
                          }`}
                        >
                          <span>{opt.displayDate}</span>
                          <span className="text-[11px] font-mono text-[#00E5F0]">{opt.tag}</span>
                        </button>
                      );
                    })}
                    <div className="pt-2 mt-1 border-t border-[#164452] px-1">
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Hoặc chọn ngày khác từ lịch:
                      </label>
                      <input
                        type="date"
                        value={dueDateDay}
                        onChange={(e) => {
                          if (e.target.value) {
                            setDueDateDay(e.target.value);
                            setActiveCreateDropdown(null);
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#050B16] border border-[#164452] text-xs font-bold text-slate-100 outline-none focus:border-[#00E5F0]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Giờ khóa đề * (Combobox khi click) */}
              <div className="relative" data-create-combobox>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Giờ khóa đề <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCreateDropdown((prev) => (prev === 'lockTime' ? null : 'lockTime'))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] hover:border-[#00E5F0]/60 text-xs sm:text-sm font-bold text-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Lock className="w-4 h-4 text-[#00E5F0] shrink-0" />
                    <span className="truncate">
                      {lockTimeComboboxOptions.find((o) => o.value === lockTimeHour)?.label ||
                        `${lockTimeHour}`}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      activeCreateDropdown === 'lockTime' ? 'rotate-180 text-[#00E5F0]' : ''
                    }`}
                  />
                </button>

                {activeCreateDropdown === 'lockTime' && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 rounded-2xl bg-[#071020] border border-[#00E5F0]/50 shadow-2xl z-30 p-2 space-y-1 max-h-64 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5F0] border-b border-[#164452]">
                      Chọn khung giờ khóa đề
                    </div>
                    {lockTimeComboboxOptions.map((opt) => {
                      const isActive = lockTimeHour === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setLockTimeHour(opt.value);
                            setActiveCreateDropdown(null);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#072235] text-[#00E5F0] font-bold border border-[#00E5F0]/40'
                              : 'text-slate-200 hover:bg-[#101827]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5F0]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Thời gian làm bài (phút) (Combobox khi click) */}
              <div className="relative" data-create-combobox>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Thời gian làm bài (phút)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCreateDropdown((prev) => (prev === 'duration' ? null : 'duration'))
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-[#050B16] border border-[#164452] hover:border-[#00E5F0]/60 text-xs sm:text-sm font-bold text-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Clock className="w-4 h-4 text-[#00E5F0] shrink-0" />
                    <span className="truncate">
                      {durationComboboxOptions.find((o) => o.value === durationMinutes)?.label ||
                        `${durationMinutes} phút`}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      activeCreateDropdown === 'duration' ? 'rotate-180 text-[#00E5F0]' : ''
                    }`}
                  />
                </button>

                {activeCreateDropdown === 'duration' && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 rounded-2xl bg-[#071020] border border-[#00E5F0]/50 shadow-2xl z-30 p-2 space-y-1 max-h-64 overflow-y-auto">
                    <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#00E5F0] border-b border-[#164452]">
                      Chọn thời gian làm bài
                    </div>
                    {durationComboboxOptions.map((opt) => {
                      const isActive = durationMinutes === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDurationMinutes(opt.value);
                            setActiveCreateDropdown(null);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-[#072235] text-[#00E5F0] font-bold border border-[#00E5F0]/40'
                              : 'text-slate-200 hover:bg-[#101827]'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5F0]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* DÒNG NÚT HÀNH ĐỘNG DƯỚI CÙNG: Xem trước đề (N câu) | Lưu nháp | Giao bài ngay */}
            <div className="pt-3 border-t border-[#164452]/70 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsPreviewExamModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#061826] hover:bg-[#0A253A] border border-[#164452] text-[#00E5F0] text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Xem trước đề ({builtSnapshots.length} câu)</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveOrPublishWizard('draft')}
                  className="px-5 py-2.5 rounded-2xl bg-[#101A2C] hover:bg-[#17253D] text-slate-200 border border-slate-700 text-xs font-extrabold cursor-pointer transition-colors"
                >
                  Lưu nháp
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrPublishWizard('published')}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#009BB8] to-[#0284C7] hover:from-[#00E5F0] hover:to-[#0369A1] text-white text-xs font-extrabold flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,240,0.25)] cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Giao bài ngay</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* MÀN HÌNH 3: DANH SÁCH BÀI TẬP ĐÃ GIAO (MASTER SPEC SPLIT VIEW 32/68)   */}
      {/* ===================================================================== */}
      {activeSubModule === 'list' && (
        <AssignedAssignmentsSplitView
          user={user}
          assignedClasses={assignedClasses}
          assignedSubjects={assignedSubjects}
          allTopics={allTopics}
          onSwitchSubModule={switchSubModule}
          onOpenEditMeta={handleOpenEditMeta}
        />
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
      {/* MODAL 5A: XEM TRƯỚC ĐỀ & ĐÁP ÁN CHUẨN TRƯỚC KHI GIAO                   */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPreviewExamModalOpen}
        onClose={() => setIsPreviewExamModalOpen(false)}
        title={`Xem trước đề bài (${builtSnapshots.length} câu hỏi • Tổng ${totalPoints} điểm)`}
        subtitle={`Môn ${wizardSubject} • Phân bổ ${sharePercentPerTopic}% mỗi chủ đề • Thời gian: ${durationMinutes} phút`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {builtSnapshots.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <p className="text-slate-300 font-bold">
                Chưa có câu hỏi nào trong đề. Hãy chọn chủ đề có câu hỏi hoặc nhấn [Auto Tạo câu hỏi].
              </p>
              <button
                type="button"
                disabled={isAutoGeneratingAi}
                onClick={handleAutoGenerateQuestionsWithGemini}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B8D9] to-[#2563EB] text-white font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAutoGeneratingAi ? 'Đang tạo câu hỏi...' : '[Auto Tạo câu hỏi] ngay'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {builtSnapshots.map((snap, idx) => (
                <div
                  key={snap.questionId}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 font-extrabold">
                        Câu {idx + 1}
                      </span>
                      <span className="font-mono text-slate-400">{snap.code}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 font-bold text-slate-300">
                        {QUESTION_TYPE_LABELS[snap.type]}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300">
                        {snap.difficulty}
                      </span>
                      <span className="text-slate-400">Chủ đề: {snap.topic}</span>
                    </div>
                    <span className="font-extrabold text-emerald-400">{snap.points} điểm</span>
                  </div>

                  <p className="text-sm text-slate-100 font-medium">{snap.content}</p>

                  {snap.options && snap.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {snap.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center justify-between ${
                            opt.isCorrect
                              ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200 font-bold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>
                            {opt.label}. {opt.text}
                          </span>
                          {opt.isCorrect && <span className="text-[10px] text-emerald-400">✓ Đúng</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {snap.rubric && (
                    <p className="text-xs text-amber-300/90 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/50">
                      <strong>Hướng dẫn chấm:</strong> {snap.rubric}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPreviewExamModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Đóng
            </button>
            {builtSnapshots.length > 0 && (
              <button
                type="button"
                onClick={() => handleSaveOrPublishWizard('published')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#009BB8] to-[#0284C7] text-white font-bold flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Giao bài ngay</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL 5: XÁC NHẬN PHÁT HÀNH BÀI TẬP                                    */}
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
