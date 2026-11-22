import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  Users,
  X,
  RotateCcw,
  Save,
  FolderKanban,
  Filter,
  Trash2,
  Copy,
  BellRing,
  Lock,
  Unlock,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  Download,
  Award,
  AlertTriangle,
  MoreVertical,
  RefreshCw,
  Share2,
  History,
  Check,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  Paperclip,
  ShieldCheck,
  UserX,
  ExternalLink
} from 'lucide-react';
import { db } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { Modal, EmptyState } from '../common/UIComponents';
import {
  Assignment,
  AssignmentReceiveStatus,
  AssignmentTopic,
  ClassRoom,
  GradeRevisionEntry,
  Student,
  StudentDueOverride,
  Submission,
  SubmissionGradeStatus,
  SubmissionQuestionAnswer,
  User
} from '../../types';

interface AssignedAssignmentsSplitViewProps {
  user: User | null;
  assignedClasses: ClassRoom[];
  assignedSubjects: string[];
  allTopics: AssignmentTopic[];
  onSwitchSubModule: (tab: 'topics' | 'create' | 'list') => void;
  onOpenEditMeta: (asn: Assignment) => void;
}

type KpiQuickFilter = 'all' | 'receiving' | 'overdue_unsubmitted' | 'pending_grade';
type StudentSubTab = 'all' | 'submitted' | 'pending_grade' | 'unsubmitted' | 'late' | 'graded';
type SortOption = 'newest' | 'due_soon' | 'lowest_submission_rate' | 'most_ungraded';
type ReceiveStatusFilterOption =
  | 'all'
  | 'open_ontime'
  | 'open_overdue'
  | AssignmentReceiveStatus;

export interface EnrichedStudentRow {
  student: Student;
  submission: Submission | null;
  personalOverride?: StudentDueOverride;
  effectiveDueIso?: string;
  isSubmitted: boolean;
  isLate: boolean;
  lateMinutes: number;
  isGraded: boolean;
  isPublished: boolean;
  isPendingGrade: boolean;
  isOverdueUnsubmitted: boolean;
  lastRemindedAt?: string;
  displayGradeStatus: SubmissionGradeStatus;
  normalizedSubmissionStatus: 'Đã nộp' | 'Nộp muộn' | 'Chưa nộp' | 'Yêu cầu làm lại';
  normalizedGradeStatus: 'Đã chấm' | 'Chưa chấm';
}

export const AssignedAssignmentsSplitView: React.FC<AssignedAssignmentsSplitViewProps> = ({
  user,
  assignedClasses,
  assignedSubjects,
  allTopics,
  onSwitchSubModule,
  onOpenEditMeta
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; sid?: string }>();
  const { showToast } = useToast();
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  // --- Loading / Sync / Feedback Banner State ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inlineBanner, setInlineBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // --- UI-03 KPI Quick Filter ---
  const [kpiQuickFilter, setKpiQuickFilter] = useState<KpiQuickFilter>('all');

  // --- UI-04 Filter & Sort State ---
  const [keyword, setKeyword] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'homework' | 'test'>('all');
  const [receiveStatusFilter, setReceiveStatusFilter] =
    useState<ReceiveStatusFilterOption>('all');
  const [gradeStatusFilter, setGradeStatusFilter] = useState<
    'all' | 'ungraded' | 'in_progress' | 'graded' | 'published'
  >('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // --- UI-07 Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // --- Master-Detail Selection State ---
  const [selectedAsnId, setSelectedAsnId] = useState<string | null>(params.id || null);
  const [openMenuAsnId, setOpenMenuAsnId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isAnalyticsReportOpen, setIsAnalyticsReportOpen] = useState<boolean>(
    location.pathname.endsWith('/reports')
  );

  // --- Right Panel Student Tabs & Search & Bulk Selection ---
  const [studentTab, setStudentTab] = useState<StudentSubTab>('all');
  const [studentKeyword, setStudentKeyword] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // --- Active Submission Grading Drawer/Modal (FLOW-02, ACT-11, ACT-12) ---
  const [gradingStudentRow, setGradingStudentRow] = useState<{
    student: Student;
    submission: Submission | null;
  } | null>(null);
  const [gradingScoreInput, setGradingScoreInput] = useState<string>('');
  const [gradingFeedbackInput, setGradingFeedbackInput] = useState<string>('');
  const [gradingQuestionScores, setGradingQuestionScores] = useState<Record<string, number>>({});
  const [gradingQuestionComments, setGradingQuestionComments] = useState<Record<string, string>>({});
  const [showInlineFilePreviewInGrading, setShowInlineFilePreviewInGrading] = useState<boolean>(true);
  const [gradingFormError, setGradingFormError] = useState<string>('');
  const [dirtyGradeWarningOpen, setDirtyGradeWarningOpen] = useState(false);
  const [isGradeDirty, setIsGradeDirty] = useState(false);

  // --- Standalone File Viewer Modal (Xem file bài làm / đề đính kèm) ---
  const [filePreviewModal, setFilePreviewModal] = useState<{
    isOpen: boolean;
    fileName: string;
    fileSize: string;
    studentName?: string;
    studentCode?: string;
    submittedAt?: string;
    content?: string;
    rowForGrading?: EnrichedStudentRow;
    isAssignmentAttachment?: boolean;
    assignmentTitle?: string;
  }>({
    isOpen: false,
    fileName: '',
    fileSize: ''
  });

  // --- Dedicated Revision History Modal (Lịch sử sửa điểm chi tiết) ---
  const [revisionHistoryModal, setRevisionHistoryModal] = useState<{
    isOpen: boolean;
    submission: Submission | null;
    asn: Assignment | null;
  }>({
    isOpen: false,
    submission: null,
    asn: null
  });

  // --- Modals State (Section 8: MOD-01 -> MOD-10) ---
  // MOD-01: Gia hạn (Extend Deadline)
  const [extendModal, setExtendModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    scope: 'class' | 'selected_students';
    targetStudentIds: string[];
    newDueLocal: string;
    reason: string;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    scope: 'class',
    targetStudentIds: [],
    newDueLocal: '',
    reason: ''
  });

  // MOD-02: Nhắc nộp (Remind Students)
  const [remindModal, setRemindModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    targetStudentIds: string[];
    channel: 'in_app' | 'email' | 'parent_app';
    message: string;
    forceDuplicate: boolean;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    targetStudentIds: [],
    channel: 'in_app',
    message: '',
    forceDuplicate: false
  });

  // MOD-03: Sửa điểm có lý do & lịch sử revision (Revise Grade)
  const [reviseModal, setReviseModal] = useState<{
    isOpen: boolean;
    submission: Submission | null;
    asn: Assignment | null;
    newScore: string;
    reason: string;
    feedback: string;
    errorText?: string;
  }>({
    isOpen: false,
    submission: null,
    asn: null,
    newScore: '',
    reason: '',
    feedback: ''
  });

  // MOD-04: Trả bài / Công bố điểm (Publish Grades)
  const [publishGradesModal, setPublishGradesModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    submissionIds: string[];
    notifyStudents: boolean;
  }>({
    isOpen: false,
    asn: null,
    submissionIds: [],
    notifyStudents: true
  });

  // MOD-05: Đóng / Mở nhận bài (Close / Reopen Assignment)
  const [closeOpenModal, setCloseOpenModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    targetStatus: 'open' | 'closed';
    reason: string;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    targetStatus: 'closed',
    reason: ''
  });

  // MOD-06: Thu hồi bài tập (Soft-delete / Withdraw)
  const [withdrawModal, setWithdrawModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    reason: string;
    confirmText: string;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    reason: '',
    confirmText: ''
  });

  // MOD-07: Giao lại bài tập (Reassign)
  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    title: string;
    classIds: string[];
    newDueLocal: string;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    title: '',
    classIds: [],
    newDueLocal: ''
  });

  // MOD-08: Yêu cầu làm lại (Request Redo)
  const [redoModal, setRedoModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    student: Student | null;
    extraAttempts: number;
    newDueLocal: string;
    feedback: string;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    student: null,
    extraAttempts: 1,
    newDueLocal: '',
    feedback: ''
  });

  // MOD-09: Xuất báo cáo (Export Excel / CSV)
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    scope: 'current_assignment' | 'unsubmitted_only' | 'filtered_list';
    format: 'xlsx' | 'csv';
    includeQuestionsDetail: boolean;
    includeFeedback: boolean;
  }>({
    isOpen: false,
    scope: 'current_assignment',
    format: 'xlsx',
    includeQuestionsDetail: true,
    includeFeedback: true
  });

  // MOD-10: Sao chép / Nhân bản bài tập (Copy / Duplicate Modal)
  const [copyModal, setCopyModal] = useState<{
    isOpen: boolean;
    asn: Assignment | null;
    newTitle: string;
    targetClassId: string;
    newDueLocal: string;
    keepSnapshots: boolean;
    selectAfterCopy: boolean;
    errorText?: string;
  }>({
    isOpen: false,
    asn: null,
    newTitle: '',
    targetClassId: '',
    newDueLocal: '',
    keepSnapshots: true,
    selectAfterCopy: true
  });

  // Close 3-dot menu on outside click or Escape key
  useEffect(() => {
    if (!openMenuAsnId) return;
    const handleOutsideClick = () => {
      setOpenMenuAsnId(null);
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOpenMenuAsnId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuAsnId]);

  // Auto-hide inline status banner after 4.5s
  useEffect(() => {
    if (!inlineBanner) return;
    const t = window.setTimeout(() => setInlineBanner(null), 4500);
    return () => window.clearTimeout(t);
  }, [inlineBanner]);

  // Helpers
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
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // --- RBAC Permission Verification (Section 4) ---
  const canManageAssignment = (asn: Assignment): boolean => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    if (asn.teacherId === user.id) return true;
    const allowedClassIds = new Set(assignedClasses.map((c) => c.id));
    if (allowedClassIds.has(asn.classId)) return true;
    if (asn.targetClassIds && asn.targetClassIds.some((cid) => allowedClassIds.has(cid))) {
      return true;
    }
    return false;
  };

  const ensurePermissionOrToast = (asn: Assignment, actionLabel: string): boolean => {
    if (!canManageAssignment(asn)) {
      const msg = `Phân quyền RBAC: Bạn không có quyền thực hiện "${actionLabel}" đối với bài tập ngoài phạm vi phụ trách.`;
      showToast(msg, 'error');
      setInlineBanner({ type: 'error', text: msg });
      return false;
    }
    return true;
  };

  // --- RBAC Filtered Assignments (Section 4) ---
  const allAssignments = db.getAssignments();
  const allStudents = db.getStudents();

  const rbacAssignments = useMemo(() => {
    if (!user || user.role === 'admin') return allAssignments;
    const allowedClassIds = new Set(assignedClasses.map((c) => c.id));
    return allAssignments.filter(
      (a) =>
        a.teacherId === user.id ||
        allowedClassIds.has(a.classId) ||
        (a.targetClassIds && a.targetClassIds.some((cid) => allowedClassIds.has(cid)))
    );
  }, [allAssignments, user, assignedClasses]);

  // --- SINGLE SOURCE OF TRUTH: Compute Enriched Assignment Metrics & Student Rows ---
  const enrichedAssignments = useMemo(() => {
    const nowMs = Date.now();

    return rbacAssignments.map((asn) => {
      const targetIds =
        asn.targetClassIds && asn.targetClassIds.length > 0 ? asn.targetClassIds : [asn.classId];

      // Determine canonical recipient students for this assignment
      const recipients = allStudents.filter(
        (s) =>
          (asn.assignedStudentIds && asn.assignedStudentIds.includes(s.id)) ||
          (targetIds.includes(s.classId) && s.status === 'active')
      );

      const rawSubs = db.getSubmissions(asn.id);
      const defaultDueMs = asn.dueDate ? new Date(asn.dueDate).getTime() : Infinity;
      const openMs = asn.openAt ? new Date(asn.openAt).getTime() : 0;

      // Match each recipient student to at most ONE canonical submission record
      const usedSubIds = new Set<string>();
      const studentRows: EnrichedStudentRow[] = recipients.map((student) => {
        // 1. Direct match by student.id
        let matchedSubs = rawSubs.filter(
          (s) => !usedSubIds.has(s.id) && s.studentId === student.id
        );

        // 2. Fallback match by legacy ID pattern (e.g. 'std-1' -> 'std-10a1-01') or exact studentName
        if (matchedSubs.length === 0) {
          const suffixMatch = /-(\d+)$/.exec(student.id);
          const legacyShortId = suffixMatch ? `std-${parseInt(suffixMatch[1], 10)}` : '';
          matchedSubs = rawSubs.filter(
            (s) =>
              !usedSubIds.has(s.id) &&
              ((legacyShortId && s.studentId === legacyShortId) ||
                (s.studentName &&
                  s.studentName.trim().toLowerCase() === student.fullName.trim().toLowerCase()))
          );
        }

        // Pick latest submission if multiple exist
        let sub: Submission | null = null;
        if (matchedSubs.length > 0) {
          matchedSubs.sort(
            (a, b) =>
              new Date(b.updatedAt || b.submittedAt || 0).getTime() -
              new Date(a.updatedAt || a.submittedAt || 0).getTime()
          );
          sub = matchedSubs[0];
          usedSubIds.add(sub.id);
        }

        const personalOverride = asn.dueOverrides?.[student.id];
        const effectiveDueIso = personalOverride?.dueDate || sub?.dueOverrideAt || asn.dueDate;
        const effectiveDueMs = effectiveDueIso ? new Date(effectiveDueIso).getTime() : defaultDueMs;

        const isSubmitted =
          !!sub &&
          (sub.status === 'submitted' ||
            sub.status === 'late' ||
            sub.status === 'graded' ||
            sub.status === 'redo_requested');

        const subMs = sub?.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        const isLate =
          isSubmitted &&
          (Boolean(sub?.isLate) ||
            sub?.status === 'late' ||
            (subMs > 0 && effectiveDueMs !== Infinity && subMs > effectiveDueMs));

        const lateMinutes =
          isLate && effectiveDueMs !== Infinity && subMs > effectiveDueMs
            ? sub?.lateMinutes || Math.max(1, Math.round((subMs - effectiveDueMs) / 60000))
            : sub?.lateMinutes || 0;

        const isGraded =
          isSubmitted &&
          (sub?.status === 'graded' ||
            sub?.gradeStatus === 'graded' ||
            sub?.gradeStatus === 'published') &&
          typeof sub?.score === 'number';

        const isPublished = isGraded && sub?.gradeStatus === 'published';
        const isPendingGrade = isSubmitted && !isGraded;
        const isOverdueUnsubmitted = !isSubmitted && effectiveDueMs < nowMs;

        let displayGradeStatus: SubmissionGradeStatus = 'ungraded';
        if (isPublished) displayGradeStatus = 'published';
        else if (isGraded) displayGradeStatus = 'graded';
        else if (sub?.gradeStatus === 'draft_grade') displayGradeStatus = 'draft_grade';

        const normalizedSubmissionStatus: EnrichedStudentRow['normalizedSubmissionStatus'] =
          !isSubmitted
            ? 'Chưa nộp'
            : sub?.status === 'redo_requested'
            ? 'Yêu cầu làm lại'
            : isLate
            ? 'Nộp muộn'
            : 'Đã nộp';

        const normalizedGradeStatus: EnrichedStudentRow['normalizedGradeStatus'] = isGraded
          ? 'Đã chấm'
          : 'Chưa chấm';

        return {
          student,
          submission: sub,
          personalOverride,
          effectiveDueIso,
          isSubmitted,
          isLate,
          lateMinutes,
          isGraded,
          isPublished,
          isPendingGrade,
          isOverdueUnsubmitted,
          lastRemindedAt: asn.reminderHistory?.[student.id],
          displayGradeStatus,
          normalizedSubmissionStatus,
          normalizedGradeStatus
        };
      });

      // Derive ALL assignment counts strictly from studentRows (Single Source of Truth!)
      const totalRecipients = studentRows.length;
      const submittedCount = studentRows.filter((r) => r.isSubmitted).length;
      const unsubmittedCount = studentRows.filter((r) => !r.isSubmitted).length;
      const pendingGradeCount = studentRows.filter((r) => r.isPendingGrade).length;
      const gradedCount = studentRows.filter((r) => r.isGraded).length;
      const publishedCount = studentRows.filter((r) => r.isPublished).length;
      const lateSubsCount = studentRows.filter((r) => r.isLate).length;

      const isOverdue = asn.dueDate ? defaultDueMs < nowMs : false;

      // Derive Receive Status (Trạng thái nhận bài tách biệt, kiểm tra chặt khi đã quá hạn)
      let derivedReceiveStatus: AssignmentReceiveStatus = 'open';
      if (asn.status === 'withdrawn' || asn.receiveStatus === 'withdrawn') {
        derivedReceiveStatus = 'withdrawn';
      } else if (asn.status === 'draft' || asn.receiveStatus === 'draft') {
        derivedReceiveStatus = 'draft';
      } else if (asn.status === 'closed' || asn.receiveStatus === 'closed') {
        derivedReceiveStatus = 'closed';
      } else if (openMs > nowMs) {
        derivedReceiveStatus = 'scheduled';
      } else if (isOverdue && asn.latePolicy === 'disallow_after_due') {
        derivedReceiveStatus = 'closed';
      } else {
        derivedReceiveStatus = 'open';
      }

      // Distinguish clearly between on-time receiving vs overdue still accepting late work
      const isReceivingOnTime = derivedReceiveStatus === 'open' && !isOverdue;
      const isOverdueAcceptingLate = derivedReceiveStatus === 'open' && isOverdue;

      // Derive Overall Grading Status (Trạng thái chấm bài tách biệt)
      let derivedGradeStatus: 'ungraded' | 'in_progress' | 'graded' | 'published' = 'ungraded';
      if (submittedCount > 0 && publishedCount >= submittedCount) {
        derivedGradeStatus = 'published';
      } else if (submittedCount > 0 && gradedCount >= submittedCount) {
        derivedGradeStatus = 'graded';
      } else if (
        gradedCount > 0 ||
        studentRows.some((r) => r.displayGradeStatus === 'draft_grade')
      ) {
        derivedGradeStatus = 'in_progress';
      } else {
        derivedGradeStatus = 'ungraded';
      }

      const scoredRows = studentRows.filter(
        (r) => r.isGraded && r.submission && typeof r.submission.score === 'number'
      );
      const avgScore =
        scoredRows.length > 0
          ? Number(
              (
                scoredRows.reduce((sum, r) => sum + (r.submission?.score || 0), 0) /
                scoredRows.length
              ).toFixed(1)
            )
          : null;

      const submissionRate =
        totalRecipients > 0 ? Math.round((submittedCount / totalRecipients) * 100) : 0;

      const tabCounts = {
        all: totalRecipients,
        submitted: submittedCount,
        pending_grade: pendingGradeCount,
        unsubmitted: unsubmittedCount,
        late: lateSubsCount,
        graded: gradedCount
      };

      return {
        asn,
        recipients,
        studentRows,
        tabCounts,
        totalRecipients,
        submittedCount,
        unsubmittedCount,
        gradedCount,
        publishedCount,
        pendingGradeCount,
        lateSubsCount,
        avgScore,
        submissionRate,
        isOverdue,
        isReceivingOnTime,
        isOverdueAcceptingLate,
        derivedReceiveStatus,
        derivedGradeStatus
      };
    });
  }, [rbacAssignments, allStudents, isRefreshing]);

  // --- UI-03 KPI Summary Counts (Synchronized from enrichedAssignments) ---
  const kpiStats = useMemo(() => {
    const activeList = enrichedAssignments.filter(
      (item) => item.derivedReceiveStatus !== 'withdrawn'
    );
    const totalAssigned = activeList.length;
    const receivingOnTimeCount = activeList.filter((item) => item.isReceivingOnTime).length;
    const overdueAcceptingLateCount = activeList.filter(
      (item) => item.isOverdueAcceptingLate
    ).length;
    const overdueOrUnsubmittedCount = activeList.filter(
      (item) => item.isOverdue || item.unsubmittedCount > 0
    ).length;
    const totalUnsubmittedStudents = activeList.reduce(
      (acc, item) => acc + item.unsubmittedCount,
      0
    );
    const pendingGradeAssignmentsCount = activeList.filter(
      (item) => item.pendingGradeCount > 0
    ).length;
    const totalPendingGradeSubmissions = activeList.reduce(
      (acc, item) => acc + item.pendingGradeCount,
      0
    );

    return {
      totalAssigned,
      receivingOnTimeCount,
      overdueAcceptingLateCount,
      overdueOrUnsubmittedCount,
      totalUnsubmittedStudents,
      pendingGradeAssignmentsCount,
      totalPendingGradeSubmissions
    };
  }, [enrichedAssignments]);

  // --- UI-04 Filtered & Sorted Assignments ---
  const dateRangeInvalid = useMemo(() => {
    if (!dateFrom || !dateTo) return false;
    return new Date(dateFrom).getTime() > new Date(dateTo).getTime();
  }, [dateFrom, dateTo]);

  const filteredEnrichedAssignments = useMemo(() => {
    if (dateRangeInvalid) return [];

    const filtered = enrichedAssignments.filter((item) => {
      const {
        asn,
        derivedReceiveStatus,
        derivedGradeStatus,
        isOverdue,
        isReceivingOnTime,
        isOverdueAcceptingLate,
        unsubmittedCount,
        pendingGradeCount
      } = item;

      // By default hide withdrawn unless explicitly filtered
      if (receiveStatusFilter !== 'withdrawn' && derivedReceiveStatus === 'withdrawn') {
        return false;
      }

      // KPI Quick Filter
      if (kpiQuickFilter === 'receiving' && !isReceivingOnTime) return false;
      if (kpiQuickFilter === 'overdue_unsubmitted' && !isOverdue && unsubmittedCount <= 0) {
        return false;
      }
      if (kpiQuickFilter === 'pending_grade' && pendingGradeCount <= 0) return false;

      // Class filter
      if (classFilter !== 'all') {
        const matchClass =
          asn.classId === classFilter ||
          (asn.targetClassIds && asn.targetClassIds.includes(classFilter));
        if (!matchClass) return false;
      }

      // Subject filter
      if (subjectFilter !== 'all' && asn.subject !== subjectFilter) return false;

      // Assignment Type filter
      if (typeFilter !== 'all' && (asn.assignmentType || 'homework') !== typeFilter) return false;

      // Receive status filter (with overdue distinction)
      if (receiveStatusFilter === 'open_ontime' && !isReceivingOnTime) return false;
      if (receiveStatusFilter === 'open_overdue' && !isOverdueAcceptingLate) return false;
      if (
        receiveStatusFilter !== 'all' &&
        receiveStatusFilter !== 'open_ontime' &&
        receiveStatusFilter !== 'open_overdue' &&
        derivedReceiveStatus !== receiveStatusFilter
      ) {
        return false;
      }

      // Grade status filter
      if (gradeStatusFilter !== 'all' && derivedGradeStatus !== gradeStatusFilter) return false;

      // Topic filter
      if (topicFilter !== 'all') {
        const matchTopic =
          (asn.topicIds && asn.topicIds.includes(topicFilter)) ||
          (asn.topicNames && asn.topicNames.includes(topicFilter));
        if (!matchTopic) return false;
      }

      // Date range filter
      if (dateFrom) {
        const fromMs = new Date(dateFrom).getTime();
        const asnMs = new Date(asn.assignedAt || asn.createdAt).getTime();
        if (asnMs < fromMs) return false;
      }
      if (dateTo) {
        const toMs = new Date(dateTo).getTime() + 86400000;
        const asnMs = new Date(asn.assignedAt || asn.createdAt).getTime();
        if (asnMs > toMs) return false;
      }

      // Keyword search (max 100 chars)
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const inTitle = asn.title.toLowerCase().includes(q);
        const inCode = (asn.code || asn.id).toLowerCase().includes(q);
        const inClass = asn.className.toLowerCase().includes(q);
        const inTopic = (asn.topicNames || []).some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inCode && !inClass && !inTopic) return false;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.asn.assignedAt || b.asn.createdAt).getTime() -
          new Date(a.asn.assignedAt || a.asn.createdAt).getTime()
        );
      }
      if (sortBy === 'due_soon') {
        const aDue = a.asn.dueDate ? new Date(a.asn.dueDate).getTime() : Infinity;
        const bDue = b.asn.dueDate ? new Date(b.asn.dueDate).getTime() : Infinity;
        return aDue - bDue;
      }
      if (sortBy === 'lowest_submission_rate') {
        return a.submissionRate - b.submissionRate;
      }
      if (sortBy === 'most_ungraded') {
        return b.pendingGradeCount - a.pendingGradeCount;
      }
      return 0;
    });
  }, [
    enrichedAssignments,
    dateRangeInvalid,
    kpiQuickFilter,
    classFilter,
    subjectFilter,
    typeFilter,
    receiveStatusFilter,
    gradeStatusFilter,
    topicFilter,
    dateFrom,
    dateTo,
    keyword,
    sortBy
  ]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredEnrichedAssignments.length / ITEMS_PER_PAGE));
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEnrichedAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEnrichedAssignments, currentPage]);

  // Auto-select first assignment when list changes
  useEffect(() => {
    if (filteredEnrichedAssignments.length === 0) {
      setSelectedAsnId(null);
      return;
    }
    const exists = filteredEnrichedAssignments.some((item) => item.asn.id === selectedAsnId);
    if (!exists) {
      setSelectedAsnId(filteredEnrichedAssignments[0].asn.id);
      setSelectedStudentIds([]);
    }
  }, [filteredEnrichedAssignments, selectedAsnId]);

  const selectedEnriched = useMemo(() => {
    return (
      filteredEnrichedAssignments.find((item) => item.asn.id === selectedAsnId) ||
      enrichedAssignments.find((item) => item.asn.id === selectedAsnId) ||
      null
    );
  }, [filteredEnrichedAssignments, enrichedAssignments, selectedAsnId]);

  // --- Student Rows & Tab Counts read directly from selectedEnriched (Single Source of Truth!) ---
  const studentRowsForSelected = useMemo<EnrichedStudentRow[]>(() => {
    return selectedEnriched ? selectedEnriched.studentRows : [];
  }, [selectedEnriched]);

  const studentTabCounts = useMemo(() => {
    if (!selectedEnriched) {
      return { all: 0, submitted: 0, pending_grade: 0, unsubmitted: 0, late: 0, graded: 0 };
    }
    return selectedEnriched.tabCounts;
  }, [selectedEnriched]);

  const filteredStudentRows = useMemo(() => {
    return studentRowsForSelected.filter((r) => {
      if (studentTab === 'submitted' && !r.isSubmitted) return false;
      if (studentTab === 'pending_grade' && !r.isPendingGrade) return false;
      if (studentTab === 'unsubmitted' && r.isSubmitted) return false;
      if (studentTab === 'late' && !r.isLate) return false;
      if (studentTab === 'graded' && !r.isGraded) return false;

      if (studentKeyword.trim()) {
        const q = studentKeyword.trim().toLowerCase();
        const matchName = r.student.fullName.toLowerCase().includes(q);
        const matchCode = r.student.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [studentRowsForSelected, studentTab, studentKeyword]);

  // Reset Filter Handler (ACT-10)
  const handleResetFilters = () => {
    setKpiQuickFilter('all');
    setKeyword('');
    setClassFilter('all');
    setSubjectFilter('all');
    setTypeFilter('all');
    setReceiveStatusFilter('all');
    setGradeStatusFilter('all');
    setTopicFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('newest');
    setCurrentPage(1);
    showToast('Đã đặt lại toàn bộ bộ lọc về mặc định.', 'info');
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      setInlineBanner({
        type: 'info',
        text: 'Đã đồng bộ dữ liệu bài tập, bài nộp và trạng thái chấm điểm mới nhất từ hệ thống.'
      });
      showToast('Đã làm mới và đồng bộ dữ liệu thành công.', 'info');
    }, 350);
  };

  // --- File Preview & Download Helpers ---
  const openStudentFilePreview = (row: EnrichedStudentRow) => {
    const sub = row.submission;
    if (!sub) return;
    setFilePreviewModal({
      isOpen: true,
      fileName: sub.fileName || `BaiLam_${row.student.code}.txt`,
      fileSize: sub.fileSize || '1.2 MB',
      studentName: row.student.fullName,
      studentCode: row.student.code,
      submittedAt: sub.submittedAt,
      content: sub.content,
      rowForGrading: row,
      isAssignmentAttachment: false,
      assignmentTitle: selectedEnriched?.asn.title
    });
  };

  const openAssignmentAttachmentPreview = (asn: Assignment) => {
    if (!asn.attachmentName) return;
    setFilePreviewModal({
      isOpen: true,
      fileName: asn.attachmentName,
      fileSize: asn.attachmentSize || '1.4 MB',
      content:
        asn.description ||
        `Tài liệu đề bài đính kèm cho bài tập "${asn.title}" (Môn ${asn.subject} - Lớp ${asn.className}).`,
      isAssignmentAttachment: true,
      assignmentTitle: asn.title
    });
  };

  const handleDownloadPreviewFile = (
    fileName: string,
    title: string,
    bodyContent: string,
    studentInfo?: string
  ) => {
    const textData = [
      `===================================================================`,
      `SMART CLASS 4.0 - HỆ THỐNG QUẢN LÝ BÀI TẬP & CHẤM ĐIỂM`,
      `===================================================================`,
      `Tệp: ${fileName}`,
      `Bài tập: ${title}`,
      studentInfo ? `Học sinh: ${studentInfo}` : '',
      `Thời gian trích xuất: ${new Date().toLocaleString('vi-VN')}`,
      `-------------------------------------------------------------------`,
      `NỘI DUNG CHI TIẾT:`,
      bodyContent || '(Tệp đính kèm học liệu)',
      `===================================================================`
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã tải tệp "${fileName}" về máy.`, 'success');
  };

  // --- Open Grading Workspace (ACT-11, ACT-12) ---
  const handleOpenGradingWorkspace = (row: EnrichedStudentRow) => {
    if (selectedEnriched && !ensurePermissionOrToast(selectedEnriched.asn, 'Chấm bài nộp')) {
      return;
    }
    const sub = row.submission;
    setGradingStudentRow({ student: row.student, submission: sub });
    const initialScore =
      sub?.score !== undefined
        ? String(sub.score)
        : sub?.draftScore !== undefined
        ? String(sub.draftScore)
        : sub?.objectiveScore !== undefined
        ? String(sub.objectiveScore)
        : '';
    setGradingScoreInput(initialScore);
    setGradingFeedbackInput(sub?.feedback || sub?.draftFeedback || '');
    setGradingFormError('');

    const qScores: Record<string, number> = {};
    const qComments: Record<string, string> = {};
    (sub?.answers || []).forEach((ans) => {
      if (ans.manualScore !== undefined) qScores[ans.questionId] = ans.manualScore;
      else if (ans.autoScore !== undefined) qScores[ans.questionId] = ans.autoScore;
      if (ans.feedback) qComments[ans.questionId] = ans.feedback;
    });
    setGradingQuestionScores(qScores);
    setGradingQuestionComments(qComments);
    setIsGradeDirty(false);
  };

  const handleCloseGradingWorkspace = () => {
    if (isGradeDirty) {
      setDirtyGradeWarningOpen(true);
      return;
    }
    setGradingStudentRow(null);
    setGradingFormError('');
  };

  const handleNavigateGradingStudent = (direction: 'prev' | 'next') => {
    if (!gradingStudentRow) return;
    const list = filteredStudentRows.length > 0 ? filteredStudentRows : studentRowsForSelected;
    const idx = list.findIndex((r) => r.student.id === gradingStudentRow.student.id);
    if (idx === -1) return;
    const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < list.length) {
      handleOpenGradingWorkspace(list[targetIdx]);
    }
  };

  const handleRecalculateTotalFromQuestions = () => {
    if (!selectedEnriched) return;
    const sum = Object.values(gradingQuestionScores).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const bounded = Math.min(selectedEnriched.asn.totalPoints, Number(sum.toFixed(2)));
    setGradingScoreInput(String(bounded));
    setIsGradeDirty(true);
    setGradingFormError('');
  };

  const handleSaveSubmissionGrade = (mode: 'draft_grade' | 'graded' | 'published') => {
    if (!gradingStudentRow || !selectedEnriched) return;
    const { asn } = selectedEnriched;
    let sub = gradingStudentRow.submission;

    const parsedScore = parseFloat(gradingScoreInput);
    if (
      gradingScoreInput.trim() === '' ||
      isNaN(parsedScore) ||
      parsedScore < 0 ||
      parsedScore > asn.totalPoints
    ) {
      const errMsg = `Điểm không hợp lệ! Vui lòng nhập điểm số từ 0 đến ${asn.totalPoints}.`;
      setGradingFormError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    // If student had no submission record yet, create a manual teacher-recorded submission first
    if (!sub) {
      sub = db.submitAssignment(
        asn.id,
        gradingStudentRow.student.id,
        gradingStudentRow.student.fullName,
        '(Giáo viên ghi nhận nộp bài trực tiếp / chấm đặc cách)'
      );
    }

    const updatedAnswers: SubmissionQuestionAnswer[] = (sub.answers || []).map((ans) => ({
      ...ans,
      manualScore:
        gradingQuestionScores[ans.questionId] !== undefined
          ? gradingQuestionScores[ans.questionId]
          : ans.manualScore,
      feedback:
        gradingQuestionComments[ans.questionId] !== undefined
          ? gradingQuestionComments[ans.questionId]
          : ans.feedback
    }));

    db.gradeSubmission(
      sub.id,
      parsedScore,
      gradingFeedbackInput.trim() || 'Đã chấm và nhận xét bài làm.',
      user?.name || 'Cô Nguyễn Thị Mai',
      'graded',
      {
        answers: updatedAnswers,
        gradeStatus: mode,
        publishImmediately: mode === 'published'
      }
    );

    const msg =
      mode === 'draft_grade'
        ? `Đã lưu nháp chấm bài (${parsedScore}đ) cho ${gradingStudentRow.student.fullName}.`
        : mode === 'published'
        ? `Đã chấm ${parsedScore}/${asn.totalPoints} điểm và công bố kết quả cho ${gradingStudentRow.student.fullName}!`
        : `Đã lưu điểm (${parsedScore}/${asn.totalPoints}) cho ${gradingStudentRow.student.fullName}.`;

    setIsGradeDirty(false);
    setGradingFormError('');
    setGradingStudentRow(null);
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
  };

  // --- Handlers for Modals (MOD-01 -> MOD-10) ---

  // Open MOD-01: Gia hạn
  const openExtendModalFor = (
    asn: Assignment,
    scope: 'class' | 'selected_students',
    studentIds: string[] = []
  ) => {
    if (!ensurePermissionOrToast(asn, 'Gia hạn nộp bài')) return;
    const defaultDate = new Date(
      Math.max(Date.now() + 86400000, new Date(asn.dueDate || Date.now()).getTime() + 86400000)
    ).toISOString();
    setExtendModal({
      isOpen: true,
      asn,
      scope,
      targetStudentIds: studentIds,
      newDueLocal: toDateTimeLocalValue(defaultDate),
      reason: '',
      errorText: ''
    });
  };

  const applyQuickExtendOffset = (hoursToAdd: number) => {
    const baseMs = Math.max(
      Date.now(),
      extendModal.asn?.dueDate ? new Date(extendModal.asn.dueDate).getTime() : Date.now()
    );
    const nextIso = new Date(baseMs + hoursToAdd * 3600000).toISOString();
    setExtendModal((prev) => ({
      ...prev,
      newDueLocal: toDateTimeLocalValue(nextIso),
      errorText: ''
    }));
  };

  const handleConfirmExtendModal = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, scope, targetStudentIds, newDueLocal, reason } = extendModal;
    if (!asn) return;
    if (!newDueLocal) {
      setExtendModal((p) => ({ ...p, errorText: 'Vui lòng chọn thời điểm hạn nộp mới.' }));
      showToast('Vui lòng chọn hạn nộp mới.', 'error');
      return;
    }
    const newDueMs = new Date(newDueLocal).getTime();
    if (isNaN(newDueMs) || newDueMs <= Date.now()) {
      setExtendModal((p) => ({
        ...p,
        errorText: 'Hạn nộp mới phải lớn hơn thời điểm hiện tại.'
      }));
      showToast('Hạn nộp mới phải lớn hơn thời điểm hiện tại.', 'error');
      return;
    }
    if (reason.trim().length < 5 || reason.trim().length > 500) {
      setExtendModal((p) => ({
        ...p,
        errorText: 'Vui lòng nhập lý do gia hạn (tối thiểu 5 ký tự, tối đa 500 ký tự).'
      }));
      showToast('Vui lòng nhập lý do gia hạn từ 5 đến 500 ký tự.', 'error');
      return;
    }

    const newDueIso = new Date(newDueLocal).toISOString();
    db.extendAssignmentDeadline(
      asn.id,
      newDueIso,
      reason.trim(),
      user?.name || 'Cô Nguyễn Thị Mai',
      scope === 'selected_students' ? targetStudentIds : undefined
    );

    const msg =
      scope === 'selected_students'
        ? `Đã gia hạn riêng cho ${targetStudentIds.length} học sinh tới ${formatDateTimeVN(newDueIso)}!`
        : `Đã gia hạn bài tập "${asn.title}" cho cả lớp tới ${formatDateTimeVN(newDueIso)}!`;

    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setExtendModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
    setSelectedStudentIds([]);
  };

  // Open MOD-02: Nhắc nộp (Always reads unsubmitted students from the target assignment's own studentRows)
  const openRemindModalFor = (asn: Assignment, customStudentIds?: string[]) => {
    if (!ensurePermissionOrToast(asn, 'Gửi nhắc nộp')) return;
    const enrichedTarget = enrichedAssignments.find((item) => item.asn.id === asn.id);
    const rowsOfAsn = enrichedTarget ? enrichedTarget.studentRows : studentRowsForSelected;
    const unsubmittedIds =
      customStudentIds && customStudentIds.length > 0
        ? customStudentIds
        : rowsOfAsn.filter((r) => !r.isSubmitted).map((r) => r.student.id);

    setRemindModal({
      isOpen: true,
      asn,
      targetStudentIds: unsubmittedIds,
      channel: 'in_app',
      message: `Nhắc nhở: Các em khẩn trương hoàn thành và nộp bài tập "${asn.title}" môn ${asn.subject} (Hạn nộp: ${formatDateTimeVN(asn.dueDate)}).`,
      forceDuplicate: false,
      errorText: ''
    });
  };

  const handleConfirmRemindModal = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, targetStudentIds, channel, message, forceDuplicate } = remindModal;
    if (!asn) return;
    if (targetStudentIds.length === 0) {
      setRemindModal((p) => ({
        ...p,
        errorText: 'Chưa có học sinh nào được chọn để gửi nhắc nộp.'
      }));
      showToast('Không có học sinh nào trong danh sách cần nhắc nộp.', 'error');
      return;
    }
    if (message.trim().length === 0 || message.length > 1000) {
      setRemindModal((p) => ({
        ...p,
        errorText: 'Nội dung lời nhắc phải từ 1 đến 1.000 ký tự.'
      }));
      showToast('Nội dung lời nhắc phải từ 1 đến 1.000 ký tự.', 'error');
      return;
    }

    const result = db.remindStudentsAdvanced(
      asn.id,
      targetStudentIds,
      channel,
      message.trim(),
      user?.name || 'Cô Nguyễn Thị Mai',
      forceDuplicate
    );

    if (result.sentCount === 0 && result.skippedCount > 0) {
      const warnMsg = `Có ${result.skippedCount} học sinh vừa được nhắc trong vòng 15 phút qua. Hãy tích chọn "Gửi lại ngay cả khi vừa nhắc" nếu muốn gửi tiếp.`;
      setRemindModal((p) => ({ ...p, errorText: warnMsg }));
      showToast(warnMsg, 'info');
      return;
    }

    const msg = `Đã gửi nhắc nộp thành công cho ${result.sentCount} học sinh${
      result.skippedCount > 0 ? ` (bỏ qua ${result.skippedCount} HS vừa nhắc gần đây)` : ''
    }!`;
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setRemindModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
    setSelectedStudentIds([]);
  };

  // Open MOD-03: Sửa điểm có lý do
  const openReviseScoreModal = (sub: Submission, asn: Assignment) => {
    if (!ensurePermissionOrToast(asn, 'Sửa điểm')) return;
    setReviseModal({
      isOpen: true,
      submission: sub,
      asn,
      newScore: sub.score !== undefined ? String(sub.score) : '',
      reason: '',
      feedback: sub.feedback || '',
      errorText: ''
    });
  };

  const handleConfirmReviseModal = (e: React.FormEvent) => {
    e.preventDefault();
    const { submission, asn, newScore, reason, feedback } = reviseModal;
    if (!submission || !asn) return;
    const numeric = parseFloat(newScore);
    if (newScore.trim() === '' || isNaN(numeric) || numeric < 0 || numeric > asn.totalPoints) {
      setReviseModal((p) => ({
        ...p,
        errorText: `Điểm mới phải nằm trong khoảng từ 0 đến ${asn.totalPoints}.`
      }));
      showToast(`Điểm mới phải nằm trong khoảng 0 đến ${asn.totalPoints}.`, 'error');
      return;
    }
    if (reason.trim().length < 5) {
      setReviseModal((p) => ({
        ...p,
        errorText: 'Bắt buộc nhập lý do sửa điểm (tối thiểu 5 ký tự) để lưu lịch sử kiểm toán.'
      }));
      showToast('Bắt buộc nhập lý do sửa điểm (tối thiểu 5 ký tự) để lưu lịch sử.', 'error');
      return;
    }

    db.reviseSubmissionGrade(
      submission.id,
      numeric,
      reason.trim(),
      user?.name || 'Cô Nguyễn Thị Mai',
      feedback.trim()
    );
    const msg = `Đã cập nhật điểm của ${submission.studentName} từ ${
      submission.score ?? '--'
    } → ${numeric}/${asn.totalPoints} và lưu lịch sử sửa điểm!`;
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setReviseModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-04: Trả bài / Công bố điểm
  const openPublishGradesModalFor = (asn: Assignment, specificSubIds: string[] = []) => {
    if (!ensurePermissionOrToast(asn, 'Công bố điểm')) return;
    setPublishGradesModal({
      isOpen: true,
      asn,
      submissionIds: specificSubIds,
      notifyStudents: true
    });
  };

  const handleConfirmPublishGrades = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, submissionIds, notifyStudents } = publishGradesModal;
    if (!asn) return;
    const count = db.publishAssignmentGrades(
      asn.id,
      submissionIds,
      notifyStudents,
      user?.name || 'Cô Nguyễn Thị Mai'
    );
    if (count === 0) {
      showToast('Chưa có bài nộp nào đã chấm điểm để công bố.', 'error');
      return;
    }
    const msg = `Đã trả bài và công bố điểm chính thức cho ${count} học sinh!`;
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setPublishGradesModal((prev) => ({ ...prev, isOpen: false }));
    setSelectedStudentIds([]);
  };

  // Open MOD-05: Đóng / Mở nhận bài
  const openCloseOrReopenModal = (asn: Assignment, targetStatus: 'open' | 'closed') => {
    if (!ensurePermissionOrToast(asn, targetStatus === 'open' ? 'Mở lại nhận bài' : 'Đóng nhận bài')) {
      return;
    }
    setCloseOpenModal({
      isOpen: true,
      asn,
      targetStatus,
      reason:
        targetStatus === 'closed'
          ? 'Đóng cổng nhận bài để khóa danh sách và tổng hợp điểm'
          : 'Mở lại cổng nhận bài cho học sinh nộp bổ sung',
      errorText: ''
    });
  };

  const handleConfirmCloseOrReopen = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, targetStatus, reason } = closeOpenModal;
    if (!asn) return;
    if (reason.trim().length < 5) {
      setCloseOpenModal((p) => ({
        ...p,
        errorText: 'Vui lòng nhập lý do thay đổi trạng thái nhận bài (tối thiểu 5 ký tự).'
      }));
      showToast('Vui lòng nhập lý do thay đổi trạng thái nhận bài.', 'error');
      return;
    }
    db.toggleAssignmentReceiveStatus(
      asn.id,
      targetStatus,
      reason.trim(),
      user?.name || 'Cô Nguyễn Thị Mai'
    );
    const msg =
      targetStatus === 'open'
        ? `Đã mở lại nhận bài cho "${asn.title}".`
        : `Đã đóng nhận bài cho "${asn.title}".`;
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setCloseOpenModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-06: Thu hồi (Soft-delete)
  const openWithdrawModal = (asn: Assignment) => {
    if (!ensurePermissionOrToast(asn, 'Thu hồi lượt giao')) return;
    setWithdrawModal({
      isOpen: true,
      asn,
      reason: '',
      confirmText: '',
      errorText: ''
    });
  };

  const handleConfirmWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, reason, confirmText } = withdrawModal;
    if (!asn) return;
    if (reason.trim().length < 5) {
      setWithdrawModal((p) => ({
        ...p,
        errorText: 'Vui lòng nhập lý do thu hồi bài tập (tối thiểu 5 ký tự).'
      }));
      showToast('Vui lòng nhập lý do thu hồi bài tập (tối thiểu 5 ký tự).', 'error');
      return;
    }
    if (confirmText.trim().toUpperCase() !== 'THU HOI') {
      setWithdrawModal((p) => ({
        ...p,
        errorText: 'Vui lòng gõ chính xác cụm từ THU HOI để xác nhận.'
      }));
      showToast('Vui lòng gõ chính xác cụm từ THU HOI để xác nhận.', 'error');
      return;
    }
    db.withdrawAssignment(asn.id, reason.trim(), user?.name || 'Cô Nguyễn Thị Mai');
    const msg = `Đã thu hồi lượt giao "${asn.title}". Dữ liệu bài nộp và điểm lịch sử vẫn được bảo toàn.`;
    setInlineBanner({ type: 'info', text: msg });
    showToast(msg, 'info');
    setWithdrawModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-07: Giao lại (Reassign)
  const openReassignModal = (asn: Assignment) => {
    if (!ensurePermissionOrToast(asn, 'Giao lại bài tập')) return;
    const nextWeekIso = new Date(Date.now() + 7 * 86400000).toISOString();
    setReassignModal({
      isOpen: true,
      asn,
      title: `${asn.title} (Giao lại)`,
      classIds: asn.targetClassIds?.length ? asn.targetClassIds : [asn.classId],
      newDueLocal: toDateTimeLocalValue(nextWeekIso),
      errorText: ''
    });
  };

  const handleConfirmReassign = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, title, classIds, newDueLocal } = reassignModal;
    if (!asn) return;
    if (classIds.length === 0) {
      setReassignModal((p) => ({ ...p, errorText: 'Vui lòng chọn ít nhất 1 lớp nhận bài.' }));
      showToast('Vui lòng chọn ít nhất 1 lớp nhận bài.', 'error');
      return;
    }
    if (!newDueLocal || new Date(newDueLocal).getTime() <= Date.now()) {
      setReassignModal((p) => ({
        ...p,
        errorText: 'Hạn nộp mới phải lớn hơn thời điểm hiện tại.'
      }));
      showToast('Hạn nộp mới phải lớn hơn thời điểm hiện tại.', 'error');
      return;
    }
    const created = db.reassignAssignment(
      asn.id,
      classIds,
      new Date(newDueLocal).toISOString(),
      title,
      user?.name || 'Cô Nguyễn Thị Mai'
    );
    if (created) {
      const msg = `Đã tạo lượt giao mới "${created.title}" cho lớp ${created.className}!`;
      setInlineBanner({ type: 'success', text: msg });
      showToast(msg, 'success');
      setSelectedAsnId(created.id);
    }
    setReassignModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-08: Yêu cầu làm lại (Redo Request)
  const openRedoModalFor = (asn: Assignment, student: Student) => {
    if (!ensurePermissionOrToast(asn, 'Yêu cầu làm lại')) return;
    const plus2Days = new Date(Date.now() + 2 * 86400000).toISOString();
    setRedoModal({
      isOpen: true,
      asn,
      student,
      extraAttempts: 1,
      newDueLocal: toDateTimeLocalValue(plus2Days),
      feedback: 'Em cần xem lại kiến thức trọng tâm và nộp lại bài hoàn chỉnh hơn.',
      errorText: ''
    });
  };

  const handleConfirmRedo = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, student, extraAttempts, newDueLocal, feedback } = redoModal;
    if (!asn || !student) return;
    if (!newDueLocal || new Date(newDueLocal).getTime() <= Date.now()) {
      setRedoModal((p) => ({
        ...p,
        errorText: 'Hạn nộp bổ sung phải lớn hơn thời điểm hiện tại.'
      }));
      showToast('Hạn nộp bổ sung phải lớn hơn thời điểm hiện tại.', 'error');
      return;
    }
    if (!feedback.trim()) {
      setRedoModal((p) => ({
        ...p,
        errorText: 'Vui lòng nhập nhận xét / yêu cầu cần sửa cho học sinh.'
      }));
      showToast('Vui lòng nhập nhận xét / yêu cầu cần sửa cho học sinh.', 'error');
      return;
    }
    db.requestSubmissionRedo(
      asn.id,
      student.id,
      student.fullName,
      Math.max(1, extraAttempts),
      new Date(newDueLocal).toISOString(),
      feedback.trim(),
      user?.name || 'Cô Nguyễn Thị Mai'
    );
    const msg = `Đã gửi yêu cầu làm lại bài cho học sinh ${student.fullName}!`;
    setInlineBanner({ type: 'success', text: msg });
    showToast(msg, 'success');
    setRedoModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-10: Sao chép / Nhân bản bài tập (Copy Modal)
  const openCopyModalFor = (asn: Assignment) => {
    if (!ensurePermissionOrToast(asn, 'Sao chép bài tập')) return;
    const nextWeekIso = new Date(Date.now() + 7 * 86400000).toISOString();
    setCopyModal({
      isOpen: true,
      asn,
      newTitle: `${asn.title} (Bản sao)`,
      targetClassId: asn.classId,
      newDueLocal: toDateTimeLocalValue(asn.dueDate || nextWeekIso),
      keepSnapshots: true,
      selectAfterCopy: true,
      errorText: ''
    });
  };

  const handleConfirmCopyModal = (e: React.FormEvent) => {
    e.preventDefault();
    const { asn, newTitle, targetClassId, newDueLocal, keepSnapshots, selectAfterCopy } =
      copyModal;
    if (!asn) return;
    if (!newTitle.trim()) {
      setCopyModal((p) => ({ ...p, errorText: 'Vui lòng nhập tiêu đề cho bản sao bài tập.' }));
      showToast('Vui lòng nhập tiêu đề bản sao.', 'error');
      return;
    }

    const copied = db.copyAssignment(asn.id, {
      title: newTitle.trim(),
      classId: targetClassId || asn.classId,
      dueDate: newDueLocal ? new Date(newDueLocal).toISOString() : asn.dueDate,
      keepSnapshots,
      teacherName: user?.name || 'Cô Nguyễn Thị Mai'
    });

    if (copied) {
      const msg = `Đã sao chép bài tập thành bản nháp "${copied.title}" (Lớp ${copied.className})!`;
      setInlineBanner({ type: 'success', text: msg });
      showToast(msg, 'success');
      if (selectAfterCopy) {
        setSelectedAsnId(copied.id);
      }
    }
    setCopyModal((prev) => ({ ...prev, isOpen: false, errorText: '' }));
  };

  // Open MOD-09: Xuất báo cáo Excel / CSV (Sanitize Formula Injection per Section 11)
  const sanitizeSpreadsheetCell = (val: unknown): string | number => {
    if (typeof val === 'number') return val;
    const str = String(val ?? '');
    if (/^[=+\-@]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  const handleQuickExportUnsubmitted = () => {
    if (!selectedEnriched) return;
    const { asn } = selectedEnriched;
    const unsubmittedRows = studentRowsForSelected.filter((r) => !r.isSubmitted);
    if (unsubmittedRows.length === 0) {
      showToast('Tất cả học sinh trong lớp đều đã nộp bài!', 'info');
      return;
    }
    const rows = unsubmittedRows.map((r, idx) => ({
      STT: idx + 1,
      'Mã HS': sanitizeSpreadsheetCell(r.student.code),
      'Họ và tên': sanitizeSpreadsheetCell(r.student.fullName),
      Lớp: sanitizeSpreadsheetCell(r.student.className),
      'Trạng thái nộp': r.isOverdueUnsubmitted ? 'Quá hạn chưa nộp' : 'Chưa nộp',
      'Hạn nộp áp dụng': formatDateTimeVN(r.effectiveDueIso),
      'Lần nhắc gần nhất': r.lastRemindedAt ? formatDateTimeVN(r.lastRemindedAt) : 'Chưa nhắc',
      'SĐT Phụ huynh': sanitizeSpreadsheetCell(r.student.parentPhone || '-')
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HocSinhChuaNop');
    XLSX.writeFile(wb, `DS_ChuaNop_${asn.className}_${asn.code || asn.id}.xlsx`);
    db.addAuditLog(
      'Xuất danh sách học sinh chưa nộp',
      'assignment',
      `Xuất Excel ${rows.length} học sinh chưa nộp bài "${asn.title}"`
    );
    showToast(`Đã xuất danh sách ${rows.length} học sinh chưa nộp (.xlsx)!`, 'success');
  };

  const handleConfirmExport = (e: React.FormEvent) => {
    e.preventDefault();
    const { scope, format, includeQuestionsDetail, includeFeedback } = exportModal;

    if (
      (scope === 'current_assignment' || scope === 'unsubmitted_only') &&
      selectedEnriched
    ) {
      const { asn } = selectedEnriched;
      const sourceRows =
        scope === 'unsubmitted_only'
          ? studentRowsForSelected.filter((r) => !r.isSubmitted)
          : studentRowsForSelected;

      const rows = sourceRows.map((r, idx) => {
        const base: Record<string, string | number> = {
          STT: idx + 1,
          'Mã HS': sanitizeSpreadsheetCell(r.student.code),
          'Họ và tên': sanitizeSpreadsheetCell(r.student.fullName),
          Lớp: sanitizeSpreadsheetCell(r.student.className),
          'Trạng thái nộp': r.normalizedSubmissionStatus,
          'Chi tiết nộp': r.isSubmitted
            ? r.isLate
              ? `Nộp muộn (${r.lateMinutes} phút)`
              : 'Đã nộp đúng hạn'
            : r.isOverdueUnsubmitted
            ? 'Quá hạn chưa nộp'
            : 'Chưa nộp',
          'Trạng thái chấm': r.normalizedGradeStatus,
          'Công bố điểm':
            r.displayGradeStatus === 'published'
              ? 'Đã công bố điểm'
              : r.displayGradeStatus === 'graded'
              ? 'Đã chấm (Chờ trả)'
              : r.displayGradeStatus === 'draft_grade'
              ? 'Đang chấm nháp'
              : 'Chưa chấm',
          'Thời gian nộp': r.submission ? formatDateTimeVN(r.submission.submittedAt) : '-',
          'Hạn nộp áp dụng': formatDateTimeVN(r.effectiveDueIso)
        };
        if (includeQuestionsDetail) {
          base['Điểm Trắc nghiệm'] = r.submission?.objectiveScore ?? '-';
          base['Điểm Tự luận'] = r.submission?.essayScore ?? '-';
        }
        base[`Tổng điểm (/${asn.totalPoints})`] =
          r.submission?.score !== undefined ? r.submission.score : '-';
        if (includeFeedback) {
          base['Nhận xét của GV'] = sanitizeSpreadsheetCell(r.submission?.feedback || '');
        }
        return base;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        ws,
        scope === 'unsubmitted_only' ? 'DSChuaNop' : 'KetQuaBaiTap'
      );
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const prefix = scope === 'unsubmitted_only' ? 'DS_ChuaNop' : 'BaoCao_BaiTap';
      XLSX.writeFile(wb, `${prefix}_${asn.title.replace(/\s+/g, '_')}.${ext}`, {
        bookType: format === 'csv' ? 'csv' : 'xlsx'
      });
      db.addAuditLog(
        'Xuất báo cáo bài tập',
        'assignment',
        `Xuất tệp ${ext.toUpperCase()} kết quả bài tập "${asn.title}" (${rows.length} học sinh)`
      );
      showToast(`Đã xuất báo cáo bài tập "${asn.title}" (.${ext}) thành công!`, 'success');
    } else {
      const rows = filteredEnrichedAssignments.map((item, idx) => ({
        STT: idx + 1,
        'Mã bài': sanitizeSpreadsheetCell(item.asn.code || item.asn.id),
        'Tên bài tập': sanitizeSpreadsheetCell(item.asn.title),
        'Môn học': sanitizeSpreadsheetCell(item.asn.subject),
        Lớp: sanitizeSpreadsheetCell(item.asn.className),
        Loại: item.asn.assignmentType === 'test' ? 'Bài kiểm tra' : 'Bài tập về nhà',
        'Ngày giao': formatDateTimeVN(item.asn.assignedAt || item.asn.createdAt),
        'Hạn nộp': formatDateTimeVN(item.asn.dueDate),
        'Trạng thái nhận bài':
          item.derivedReceiveStatus === 'open' && item.isOverdue
            ? 'Quá hạn (Còn nhận muộn)'
            : item.derivedReceiveStatus === 'open'
            ? 'Đang nhận bài (Còn hạn)'
            : item.derivedReceiveStatus === 'closed'
            ? 'Đã đóng nhận bài'
            : item.derivedReceiveStatus,
        'Trạng thái chấm': item.derivedGradeStatus,
        'Đã nộp / Tổng': `${item.submittedCount}/${item.totalRecipients}`,
        'Chưa nộp': item.unsubmittedCount,
        'Nộp muộn': item.lateSubsCount,
        'Chưa chấm': item.pendingGradeCount,
        'Đã chấm': item.gradedCount,
        'Tỷ lệ nộp (%)': item.submissionRate,
        'Điểm TB': item.avgScore ?? '-'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DanhSachBaiTapDaGiao');
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      XLSX.writeFile(wb, `DanhSach_BaiTap_DaGiao.${ext}`, {
        bookType: format === 'csv' ? 'csv' : 'xlsx'
      });
      db.addAuditLog(
        'Xuất danh sách bài tập đã giao',
        'assignment',
        `Xuất tệp ${ext.toUpperCase()} tổng hợp ${rows.length} lượt giao bài tập`
      );
      showToast(`Đã xuất danh sách ${rows.length} lượt giao bài tập (.${ext})!`, 'success');
    }

    setExportModal((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Standardized Badge Renderers ---
  const renderReceiveStatusBadge = (status: AssignmentReceiveStatus, isOverdue: boolean) => {
    if (status === 'withdrawn') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-700/50">
          Đã thu hồi
        </span>
      );
    }
    if (status === 'draft') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          Bản nháp
        </span>
      );
    }
    if (status === 'scheduled') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-950/70 text-purple-300 border border-purple-700/50">
          Đã lên lịch
        </span>
      );
    }
    if (status === 'closed') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-rose-300 border border-rose-700/50">
          {isOverdue ? 'Quá hạn • Đã đóng nhận' : 'Đã đóng nhận bài'}
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/85 text-amber-300 border border-amber-500/50">
          Quá hạn • Còn nhận muộn
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
        Đang nhận bài
      </span>
    );
  };

  const renderGradeStatusBadge = (
    status: 'ungraded' | 'in_progress' | 'graded' | 'published',
    gradedCount?: number,
    submittedCount?: number
  ) => {
    if (status === 'published') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
          Đã chấm • Đã công bố
        </span>
      );
    }
    if (status === 'graded') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-600/40">
          Đã chấm ({gradedCount ?? 0}/{submittedCount ?? 0})
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-600/40">
          Đang chấm ({gradedCount ?? 0}/{submittedCount ?? 0})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
        Chưa chấm
      </span>
    );
  };

  // Bulk select helpers
  const allVisibleStudentIds = useMemo(
    () => filteredStudentRows.map((r) => r.student.id),
    [filteredStudentRows]
  );
  const isAllVisibleSelected =
    allVisibleStudentIds.length > 0 &&
    allVisibleStudentIds.every((id) => selectedStudentIds.includes(id));

  const toggleSelectAllStudents = () => {
    if (isAllVisibleSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !allVisibleStudentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...allVisibleStudentIds])));
    }
  };

  const toggleSelectOneStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  return (
    <div className="space-y-4">
      {/* ===================================================================== */}
      {/* UI-01: BREADCRUMB & UI-02: TOOLBAR THAO TÁC NHANH                      */}
      {/* ===================================================================== */}
      <div className="bg-[#031C2E] border border-[#064966] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"
          >
            <button
              type="button"
              onClick={() => navigate('/teacher/dashboard')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Dạy &amp; Học
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button
              type="button"
              onClick={() => onSwitchSubModule('topics')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Giao bài tập
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-400 font-bold">Danh sách bài tập đã giao</span>
          </nav>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Danh sách Bài tập đã giao &amp; Điều phối Chấm trả
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold">
              {filteredEnrichedAssignments.length} lượt giao
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Role: <strong className="text-cyan-300">{user?.role === 'admin' ? 'Admin' : 'Giáo viên'}</strong>
            </span>
          </div>
        </div>

        {/* UI-02: Thanh công cụ (Quản lý chủ đề, Tạo bài tập từ NCH, Xuất báo cáo, Làm mới) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSwitchSubModule('topics')}
            className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-[#064966] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400" /> Quản lý chủ đề
          </button>

          <button
            type="button"
            onClick={() => onSwitchSubModule('create')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#009ED0] to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Tạo bài tập mới
          </button>

          <button
            type="button"
            onClick={() =>
              setExportModal({
                isOpen: true,
                scope: selectedEnriched ? 'current_assignment' : 'filtered_list',
                format: 'xlsx',
                includeQuestionsDetail: true,
                includeFeedback: true
              })
            }
            className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất báo cáo
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Làm mới & đồng bộ dữ liệu"
            className="px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-[#064966] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Inline Status Banner (Success / Error / Loading Feedback) */}
      {inlineBanner && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all ${
            inlineBanner.type === 'success'
              ? 'bg-emerald-950/75 border-emerald-500/50 text-emerald-200'
              : inlineBanner.type === 'error'
              ? 'bg-rose-950/75 border-rose-500/50 text-rose-200'
              : 'bg-cyan-950/75 border-cyan-500/50 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {inlineBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : inlineBanner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span>{inlineBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setInlineBanner(null)}
            className="p-1 rounded hover:bg-slate-800/60 text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* UI-03: 4 THẺ KPI TỔNG QUAN (ĐỒNG BỘ 1 NGUỒN DỮ LIỆU DUY NHẤT)          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'all' as KpiQuickFilter,
            label: 'Tổng lượt giao',
            value: kpiStats.totalAssigned,
            sub: `Trên ${assignedClasses.length} lớp phụ trách`,
            icon: BookOpen,
            accent: 'cyan'
          },
          {
            id: 'receiving' as KpiQuickFilter,
            label: 'Đang nhận bài (Còn hạn)',
            value: kpiStats.receivingOnTimeCount,
            sub:
              kpiStats.overdueAcceptingLateCount > 0
                ? `Trong hạn nộp • +${kpiStats.overdueAcceptingLateCount} bài quá hạn mở muộn`
                : 'Đang mở trong thời hạn nộp bài',
            icon: Clock,
            accent: 'emerald'
          },
          {
            id: 'overdue_unsubmitted' as KpiQuickFilter,
            label: 'Quá hạn / Chưa nộp',
            value: kpiStats.overdueOrUnsubmittedCount,
            sub: `${kpiStats.totalUnsubmittedStudents} lượt HS chưa nộp bài`,
            icon: AlertTriangle,
            accent: 'rose'
          },
          {
            id: 'pending_grade' as KpiQuickFilter,
            label: 'Bài chưa chấm',
            value: kpiStats.totalPendingGradeSubmissions,
            sub: `Thuộc ${kpiStats.pendingGradeAssignmentsCount} lượt giao có bài chờ chấm`,
            icon: Edit3,
            accent: 'amber'
          }
        ].map((card) => {
          const Icon = card.icon;
          const active = kpiQuickFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setKpiQuickFilter(card.id);
                setCurrentPage(1);
              }}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                active
                  ? 'bg-[#05263D] border-[#00E5F0] shadow-[0_0_20px_rgba(0,229,240,0.18)]'
                  : 'bg-[#031C2E] border-[#064966] hover:border-cyan-500/60'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-300">{card.label}</p>
                <p className="text-2xl font-extrabold text-white mt-1 font-mono">{card.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  card.accent === 'cyan'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : card.accent === 'emerald'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : card.accent === 'rose'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* UI-04: THANH TÌM KIẾM, BỘ LỌC ĐA CHIỀU & SẮP XẾP                      */}
      {/* ===================================================================== */}
      <div className="bg-[#031C2E] border border-[#064966] rounded-2xl p-3.5 space-y-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Tìm kiếm từ khóa */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value.slice(0, 100));
                setCurrentPage(1);
              }}
              placeholder="Tìm tên bài tập, chủ đề, mã bài, lớp (tối đa 100 ký tự)..."
              className="w-full pl-9 pr-3 py-2 bg-[#00121F] border border-[#064966] rounded-xl text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Lọc theo Lớp */}
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Tất cả lớp phụ trách</option>
            {assignedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                Lớp {c.name}
              </option>
            ))}
          </select>

          {/* Lọc theo Môn */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Tất cả môn học</option>
            {assignedSubjects.map((s) => (
              <option key={s} value={s}>
                Môn {s}
              </option>
            ))}
          </select>

          {/* Lọc theo Loại bài */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'all' | 'homework' | 'test');
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Loại: Tất cả</option>
            <option value="homework">Bài tập về nhà</option>
            <option value="test">Bài kiểm tra</option>
          </select>

          {/* Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-bold text-cyan-300 outline-none focus:border-cyan-400"
          >
            <option value="newest">Sắp xếp: Mới giao nhất</option>
            <option value="due_soon">Sắp xếp: Sắp hết hạn</option>
            <option value="lowest_submission_rate">Sắp xếp: Tỷ lệ nộp thấp nhất</option>
            <option value="most_ungraded">Sắp xếp: Nhiều bài chưa chấm nhất</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-[#064966]/60 items-center">
          {/* Trạng thái nhận bài (tách rõ Còn hạn vs Quá hạn) */}
          <select
            value={receiveStatusFilter}
            onChange={(e) => {
              setReceiveStatusFilter(e.target.value as ReceiveStatusFilterOption);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Trạng thái nhận: Tất cả</option>
            <option value="open_ontime">Đang nhận bài (Còn hạn)</option>
            <option value="open_overdue">Quá hạn (Còn nhận nộp muộn)</option>
            <option value="open">Tất cả đang mở nhận bài</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="closed">Đã đóng nhận bài</option>
            <option value="draft">Bản nháp</option>
            <option value="withdrawn">Đã thu hồi</option>
          </select>

          {/* Trạng thái chấm bài */}
          <select
            value={gradeStatusFilter}
            onChange={(e) => {
              setGradeStatusFilter(
                e.target.value as 'all' | 'ungraded' | 'in_progress' | 'graded' | 'published'
              );
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Trạng thái chấm: Tất cả</option>
            <option value="ungraded">Chưa chấm</option>
            <option value="in_progress">Đang chấm dở</option>
            <option value="graded">Đã chấm (Chờ trả)</option>
            <option value="published">Đã chấm (Đã công bố)</option>
          </select>

          {/* Lọc theo Chủ đề */}
          <select
            value={topicFilter}
            onChange={(e) => {
              setTopicFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#00121F] border border-[#064966] text-xs font-semibold text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="all">Chủ đề: Tất cả chủ đề</option>
            {allTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Khoảng ngày */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-[#00121F] border border-[#064966] text-[11px] text-slate-200"
              title="Từ ngày giao"
            />
            <span className="text-slate-500 text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl bg-[#00121F] border border-[#064966] text-[11px] text-slate-200"
              title="Đến ngày giao"
            />
          </div>

          {/* Nút Reset bộ lọc (ACT-10) */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Reset bộ lọc
          </button>
        </div>

        {dateRangeInvalid && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Khoảng ngày không hợp lệ: "Từ ngày" phải nhỏ hơn hoặc bằng "Đến ngày".</span>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* UI-05 & UI-06: MASTER–DETAIL SPLIT VIEW (32% TRÁI / 68% PHẢI)         */}
      {/* ===================================================================== */}
      {isRefreshing ? (
        <div className="bg-[#031C2E] border border-[#064966] rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
          <p className="text-sm font-extrabold text-white">
            Đang đồng bộ danh sách bài tập, bài nộp và trạng thái chấm điểm...
          </p>
          <p className="text-xs text-slate-400">
            Tất cả chỉ số KPI, tab và tiến độ được tổng hợp từ một nguồn dữ liệu thống nhất.
          </p>
        </div>
      ) : filteredEnrichedAssignments.length === 0 ? (
        <EmptyState
          title="Không tìm thấy lượt giao bài tập nào phù hợp"
          description="Bạn có thể nhấn Reset bộ lọc để xem toàn bộ danh sách hoặc tạo bài tập mới từ Ngân hàng câu hỏi."
          icon={BookOpen}
          actionText="Reset bộ lọc"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ================================================================= */}
          {/* CỘT TRÁI (32% ~ 4/12 CỘT DESKTOP): DANH SÁCH THẺ LƯỢT GIAO         */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 space-y-3">
            <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
              {paginatedAssignments.map((item) => {
                const {
                  asn,
                  totalRecipients,
                  submittedCount,
                  unsubmittedCount,
                  gradedCount,
                  pendingGradeCount,
                  lateSubsCount,
                  submissionRate,
                  isOverdue,
                  derivedReceiveStatus,
                  derivedGradeStatus
                } = item;
                const isSelected = selectedAsnId === asn.id;

                return (
                  <div
                    key={asn.id}
                    onClick={() => {
                      setSelectedAsnId(asn.id);
                      setSelectedStudentIds([]);
                      setMobileDetailOpen(true);
                      if (window.innerWidth < 1024 && detailPanelRef.current) {
                        detailPanelRef.current.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#05263D] border-[#00E5F0] shadow-[0_0_20px_rgba(0,229,240,0.16)]'
                        : 'bg-[#031C2E] border-[#064966] hover:border-cyan-500/60 hover:bg-[#042238]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-extrabold border border-cyan-500/30">
                            Lớp {asn.className}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                            {asn.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px]">
                            {asn.assignmentType === 'test' ? 'Kiểm tra' : 'BTVN'}
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-2">
                          {asn.title}
                        </h3>
                      </div>

                      {/* Menu ⋯ trên từng card (UI-05) */}
                      <div
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuAsnId(openMenuAsnId === asn.id ? null : asn.id)
                          }
                          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                          aria-label="Menu thao tác bài tập"
                          title="Menu thao tác bài tập"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuAsnId === asn.id && (
                          <div className="absolute right-0 mt-1.5 w-52 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-2xl py-1.5 z-40 text-xs font-semibold text-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                if (ensurePermissionOrToast(asn, 'Chỉnh sửa thông tin')) {
                                  onOpenEditMeta(asn);
                                }
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-300" /> Chỉnh sửa thông tin
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openExtendModalFor(asn, 'class');
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Gia hạn nộp bài
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openRemindModalFor(asn);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <BellRing className="w-3.5 h-3.5 text-cyan-300" /> Nhắc nộp ({unsubmittedCount} HS)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openPublishGradesModalFor(asn);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-400" /> Trả bài / Công bố điểm
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openCopyModalFor(asn);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-blue-400" /> Sao chép / Nhân bản
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openReassignModal(asn);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-300" /> Giao lại cho lớp khác
                            </button>
                            {derivedReceiveStatus === 'closed' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuAsnId(null);
                                  openCloseOrReopenModal(asn, 'open');
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 text-emerald-300 cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" /> Mở lại nhận bài
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuAsnId(null);
                                  openCloseOrReopenModal(asn, 'closed');
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 text-amber-300 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" /> Đóng nhận bài
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                setSelectedAsnId(asn.id);
                                setExportModal({
                                  isOpen: true,
                                  scope: 'current_assignment',
                                  format: 'xlsx',
                                  includeQuestionsDetail: true,
                                  includeFeedback: true
                                });
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-900 flex items-center gap-2 text-emerald-300 cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất báo cáo Excel
                            </button>
                            <div className="my-1 border-t border-slate-800" />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuAsnId(null);
                                openWithdrawModal(asn);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-rose-950/60 flex items-center gap-2 text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Thu hồi lượt giao
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Chủ đề & hạn nộp */}
                    {asn.topicNames && asn.topicNames.length > 0 && (
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        Chủ đề: <span className="text-slate-300">{asn.topicNames.join(', ')}</span>
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] mt-2 text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Hạn:{' '}
                        <strong className={isOverdue ? 'text-rose-400' : 'text-amber-300'}>
                          {formatDateTimeVN(asn.dueDate)}
                        </strong>
                      </span>
                      {lateSubsCount > 0 && (
                        <span className="text-[10px] font-bold text-amber-300">
                          {lateSubsCount} nộp muộn
                        </span>
                      )}
                    </div>

                    {/* Progress bar Đã nộp / Tổng & Đã chấm / Đã nộp (100% đồng bộ với bảng bên phải) */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">
                          Đã nộp:{' '}
                          <strong className="text-emerald-400 font-mono">
                            {submittedCount}/{totalRecipients}
                          </strong>{' '}
                          ({submissionRate}%)
                        </span>
                        <span className="text-slate-300">
                          Đã chấm:{' '}
                          <strong className="text-cyan-300 font-mono">
                            {gradedCount}/{submittedCount}
                          </strong>
                          {pendingGradeCount > 0 && (
                            <span className="ml-1 text-amber-300 font-bold">
                              ({pendingGradeCount} chưa chấm)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                          style={{ width: `${Math.min(100, submissionRate)}%` }}
                        />
                      </div>
                    </div>

                    {/* 2 Badge tách biệt: Trạng thái nhận bài & Trạng thái chấm */}
                    <div className="mt-3 pt-2.5 border-t border-[#064966]/50 flex items-center justify-between gap-1.5 flex-wrap">
                      {renderReceiveStatusBadge(derivedReceiveStatus, isOverdue)}
                      {renderGradeStatusBadge(derivedGradeStatus, gradedCount, submittedCount)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UI-07: Phân trang (Pagination 20 items/page) */}
            {totalPages > 1 && (
              <div className="bg-[#031C2E] border border-[#064966] rounded-xl p-2.5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Trước
                </button>
                <span className="text-slate-300 font-bold">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  Sau <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* CỘT PHẢI (68% ~ 8/12 CỘT DESKTOP): PANEL CHI TIẾT & HỌC SINH       */}
          {/* ================================================================= */}
          <div className="lg:col-span-8" ref={detailPanelRef}>
            {selectedEnriched ? (
              <div className="bg-[#031C2E] border border-[#064966] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                {/* =========================================================== */}
                {/* KHU VỰC 1: TIÊU ĐỀ & THÔNG TIN BÀI TẬP (TÁCH RIÊNG RỘNG RÃI) */}
                {/* =========================================================== */}
                <div className="space-y-2.5 pb-3 border-b border-[#064966]/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold">
                        Lớp {selectedEnriched.asn.className}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 text-xs font-bold">
                        Môn {selectedEnriched.asn.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-400 border border-slate-800 text-[11px] font-mono">
                        Mã: {selectedEnriched.asn.code || selectedEnriched.asn.id}
                      </span>
                      {renderReceiveStatusBadge(
                        selectedEnriched.derivedReceiveStatus,
                        selectedEnriched.isOverdue
                      )}
                      {renderGradeStatusBadge(
                        selectedEnriched.derivedGradeStatus,
                        selectedEnriched.gradedCount,
                        selectedEnriched.submittedCount
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          ensurePermissionOrToast(selectedEnriched.asn, 'Chỉnh sửa thông tin')
                        ) {
                          onOpenEditMeta(selectedEnriched.asn);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Chỉnh sửa tiêu đề, hạn nộp hoặc hướng dẫn"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-300" /> Sửa thông tin
                    </button>
                  </div>

                  {/* Tiêu đề bài tập chiếm trọn chiều ngang, không bị chèn ép bởi thanh nút */}
                  <h3 className="text-base sm:text-xl font-extrabold text-white leading-snug">
                    {selectedEnriched.asn.title}
                  </h3>

                  {selectedEnriched.asn.description && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-[#00121F]/60 px-3 py-2 rounded-xl border border-[#064966]/50">
                      {selectedEnriched.asn.description}
                    </p>
                  )}

                  {/* Metadata chi tiết của bài tập */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 pt-0.5">
                    <span>
                      Ngày giao:{' '}
                      <strong className="text-slate-100">
                        {formatDateTimeVN(
                          selectedEnriched.asn.assignedAt || selectedEnriched.asn.createdAt
                        )}
                      </strong>
                    </span>
                    <span>
                      Hạn nộp:{' '}
                      <strong
                        className={
                          selectedEnriched.isOverdue ? 'text-rose-400' : 'text-amber-300'
                        }
                      >
                        {formatDateTimeVN(selectedEnriched.asn.dueDate)}
                      </strong>
                    </span>
                    <span>
                      Thang điểm:{' '}
                      <strong className="text-cyan-300">
                        {selectedEnriched.asn.totalPoints} điểm
                      </strong>
                    </span>
                    <span>
                      Nộp muộn:{' '}
                      <strong className="text-slate-200">
                        {selectedEnriched.asn.latePolicy === 'disallow_after_due'
                          ? 'Đóng cổng khi hết hạn'
                          : selectedEnriched.asn.latePolicy === 'deduct_points'
                          ? `Cho nộp muộn (Trừ ${selectedEnriched.asn.latePenaltyPercent || 10}% điểm)`
                          : 'Cho nộp & gắn nhãn Nộp muộn'}
                      </strong>
                    </span>
                    {selectedEnriched.asn.questionSnapshots &&
                      selectedEnriched.asn.questionSnapshots.length > 0 && (
                        <span className="text-emerald-300 font-bold">
                          • Snapshot {selectedEnriched.asn.questionSnapshots.length} câu hỏi
                        </span>
                      )}
                    {selectedEnriched.asn.attachmentName && (
                      <button
                        type="button"
                        onClick={() => openAssignmentAttachmentPreview(selectedEnriched.asn)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" /> Đề đính kèm:{' '}
                        {selectedEnriched.asn.attachmentName}
                      </button>
                    )}
                  </div>
                </div>

                {/* =========================================================== */}
                {/* KHU VỰC 2: THANH THAO TÁC LƯỢT GIAO ĐỘC LẬP (TÁCH KHỎI TITLE) */}
                {/* =========================================================== */}
                <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] flex flex-wrap items-center justify-between gap-2">
                  {/* Nhóm thao tác điều phối học sinh (Gia hạn, Nhắc nộp, Trả bài) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openExtendModalFor(selectedEnriched.asn, 'class')}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Gia hạn
                    </button>

                    <button
                      type="button"
                      onClick={() => openRemindModalFor(selectedEnriched.asn)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <BellRing className="w-3.5 h-3.5" /> Nhắc nộp ({studentTabCounts.unsubmitted})
                    </button>

                    <button
                      type="button"
                      onClick={() => openPublishGradesModalFor(selectedEnriched.asn)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Trả bài / Công bố điểm
                    </button>
                  </div>

                  {/* Nhóm thao tác quản lý lượt giao (Đóng/Mở, Sao chép, Giao lại, Thống kê, Thu hồi) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedEnriched.derivedReceiveStatus === 'closed' ? (
                      <button
                        type="button"
                        onClick={() => openCloseOrReopenModal(selectedEnriched.asn, 'open')}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Mở nhận bài
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openCloseOrReopenModal(selectedEnriched.asn, 'closed')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" /> Đóng nhận
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openCopyModalFor(selectedEnriched.asn)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Sao chép
                    </button>

                    <button
                      type="button"
                      onClick={() => openReassignModal(selectedEnriched.asn)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Giao lại
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAnalyticsReportOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-300" /> Phổ điểm &amp; Cảnh báo
                    </button>

                    <button
                      type="button"
                      onClick={() => openWithdrawModal(selectedEnriched.asn)}
                      title="Thu hồi lượt giao (Soft-delete)"
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-700/50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Thu hồi
                    </button>
                  </div>
                </div>

                {/* =========================================================== */}
                {/* KHU VỰC 3: 6 Ô KPI CỦA LƯỢT GIAO ĐANG CHỌN (ĐỒNG BỘ 100%)    */}
                {/* =========================================================== */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Đã nộp</p>
                    <p className="text-base font-extrabold text-emerald-400 font-mono">
                      {selectedEnriched.submittedCount}/{selectedEnriched.totalRecipients}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Chưa nộp</p>
                    <p className="text-base font-extrabold text-rose-400 font-mono">
                      {selectedEnriched.unsubmittedCount}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Nộp muộn</p>
                    <p className="text-base font-extrabold text-amber-300 font-mono">
                      {selectedEnriched.lateSubsCount}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Chưa chấm</p>
                    <p className="text-base font-extrabold text-amber-400 font-mono">
                      {selectedEnriched.pendingGradeCount}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Đã chấm</p>
                    <p className="text-base font-extrabold text-cyan-300 font-mono">
                      {selectedEnriched.gradedCount}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#00121F] border border-[#064966] text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Điểm TB</p>
                    <p className="text-base font-extrabold text-white font-mono">
                      {selectedEnriched.avgScore !== null ? selectedEnriched.avgScore : '--'}
                    </p>
                  </div>
                </div>

                {/* =========================================================== */}
                {/* KHU VỰC 4: 6 SUB-TABS HỌC SINH & TÌM KIẾM                    */}
                {/* =========================================================== */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {(
                      [
                        { id: 'all', label: `Tất cả (${studentTabCounts.all})` },
                        { id: 'submitted', label: `Đã nộp (${studentTabCounts.submitted})` },
                        {
                          id: 'pending_grade',
                          label: `Chưa chấm (${studentTabCounts.pending_grade})`
                        },
                        { id: 'unsubmitted', label: `Chưa nộp (${studentTabCounts.unsubmitted})` },
                        { id: 'late', label: `Nộp muộn (${studentTabCounts.late})` },
                        { id: 'graded', label: `Đã chấm (${studentTabCounts.graded})` }
                      ] as { id: StudentSubTab; label: string }[]
                    ).map((t) => {
                      const active = studentTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setStudentTab(t.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            active
                              ? 'bg-[#009ED0] text-slate-950 font-extrabold shadow-sm'
                              : 'bg-[#00121F] text-slate-300 hover:text-white border border-[#064966]'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentKeyword}
                      onChange={(e) => setStudentKeyword(e.target.value)}
                      placeholder="Tìm tên hoặc mã học sinh..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#00121F] border border-[#064966] text-xs text-slate-100 placeholder-slate-400 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* =========================================================== */}
                {/* THANH THAO TÁC RIÊNG CHO HỌC SINH CHƯA NỘP BÀI               */}
                {/* =========================================================== */}
                {studentTab === 'unsubmitted' && studentTabCounts.unsubmitted > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-rose-200">
                      <UserX className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        Có <strong>{studentTabCounts.unsubmitted} học sinh</strong> chưa nộp bài tập
                        này. Bạn có thể đôn đốc hàng loạt hoặc gia hạn riêng:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openRemindModalFor(
                            selectedEnriched.asn,
                            studentRowsForSelected
                              .filter((r) => !r.isSubmitted)
                              .map((r) => r.student.id)
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" /> Nhắc tất cả ({studentTabCounts.unsubmitted} HS)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openExtendModalFor(
                            selectedEnriched.asn,
                            'selected_students',
                            studentRowsForSelected
                              .filter((r) => !r.isSubmitted)
                              .map((r) => r.student.id)
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Gia hạn riêng nhóm chưa nộp
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickExportUnsubmitted}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất DS chưa nộp
                      </button>
                    </div>
                  </div>
                )}

                {/* ACT-18: Bulk Action Bar khi có tích chọn học sinh */}
                {selectedStudentIds.length > 0 && (
                  <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-cyan-200">
                      Đã chọn <strong>{selectedStudentIds.length}</strong> học sinh
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openRemindModalFor(selectedEnriched.asn, selectedStudentIds)
                        }
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" /> Nhắc nộp nhóm chọn
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openExtendModalFor(
                            selectedEnriched.asn,
                            'selected_students',
                            selectedStudentIds
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Gia hạn cá nhân/nhóm
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const subIds = studentRowsForSelected
                            .filter(
                              (r) =>
                                selectedStudentIds.includes(r.student.id) &&
                                r.submission &&
                                r.submission.score !== undefined
                            )
                            .map((r) => r.submission!.id);
                          openPublishGradesModalFor(selectedEnriched.asn, subIds);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Công bố điểm nhóm chọn
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700 cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                )}

                {/* Bảng danh sách học sinh trong Lượt giao */}
                <div className="rounded-xl border border-[#064966] overflow-hidden bg-[#00121F]">
                  <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-[#021829] border-b border-[#064966] text-[11px] font-bold uppercase text-slate-400">
                        <tr>
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={isAllVisibleSelected}
                              onChange={toggleSelectAllStudents}
                              className="rounded border-slate-600 text-cyan-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3">Học sinh &amp; File bài làm</th>
                          <th className="py-3 px-3">Trạng thái nộp</th>
                          <th className="py-3 px-3">Trạng thái chấm</th>
                          <th className="py-3 px-3 text-center">Điểm &amp; Lịch sử</th>
                          <th className="py-3 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#064966]/40">
                        {filteredStudentRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-slate-400 space-y-2">
                              <p className="font-bold text-slate-300">
                                {studentTab === 'unsubmitted'
                                  ? 'Tuyệt vời! 100% học sinh trong danh sách đã nộp bài.'
                                  : studentTab === 'pending_grade'
                                  ? 'Không còn bài nộp nào đang chờ chấm.'
                                  : 'Không có học sinh nào trong tab này khớp với điều kiện lọc.'}
                              </p>
                              {studentTab !== 'all' && (
                                <button
                                  type="button"
                                  onClick={() => setStudentTab('all')}
                                  className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-[11px] font-bold cursor-pointer"
                                >
                                  Xem tất cả học sinh ({studentTabCounts.all})
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredStudentRows.map((row) => {
                            const {
                              student,
                              submission: sub,
                              personalOverride,
                              isSubmitted,
                              isLate,
                              lateMinutes,
                              isGraded,
                              isOverdueUnsubmitted,
                              lastRemindedAt,
                              displayGradeStatus
                            } = row;
                            const checked = selectedStudentIds.includes(student.id);

                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-[#042238]/70 transition-colors"
                              >
                                <td className="py-3 px-3">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleSelectOneStudent(student.id)}
                                    className="rounded border-slate-600 text-cyan-500 cursor-pointer"
                                  />
                                </td>

                                <td className="py-3 px-3">
                                  <p className="font-bold text-white">{student.fullName}</p>
                                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 mt-0.5">
                                    <span className="font-mono">{student.code}</span>
                                    {personalOverride && (
                                      <span
                                        className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-600/40 text-[10px]"
                                        title={`Gia hạn riêng: ${personalOverride.reason}`}
                                      >
                                        Hạn riêng: {formatDateTimeVN(personalOverride.dueDate)}
                                      </span>
                                    )}
                                    {!isSubmitted && lastRemindedAt && (
                                      <span
                                        className="px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-700/40 text-[10px]"
                                        title={`Đã nhắc lúc ${formatDateTimeVN(lastRemindedAt)}`}
                                      >
                                        Đã nhắc nộp
                                      </span>
                                    )}
                                  </div>

                                  {/* Nút Xem file bài làm trực tiếp ngay trên dòng */}
                                  {isSubmitted && sub && (sub.fileName || sub.content) && (
                                    <button
                                      type="button"
                                      onClick={() => openStudentFilePreview(row)}
                                      className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold cursor-pointer transition-colors"
                                      title="Nhấn để xem trực tiếp file bài làm của học sinh"
                                    >
                                      <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                                      <span className="truncate max-w-[180px]">
                                        {sub.fileName || 'Xem nội dung bài làm'}
                                      </span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-80 shrink-0" />
                                    </button>
                                  )}
                                </td>

                                {/* Trạng thái nộp đã chuẩn hóa: Đã nộp | Nộp muộn | Chưa nộp */}
                                <td className="py-3 px-3">
                                  {isSubmitted ? (
                                    <div className="space-y-0.5">
                                      {sub?.status === 'redo_requested' ? (
                                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/40 text-[10px] font-bold">
                                          Yêu cầu làm lại
                                        </span>
                                      ) : isLate ? (
                                        <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                          Nộp muộn ({lateMinutes}p)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                          Đã nộp
                                        </span>
                                      )}
                                      <p className="text-[10px] text-slate-400">
                                        {formatDateTimeVN(sub?.submittedAt)}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-700/50 text-[10px] font-bold">
                                        Chưa nộp
                                      </span>
                                      {isOverdueUnsubmitted && (
                                        <p className="text-[10px] text-rose-400 font-semibold">
                                          Quá hạn nộp
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </td>

                                {/* Trạng thái chấm đã chuẩn hóa: Đã chấm | Chưa chấm */}
                                <td className="py-3 px-3">
                                  {!isSubmitted ? (
                                    <span className="text-[11px] text-slate-500">--</span>
                                  ) : displayGradeStatus === 'published' ? (
                                    <div className="space-y-0.5">
                                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                                        Đã chấm
                                      </span>
                                      <p className="text-[10px] text-emerald-400 font-semibold">
                                        Đã công bố điểm
                                      </p>
                                    </div>
                                  ) : displayGradeStatus === 'graded' ? (
                                    <div className="space-y-0.5">
                                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                                        Đã chấm
                                      </span>
                                      <p className="text-[10px] text-slate-400">Chờ công bố</p>
                                    </div>
                                  ) : displayGradeStatus === 'draft_grade' ? (
                                    <div className="space-y-0.5">
                                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                        Chưa chấm
                                      </span>
                                      <p className="text-[10px] text-amber-400">
                                        Nháp: {sub?.draftScore ?? '--'}đ
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-600/30 text-[10px] font-bold">
                                      Chưa chấm
                                    </span>
                                  )}
                                </td>

                                {/* Điểm số & Lịch sử sửa điểm */}
                                <td className="py-3 px-3 text-center">
                                  {sub?.score !== undefined ? (
                                    <div className="space-y-0.5">
                                      <div>
                                        <span className="text-sm font-extrabold text-emerald-300 font-mono">
                                          {sub.score}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                          /{selectedEnriched.asn.totalPoints}
                                        </span>
                                      </div>
                                      {sub.revisions && sub.revisions.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRevisionHistoryModal({
                                              isOpen: true,
                                              submission: sub,
                                              asn: selectedEnriched.asn
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/70 hover:bg-amber-900/80 text-[10px] text-amber-300 border border-amber-500/30 font-semibold cursor-pointer"
                                          title="Xem lịch sử sửa điểm"
                                        >
                                          <History className="w-2.5 h-2.5" />
                                          {sub.revisions.length} lần sửa
                                        </button>
                                      )}
                                    </div>
                                  ) : sub?.objectiveScore !== undefined ? (
                                    <span className="text-[11px] text-cyan-300 font-semibold">
                                      TN: {sub.objectiveScore}đ
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">--</span>
                                  )}
                                </td>

                                {/* Cột Thao tác: Phân nhánh rõ giữa HS Đã nộp vs HS Chưa nộp */}
                                <td className="py-3 px-3 text-right">
                                  {isSubmitted ? (
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {/* Xem file bài làm */}
                                      {sub && (sub.fileName || sub.content) && (
                                        <button
                                          type="button"
                                          onClick={() => openStudentFilePreview(row)}
                                          title="Xem file bài làm của học sinh"
                                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 cursor-pointer"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Nút Chấm bài / Xem chấm lại */}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenGradingWorkspace(row)}
                                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        {isGraded ? 'Chấm lại' : 'Chấm bài'}
                                      </button>

                                      {/* Nút Sửa điểm có lý do (MOD-03) */}
                                      {sub && sub.score !== undefined && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openReviseScoreModal(sub, selectedEnriched.asn)
                                          }
                                          title="Sửa điểm có lý do bắt buộc"
                                          className="px-2 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        >
                                          <Edit3 className="w-3 h-3" /> Sửa điểm
                                        </button>
                                      )}

                                      {/* Nút Xem lịch sử sửa điểm */}
                                      {sub && sub.revisions && sub.revisions.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRevisionHistoryModal({
                                              isOpen: true,
                                              submission: sub,
                                              asn: selectedEnriched.asn
                                            })
                                          }
                                          title="Xem lịch sử sửa điểm"
                                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 cursor-pointer"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Nút Yêu cầu làm lại */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRedoModalFor(selectedEnriched.asn, student)
                                        }
                                        title="Yêu cầu học sinh làm lại bài"
                                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    /* Thao tác dành riêng cho HỌC SINH CHƯA NỘP */
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRemindModalFor(selectedEnriched.asn, [student.id])
                                        }
                                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        title="Gửi thông báo nhắc nộp riêng cho học sinh này"
                                      >
                                        <BellRing className="w-3.5 h-3.5" /> Nhắc nộp
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openExtendModalFor(
                                            selectedEnriched.asn,
                                            'selected_students',
                                            [student.id]
                                          )
                                        }
                                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/70 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                        title="Gia hạn riêng cho học sinh chưa nộp này"
                                      >
                                        <Calendar className="w-3.5 h-3.5" /> Gia hạn riêng
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenGradingWorkspace(row)}
                                        className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                        title="Ghi nhận nộp bài giấy hoặc chấm đặc cách"
                                      >
                                        <Edit3 className="w-3 h-3 text-emerald-400" /> Chấm trực tiếp
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#031C2E] border border-[#064966] rounded-2xl p-8 text-center text-slate-400">
                Chọn một lượt giao bài tập ở danh sách bên trái để xem chi tiết và chấm bài.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL XEM FILE BÀI LÀM CỦA HỌC SINH / TỆP ĐỀ BÀI (FILE VIEWER)         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={filePreviewModal.isOpen}
        onClose={() => setFilePreviewModal((p) => ({ ...p, isOpen: false }))}
        title={
          filePreviewModal.isAssignmentAttachment
            ? `Xem tệp đề bài đính kèm: ${filePreviewModal.fileName}`
            : `Xem file bài làm: ${filePreviewModal.studentName || ''} (${filePreviewModal.studentCode || ''})`
        }
        subtitle={
          filePreviewModal.isAssignmentAttachment
            ? `Bài tập: ${filePreviewModal.assignmentTitle || ''} • Dung lượng: ${filePreviewModal.fileSize}`
            : `Tệp: ${filePreviewModal.fileName} (${filePreviewModal.fileSize}) • Nộp lúc: ${formatDateTimeVN(filePreviewModal.submittedAt)}`
        }
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Thanh công cụ File Viewer */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> {filePreviewModal.fileName}
              </span>
              <span className="text-slate-400 font-mono">{filePreviewModal.fileSize}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDownloadPreviewFile(
                    filePreviewModal.fileName,
                    filePreviewModal.assignmentTitle || selectedEnriched?.asn.title || 'BaiTap',
                    filePreviewModal.content || '',
                    filePreviewModal.studentName
                      ? `${filePreviewModal.studentName} (${filePreviewModal.studentCode})`
                      : undefined
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Tải file về máy
              </button>

              {!filePreviewModal.isAssignmentAttachment && filePreviewModal.rowForGrading && (
                <button
                  type="button"
                  onClick={() => {
                    const targetRow = filePreviewModal.rowForGrading!;
                    setFilePreviewModal((p) => ({ ...p, isOpen: false }));
                    handleOpenGradingWorkspace(targetRow);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chuyển sang Chấm bài này
                </button>
              )}
            </div>
          </div>

          {/* Tờ giấy hiển thị nội dung file bài làm trực quan */}
          <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="pb-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold">
                  {filePreviewModal.isAssignmentAttachment
                    ? 'BẢN XEM TRƯỚC TÀI LIỆU ĐỀ BÀI'
                    : 'BẢN XEM TRƯỚC BÀI LÀM HỌC SINH'}
                </p>
                <h4 className="text-sm font-extrabold text-white mt-0.5">
                  {filePreviewModal.assignmentTitle || selectedEnriched?.asn.title}
                </h4>
              </div>
              {filePreviewModal.studentName && (
                <div className="text-right">
                  <p className="font-bold text-slate-200">{filePreviewModal.studentName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Mã HS: {filePreviewModal.studentCode}
                  </p>
                </div>
              )}
            </div>

            <div className="text-slate-100 whitespace-pre-line leading-relaxed text-xs sm:text-sm font-sans bg-slate-900/70 p-4 rounded-xl border border-slate-800">
              {filePreviewModal.content ||
                'Học sinh đã đính kèm tệp bài làm hoàn chỉnh. Giáo viên có thể xem nội dung hoặc tải tệp về máy.'}
            </div>

            {filePreviewModal.rowForGrading?.submission?.score !== undefined && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-emerald-300 font-bold">
                    Điểm đã chấm: {filePreviewModal.rowForGrading.submission.score}/
                    {selectedEnriched?.asn.totalPoints || 10} điểm
                  </span>
                  {filePreviewModal.rowForGrading.submission.feedback && (
                    <p className="text-slate-300 mt-0.5">
                      Nhận xét GV: {filePreviewModal.rowForGrading.submission.feedback}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL XEM LỊCH SỬ SỬA ĐIỂM (GRADE REVISION AUDIT LOG)                  */}
      {/* ===================================================================== */}
      <Modal
        isOpen={revisionHistoryModal.isOpen}
        onClose={() => setRevisionHistoryModal({ isOpen: false, submission: null, asn: null })}
        title={
          revisionHistoryModal.submission
            ? `Lịch sử sửa điểm: ${revisionHistoryModal.submission.studentName}`
            : 'Lịch sử sửa điểm'
        }
        subtitle="Mọi thao tác điều chỉnh điểm sau khi chấm đều được ghi nhận bất biến (Immutable Audit Trail)"
        maxWidth="lg"
      >
        {revisionHistoryModal.submission && revisionHistoryModal.asn && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-slate-300">
                  Học sinh:{' '}
                  <strong className="text-white">
                    {revisionHistoryModal.submission.studentName}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Bài tập: {revisionHistoryModal.asn.title}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Điểm hiện hành: </span>
                <strong className="text-base font-extrabold text-emerald-300 font-mono">
                  {revisionHistoryModal.submission.score ?? '--'}/
                  {revisionHistoryModal.asn.totalPoints}
                </strong>
              </div>
            </div>

            {!revisionHistoryModal.submission.revisions ||
            revisionHistoryModal.submission.revisions.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                Bài nộp này chưa có lịch sử chỉnh sửa điểm nào.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {revisionHistoryModal.submission.revisions.map(
                  (rev: GradeRevisionEntry, index: number) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                          Lần sửa #{revisionHistoryModal.submission!.revisions!.length - index}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDateTimeVN(rev.changedAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-slate-300">
                          Người thực hiện: <strong className="text-white">{rev.changedBy}</strong>
                        </span>
                        <span className="font-mono font-bold">
                          <span className="text-slate-400 line-through mr-1.5">
                            {rev.oldScore ?? '--'}đ
                          </span>
                          → <span className="text-emerald-300">{rev.newScore}đ</span>
                        </span>
                      </div>
                      <p className="text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <strong className="text-amber-300">Lý do sửa điểm:</strong> {rev.reason}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const sub = revisionHistoryModal.submission!;
                  const asn = revisionHistoryModal.asn!;
                  setRevisionHistoryModal({ isOpen: false, submission: null, asn: null });
                  openReviseScoreModal(sub, asn);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> + Tạo lần sửa điểm mới
              </button>
              <button
                type="button"
                onClick={() =>
                  setRevisionHistoryModal({ isOpen: false, submission: null, asn: null })
                }
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ===================================================================== */}
      {/* WORKSPACE CHẤM BÀI CHI TIẾT (FLOW-02, ACT-11, ACT-12)                  */}
      {/* ===================================================================== */}
      <Modal
        isOpen={!!gradingStudentRow && !!selectedEnriched}
        onClose={handleCloseGradingWorkspace}
        title={
          gradingStudentRow && selectedEnriched
            ? `Chấm bài & Nhận xét: ${gradingStudentRow.student.fullName} (${gradingStudentRow.student.code})`
            : 'Chấm bài nộp'
        }
        subtitle={
          selectedEnriched
            ? `${selectedEnriched.asn.title} • Lớp ${selectedEnriched.asn.className} • Thang điểm ${selectedEnriched.asn.totalPoints}`
            : ''
        }
        maxWidth="2xl"
      >
        {gradingStudentRow && selectedEnriched && (
          <div className="space-y-4 text-xs">
            {/* Thanh điều hướng chuyển nhanh giữa các học sinh & trạng thái nộp */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-slate-200">
                  Trạng thái nộp:{' '}
                  <strong className="text-cyan-300">
                    {gradingStudentRow.submission
                      ? `Đã nộp lúc ${formatDateTimeVN(gradingStudentRow.submission.submittedAt)}`
                      : 'Học sinh chưa nộp trực tuyến (Chế độ chấm trực tiếp / bài giấy)'}
                  </strong>
                </p>
                {gradingStudentRow.submission?.objectiveScore !== undefined && (
                  <p className="text-emerald-300 font-bold">
                    Điểm trắc nghiệm máy chấm tự động: {gradingStudentRow.submission.objectiveScore}{' '}
                    điểm
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNavigateGradingStudent('prev')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> HS trước
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateGradingStudent('next')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  HS tiếp <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Khu vực Xem File đính kèm & Nội dung bài làm ngay trong Workspace chấm bài */}
            {gradingStudentRow.submission &&
              (gradingStudentRow.submission.fileName || gradingStudentRow.submission.content) && (
                <div className="rounded-xl border border-cyan-500/30 bg-slate-950 overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-cyan-300">
                        {gradingStudentRow.submission.fileName
                          ? `File bài làm: ${gradingStudentRow.submission.fileName} (${
                              gradingStudentRow.submission.fileSize || '1.5 MB'
                            })`
                          : 'Nội dung bài làm văn bản của học sinh'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gradingStudentRow.submission.fileName && (
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPreviewFile(
                              gradingStudentRow.submission!.fileName!,
                              selectedEnriched.asn.title,
                              gradingStudentRow.submission!.content || '',
                              `${gradingStudentRow.student.fullName} (${gradingStudentRow.student.code})`
                            )
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-cyan-400" /> Tải file
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowInlineFilePreviewInGrading((v) => !v)}
                        className="px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold cursor-pointer"
                      >
                        {showInlineFilePreviewInGrading ? 'Thu gọn bài làm' : 'Mở xem file bài làm'}
                      </button>
                    </div>
                  </div>

                  {showInlineFilePreviewInGrading && (
                    <div className="p-3.5 text-slate-100 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                      {gradingStudentRow.submission.content ||
                        `[Bản xem trước tệp ${gradingStudentRow.submission.fileName}] Học sinh đã nộp đầy đủ bài giải trong tệp đính kèm.`}
                    </div>
                  )}
                </div>
              )}

            {/* Chấm từng câu theo Snapshot (nếu có) */}
            {selectedEnriched.asn.questionSnapshots &&
              selectedEnriched.asn.questionSnapshots.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-cyan-300">
                      Chi tiết câu trả lời theo Snapshot (
                      {selectedEnriched.asn.questionSnapshots.length} câu):
                    </p>
                    <button
                      type="button"
                      onClick={handleRecalculateTotalFromQuestions}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer"
                    >
                      Cộng điểm từng câu vào Tổng điểm
                    </button>
                  </div>

                  {selectedEnriched.asn.questionSnapshots.map((snapQ, idx) => {
                    const studentAns = gradingStudentRow.submission?.answers?.find(
                      (a) => a.questionId === snapQ.questionId
                    );
                    const qScore =
                      gradingQuestionScores[snapQ.questionId] !== undefined
                        ? gradingQuestionScores[snapQ.questionId]
                        : studentAns?.manualScore ?? studentAns?.autoScore ?? 0;

                    return (
                      <div
                        key={snapQ.questionId}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-100">
                            Câu {idx + 1} ({snapQ.type === 'essay' ? 'Tự luận' : 'Trắc nghiệm'} - Tối
                            đa {snapQ.points}đ):{' '}
                            <span className="font-normal">{snapQ.content}</span>
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              step="0.25"
                              min={0}
                              max={snapQ.points}
                              value={qScore}
                              onChange={(e) => {
                                setGradingQuestionScores({
                                  ...gradingQuestionScores,
                                  [snapQ.questionId]: parseFloat(e.target.value) || 0
                                });
                                setIsGradeDirty(true);
                              }}
                              className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-emerald-300 font-bold text-center"
                            />
                            <span className="text-slate-400">/{snapQ.points}đ</span>
                          </div>
                        </div>

                        <p className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800/80">
                          <strong>Trả lời của HS:</strong>{' '}
                          {studentAns?.selectedOptionLabels?.length
                            ? `Chọn phương án ${studentAns.selectedOptionLabels.join(', ')}`
                            : studentAns?.textAnswer || '(Chưa trả lời câu này)'}
                        </p>

                        {snapQ.rubric && (
                          <p className="text-[11px] text-amber-300/90 italic">
                            Rubric / Đáp án mẫu: {snapQ.rubric}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Ô nhập Tổng điểm & Nhận xét chung */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800">
              <div className="sm:col-span-4 space-y-1.5">
                <label className="block font-bold text-slate-200">
                  Tổng điểm (0 – {selectedEnriched.asn.totalPoints}){' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min={0}
                  max={selectedEnriched.asn.totalPoints}
                  value={gradingScoreInput}
                  onChange={(e) => {
                    setGradingScoreInput(e.target.value);
                    setIsGradeDirty(true);
                    setGradingFormError('');
                  }}
                  placeholder={`VD: 8.5 / ${selectedEnriched.asn.totalPoints}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-sm font-extrabold text-emerald-300 outline-none"
                />
                {/* Phím tắt chọn điểm nhanh */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[0, 5, 7, 8, 9, 10]
                    .filter((v) => v <= selectedEnriched.asn.totalPoints)
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setGradingScoreInput(String(preset));
                          setIsGradeDirty(true);
                          setGradingFormError('');
                        }}
                        className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono cursor-pointer"
                      >
                        {preset}đ
                      </button>
                    ))}
                </div>
              </div>

              <div className="sm:col-span-8">
                <label className="block font-bold text-slate-200 mb-1">
                  Nhận xét &amp; Góp ý của giáo viên
                </label>
                <textarea
                  rows={3}
                  value={gradingFeedbackInput}
                  onChange={(e) => {
                    setGradingFeedbackInput(e.target.value);
                    setIsGradeDirty(true);
                  }}
                  placeholder="Nhập nhận xét chi tiết ưu điểm, lỗi sai cần khắc phục..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {gradingFormError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{gradingFormError}</span>
              </div>
            )}

            {/* Lịch sử chỉnh sửa điểm (Grade Revisions nếu có) */}
            {gradingStudentRow.submission?.revisions &&
              gradingStudentRow.submission.revisions.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Lịch sử điều chỉnh điểm (
                    {gradingStudentRow.submission.revisions.length} lần sửa):
                  </p>
                  {gradingStudentRow.submission.revisions.map((rev) => (
                    <div key={rev.id} className="text-[11px] text-slate-300">
                      • <strong>{formatDateTimeVN(rev.changedAt)}</strong> bởi{' '}
                      <strong>{rev.changedBy}</strong>: Điểm {rev.oldScore ?? '--'} →{' '}
                      <strong className="text-emerald-300">{rev.newScore}</strong> (Lý do:{' '}
                      <em>{rev.reason}</em>)
                    </div>
                  ))}
                </div>
              )}

            {/* Footer 3 chế độ lưu: Lưu nháp chấm | Lưu điểm | Lưu & Công bố ngay */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCloseGradingWorkspace}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveSubmissionGrade('draft_grade')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                >
                  Lưu nháp chấm
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubmissionGrade('graded')}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  Lưu điểm (Chưa công bố)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubmissionGrade('published')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" /> Lưu &amp; Trả bài ngay
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cảnh báo đóng form chấm bài khi đang sửa dở (Dirty State Guard) */}
      <Modal
        isOpen={dirtyGradeWarningOpen}
        onClose={() => setDirtyGradeWarningOpen(false)}
        title="Cảnh báo thay đổi chưa lưu"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-200">
            Bạn đang nhập điểm hoặc nhận xét chưa lưu. Bạn có muốn đóng mà không lưu thay đổi không?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDirtyGradeWarningOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Tiếp tục chấm
            </button>
            <button
              type="button"
              onClick={() => {
                setDirtyGradeWarningOpen(false);
                setIsGradeDirty(false);
                setGradingStudentRow(null);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold cursor-pointer"
            >
              Bỏ thay đổi &amp; Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-01: MODAL GIA HẠN NỘP BÀI (CẢ LỚP HOẶC CÁ NHÂN/NHÓM)              */}
      {/* ===================================================================== */}
      <Modal
        isOpen={extendModal.isOpen}
        onClose={() => setExtendModal((p) => ({ ...p, isOpen: false }))}
        title={
          extendModal.scope === 'selected_students'
            ? `Gia hạn nộp bài riêng (${extendModal.targetStudentIds.length} học sinh)`
            : `Gia hạn hạn nộp cho cả lớp: ${extendModal.asn?.title || ''}`
        }
        subtitle="Tự động tính lại trạng thái nộp muộn theo hạn nộp mới và ghi nhận Audit Log"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmExtendModal} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between">
            <span>Hạn nộp hiện tại:</span>
            <strong className="text-amber-300">
              {formatDateTimeVN(extendModal.asn?.dueDate)}
            </strong>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={extendModal.scope === 'class'}
                onChange={() => setExtendModal((p) => ({ ...p, scope: 'class', errorText: '' }))}
              />
              <span className="font-bold text-slate-200">Áp dụng cho cả lớp</span>
            </label>
            {extendModal.targetStudentIds.length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={extendModal.scope === 'selected_students'}
                  onChange={() =>
                    setExtendModal((p) => ({
                      ...p,
                      scope: 'selected_students',
                      errorText: ''
                    }))
                  }
                />
                <span className="font-bold text-cyan-300">
                  Chỉ {extendModal.targetStudentIds.length} học sinh đã chọn
                </span>
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-200">
                Hạn nộp mới <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyQuickExtendOffset(24)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer"
                >
                  +1 ngày
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickExtendOffset(48)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer"
                >
                  +2 ngày
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickExtendOffset(168)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer"
                >
                  +7 ngày
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={extendModal.newDueLocal}
              onChange={(e) =>
                setExtendModal((p) => ({ ...p, newDueLocal: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-bold text-slate-200">
                Lý do gia hạn (5 – 500 ký tự) <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {extendModal.reason.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              required
              maxLength={500}
              value={extendModal.reason}
              onChange={(e) =>
                setExtendModal((p) => ({ ...p, reason: e.target.value, errorText: '' }))
              }
              placeholder="Nhập lý do gia hạn (VD: Hỗ trợ học sinh nghỉ ốm có phép hoặc điều chỉnh lịch học)..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          {extendModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{extendModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExtendModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              Xác nhận Gia hạn
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-02: MODAL NHẮC NỘP BÀI (CHỐNG GỬI TRÙNG TRONG 15 PHÚT)            */}
      {/* ===================================================================== */}
      <Modal
        isOpen={remindModal.isOpen}
        onClose={() => setRemindModal((p) => ({ ...p, isOpen: false }))}
        title={`Gửi thông báo nhắc nộp bài (${remindModal.targetStudentIds.length} học sinh)`}
        subtitle="Hệ thống tự động kiểm tra chống gửi trùng lặp trong vòng 15 phút"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRemindModal} className="space-y-4 text-xs">
          {/* Danh sách học sinh nhận lời nhắc */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <p className="font-bold text-slate-300">
              Danh sách học sinh nhận thông báo ({remindModal.targetStudentIds.length} HS):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {remindModal.targetStudentIds.length === 0 ? (
                <span className="text-slate-400 italic">
                  Không có học sinh nào trong danh sách chưa nộp.
                </span>
              ) : (
                remindModal.targetStudentIds.map((sid) => {
                  const st = allStudents.find((s) => s.id === sid);
                  return (
                    <span
                      key={sid}
                      className="px-2 py-0.5 rounded-md bg-slate-950 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold"
                    >
                      {st ? `${st.fullName} (${st.code})` : sid}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">Kênh gửi thông báo</label>
            <select
              value={remindModal.channel}
              onChange={(e) =>
                setRemindModal((p) => ({
                  ...p,
                  channel: e.target.value as 'in_app' | 'email' | 'parent_app'
                }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-semibold"
            >
              <option value="in_app">Thông báo trên ứng dụng Học sinh (In-App)</option>
              <option value="parent_app">Gửi đồng thời tới Ứng dụng Phụ huynh</option>
              <option value="email">Qua Email học sinh &amp; In-App</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-bold text-slate-200">
                Nội dung lời nhắc (Tối đa 1.000 ký tự) <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {remindModal.message.length}/1000
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={1000}
              value={remindModal.message}
              onChange={(e) =>
                setRemindModal((p) => ({ ...p, message: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={remindModal.forceDuplicate}
              onChange={(e) =>
                setRemindModal((p) => ({
                  ...p,
                  forceDuplicate: e.target.checked,
                  errorText: ''
                }))
              }
              className="rounded border-slate-600 text-cyan-500"
            />
            <span>Gửi lại ngay cả khi học sinh vừa được nhắc trong 15 phút gần đây</span>
          </label>

          {remindModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{remindModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRemindModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" /> Gửi lời nhắc ngay
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-03: MODAL SỬA ĐIỂM CÓ LÝ DO & LỊCH SỬ REVISION BẤT BIẾN           */}
      {/* ===================================================================== */}
      <Modal
        isOpen={reviseModal.isOpen}
        onClose={() => setReviseModal((p) => ({ ...p, isOpen: false }))}
        title={
          reviseModal.submission
            ? `Sửa điểm có lý do: ${reviseModal.submission.studentName}`
            : 'Sửa điểm'
        }
        subtitle="Mọi thay đổi điểm sau khi đã chấm đều yêu cầu lý do bắt buộc và lưu vào lịch sử sửa điểm"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmReviseModal} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300">Điểm hiện tại:</span>
            <strong className="text-sm font-mono text-amber-300">
              {reviseModal.submission?.score ?? '--'} / {reviseModal.asn?.totalPoints ?? 10}
            </strong>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Điểm mới (0 – {reviseModal.asn?.totalPoints ?? 10}){' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min={0}
              max={reviseModal.asn?.totalPoints ?? 10}
              required
              value={reviseModal.newScore}
              onChange={(e) =>
                setReviseModal((p) => ({ ...p, newScore: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Lý do điều chỉnh điểm (Bắt buộc tối thiểu 5 ký tự){' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={reviseModal.reason}
              onChange={(e) =>
                setReviseModal((p) => ({ ...p, reason: e.target.value, errorText: '' }))
              }
              placeholder="VD: Phúc khảo bổ sung ý tự luận câu 2 (+0.5 điểm)..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Cập nhật nhận xét cho học sinh
            </label>
            <textarea
              rows={2}
              value={reviseModal.feedback}
              onChange={(e) =>
                setReviseModal((p) => ({ ...p, feedback: e.target.value }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          {/* Hiển thị lịch sử sửa điểm trước đó ngay trong Modal sửa điểm */}
          {reviseModal.submission?.revisions &&
            reviseModal.submission.revisions.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Các lần sửa điểm trước đây (
                  {reviseModal.submission.revisions.length}):
                </p>
                {reviseModal.submission.revisions.map((rev) => (
                  <div key={rev.id} className="text-[11px] text-slate-300">
                    • <strong>{formatDateTimeVN(rev.changedAt)}</strong> ({rev.changedBy}):{' '}
                    {rev.oldScore ?? '--'}đ →{' '}
                    <strong className="text-emerald-300">{rev.newScore}đ</strong> —{' '}
                    <em>{rev.reason}</em>
                  </div>
                ))}
              </div>
            )}

          {reviseModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{reviseModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReviseModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
            >
              Lưu điểm mới &amp; Ghi lịch sử
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-04: MODAL TRẢ BÀI / CÔNG BỐ ĐIỂM CHO HỌC SINH & PHỤ HUYNH         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={publishGradesModal.isOpen}
        onClose={() => setPublishGradesModal((p) => ({ ...p, isOpen: false }))}
        title="Trả bài & Công bố điểm cho Học sinh"
        subtitle="Khi công bố, học sinh và phụ huynh sẽ xem được điểm số cùng lời phê của giáo viên"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPublishGrades} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed">
            Bạn sắp công bố điểm và nhận xét cho các bài nộp đã chấm thuộc lượt giao{' '}
            <strong className="text-cyan-300">"{publishGradesModal.asn?.title}"</strong>.
          </div>

          <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={publishGradesModal.notifyStudents}
              onChange={(e) =>
                setPublishGradesModal((p) => ({ ...p, notifyStudents: e.target.checked }))
              }
              className="rounded border-slate-600 text-cyan-500"
            />
            <span>Gửi thông báo đã trả bài tới Học sinh &amp; Phụ huynh</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPublishGradesModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Xác nhận Công bố điểm
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-05: MODAL ĐÓNG / MỞ LẠI NHẬN BÀI                                  */}
      {/* ===================================================================== */}
      <Modal
        isOpen={closeOpenModal.isOpen}
        onClose={() => setCloseOpenModal((p) => ({ ...p, isOpen: false }))}
        title={
          closeOpenModal.targetStatus === 'open'
            ? 'Mở lại nhận bài tập'
            : 'Đóng nhận bài tập'
        }
        subtitle="Kiểm soát cổng nộp bài của học sinh và ghi nhận lịch sử thay đổi trạng thái"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCloseOrReopen} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed">
            {closeOpenModal.targetStatus === 'open'
              ? `Cho phép học sinh lớp ${closeOpenModal.asn?.className} tiếp tục nộp bài "${closeOpenModal.asn?.title}".`
              : `Sau khi đóng nhận bài, học sinh sẽ không thể gửi bài nộp mới cho "${closeOpenModal.asn?.title}" trừ khi được mở lại hoặc gia hạn riêng.`}
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Lý do thực hiện <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={closeOpenModal.reason}
              onChange={(e) =>
                setCloseOpenModal((p) => ({ ...p, reason: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          {closeOpenModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{closeOpenModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCloseOpenModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              Xác nhận {closeOpenModal.targetStatus === 'open' ? 'Mở nhận bài' : 'Đóng nhận bài'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-10: MODAL SAO CHÉP / NHÂN BẢN BÀI TẬP                             */}
      {/* ===================================================================== */}
      <Modal
        isOpen={copyModal.isOpen}
        onClose={() => setCopyModal((p) => ({ ...p, isOpen: false }))}
        title={`Sao chép / Nhân bản bài tập: ${copyModal.asn?.title || ''}`}
        subtitle="Tạo bản nháp bài tập mới từ cấu trúc đề và câu hỏi Snapshot của bài tập gốc"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCopyModal} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Tên bài tập bản sao <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={copyModal.newTitle}
              onChange={(e) =>
                setCopyModal((p) => ({ ...p, newTitle: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">Lớp dự kiến giao</label>
              <select
                value={copyModal.targetClassId}
                onChange={(e) =>
                  setCopyModal((p) => ({ ...p, targetClassId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold"
              >
                {assignedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} ({c.studentCount} HS)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1">Hạn nộp dự kiến</label>
              <input
                type="datetime-local"
                value={copyModal.newDueLocal}
                onChange={(e) =>
                  setCopyModal((p) => ({ ...p, newDueLocal: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={copyModal.keepSnapshots}
                onChange={(e) =>
                  setCopyModal((p) => ({ ...p, keepSnapshots: e.target.checked }))
                }
                className="rounded border-slate-600 text-cyan-500"
              />
              <span>
                Giữ nguyên danh sách câu hỏi Snapshot &amp; cấu hình thang điểm (
                {copyModal.asn?.totalPoints || 10} điểm)
              </span>
            </label>

            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={copyModal.selectAfterCopy}
                onChange={(e) =>
                  setCopyModal((p) => ({ ...p, selectAfterCopy: e.target.checked }))
                }
                className="rounded border-slate-600 text-cyan-500"
              />
              <span>Chuyển ngay tới bản sao vừa tạo sau khi lưu</span>
            </label>
          </div>

          {copyModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{copyModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCopyModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Xác nhận Sao chép
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-06: MODAL THU HỒI LƯỢT GIAO (SOFT-DELETE / WITHDRAW)              */}
      {/* ===================================================================== */}
      <Modal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal((p) => ({ ...p, isOpen: false }))}
        title={`Thu hồi lượt giao: ${withdrawModal.asn?.title || ''}`}
        subtitle="Soft-delete: Ẩn bài tập khỏi danh sách làm bài của học sinh nhưng bảo toàn dữ liệu lịch sử"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmWithdraw} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-600/50 text-rose-200">
            Lưu ý: Hệ thống không xóa cứng dữ liệu đã phát sinh. Các bài nộp và điểm số đã chấm vẫn
            được lưu trữ trong lịch sử để đối soát.
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Lý do thu hồi <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={withdrawModal.reason}
              onChange={(e) =>
                setWithdrawModal((p) => ({ ...p, reason: e.target.value, errorText: '' }))
              }
              placeholder="VD: Giao nhầm lớp hoặc thay thế bằng đề kiểm tra mới..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Nhập cụm từ <strong className="text-rose-400 font-mono">THU HOI</strong> để xác nhận{' '}
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={withdrawModal.confirmText}
              onChange={(e) =>
                setWithdrawModal((p) => ({ ...p, confirmText: e.target.value, errorText: '' }))
              }
              placeholder="THU HOI"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-300 font-mono font-bold"
            />
          </div>

          {withdrawModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{withdrawModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWithdrawModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
            >
              Xác nhận Thu hồi
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-07: MODAL GIAO LẠI BÀI TẬP CHO LỚP KHÁC (REASSIGN)                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={reassignModal.isOpen}
        onClose={() => setReassignModal((p) => ({ ...p, isOpen: false }))}
        title="Giao lại bài tập (Tạo lượt giao mới)"
        subtitle="Giữ nguyên cấu trúc câu hỏi Snapshot và thiết lập lớp nhận, hạn nộp mới"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmReassign} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-200 mb-1">Tên lượt giao mới</label>
            <input
              type="text"
              required
              value={reassignModal.title}
              onChange={(e) =>
                setReassignModal((p) => ({ ...p, title: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1.5">
              Chọn lớp nhận bài <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {assignedClasses.map((cls) => {
                const checked = reassignModal.classIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                      checked
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setReassignModal((p) => ({
                          ...p,
                          errorText: '',
                          classIds: checked
                            ? p.classIds.filter((id) => id !== cls.id)
                            : [...p.classIds, cls.id]
                        }))
                      }
                    />
                    <span>
                      Lớp {cls.name} ({cls.studentCount} HS)
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Hạn nộp mới <span className="text-rose-400">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={reassignModal.newDueLocal}
              onChange={(e) =>
                setReassignModal((p) => ({ ...p, newDueLocal: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          {reassignModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{reassignModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReassignModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
            >
              Xác nhận Giao lại
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-08: MODAL YÊU CẦU HỌC SINH LÀM LẠI BÀI (REDO REQUEST)             */}
      {/* ===================================================================== */}
      <Modal
        isOpen={redoModal.isOpen}
        onClose={() => setRedoModal((p) => ({ ...p, isOpen: false }))}
        title={
          redoModal.student
            ? `Yêu cầu làm lại bài: ${redoModal.student.fullName}`
            : 'Yêu cầu làm lại bài'
        }
        subtitle="Cấp thêm lượt nộp và hạn nộp riêng kèm hướng dẫn sửa bài"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRedo} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-200 mb-1">Số lượt làm thêm</label>
              <input
                type="number"
                min={1}
                max={5}
                value={redoModal.extraAttempts}
                onChange={(e) =>
                  setRedoModal((p) => ({ ...p, extraAttempts: Number(e.target.value) || 1 }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1">
                Hạn nộp bổ sung <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={redoModal.newDueLocal}
                onChange={(e) =>
                  setRedoModal((p) => ({ ...p, newDueLocal: e.target.value, errorText: '' }))
                }
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Nhận xét / Nội dung yêu cầu làm lại <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={redoModal.feedback}
              onChange={(e) =>
                setRedoModal((p) => ({ ...p, feedback: e.target.value, errorText: '' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
            />
          </div>

          {redoModal.errorText && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{redoModal.errorText}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRedoModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
            >
              Gửi yêu cầu làm lại
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MOD-09: MODAL XUẤT BÁO CÁO EXCEL / CSV (CÓ SANITIZE FORMULA)          */}
      {/* ===================================================================== */}
      <Modal
        isOpen={exportModal.isOpen}
        onClose={() => setExportModal((p) => ({ ...p, isOpen: false }))}
        title="Xuất báo cáo Bài tập & Kết quả chấm"
        subtitle="Dữ liệu xuất tuân thủ phân quyền RBAC và tự động khử mã thực thi công thức (Formula Sanitization)"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmExport} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-200 mb-1.5">Phạm vi dữ liệu xuất</label>
            <div className="space-y-2">
              <label className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={exportModal.scope === 'current_assignment'}
                  onChange={() =>
                    setExportModal((p) => ({ ...p, scope: 'current_assignment' }))
                  }
                />
                <span>
                  Bảng điểm chi tiết của bài tập đang chọn:{' '}
                  <strong className="text-cyan-300">
                    {selectedEnriched?.asn.title || '(Chưa chọn)'}
                  </strong>
                </span>
              </label>

              <label className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={exportModal.scope === 'unsubmitted_only'}
                  onChange={() =>
                    setExportModal((p) => ({ ...p, scope: 'unsubmitted_only' }))
                  }
                />
                <span>
                  Danh sách riêng Học sinh chưa nộp của bài đang chọn (
                  <strong className="text-rose-300">
                    {studentTabCounts.unsubmitted} học sinh
                  </strong>
                  )
                </span>
              </label>

              <label className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={exportModal.scope === 'filtered_list'}
                  onChange={() =>
                    setExportModal((p) => ({ ...p, scope: 'filtered_list' }))
                  }
                />
                <span>
                  Danh sách tổng hợp tất cả lượt giao theo bộ lọc hiện tại (
                  <strong className="text-emerald-300">
                    {filteredEnrichedAssignments.length} lượt giao
                  </strong>
                  )
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-1">Định dạng tệp</label>
            <select
              value={exportModal.format}
              onChange={(e) =>
                setExportModal((p) => ({ ...p, format: e.target.value as 'xlsx' | 'csv' }))
              }
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-bold"
            >
              <option value="xlsx">Microsoft Excel (.xlsx)</option>
              <option value="csv">CSV UTF-8 (.csv)</option>
            </select>
          </div>

          {exportModal.scope === 'current_assignment' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportModal.includeQuestionsDetail}
                  onChange={(e) =>
                    setExportModal((p) => ({
                      ...p,
                      includeQuestionsDetail: e.target.checked
                    }))
                  }
                />
                <span>Bao gồm cột tách điểm Trắc nghiệm &amp; Tự luận</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportModal.includeFeedback}
                  onChange={(e) =>
                    setExportModal((p) => ({ ...p, includeFeedback: e.target.checked }))
                  }
                />
                <span>Bao gồm cột Nhận xét của giáo viên</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExportModal((p) => ({ ...p, isOpen: false }))}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Tải báo cáo về máy
            </button>
          </div>
        </form>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL THỐNG KÊ, PHỔ ĐIỂM & CẢNH BÁO THEO LƯỢT GIAO (/reports)         */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isAnalyticsReportOpen && !!selectedEnriched}
        onClose={() => setIsAnalyticsReportOpen(false)}
        title={
          selectedEnriched
            ? `Báo cáo Thống kê, Phổ điểm & Cảnh báo: ${selectedEnriched.asn.title}`
            : 'Báo cáo theo lượt giao'
        }
        subtitle={
          selectedEnriched
            ? `Lớp ${selectedEnriched.asn.className} • Môn ${selectedEnriched.asn.subject} • Đã nộp: ${selectedEnriched.submittedCount}/${selectedEnriched.totalRecipients} (${selectedEnriched.submissionRate}%)`
            : ''
        }
        maxWidth="2xl"
      >
        {selectedEnriched &&
          (() => {
            const maxPts = selectedEnriched.asn.totalPoints || 10;
            const scoredRows = studentRowsForSelected.filter(
              (r) => r.submission && typeof r.submission.score === 'number'
            );
            const countExcellent = scoredRows.filter(
              (r) => (r.submission!.score! / maxPts) * 10 >= 8
            ).length;
            const countGood = scoredRows.filter((r) => {
              const norm = (r.submission!.score! / maxPts) * 10;
              return norm >= 6.5 && norm < 8;
            }).length;
            const countAverage = scoredRows.filter((r) => {
              const norm = (r.submission!.score! / maxPts) * 10;
              return norm >= 5 && norm < 6.5;
            }).length;
            const countWeak = scoredRows.filter(
              (r) => (r.submission!.score! / maxPts) * 10 < 5
            ).length;

            const lowScoreRows = scoredRows.filter(
              (r) => (r.submission!.score! / maxPts) * 10 < 5
            );
            const unsubmittedRows = studentRowsForSelected.filter((r) => !r.isSubmitted);

            return (
              <div className="space-y-5 text-xs">
                {/* Phổ điểm 4 mức */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <p className="font-extrabold text-cyan-300 uppercase tracking-wider">
                    1. Phân tích Phổ điểm ({scoredRows.length} bài đã chấm điểm)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-center">
                      <p className="text-[11px] text-emerald-300 font-bold">Giỏi (≥ 80%)</p>
                      <p className="text-xl font-extrabold text-white font-mono mt-1">
                        {countExcellent} HS
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-center">
                      <p className="text-[11px] text-cyan-300 font-bold">Khá (65% – 79%)</p>
                      <p className="text-xl font-extrabold text-white font-mono mt-1">
                        {countGood} HS
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-center">
                      <p className="text-[11px] text-amber-300 font-bold">Trung bình (50% – 64%)</p>
                      <p className="text-xl font-extrabold text-white font-mono mt-1">
                        {countAverage} HS
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 text-center">
                      <p className="text-[11px] text-rose-300 font-bold">Cần hỗ trợ (&lt; 50%)</p>
                      <p className="text-xl font-extrabold text-white font-mono mt-1">
                        {countWeak} HS
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cảnh báo thông minh theo Lượt giao */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> 2. Cảnh báo học sinh cần đôn đốc &amp;
                      hỗ trợ
                    </p>
                    {unsubmittedRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAnalyticsReportOpen(false);
                          openRemindModalFor(
                            selectedEnriched.asn,
                            unsubmittedRows.map((r) => r.student.id)
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <BellRing className="w-3.5 h-3.5" /> Nhắc tất cả {unsubmittedRows.length} HS
                        chưa nộp
                      </button>
                    )}
                  </div>

                  {unsubmittedRows.length === 0 && lowScoreRows.length === 0 ? (
                    <p className="text-emerald-300 font-semibold">
                      Tuyệt vời! Tất cả học sinh đều đã nộp bài và đạt điểm từ trung bình trở lên.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {unsubmittedRows.map((r) => (
                        <div
                          key={`unsub-${r.student.id}`}
                          className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/30 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-white">{r.student.fullName}</span>{' '}
                            <span className="text-slate-400 font-mono">({r.student.code})</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold">
                              Chưa nộp bài
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAnalyticsReportOpen(false);
                                openRemindModalFor(selectedEnriched.asn, [r.student.id]);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
                            >
                              Nhắc nộp
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAnalyticsReportOpen(false);
                                openExtendModalFor(
                                  selectedEnriched.asn,
                                  'selected_students',
                                  [r.student.id]
                                );
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer"
                            >
                              Gia hạn riêng
                            </button>
                          </div>
                        </div>
                      ))}

                      {lowScoreRows.map((r) => (
                        <div
                          key={`low-${r.student.id}`}
                          className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-white">{r.student.fullName}</span>{' '}
                            <span className="text-slate-400 font-mono">({r.student.code})</span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">
                              Điểm thấp: {r.submission?.score}/{maxPts}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAnalyticsReportOpen(false);
                              openRedoModalFor(selectedEnriched.asn, r.student);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer"
                          >
                            Yêu cầu làm lại
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAnalyticsReportOpen(false);
                      setExportModal({
                        isOpen: true,
                        scope: 'current_assignment',
                        format: 'xlsx',
                        includeQuestionsDetail: true,
                        includeFeedback: true
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Xuất báo cáo Excel lượt giao này
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnalyticsReportOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
};
