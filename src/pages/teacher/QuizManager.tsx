import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Copy,
  Edit3,
  Eye,
  Check,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldAlert,
  FileSpreadsheet,
  BookOpen,
  Tag,
  Play,
  Shuffle,
  RotateCw,
  GitCompare,
  CheckSquare,
  Cloud,
  CloudUpload
} from 'lucide-react';
import { useClass } from '../../contexts/ClassContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/db';
import {
  PageHeader,
  StatCard,
  Modal,
  ConfirmDialog,
  EmptyState,
  StatusChip
} from '../../components/common/UIComponents';
import {
  questionBankService,
  QuestionItem,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
  QuestionOption,
  TrueFalseStatement,
  ImportRowPreview,
  ExportConfig,
  QUESTION_TYPE_LABELS,
  QUESTION_STATUS_LABELS,
  DUPLICATE_STATUS_LABELS,
  SUBJECT_LIST,
  GRADE_LIST,
  DIFFICULTY_LIST,
  validateQuestionItem,
  evaluateDuplicateForQuestion
} from '../../services/questionBankService';

const SAMPLE_WORD_TEXT = `Câu 1: [Nhận biết] Cho hàm số bậc hai y = x² - 4x + 3. Trục đối xứng của đồ thị hàm số là đường thẳng nào?
A. x = 2
B. x = -2
C. x = 4
D. x = 1
Đáp án: A
Lời giải: Trục đối xứng của parabol y = ax² + bx + c là x = -b/(2a) = 4/(2.1) = 2.

Câu 2: [Thông hiểu] Trong mặt phẳng tọa độ Oxy, cho điểm A(1; 2) và B(4; 6). Độ dài đoạn thẳng AB bằng:
*A. 5
B. 7
C. 25
D. 3
Đáp án: A
Lời giải: AB = √((4-1)² + (6-2)²) = √(9 + 16) = 5.

Câu 3: [Vận dụng] Nghiệm dương của phương trình x² - 3x - 10 = 0 là bao nhiêu?
Đáp án: 5 | x = 5
Lời giải: Phương trình có 2 nghiệm x = 5 và x = -2. Nghiệm dương là 5.`;

export const QuizManager: React.FC = () => {
  const { selectedClassId, selectedClass } = useClass();
  const { success, warning, error, info } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Main View Mode: 'bank' (Ngân hàng câu hỏi thông minh) | 'class_quizzes' (Bộ đề kiểm tra của lớp)
  const [activeView, setActiveView] = useState<'bank' | 'class_quizzes'>('bank');

  // Question Bank State
  const [questions, setQuestions] = useState<QuestionItem[]>(() => questionBankService.getAll());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterChapter, setFilterChapter] = useState<string>('ALL');
  const [filterTopic, setFilterTopic] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterQuality, setFilterQuality] = useState<'ALL' | 'NEEDS_CHECK' | 'DUPLICATE' | 'VALID'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'code' | 'difficulty' | 'duplicate'>('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [detailQuestion, setDetailQuestion] = useState<QuestionItem | null>(null);
  const [comparePair, setComparePair] = useState<{ current: QuestionItem; target: QuestionItem } | null>(null);

  // Confirm Delete State
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Bulk Action Modal State
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [bulkChapterInput, setBulkChapterInput] = useState('');
  const [bulkTopicInput, setBulkTopicInput] = useState('');
  const [bulkTagInput, setBulkTagInput] = useState('');

  // AI Generation & Review Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSubject, setAiSubject] = useState('Toán học');
  const [aiGrade, setAiGrade] = useState<number>(10);
  const [aiChapter, setAiChapter] = useState('Chương 2: Hàm số bậc hai và đồ thị');
  const [aiTopic, setAiTopic] = useState('Khảo sát và vẽ đồ thị hàm số bậc hai');
  const [aiType, setAiType] = useState<QuestionType | 'mixed'>('mixed');
  const [aiDifficulty, setAiDifficulty] = useState<QuestionDifficulty | 'mixed'>('mixed');
  const [aiCount, setAiCount] = useState<number>(4);
  const [aiSourceMaterial, setAiSourceMaterial] = useState('');
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [aiStagedQuestions, setAiStagedQuestions] = useState<QuestionItem[]>([]);
  const [aiSelectedStageIds, setAiSelectedStageIds] = useState<string[]>([]);
  const [aiSourceBanner, setAiSourceBanner] = useState<string>('');
  const [aiEditingIndex, setAiEditingIndex] = useState<number | null>(null);

  // Import Excel / Word Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'excel' | 'word'>('excel');
  const [importSubject, setImportSubject] = useState('Toán học');
  const [importGrade, setImportGrade] = useState<number>(10);
  const [importChapter, setImportChapter] = useState('Chương 2: Hàm số bậc hai và đồ thị');
  const [importTopic, setImportTopic] = useState('Hàm số bậc hai');
  const [wordRawText, setWordRawText] = useState(SAMPLE_WORD_TEXT);
  const [importPreviews, setImportPreviews] = useState<ImportRowPreview[]>([]);
  const [importFilterTab, setImportFilterTab] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
  const [importTargetStatus, setImportTargetStatus] = useState<QuestionStatus>('pending');
  const [importEditingRowIdx, setImportEditingRowIdx] = useState<number | null>(null);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    scope: 'filtered',
    format: 'word',
    includeAnswers: true,
    includeExplanation: true,
    includeMetadata: true,
    shuffleQuestions: false,
    examTitle: `ĐỀ KIỂM TRA & NGÂN HÀNG CÂU HỎI - LỚP ${selectedClass?.name || '10A1'}`,
    schoolName: 'TRƯỜNG THPT CHUYÊN SMARTEDU'
  });

  // Quality & Duplicate Scanner Modal State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  const handleSyncFirestore = async () => {
    setIsSyncingFirestore(true);
    try {
      const res = await questionBankService.syncAllToFirestore();
      if (res.success) {
        success('Đồng bộ Cloud Firestore thành công!', `Đã lưu trữ ${res.count} câu hỏi lên Firebase.`);
      } else {
        error('Lỗi đồng bộ', res.error || 'Vui lòng kiểm tra quyền truy cập Firestore.');
      }
    } catch {
      error('Lỗi kết nối', 'Không thể gửi dữ liệu đến Cloud Firestore.');
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Existing Class Quizzes Accordion State (Preserved feature)
  const quizzes = db.getQuizzes(selectedClassId);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);

  // Form State for Create / Edit Question
  const [formCode, setFormCode] = useState('');
  const [formSubject, setFormSubject] = useState('Toán học');
  const [formGrade, setFormGrade] = useState<number>(10);
  const [formChapter, setFormChapter] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formType, setFormType] = useState<QuestionType>('single_choice');
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>('Thông hiểu');
  const [formStatus, setFormStatus] = useState<QuestionStatus>('approved');
  const [formContent, setFormContent] = useState('');
  const [formOptions, setFormOptions] = useState<QuestionOption[]>([
    { id: 'o-1', label: 'A', text: '', isCorrect: true },
    { id: 'o-2', label: 'B', text: '', isCorrect: false },
    { id: 'o-3', label: 'C', text: '', isCorrect: false },
    { id: 'o-4', label: 'D', text: '', isCorrect: false }
  ]);
  const [formStatements, setFormStatements] = useState<TrueFalseStatement[]>([
    { id: 's-1', label: 'a', content: '', isTrue: true },
    { id: 's-2', label: 'b', content: '', isTrue: false },
    { id: 's-3', label: 'c', content: '', isTrue: true },
    { id: 's-4', label: 'd', content: '', isTrue: false }
  ]);
  const [formAcceptedAnswers, setFormAcceptedAnswers] = useState<string>('');
  const [formRubric, setFormRubric] = useState('');
  const [formMaxPoints, setFormMaxPoints] = useState<number>(0.25);
  const [formExplanation, setFormExplanation] = useState('');
  const [formTags, setFormTags] = useState('');

  // Refresh helper
  const refreshBank = () => {
    setQuestions(questionBankService.getAll());
  };

  // Distinct chapters & topics for filter dropdowns
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if ((filterSubject === 'ALL' || q.subject === filterSubject) && q.chapter) {
        set.add(q.chapter);
      }
    });
    return Array.from(set);
  }, [questions, filterSubject]);

  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (
        (filterSubject === 'ALL' || q.subject === filterSubject) &&
        (filterChapter === 'ALL' || q.chapter === filterChapter) &&
        q.topic
      ) {
        set.add(q.topic);
      }
    });
    return Array.from(set);
  }, [questions, filterSubject, filterChapter]);

  // Statistics
  const stats = useMemo(() => {
    const total = questions.length;
    const approved = questions.filter((q) => q.status === 'approved').length;
    const pending = questions.filter((q) => q.status === 'pending').length;
    const aiPending = questions.filter((q) => q.status === 'pending' && q.source === 'ai').length;
    const needsCheck = questions.filter(
      (q) => q.duplicateStatus !== 'unique' || q.validationIssues.length > 0
    ).length;
    const duplicatesOnly = questions.filter((q) => q.duplicateStatus !== 'unique').length;

    return { total, approved, pending, aiPending, needsCheck, duplicatesOnly };
  }, [questions]);

  // Filtered & Sorted Questions
  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();

    const list = questions.filter((q) => {
      if (filterSubject !== 'ALL' && q.subject !== filterSubject) return false;
      if (filterGrade !== 'ALL' && String(q.gradeLevel) !== filterGrade) return false;
      if (filterChapter !== 'ALL' && q.chapter !== filterChapter) return false;
      if (filterTopic !== 'ALL' && q.topic !== filterTopic) return false;
      if (filterType !== 'ALL' && q.type !== filterType) return false;
      if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
      if (filterStatus !== 'ALL' && q.status !== filterStatus) return false;

      if (filterQuality === 'DUPLICATE' && q.duplicateStatus === 'unique') return false;
      if (
        filterQuality === 'NEEDS_CHECK' &&
        q.duplicateStatus === 'unique' &&
        q.validationIssues.length === 0
      )
        return false;
      if (
        filterQuality === 'VALID' &&
        (q.duplicateStatus !== 'unique' ||
          q.validationIssues.some((i) => i.severity === 'error'))
      )
        return false;

      if (qLower) {
        const inContent = q.content.toLowerCase().includes(qLower);
        const inCode = q.code.toLowerCase().includes(qLower);
        const inTopic = q.topic.toLowerCase().includes(qLower);
        const inChapter = q.chapter.toLowerCase().includes(qLower);
        const inTags = q.tags.some((t) => t.toLowerCase().includes(qLower));
        if (!inContent && !inCode && !inTopic && !inChapter && !inTags) return false;
      }

      return true;
    });

    const diffWeight: Record<QuestionDifficulty, number> = {
      'Nhận biết': 1,
      'Thông hiểu': 2,
      'Vận dụng': 3,
      'Vận dụng cao': 4
    };

    return list.sort((a, b) => {
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      if (sortBy === 'difficulty') return diffWeight[a.difficulty] - diffWeight[b.difficulty];
      if (sortBy === 'duplicate') return (b.duplicateScore || 0) - (a.duplicateScore || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [
    questions,
    searchQuery,
    filterSubject,
    filterGrade,
    filterChapter,
    filterTopic,
    filterType,
    filterDifficulty,
    filterStatus,
    filterQuality,
    sortBy
  ]);

  // Keep page within valid range when filter changes (without losing data)
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  // Real-time form validation & duplicate check inside Create/Edit modal
  const liveFormDraft = useMemo<Partial<QuestionItem>>(() => {
    return {
      id: editingQuestion?.id,
      subject: formSubject,
      gradeLevel: formGrade,
      chapter: formChapter,
      topic: formTopic,
      type: formType,
      difficulty: formDifficulty,
      status: formStatus,
      content: formContent,
      options: formOptions,
      statements: formStatements,
      acceptedAnswers: formAcceptedAnswers
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean),
      rubric: formRubric,
      maxPoints: formMaxPoints,
      explanation: formExplanation
    };
  }, [
    editingQuestion,
    formSubject,
    formGrade,
    formChapter,
    formTopic,
    formType,
    formDifficulty,
    formStatus,
    formContent,
    formOptions,
    formStatements,
    formAcceptedAnswers,
    formRubric,
    formMaxPoints,
    formExplanation
  ]);

  const liveFormValidation = useMemo(() => validateQuestionItem(liveFormDraft), [liveFormDraft]);
  const liveFormDuplicate = useMemo(
    () => evaluateDuplicateForQuestion(liveFormDraft, questions),
    [liveFormDraft, questions]
  );

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingQuestion(null);
    setFormCode(questionBankService.generateNextCode('Toán học', 10, questions));
    setFormSubject('Toán học');
    setFormGrade(10);
    setFormChapter('Chương 2: Hàm số bậc hai và đồ thị');
    setFormTopic('Hàm số bậc hai');
    setFormType('single_choice');
    setFormDifficulty('Thông hiểu');
    setFormStatus('approved');
    setFormContent('');
    setFormOptions([
      { id: 'o-1', label: 'A', text: '', isCorrect: true },
      { id: 'o-2', label: 'B', text: '', isCorrect: false },
      { id: 'o-3', label: 'C', text: '', isCorrect: false },
      { id: 'o-4', label: 'D', text: '', isCorrect: false }
    ]);
    setFormStatements([
      { id: 's-1', label: 'a', content: '', isTrue: true },
      { id: 's-2', label: 'b', content: '', isTrue: false },
      { id: 's-3', label: 'c', content: '', isTrue: true },
      { id: 's-4', label: 'd', content: '', isTrue: false }
    ]);
    setFormAcceptedAnswers('');
    setFormRubric('');
    setFormMaxPoints(0.25);
    setFormExplanation('');
    setFormTags('');
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (q: QuestionItem) => {
    setEditingQuestion(q);
    setFormCode(q.code);
    setFormSubject(q.subject);
    setFormGrade(q.gradeLevel);
    setFormChapter(q.chapter);
    setFormTopic(q.topic);
    setFormType(q.type);
    setFormDifficulty(q.difficulty);
    setFormStatus(q.status);
    setFormContent(q.content);
    setFormOptions(
      q.options.length > 0
        ? JSON.parse(JSON.stringify(q.options))
        : [
            { id: 'o-1', label: 'A', text: '', isCorrect: true },
            { id: 'o-2', label: 'B', text: '', isCorrect: false },
            { id: 'o-3', label: 'C', text: '', isCorrect: false },
            { id: 'o-4', label: 'D', text: '', isCorrect: false }
          ]
    );
    setFormStatements(
      q.statements.length > 0
        ? JSON.parse(JSON.stringify(q.statements))
        : [
            { id: 's-1', label: 'a', content: '', isTrue: true },
            { id: 's-2', label: 'b', content: '', isTrue: false },
            { id: 's-3', label: 'c', content: '', isTrue: true },
            { id: 's-4', label: 'd', content: '', isTrue: false }
          ]
    );
    setFormAcceptedAnswers(q.acceptedAnswers.join(' | '));
    setFormRubric(q.rubric || '');
    setFormMaxPoints(q.maxPoints || 0.25);
    setFormExplanation(q.explanation || '');
    setFormTags(q.tags.join(', '));
    setIsEditorOpen(true);
  };

  // Save Question (Create or Edit)
  const handleSaveQuestion = () => {
    const errors = liveFormValidation.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      error('Chưa thể lưu câu hỏi', errors[0].message);
      return;
    }

    const payload = {
      code: formCode.trim(),
      subject: formSubject,
      gradeLevel: formGrade,
      className: selectedClass?.name || `${formGrade}A1`,
      chapter: formChapter.trim() || 'Chương 1',
      topic: formTopic.trim() || 'Chủ đề chung',
      type: formType,
      difficulty: formDifficulty,
      status: formStatus,
      content: formContent.trim(),
      options: formType === 'single_choice' || formType === 'multiple_choice' ? formOptions : [],
      statements: formType === 'true_false' ? formStatements : [],
      acceptedAnswers:
        formType === 'fill_blank'
          ? formAcceptedAnswers
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      rubric: formType === 'essay' ? formRubric.trim() : '',
      maxPoints: formMaxPoints,
      explanation: formExplanation.trim(),
      tags: formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      source: editingQuestion ? editingQuestion.source : ('manual' as const),
      sourceNote: editingQuestion?.sourceNote
    };

    if (editingQuestion) {
      questionBankService.update(editingQuestion.id, payload);
      success('Đã cập nhật câu hỏi', `Mã câu hỏi ${payload.code} đã được lưu thành công.`);
    } else {
      const created = questionBankService.create(payload);
      if (created.duplicateStatus !== 'unique') {
        warning(
          'Đã lưu kèm cảnh báo trùng lặp',
          `Câu hỏi ${created.code} có độ tương đồng ${created.duplicateScore}% với ${created.duplicateOfCode}.`
        );
      } else {
        success('Đã tạo câu hỏi mới', `Mã câu hỏi ${created.code} đã được thêm vào ngân hàng.`);
      }
    }

    refreshBank();
    setIsEditorOpen(false);
  };

  // Duplicate single question
  const handleDuplicate = (q: QuestionItem) => {
    const copy = questionBankService.duplicateQuestion(q.id);
    if (copy) {
      refreshBank();
      info('Đã nhân bản câu hỏi', `Tạo bản sao ${copy.code} ở trạng thái Bản nháp.`);
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = (id: string, status: QuestionStatus) => {
    questionBankService.update(id, { status });
    refreshBank();
    success('Đã cập nhật trạng thái', `Chuyển sang "${QUESTION_STATUS_LABELS[status]}".`);
  };

  // Confirm & Execute Delete
  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteTargetIds(ids);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    questionBankService.deleteMany(deleteTargetIds);
    setSelectedIds((prev) => prev.filter((id) => !deleteTargetIds.includes(id)));
    refreshBank();
    success('Đã xóa câu hỏi', `Đã xóa ${deleteTargetIds.length} câu hỏi khỏi ngân hàng.`);
    setDeleteTargetIds([]);
  };

  // Selection Handlers
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected =
    paginatedQuestions.length > 0 &&
    paginatedQuestions.every((q) => selectedIds.includes(q.id));

  const toggleSelectCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedQuestions.map((q) => q.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...paginatedQuestions.map((q) => q.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const selectAllFiltered = () => {
    setSelectedIds(filteredQuestions.map((q) => q.id));
    info('Đã chọn tất cả kết quả lọc', `Đang chọn ${filteredQuestions.length} câu hỏi.`);
  };

  // Bulk Actions
  const handleBulkStatus = (status: QuestionStatus) => {
    if (selectedIds.length === 0) return;
    questionBankService.bulkUpdate(selectedIds, { status });
    refreshBank();
    success(
      'Cập nhật trạng thái hàng loạt',
      `Đã chuyển ${selectedIds.length} câu hỏi sang "${QUESTION_STATUS_LABELS[status]}".`
    );
  };

  const handleBulkDifficulty = (difficulty: QuestionDifficulty) => {
    if (selectedIds.length === 0) return;
    questionBankService.bulkUpdate(selectedIds, { difficulty });
    refreshBank();
    success(
      'Đổi mức độ hàng loạt',
      `Đã đổi ${selectedIds.length} câu hỏi sang mức "${difficulty}".`
    );
  };

  const handleSaveBulkMetadata = () => {
    if (selectedIds.length === 0) return;
    questionBankService.bulkUpdate(selectedIds, {
      chapter: bulkChapterInput,
      topic: bulkTopicInput,
      addTag: bulkTagInput
    });
    refreshBank();
    setIsBulkTagModalOpen(false);
    setBulkChapterInput('');
    setBulkTopicInput('');
    setBulkTagInput('');
    success('Đã gắn nhãn & phân nhóm', `Đã cập nhật thông tin cho ${selectedIds.length} câu hỏi.`);
  };

  // AI Batch Generation & Review
  const handleGenerateAiQuestions = async () => {
    if (!aiTopic.trim()) {
      warning('Thiếu chủ đề', 'Vui lòng nhập chủ đề hoặc nội dung kiến thức cần tạo câu hỏi.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await questionBankService.generateQuestionsWithAI({
        subject: aiSubject,
        gradeLevel: aiGrade,
        chapter: aiChapter,
        topic: aiTopic,
        questionType: aiType,
        difficulty: aiDifficulty,
        count: aiCount,
        sourceMaterial: aiSourceMaterial,
        extraInstructions: aiExtraInstructions
      });
      setAiStagedQuestions(res.questions);
      setAiSelectedStageIds(res.questions.map((q) => q.id));
      setAiSourceBanner(res.sourceLabel);
      setAiEditingIndex(null);
      success(
        `AI đã đề xuất ${res.questions.length} câu hỏi`,
        'Hãy kiểm tra, chỉnh sửa nếu cần và chọn duyệt để đưa vào ngân hàng chính thức.'
      );
    } catch (e: any) {
      error('Lỗi khi tạo câu hỏi AI', e?.message || 'Vui lòng thử lại.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCommitAiStaged = (targetStatus: QuestionStatus) => {
    const chosen = aiStagedQuestions.filter((q) => aiSelectedStageIds.includes(q.id));
    if (chosen.length === 0) {
      warning('Chưa chọn câu hỏi', 'Hãy tích chọn ít nhất 1 câu hỏi AI đề xuất để lưu.');
      return;
    }
    const itemsToCreate = chosen.map((q) => ({
      ...q,
      code: undefined,
      status: targetStatus,
      sourceNote:
        targetStatus === 'approved'
          ? 'Đề xuất bởi AI (Đã được giáo viên duyệt)'
          : 'Đề xuất bởi AI (Chờ duyệt)'
    }));
    questionBankService.createBatch(itemsToCreate);
    refreshBank();
    setIsAiModalOpen(false);
    setAiStagedQuestions([]);
    success(
      'Đã đưa câu hỏi vào ngân hàng!',
      `Đã lưu ${chosen.length} câu hỏi với trạng thái "${QUESTION_STATUS_LABELS[targetStatus]}".`
    );
  };

  // Import Excel & Word Handlers
  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await questionBankService.parseExcelFile(file, importSubject, importGrade);
      setImportPreviews(rows);
      setImportEditingRowIdx(null);
      info(
        `Đã phân tích file "${file.name}"`,
        `Tìm thấy ${rows.length} câu hỏi (${rows.filter((r) => r.isValid).length} hợp lệ, ${rows.filter((r) => !r.isValid).length} lỗi).`
      );
    } catch (err: any) {
      error('Không thể đọc file Excel', err?.message || 'Định dạng file không hợp lệ.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAnalyzeWordText = () => {
    if (!wordRawText.trim()) {
      warning('Chưa có nội dung', 'Vui lòng dán nội dung câu hỏi từ Word vào ô văn bản.');
      return;
    }
    const rows = questionBankService.parseWordFormattedText(
      wordRawText,
      importSubject,
      importGrade,
      importChapter,
      importTopic
    );
    setImportPreviews(rows);
    setImportEditingRowIdx(null);
    info(
      'Đã phân tích văn bản định dạng Word',
      `Tách thành công ${rows.length} câu hỏi (${rows.filter((r) => r.isValid).length} hợp lệ).`
    );
  };

  const handleUpdateImportPreviewRow = (idx: number, updatedQuestion: QuestionItem) => {
    setImportPreviews((prev) => {
      const next = [...prev];
      const issues = validateQuestionItem(updatedQuestion);
      const dup = evaluateDuplicateForQuestion(updatedQuestion, questions);
      const enriched: QuestionItem = {
        ...updatedQuestion,
        validationIssues: issues,
        duplicateStatus: dup.duplicateStatus,
        duplicateScore: dup.duplicateScore,
        duplicateOfId: dup.duplicateOfId,
        duplicateOfCode: dup.duplicateOfCode,
        duplicateReason: dup.duplicateReason
      };
      const errors = issues.filter((i) => i.severity === 'error').map((i) => i.message);
      const warnings = [
        ...issues.filter((i) => i.severity === 'warning').map((i) => i.message),
        ...(dup.duplicateStatus !== 'unique' && dup.duplicateReason ? [dup.duplicateReason] : [])
      ];
      next[idx] = {
        ...next[idx],
        question: enriched,
        isValid: errors.length === 0,
        hasWarnings: warnings.length > 0,
        errors,
        warnings
      };
      return next;
    });
  };

  const handleCommitImport = () => {
    const validRows = importPreviews.filter((r) => r.isValid);
    if (validRows.length === 0) {
      error('Không có câu hỏi hợp lệ', 'Vui lòng sửa các dòng báo lỗi đỏ trước khi lưu vào ngân hàng.');
      return;
    }
    questionBankService.createBatch(
      validRows.map((r) => ({
        ...r.question,
        code: undefined,
        status: importTargetStatus
      }))
    );
    refreshBank();
    setIsImportModalOpen(false);
    setImportPreviews([]);
    success(
      'Import câu hỏi thành công!',
      `Đã lưu ${validRows.length} câu hỏi vào ngân hàng (Trạng thái: ${QUESTION_STATUS_LABELS[importTargetStatus]}).`
    );
  };

  // Export Handler
  const handleRunExport = () => {
    let targetList: QuestionItem[] = [];
    if (exportConfig.scope === 'selected') {
      targetList = questions.filter((q) => selectedIds.includes(q.id));
    } else if (exportConfig.scope === 'filtered') {
      targetList = filteredQuestions;
    } else if (exportConfig.scope === 'approved') {
      targetList = questions.filter((q) => q.status === 'approved');
    } else {
      targetList = questions;
    }

    if (targetList.length === 0) {
      warning('Không có câu hỏi nào để xuất', 'Phạm vi bạn chọn hiện đang trống.');
      return;
    }

    questionBankService.exportQuestions(targetList, exportConfig);
    setIsExportModalOpen(false);
    success(
      `Đã xuất ${targetList.length} câu hỏi ra ${exportConfig.format === 'excel' ? 'Excel (.xlsx)' : 'Word (.doc)'}`,
      'Tệp đã được tải xuống máy tính của bạn.'
    );
  };

  // Open side-by-side comparison modal
  const handleOpenCompare = (q: QuestionItem) => {
    if (!q.duplicateOfId) return;
    const match = questions.find((item) => item.id === q.duplicateOfId);
    if (match) {
      setComparePair({ current: q, target: match });
    } else {
      info('Không tìm thấy câu gốc', 'Câu hỏi đối chiếu có thể đã bị xóa.');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilterSubject('ALL');
    setFilterGrade('ALL');
    setFilterChapter('ALL');
    setFilterTopic('ALL');
    setFilterType('ALL');
    setFilterDifficulty('ALL');
    setFilterStatus('ALL');
    setFilterQuality('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Render helper for Status Badge
  const renderStatusBadge = (status: QuestionStatus) => {
    const styleMap: Record<QuestionStatus, string> = {
      approved: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70',
      pending: 'bg-amber-950/80 text-amber-300 border-amber-800/70',
      draft: 'bg-slate-800 text-slate-300 border-slate-700',
      rejected: 'bg-rose-950/80 text-rose-300 border-rose-800/70',
      archived: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/70'
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${styleMap[status]}`}
      >
        {QUESTION_STATUS_LABELS[status]}
      </span>
    );
  };

  // Render helper for Difficulty Text
  const renderDifficultyText = (diff: QuestionDifficulty) => {
    const colorMap: Record<QuestionDifficulty, string> = {
      'Nhận biết': 'text-cyan-400',
      'Thông hiểu': 'text-emerald-400',
      'Vận dụng': 'text-amber-400',
      'Vận dụng cao': 'text-rose-400'
    };
    return <span className={`text-xs font-semibold ${colorMap[diff]}`}>{diff}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Hidden Excel File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleExcelFileUpload}
        className="hidden"
      />

      {/* PAGE HEADER */}
      <PageHeader
        title="Ngân hàng câu hỏi"
        subtitle="Quản lý tập trung, tạo câu hỏi bằng AI, import/export chuẩn Word & Excel, kiểm tra lỗi và phát hiện trùng lặp thông minh"
        badge={`Lớp ${selectedClass?.name || '10A1'}`}
      >
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Thêm câu hỏi
        </button>

        <button
          onClick={() => setIsAiModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Tạo hàng loạt bằng AI
        </button>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          Import Excel / Word
        </button>

        <button
          onClick={() => setIsScannerModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Kiểm tra trùng & Lỗi ({stats.needsCheck})
        </button>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Xuất Word / Excel
        </button>

        <button
          onClick={handleSyncFirestore}
          disabled={isSyncingFirestore}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          title="Đồng bộ kho câu hỏi lên Google Cloud Firestore"
        >
          <CloudUpload className={`w-4 h-4 text-cyan-400 ${isSyncingFirestore ? 'animate-bounce' : ''}`} />
          {isSyncingFirestore ? 'Đang lưu...' : 'Lưu Firestore'}
        </button>
      </PageHeader>

      {/* 4 KPI STAT CARDS (Click to Quick-Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng số câu hỏi"
          value={stats.total}
          icon={Layers}
          color="blue"
          subtitle="Đầy đủ 5 dạng câu hỏi chuẩn GDPT"
          onClick={() => {
            setActiveView('bank');
            resetFilters();
          }}
        />
        <StatCard
          title="Câu hỏi đã duyệt"
          value={stats.approved}
          icon={CheckCircle2}
          color="emerald"
          change={`${stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%`}
          changePositive={true}
          subtitle="Sẵn sàng đưa vào đề kiểm tra"
          onClick={() => {
            setActiveView('bank');
            setFilterStatus('approved');
            setFilterQuality('ALL');
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Câu hỏi chờ duyệt"
          value={stats.pending}
          icon={Clock}
          color="amber"
          subtitle={`Gồm ${stats.aiPending} câu hỏi do AI đề xuất`}
          onClick={() => {
            setActiveView('bank');
            setFilterStatus('pending');
            setFilterQuality('ALL');
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Trùng lặp / Cần kiểm tra"
          value={stats.needsCheck}
          icon={AlertTriangle}
          color="rose"
          change={`${stats.duplicatesOnly} nghi trùng`}
          changePositive={false}
          subtitle="Click để lọc các câu cần rà soát"
          onClick={() => {
            setActiveView('bank');
            setFilterStatus('ALL');
            setFilterQuality('NEEDS_CHECK');
            setCurrentPage(1);
          }}
        />
      </div>

      {/* VIEW SWITCHER: KHO CÂU HỎI vs BỘ ĐỀ KIỂM TRA LỚP HỌC */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0f172a] p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveView('bank')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeView === 'bank'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Ngân hàng câu hỏi tập trung ({questions.length})
          </button>
          <button
            onClick={() => setActiveView('class_quizzes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeView === 'class_quizzes'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            Bộ đề kiểm tra của lớp {selectedClass?.name || '10A1'} ({quizzes.length})
          </button>
        </div>

        <div className="flex items-center gap-3 px-2 text-xs text-slate-400">
          <span>
            Đang hiển thị <strong className="text-slate-200">{filteredQuestions.length}</strong> /{' '}
            {questions.length} câu hỏi
          </span>
          {(searchQuery ||
            filterSubject !== 'ALL' ||
            filterGrade !== 'ALL' ||
            filterChapter !== 'ALL' ||
            filterTopic !== 'ALL' ||
            filterType !== 'ALL' ||
            filterDifficulty !== 'ALL' ||
            filterStatus !== 'ALL' ||
            filterQuality !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {activeView === 'bank' ? (
        <>
          {/* SEARCH & MULTI-DIMENSIONAL FILTER BAR */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Box */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm theo nội dung câu hỏi, mã câu hỏi, chủ đề, tag..."
                  className="w-full pl-10 pr-8 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subject Filter */}
              <div className="md:col-span-2">
                <select
                  value={filterSubject}
                  onChange={(e) => {
                    setFilterSubject(e.target.value);
                    setFilterChapter('ALL');
                    setFilterTopic('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Tất cả môn học</option>
                  {SUBJECT_LIST.map((s) => (
                    <option key={s} value={s}>
                      Môn: {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div className="md:col-span-2">
                <select
                  value={filterGrade}
                  onChange={(e) => {
                    setFilterGrade(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Tất cả khối lớp</option>
                  {GRADE_LIST.map((g) => (
                    <option key={g} value={String(g)}>
                      Khối lớp {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Type Filter */}
              <div className="md:col-span-3">
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Tất cả dạng câu hỏi (5 dạng)</option>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second Row of Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Chapter Filter */}
              <select
                value={filterChapter}
                onChange={(e) => {
                  setFilterChapter(e.target.value);
                  setFilterTopic('ALL');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Tất cả chương / bài</option>
                {availableChapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Topic Filter */}
              <select
                value={filterTopic}
                onChange={(e) => {
                  setFilterTopic(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Tất cả chủ đề</option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>
                    Chủ đề: {t}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={filterDifficulty}
                onChange={(e) => {
                  setFilterDifficulty(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Tất cả mức độ</option>
                {DIFFICULTY_LIST.map((d) => (
                  <option key={d} value={d}>
                    Mức độ: {d}
                  </option>
                ))}
              </select>

              {/* Approval Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Tất cả trạng thái duyệt</option>
                {(Object.keys(QUESTION_STATUS_LABELS) as QuestionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    Trạng thái: {QUESTION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              {/* Quality / Duplicate & Sort */}
              <div className="flex gap-2">
                <select
                  value={filterQuality}
                  onChange={(e) => {
                    setFilterQuality(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">Mọi chất lượng</option>
                  <option value="NEEDS_CHECK">Cần kiểm tra / Trùng</option>
                  <option value="DUPLICATE">Nghi trùng lặp</option>
                  <option value="VALID">Đạt chuẩn 100%</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-1/2 px-2.5 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="newest">Mới cập nhật</option>
                  <option value="code">Theo mã câu</option>
                  <option value="difficulty">Theo mức độ</option>
                  <option value="duplicate">Độ trùng lặp</option>
                </select>
              </div>
            </div>
          </div>

          {/* BULK ACTIONS TOOLBAR (Visible when items are selected) */}
          {selectedIds.length > 0 && (
            <div className="bg-cyan-950/60 border border-cyan-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-200 bg-cyan-900/70 px-3 py-1.5 rounded-lg">
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  Đã chọn {selectedIds.length} câu hỏi
                </span>
                {selectedIds.length < filteredQuestions.length && (
                  <button
                    onClick={selectAllFiltered}
                    className="text-xs text-cyan-300 hover:text-white underline font-medium cursor-pointer"
                  >
                    Chọn toàn bộ {filteredQuestions.length} câu trong kết quả lọc
                  </button>
                )}
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Approve */}
                <button
                  onClick={() => handleBulkStatus('approved')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Duyệt câu hỏi
                </button>

                {/* Bulk Status Dropdown */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatus(e.target.value as QuestionStatus);
                      e.target.value = '';
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value="" disabled>
                    Chuyển trạng thái...
                  </option>
                  {(Object.keys(QUESTION_STATUS_LABELS) as QuestionStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {QUESTION_STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>

                {/* Bulk Difficulty Dropdown */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkDifficulty(e.target.value as QuestionDifficulty);
                      e.target.value = '';
                    }
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  <option value="" disabled>
                    Đổi mức độ...
                  </option>
                  {DIFFICULTY_LIST.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Bulk Tag / Topic Assignment */}
                <button
                  onClick={() => setIsBulkTagModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Gắn chủ đề / Tag
                </button>

                {/* Bulk Export Selected */}
                <button
                  onClick={() => {
                    setExportConfig((prev) => ({ ...prev, scope: 'selected' }));
                    setIsExportModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Xuất mục đã chọn
                </button>

                {/* Bulk Delete */}
                <button
                  onClick={() => requestDelete(selectedIds)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa ({selectedIds.length})
                </button>
              </div>
            </div>
          )}

          {/* QUESTION BANK TABLE */}
          {filteredQuestions.length === 0 ? (
            <EmptyState
              title="Không tìm thấy câu hỏi phù hợp"
              description="Hãy thử thay đổi từ khóa tìm kiếm, đặt lại bộ lọc hoặc tạo mới câu hỏi bằng AI / Import từ Excel."
              actionText="Đặt lại bộ lọc"
              onAction={resetFilters}
            />
          ) : (
            <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllCurrentPageSelected}
                          onChange={toggleSelectCurrentPage}
                          className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5 w-36">Mã & Phân loại</th>
                      <th className="p-3.5">Nội dung câu hỏi & Đáp án</th>
                      <th className="p-3.5 w-40">Dạng & Mức độ</th>
                      <th className="p-3.5 w-36">Kiểm tra & Nguồn</th>
                      <th className="p-3.5 w-32">Trạng thái</th>
                      <th className="p-3.5 w-36 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {paginatedQuestions.map((q) => {
                      const isSelected = selectedIds.includes(q.id);
                      const hasErrors = q.validationIssues.some((i) => i.severity === 'error');
                      const hasWarnings = q.validationIssues.some((i) => i.severity === 'warning');

                      return (
                        <tr
                          key={q.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-cyan-950/30 hover:bg-cyan-950/40'
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 align-top text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(q.id)}
                              className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 cursor-pointer mt-1"
                            />
                          </td>

                          {/* Code & Subject/Grade */}
                          <td className="p-3.5 align-top">
                            <div className="font-bold text-slate-100">{q.code}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {q.subject} · Khối {q.gradeLevel}
                            </div>
                            <div
                              className="text-[11px] text-slate-500 mt-1 line-clamp-1"
                              title={q.chapter}
                            >
                              {q.topic}
                            </div>
                          </td>

                          {/* Question Content & Preview */}
                          <td className="p-3.5 align-top max-w-xl">
                            <p
                              onClick={() => setDetailQuestion(q)}
                              className="font-semibold text-slate-100 hover:text-cyan-400 cursor-pointer leading-relaxed line-clamp-2"
                            >
                              {q.content}
                            </p>

                            {/* Compact Answer Summary based on Question Type */}
                            {(q.type === 'single_choice' || q.type === 'multiple_choice') &&
                              q.options.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                                  {q.options.map((opt) => (
                                    <div
                                      key={opt.id}
                                      className={`text-[11px] px-2 py-1 rounded border truncate ${
                                        opt.isCorrect
                                          ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300 font-semibold'
                                          : 'bg-slate-900/70 border-slate-800 text-slate-400'
                                      }`}
                                      title={`${opt.label}. ${opt.text}`}
                                    >
                                      {opt.label}. {opt.text || '(Trống)'}
                                    </div>
                                  ))}
                                </div>
                              )}

                            {q.type === 'true_false' && q.statements.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {q.statements.map((st) => (
                                  <span
                                    key={st.id}
                                    className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                                    title={st.content}
                                  >
                                    <strong>{st.label})</strong>{' '}
                                    <span
                                      className={
                                        st.isTrue ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                                      }
                                    >
                                      {st.isTrue ? 'Đúng' : 'Sai'}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {q.type === 'fill_blank' && (
                              <div className="mt-1.5 text-[11px] text-emerald-400">
                                Đáp án nhận:{' '}
                                <strong className="text-emerald-300">
                                  {q.acceptedAnswers.join(' | ') || 'Chưa có'}
                                </strong>
                              </div>
                            )}

                            {q.type === 'essay' && (
                              <div className="mt-1.5 text-[11px] text-slate-400 line-clamp-1">
                                Hướng dẫn chấm: {q.rubric || 'Chưa cập nhật'} ({q.maxPoints}đ)
                              </div>
                            )}

                            {/* Metadata & Tags (Unboxed clean text) */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                              <span>{q.chapter}</span>
                              {q.tags.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-400">
                                    #{q.tags.join(' #')}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Type & Difficulty */}
                          <td className="p-3.5 align-top">
                            <div className="text-slate-200 font-medium">
                              {QUESTION_TYPE_LABELS[q.type]}
                            </div>
                            <div className="mt-1">{renderDifficultyText(q.difficulty)}</div>
                          </td>

                          {/* Duplicate & Quality Diagnostics */}
                          <td className="p-3.5 align-top space-y-1">
                            {q.duplicateStatus === 'exact' && (
                              <button
                                onClick={() => handleOpenCompare(q)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                              >
                                <GitCompare className="w-3.5 h-3.5" />
                                Trùng 100% ({q.duplicateOfCode})
                              </button>
                            )}
                            {q.duplicateStatus === 'similar' && (
                              <button
                                onClick={() => handleOpenCompare(q)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                              >
                                <GitCompare className="w-3.5 h-3.5" />
                                Tương đồng {q.duplicateScore}% ({q.duplicateOfCode})
                              </button>
                            )}
                            {q.duplicateStatus === 'unique' && !hasErrors && !hasWarnings && (
                              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đạt chuẩn
                              </div>
                            )}
                            {hasErrors && (
                              <div className="text-[11px] text-rose-400 font-semibold">
                                Thiếu dữ liệu bắt buộc
                              </div>
                            )}
                            {!hasErrors && hasWarnings && (
                              <div className="text-[11px] text-amber-400">
                                {q.validationIssues[0]?.message}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500">
                              Nguồn:{' '}
                              {q.source === 'ai'
                                ? 'AI đề xuất'
                                : q.source === 'excel'
                                ? 'Import Excel'
                                : q.source === 'word'
                                ? 'Import Word'
                                : 'Thủ công'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5 align-top">
                            <div className="space-y-1.5">
                              {renderStatusBadge(q.status)}
                              {q.status === 'pending' && (
                                <div className="flex items-center gap-1 pt-1">
                                  <button
                                    onClick={() => handleQuickStatusChange(q.id, 'approved')}
                                    className="px-2 py-0.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold cursor-pointer"
                                    title="Duyệt câu hỏi này"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(q.id, 'rejected')}
                                    className="px-2 py-0.5 bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px] font-bold cursor-pointer"
                                    title="Từ chối câu hỏi này"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setDetailQuestion(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Nhân bản câu hỏi"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => requestDelete([q.id])}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Xóa câu hỏi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Hiển thị</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value={5}>5 dòng / trang</option>
                    <option value={10}>10 dòng / trang</option>
                    <option value={20}>20 dòng / trang</option>
                    <option value={50}>50 dòng / trang</option>
                  </select>
                  <span>
                    · Trang <strong className="text-slate-200">{currentPage}</strong> / {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Trước
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
                  >
                    Sau
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* PRESERVED FEATURE: BỘ ĐỀ KIỂM TRA CỦA LỚP */
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <EmptyState
              title="Chưa có bộ đề kiểm tra nào cho lớp này"
              description="Bạn có thể chọn câu hỏi từ Ngân hàng câu hỏi để xuất đề hoặc giao bài kiểm tra."
            />
          ) : (
            quizzes.map((quiz) => {
              const isOpen = openQuizId === quiz.id;
              return (
                <div
                  key={quiz.id}
                  className="bg-[#0f172a] rounded-xl border border-slate-800 hover:border-slate-700 transition-all overflow-hidden"
                >
                  <div
                    onClick={() => setOpenQuizId((prev) => (prev === quiz.id ? null : quiz.id))}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/50 flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="font-semibold text-cyan-400">{quiz.subject}</span>
                          <span>·</span>
                          <StatusChip status={quiz.status} />
                          <span>·</span>
                          <span>
                            {quiz.durationMinutes} phút · {quiz.questions.length} câu
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-100 mt-1">{quiz.title}</h3>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 self-end sm:self-auto shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs text-slate-400 mr-1">
                        Đã nộp: <strong className="text-cyan-400">{quiz.attemptsCount}</strong> lượt
                      </span>
                      <button
                        onClick={() => navigate('/student/quizzes')}
                        className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        Làm thử
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenQuizId((prev) => (prev === quiz.id ? null : quiz.id))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                      >
                        <span>{isOpen ? 'Đóng đề' : 'Mở câu hỏi'}</span>
                        {isOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-800 bg-slate-900/60 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-200">
                            Danh sách {quiz.questions.length} câu hỏi trong đề:
                          </span>
                          {quiz.shuffleQuestions && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Shuffle className="w-3 h-3" /> Đảo câu hỏi
                            </span>
                          )}
                          {quiz.shuffleOptions && (
                            <span className="text-cyan-400 flex items-center gap-1">
                              <RotateCw className="w-3 h-3" /> Đảo đáp án
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {quiz.questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="bg-[#0f172a] p-3.5 rounded-xl border border-slate-800 text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-100">
                                Câu {idx + 1}: {q.question}
                              </p>
                              <span className="text-slate-400 shrink-0">
                                {q.difficulty || 'Thông hiểu'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {q.options.map((opt, optIdx) => {
                                const isCorrect = optIdx === q.correctAnswerIndex;
                                return (
                                  <div
                                    key={optIdx}
                                    className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                                      isCorrect
                                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 font-bold'
                                        : 'bg-slate-900 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <span>
                                      {String.fromCharCode(65 + optIdx)}. {opt}
                                    </span>
                                    {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL 1: CREATE / EDIT QUESTION (Supports all 5 question types + Live Check)
         ===================================================================== */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingQuestion ? `Chỉnh sửa câu hỏi (${editingQuestion.code})` : 'Thêm câu hỏi mới vào Ngân hàng'}
        subtitle="Hỗ trợ 5 dạng câu hỏi chuẩn GDPT 2018 · Tự động kiểm tra cấu trúc và phát hiện câu hỏi trùng lặp"
        maxWidth="3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Live Duplicate / Validation Alert Banner */}
          {liveFormDuplicate.duplicateStatus !== 'unique' && (
            <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Cảnh báo trùng lặp ({DUPLICATE_STATUS_LABELS[liveFormDuplicate.duplicateStatus]} -{' '}
                  {liveFormDuplicate.duplicateScore}%)
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">{liveFormDuplicate.duplicateReason}</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Mã câu hỏi</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Môn học</label>
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {SUBJECT_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Khối lớp</label>
              <select
                value={formGrade}
                onChange={(e) => setFormGrade(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {GRADE_LIST.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Chương / Bài học</label>
              <input
                type="text"
                value={formChapter}
                onChange={(e) => setFormChapter(e.target.value)}
                placeholder="VD: Chương 2: Hàm số bậc hai và đồ thị"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Chủ đề kiến thức</label>
              <input
                type="text"
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                placeholder="VD: Dấu của tam thức bậc hai"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dạng câu hỏi</label>
              <select
                value={formType}
                onChange={(e) => {
                  const nextType = e.target.value as QuestionType;
                  setFormType(nextType);
                  if (nextType === 'single_choice') {
                    setFormOptions((prev) =>
                      prev.map((o, i) => ({ ...o, isCorrect: i === 0 }))
                    );
                  }
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-cyan-300 font-semibold"
              >
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Mức độ nhận thức</label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as QuestionDifficulty)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {DIFFICULTY_LIST.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Trạng thái duyệt</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as QuestionStatus)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {(Object.keys(QUESTION_STATUS_LABELS) as QuestionStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {QUESTION_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Content */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Nội dung câu hỏi <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Nhập đề bài câu hỏi rõ ràng, đầy đủ giả thiết..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 leading-relaxed focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* DYNAMIC ANSWER SECTION BY QUESTION TYPE */}
          {(formType === 'single_choice' || formType === 'multiple_choice') && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Các phương án lựa chọn (
                  {formType === 'single_choice'
                    ? 'Chọn 1 đáp án đúng duy nhất'
                    : 'Tích chọn nhiều đáp án đúng'}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (formOptions.length >= 6) return;
                    const nextLabel = String.fromCharCode(65 + formOptions.length);
                    setFormOptions([
                      ...formOptions,
                      { id: `o-${Date.now()}`, label: nextLabel, text: '', isCorrect: false }
                    ]);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm phương án
                </button>
              </div>

              {formOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2.5">
                  <input
                    type={formType === 'single_choice' ? 'radio' : 'checkbox'}
                    name="correctOption"
                    checked={opt.isCorrect}
                    onChange={() => {
                      if (formType === 'single_choice') {
                        setFormOptions((prev) =>
                          prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                        );
                      } else {
                        setFormOptions((prev) =>
                          prev.map((o, i) =>
                            i === idx ? { ...o, isCorrect: !o.isCorrect } : o
                          )
                        );
                      }
                    }}
                    className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 cursor-pointer"
                  />
                  <span className="w-6 font-bold text-slate-300">{opt.label}.</span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormOptions((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, text: val } : o))
                      );
                    }}
                    placeholder={`Nhập nội dung phương án ${opt.label}...`}
                    className={`flex-1 px-3 py-1.5 rounded-lg border text-xs ${
                      opt.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                        : 'bg-slate-950 border-slate-700 text-slate-200'
                    }`}
                  />
                  {formOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = formOptions
                          .filter((_, i) => i !== idx)
                          .map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
                        setFormOptions(filtered);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {formType === 'true_false' && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Các mệnh đề xét Đúng / Sai (Chuẩn cấu trúc đề thi mới)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (formStatements.length >= 6) return;
                    const nextLabel = String.fromCharCode(97 + formStatements.length);
                    setFormStatements([
                      ...formStatements,
                      { id: `s-${Date.now()}`, label: nextLabel, content: '', isTrue: true }
                    ]);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm mệnh đề
                </button>
              </div>

              {formStatements.map((st, idx) => (
                <div key={st.id} className="flex items-center gap-2.5">
                  <span className="w-6 font-bold text-cyan-400">{st.label})</span>
                  <input
                    type="text"
                    value={st.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormStatements((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, content: val } : item))
                      );
                    }}
                    placeholder={`Nhập nội dung mệnh đề ${st.label}...`}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormStatements((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, isTrue: !item.isTrue } : item
                        )
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border cursor-pointer ${
                      st.isTrue
                        ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                        : 'bg-rose-950 border-rose-700 text-rose-300'
                    }`}
                  >
                    {st.isTrue ? 'ĐÚNG' : 'SAI'}
                  </button>
                  {formStatements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = formStatements
                          .filter((_, i) => i !== idx)
                          .map((item, i) => ({ ...item, label: String.fromCharCode(97 + i) }));
                        setFormStatements(next);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {formType === 'fill_blank' && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
              <label className="block font-bold text-slate-200">
                Các đáp án đúng được chấp nhận (Cách nhau bởi dấu gạch đứng <code className="text-cyan-400">|</code>)
              </label>
              <input
                type="text"
                value={formAcceptedAnswers}
                onChange={(e) => setFormAcceptedAnswers(e.target.value)}
                placeholder="VD: -14 | -14,0 | -14.0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 font-semibold"
              />
              <p className="text-[11px] text-slate-400">
                Hệ thống chấm tự động sẽ chấp nhận mọi biến thể đáp án bạn liệt kê.
              </p>
            </div>
          )}

          {formType === 'essay' && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-200">
                  Hướng dẫn chấm & Barem điểm tự luận <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Thang điểm:</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="10"
                    value={formMaxPoints}
                    onChange={(e) => setFormMaxPoints(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-bold"
                  />
                </div>
              </div>
              <textarea
                rows={3}
                value={formRubric}
                onChange={(e) => setFormRubric(e.target.value)}
                placeholder="+ Ý 1 (0.5 điểm): ...\n+ Ý 2 (1.0 điểm): ..."
                className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200"
              />
            </div>
          )}

          {/* Explanation & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Lời giải chi tiết / Giải thích đáp án
              </label>
              <textarea
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Nhập công thức và các bước giải chi tiết..."
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Nhãn phân loại (Tags - cách nhau bởi dấu phẩy)
              </label>
              <textarea
                rows={2}
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="VD: Giữa kỳ 1, Parabol, Toán thực tế"
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-200"
              />
            </div>
          </div>

          {/* Live Validation Summary */}
          {liveFormValidation.length > 0 && (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <p className="font-bold text-slate-300">Kiểm tra chất lượng câu hỏi tự động:</p>
              {liveFormValidation.map((issue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    issue.severity === 'error' ? 'text-rose-400 font-semibold' : 'text-amber-400'
                  }`}
                >
                  <span>•</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSaveQuestion}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-sm cursor-pointer"
            >
              {editingQuestion ? 'Lưu cập nhật' : 'Lưu vào ngân hàng'}
            </button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2: QUESTION DETAIL VIEW
         ===================================================================== */}
      <Modal
        isOpen={Boolean(detailQuestion)}
        onClose={() => setDetailQuestion(null)}
        title={detailQuestion ? `Chi tiết câu hỏi ${detailQuestion.code}` : 'Chi tiết câu hỏi'}
        subtitle={
          detailQuestion
            ? `${detailQuestion.subject} · Khối ${detailQuestion.gradeLevel} · ${detailQuestion.chapter}`
            : ''
        }
        maxWidth="2xl"
      >
        {detailQuestion && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-semibold text-cyan-400">
                  {QUESTION_TYPE_LABELS[detailQuestion.type]}
                </span>
                <span>·</span>
                {renderDifficultyText(detailQuestion.difficulty)}
                <span>·</span>
                <span>Chủ đề: {detailQuestion.topic}</span>
              </div>
              {renderStatusBadge(detailQuestion.status)}
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              <p className="text-sm font-bold text-slate-100 leading-relaxed">
                {detailQuestion.content}
              </p>

              {(detailQuestion.type === 'single_choice' ||
                detailQuestion.type === 'multiple_choice') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {detailQuestion.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        opt.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>
                        {opt.label}. {opt.text}
                      </span>
                      {opt.isCorrect && <Check className="w-4 h-4 text-emerald-400" />}
                    </div>
                  ))}
                </div>
              )}

              {detailQuestion.type === 'true_false' && (
                <div className="space-y-2 mt-3">
                  {detailQuestion.statements.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <span>
                        <strong className="text-cyan-400">{st.label})</strong> {st.content}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          st.isTrue ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {st.isTrue ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {detailQuestion.type === 'fill_blank' && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                  Đáp án đúng được chấp nhận:{' '}
                  <strong>{detailQuestion.acceptedAnswers.join(' | ')}</strong>
                </div>
              )}

              {detailQuestion.type === 'essay' && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 whitespace-pre-line text-slate-300">
                  <strong className="text-cyan-400 block mb-1">
                    Hướng dẫn chấm ({detailQuestion.maxPoints} điểm):
                  </strong>
                  {detailQuestion.rubric}
                </div>
              )}
            </div>

            {detailQuestion.explanation && (
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-900/60 text-slate-200">
                <strong className="text-cyan-400 block mb-1">Lời giải chi tiết:</strong>
                {detailQuestion.explanation}
              </div>
            )}

            {detailQuestion.duplicateStatus !== 'unique' && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-200 flex items-center justify-between">
                <span>
                  {detailQuestion.duplicateReason} ({detailQuestion.duplicateScore}%)
                </span>
                <button
                  onClick={() => {
                    const q = detailQuestion;
                    setDetailQuestion(null);
                    handleOpenCompare(q);
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  So sánh câu trùng
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const q = detailQuestion;
                  setDetailQuestion(null);
                  handleOpenEditModal(q);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Chỉnh sửa câu hỏi này
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 3: AI BATCH GENERATOR & STAGING APPROVAL QUEUE
         ===================================================================== */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Tạo câu hỏi hàng loạt bằng AI & Duyệt trước khi lưu"
        subtitle="AI tự động biên soạn câu hỏi theo ma trận kiến thức, kiểm tra trùng lặp và đưa vào danh sách chờ giáo viên duyệt"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* AI Input Parameters */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Môn học</label>
                <select
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  {SUBJECT_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Khối lớp</label>
                <select
                  value={aiGrade}
                  onChange={(e) => setAiGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                >
                  {GRADE_LIST.map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dạng câu hỏi</label>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-cyan-300 font-semibold"
                >
                  <option value="mixed">Kết hợp đa dạng (Tất cả dạng)</option>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Mức độ & Số lượng</label>
                <div className="flex gap-2">
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    className="w-2/3 px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="mixed">Đủ 4 mức độ</option>
                    {DIFFICULTY_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={aiCount}
                    onChange={(e) => setAiCount(Math.max(1, Math.min(15, Number(e.target.value))))}
                    className="w-1/3 px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-center text-cyan-300 font-bold"
                    title="Số lượng câu hỏi"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Chương / Bài học</label>
                <input
                  type="text"
                  value={aiChapter}
                  onChange={(e) => setAiChapter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Chủ đề / Nội dung kiến thức cần tạo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="VD: Cực trị hàm số bậc hai, Định lý Cosin..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={aiSourceMaterial}
                onChange={(e) => setAiSourceMaterial(e.target.value)}
                placeholder="Ngữ liệu / Đoạn văn bản nguồn (Tùy chọn)..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiExtraInstructions}
                  onChange={(e) => setAiExtraInstructions(e.target.value)}
                  placeholder="Ghi chú thêm (VD: Ưu tiên bài toán thực tế)..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200"
                />
                <button
                  onClick={handleGenerateAiQuestions}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {aiLoading ? 'Đang biên soạn...' : 'Sinh câu hỏi'}
                </button>
              </div>
            </div>
          </div>

          {/* AI Staging & Review Queue */}
          {aiStagedQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-950/50 border border-purple-800/70 flex flex-wrap items-center justify-between gap-2">
                <div className="text-purple-200">
                  <span className="font-bold">Nguồn dữ liệu:</span> {aiSourceBanner}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setAiSelectedStageIds(
                        aiSelectedStageIds.length === aiStagedQuestions.length
                          ? []
                          : aiStagedQuestions.map((q) => q.id)
                      )
                    }
                    className="text-xs text-cyan-300 hover:underline cursor-pointer"
                  >
                    {aiSelectedStageIds.length === aiStagedQuestions.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {aiStagedQuestions.map((q, idx) => {
                  const checked = aiSelectedStageIds.includes(q.id);
                  const isEditingThis = aiEditingIndex === idx;

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        checked
                          ? 'bg-slate-900 border-cyan-700/70'
                          : 'bg-slate-950/60 border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setAiSelectedStageIds((prev) =>
                                prev.includes(q.id)
                                  ? prev.filter((id) => id !== q.id)
                                  : [...prev, q.id]
                              )
                            }
                            className="mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer"
                          />
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              <span className="font-bold text-cyan-400">
                                Đề xuất #{idx + 1} · {QUESTION_TYPE_LABELS[q.type]}
                              </span>
                              <span>·</span>
                              {renderDifficultyText(q.difficulty)}
                              {q.duplicateStatus !== 'unique' && (
                                <span className="text-amber-400 font-bold">
                                  · Cảnh báo: {q.duplicateReason}
                                </span>
                              )}
                            </div>

                            {isEditingThis ? (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={2}
                                  value={q.content}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setAiStagedQuestions((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, content: val } : item
                                      )
                                    );
                                  }}
                                  className="w-full p-2 bg-slate-950 border border-cyan-600 rounded-lg text-slate-100"
                                />
                                <input
                                  type="text"
                                  value={q.explanation}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setAiStagedQuestions((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, explanation: val } : item
                                      )
                                    );
                                  }}
                                  placeholder="Lời giải..."
                                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300"
                                />
                              </div>
                            ) : (
                              <p className="font-semibold text-slate-100">{q.content}</p>
                            )}

                            {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                {q.options.map((o) => (
                                  <div
                                    key={o.id}
                                    className={`px-2.5 py-1 rounded border text-[11px] ${
                                      o.isCorrect
                                        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 font-bold'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {o.label}. {o.text}
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.explanation && !isEditingThis && (
                              <p className="text-[11px] text-slate-400">
                                <strong className="text-slate-300">Giải thích:</strong>{' '}
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAiEditingIndex(isEditingThis ? null : idx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer"
                          >
                            {isEditingThis ? 'Xong' : 'Sửa nhanh'}
                          </button>
                          <button
                            onClick={() => {
                              setAiStagedQuestions((prev) => prev.filter((_, i) => i !== idx));
                              setAiSelectedStageIds((prev) => prev.filter((id) => id !== q.id));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Loại bỏ đề xuất này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <span className="text-slate-400">
                  Đã chọn duyệt <strong className="text-cyan-400">{aiSelectedStageIds.length}</strong> /{' '}
                  {aiStagedQuestions.length} câu hỏi đề xuất
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleCommitAiStaged('pending')}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    Lưu vào hàng Chờ duyệt ({aiSelectedStageIds.length})
                  </button>
                  <button
                    onClick={() => handleCommitAiStaged('approved')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                  >
                    Duyệt chính thức & Lưu ({aiSelectedStageIds.length})
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 4: IMPORT EXCEL / WORD WITH VALIDATION & INLINE PREVIEW EDITOR
         ===================================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import câu hỏi từ Excel (.xlsx / .csv) hoặc Word"
        subtitle="Tự động phân tích định dạng, kiểm tra thiếu dữ liệu, phát hiện câu trùng và cho phép chỉnh sửa trước khi lưu"
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Mode Tabs */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setImportTab('excel');
                  setImportPreviews([]);
                }}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                  importTab === 'excel'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import từ File Excel (.xlsx, .csv)
              </button>
              <button
                onClick={() => {
                  setImportTab('word');
                  setImportPreviews([]);
                }}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                  importTab === 'word'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Import từ Định dạng Word / Văn bản
              </button>
            </div>

            {importTab === 'excel' && (
              <button
                onClick={() => questionBankService.downloadSampleExcelTemplate()}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải file Excel mẫu (.xlsx)
              </button>
            )}
          </div>

          {/* Default classification for imported questions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Môn học mặc định</label>
              <select
                value={importSubject}
                onChange={(e) => setImportSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {SUBJECT_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Khối lớp</label>
              <select
                value={importGrade}
                onChange={(e) => setImportGrade(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                {GRADE_LIST.map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Chương / Bài</label>
              <input
                type="text"
                value={importChapter}
                onChange={(e) => setImportChapter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Trạng thái khi lưu</label>
              <select
                value={importTargetStatus}
                onChange={(e) => setImportTargetStatus(e.target.value as QuestionStatus)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt ngay</option>
                <option value="draft">Bản nháp</option>
              </select>
            </div>
          </div>

          {importTab === 'excel' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl bg-slate-900/50 text-center cursor-pointer transition-colors"
            >
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="font-bold text-slate-200 text-sm">
                Bấm để chọn file Excel (.xlsx, .xls, .csv) từ máy tính
              </p>
              <p className="text-slate-400 mt-1">
                Hệ thống sẽ tự động kiểm tra cột, phát hiện thiếu đáp án và cảnh báo câu hỏi trùng lặp
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold">
                  Dán nội dung câu hỏi từ Word (Hỗ trợ tự động bóc tách Câu 1:, A. B. C. D., Đáp án:, Lời giải:)
                </label>
                <button
                  onClick={() => setWordRawText(SAMPLE_WORD_TEXT)}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Điền dữ liệu mẫu chuẩn Word
                </button>
              </div>
              <textarea
                rows={6}
                value={wordRawText}
                onChange={(e) => setWordRawText(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzeWordText}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Phân tích & Kiểm tra dữ liệu
                </button>
              </div>
            </div>
          )}

          {/* IMPORT PREVIEW & INLINE FIX TABLE */}
          {importPreviews.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportFilterTab('all')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      importFilterTab === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tất cả ({importPreviews.length})
                  </button>
                  <button
                    onClick={() => setImportFilterTab('valid')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      importFilterTab === 'valid'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'text-emerald-400'
                    }`}
                  >
                    Hợp lệ ({importPreviews.filter((r) => r.isValid).length})
                  </button>
                  <button
                    onClick={() => setImportFilterTab('warning')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      importFilterTab === 'warning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'text-amber-400'
                    }`}
                  >
                    Cảnh báo / Trùng ({importPreviews.filter((r) => r.hasWarnings).length})
                  </button>
                  <button
                    onClick={() => setImportFilterTab('error')}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      importFilterTab === 'error'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'text-rose-400'
                    }`}
                  >
                    Lỗi cần sửa ({importPreviews.filter((r) => !r.isValid).length})
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {importPreviews
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => {
                    if (importFilterTab === 'valid') return row.isValid;
                    if (importFilterTab === 'warning') return row.hasWarnings;
                    if (importFilterTab === 'error') return !row.isValid;
                    return true;
                  })
                  .map(({ row, idx }) => {
                    const isEditing = importEditingRowIdx === idx;
                    return (
                      <div
                        key={row.question.id}
                        className={`p-3 rounded-xl border ${
                          !row.isValid
                            ? 'bg-rose-950/30 border-rose-800'
                            : row.hasWarnings
                            ? 'bg-amber-950/20 border-amber-800/70'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-300">
                                Dòng #{row.rowIndex} · {QUESTION_TYPE_LABELS[row.question.type]}
                              </span>
                              {row.isValid ? (
                                <span className="text-emerald-400 font-semibold">✓ Hợp lệ</span>
                              ) : (
                                <span className="text-rose-400 font-bold">✕ Lỗi cấu trúc</span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="space-y-2 pt-1">
                                <input
                                  type="text"
                                  value={row.question.content}
                                  onChange={(e) =>
                                    handleUpdateImportPreviewRow(idx, {
                                      ...row.question,
                                      content: e.target.value
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-cyan-600 rounded-lg text-slate-100"
                                />
                              </div>
                            ) : (
                              <p className="text-slate-100 font-medium">{row.question.content}</p>
                            )}

                            {row.errors.map((errMsg, i) => (
                              <p key={i} className="text-[11px] text-rose-400 font-semibold">
                                • Lỗi: {errMsg}
                              </p>
                            ))}
                            {row.warnings.map((warnMsg, i) => (
                              <p key={i} className="text-[11px] text-amber-400">
                                • Cảnh báo: {warnMsg}
                              </p>
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setImportEditingRowIdx(isEditing ? null : idx)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                            >
                              {isEditing ? 'Xong' : 'Sửa'}
                            </button>
                            <button
                              onClick={() =>
                                setImportPreviews((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCommitImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Lưu {importPreviews.filter((r) => r.isValid).length} câu hỏi hợp lệ vào Ngân hàng
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 5: EXPORT TO WORD (.DOC) OR EXCEL (.XLSX)
         ===================================================================== */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Xuất câu hỏi ra Word (.doc) hoặc Excel (.xlsx)"
        subtitle="Tùy chỉnh phạm vi câu hỏi và lựa chọn đính kèm đáp án, lời giải chi tiết, mức độ nhận thức"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Phạm vi câu hỏi cần xuất</label>
            <select
              value={exportConfig.scope}
              onChange={(e) =>
                setExportConfig((prev) => ({ ...prev, scope: e.target.value as any }))
              }
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
            >
              <option value="filtered">
                Danh sách đang lọc hiện tại ({filteredQuestions.length} câu)
              </option>
              <option value="selected">
                Các câu hỏi đang tích chọn ({selectedIds.length} câu)
              </option>
              <option value="approved">
                Toàn bộ câu hỏi Đã duyệt ({stats.approved} câu)
              </option>
              <option value="all">Toàn bộ ngân hàng ({questions.length} câu)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Định dạng tệp xuất</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportConfig((prev) => ({ ...prev, format: 'word' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportConfig.format === 'word'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm">File Word (.doc)</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Trình bày chuẩn đề kiểm tra / tài liệu in ấn giáo dục
                </div>
              </button>
              <button
                type="button"
                onClick={() => setExportConfig((prev) => ({ ...prev, format: 'excel' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportConfig.format === 'excel'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm">File Excel (.xlsx)</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Bảng tính đầy đủ các cột dữ liệu để lưu trữ & chia sẻ
                </div>
              </button>
            </div>
          </div>

          {exportConfig.format === 'word' && (
            <div className="space-y-2.5">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tiêu đề tài liệu / Đề thi</label>
                <input
                  type="text"
                  value={exportConfig.examTitle}
                  onChange={(e) =>
                    setExportConfig((prev) => ({ ...prev, examTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
            <p className="font-bold text-slate-200">Tùy chọn thông tin đi kèm:</p>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={exportConfig.includeAnswers}
                onChange={(e) =>
                  setExportConfig((prev) => ({ ...prev, includeAnswers: e.target.checked }))
                }
                className="rounded border-slate-600 bg-slate-800 text-cyan-500"
              />
              <span>Kèm đáp án đúng (Đánh dấu đáp án đúng trên từng câu)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={exportConfig.includeExplanation}
                onChange={(e) =>
                  setExportConfig((prev) => ({ ...prev, includeExplanation: e.target.checked }))
                }
                className="rounded border-slate-600 bg-slate-800 text-cyan-500"
              />
              <span>Kèm lời giải chi tiết và hướng dẫn chấm</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={exportConfig.includeMetadata}
                onChange={(e) =>
                  setExportConfig((prev) => ({ ...prev, includeMetadata: e.target.checked }))
                }
                className="rounded border-slate-600 bg-slate-800 text-cyan-500"
              />
              <span>Kèm thông tin mức độ nhận thức, mã câu hỏi và dạng câu</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={exportConfig.shuffleQuestions}
                onChange={(e) =>
                  setExportConfig((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))
                }
                className="rounded border-slate-600 bg-slate-800 text-cyan-500"
              />
              <span>Xáo trộn ngẫu nhiên thứ tự câu hỏi khi xuất</span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleRunExport}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Tải xuống {exportConfig.format === 'excel' ? 'Excel (.xlsx)' : 'Word (.doc)'}
            </button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 6: DUPLICATE & QUALITY SCANNER + SIDE-BY-SIDE COMPARISON
         ===================================================================== */}
      <Modal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        title="Trung tâm Kiểm tra Trùng lặp & Chất lượng Ngân hàng câu hỏi"
        subtitle="Rà soát các câu hỏi trùng chính xác, tương đồng ngữ nghĩa/cấu trúc hoặc thiếu lời giải/đáp án"
        maxWidth="3xl"
      >
        <div className="space-y-3 text-xs">
          {questions.filter(
            (q) => q.duplicateStatus !== 'unique' || q.validationIssues.length > 0
          ).length === 0 ? (
            <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-slate-100 text-sm">
                Toàn bộ câu hỏi trong ngân hàng đều đạt chuẩn!
              </p>
              <p className="text-slate-400 mt-1">
                Không phát hiện câu hỏi trùng lặp hoặc thiếu dữ liệu bắt buộc.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {questions
                .filter((q) => q.duplicateStatus !== 'unique' || q.validationIssues.length > 0)
                .map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-400">{q.code}</span>
                        <span>·</span>
                        <span className="text-slate-400">{q.subject}</span>
                        {q.duplicateStatus !== 'unique' && (
                          <span className="text-amber-400 font-bold">
                            · {DUPLICATE_STATUS_LABELS[q.duplicateStatus]} ({q.duplicateScore}% với{' '}
                            {q.duplicateOfCode})
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-100 line-clamp-2">{q.content}</p>
                      {q.validationIssues.map((iss, i) => (
                        <p
                          key={i}
                          className={`text-[11px] ${
                            iss.severity === 'error' ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          • {iss.message}
                        </p>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {q.duplicateStatus !== 'unique' && (
                        <button
                          onClick={() => {
                            setIsScannerModalOpen(false);
                            handleOpenCompare(q);
                          }}
                          className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-lg font-bold cursor-pointer"
                        >
                          Đối chiếu
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setIsScannerModalOpen(false);
                          handleOpenEditModal(q);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold cursor-pointer"
                      >
                        Sửa ngay
                      </button>
                      <button
                        onClick={() => requestDelete([q.id])}
                        className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Xóa câu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 7: SIDE-BY-SIDE DUPLICATE COMPARISON
         ===================================================================== */}
      <Modal
        isOpen={Boolean(comparePair)}
        onClose={() => setComparePair(null)}
        title="Đối chiếu trực tiếp 2 câu hỏi nghi ngờ trùng lặp"
        subtitle={
          comparePair
            ? `Độ tương đồng: ${comparePair.current.duplicateScore || 85}% (${DUPLICATE_STATUS_LABELS[comparePair.current.duplicateStatus]})`
            : ''
        }
        maxWidth="3xl"
      >
        {comparePair && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Question */}
              <div className="p-4 rounded-xl bg-slate-900 border border-amber-700/70 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400">
                    Câu đang kiểm tra: {comparePair.current.code}
                  </span>
                  {renderStatusBadge(comparePair.current.status)}
                </div>
                <p className="font-semibold text-slate-100 leading-relaxed">
                  {comparePair.current.content}
                </p>
                <div className="space-y-1">
                  {comparePair.current.options.map((o) => (
                    <div
                      key={o.id}
                      className={`p-1.5 rounded border text-[11px] ${
                        o.isCorrect
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {o.label}. {o.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const q = comparePair.current;
                      setComparePair(null);
                      handleOpenEditModal(q);
                    }}
                    className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold cursor-pointer"
                  >
                    Chỉnh sửa câu này
                  </button>
                  <button
                    onClick={() => {
                      const id = comparePair.current.id;
                      setComparePair(null);
                      requestDelete([id]);
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer"
                  >
                    Xóa câu này
                  </button>
                </div>
              </div>

              {/* Target Existing Question */}
              <div className="p-4 rounded-xl bg-slate-900 border border-cyan-800/70 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-cyan-400">
                    Câu gốc trong ngân hàng: {comparePair.target.code}
                  </span>
                  {renderStatusBadge(comparePair.target.status)}
                </div>
                <p className="font-semibold text-slate-100 leading-relaxed">
                  {comparePair.target.content}
                </p>
                <div className="space-y-1">
                  {comparePair.target.options.map((o) => (
                    <div
                      key={o.id}
                      className={`p-1.5 rounded border text-[11px] ${
                        o.isCorrect
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {o.label}. {o.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const q = comparePair.target;
                      setComparePair(null);
                      handleOpenEditModal(q);
                    }}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold cursor-pointer"
                  >
                    Mở sửa câu gốc
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================================
          MODAL 8: BULK ASSIGN TOPIC / CHAPTER / TAGS
         ===================================================================== */}
      <Modal
        isOpen={isBulkTagModalOpen}
        onClose={() => setIsBulkTagModalOpen(false)}
        title={`Gắn chủ đề, chương & tag cho ${selectedIds.length} câu hỏi`}
        subtitle="Để trống trường nào nếu bạn muốn giữ nguyên giá trị cũ của trường đó"
        maxWidth="md"
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Chuyển sang Chương / Bài mới</label>
            <input
              type="text"
              value={bulkChapterInput}
              onChange={(e) => setBulkChapterInput(e.target.value)}
              placeholder="VD: Chương 3: Hệ thức lượng"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Gắn Chủ đề mới</label>
            <input
              type="text"
              value={bulkTopicInput}
              onChange={(e) => setBulkTopicInput(e.target.value)}
              placeholder="VD: Định lý Sin và Cosin"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Thêm Nhãn (Tag) bổ sung</label>
            <input
              type="text"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              placeholder="VD: Ôn thi học kỳ 1"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsBulkTagModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveBulkMetadata}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              Áp dụng cho {selectedIds.length} câu hỏi
            </button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa câu hỏi"
        message={`Bạn có chắc chắn muốn xóa ${deleteTargetIds.length} câu hỏi đã chọn khỏi Ngân hàng câu hỏi? Thao tác này không thể hoàn tác.`}
        confirmText={`Xóa ${deleteTargetIds.length} câu hỏi`}
        cancelText="Hủy bỏ"
        isDanger={true}
      />
    </div>
  );
};
