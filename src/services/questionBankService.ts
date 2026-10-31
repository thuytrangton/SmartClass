import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from '@google/genai';
import { db as firestoreDb, auth } from './firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'essay';

export type QuestionDifficulty =
  | 'Nhận biết'
  | 'Thông hiểu'
  | 'Vận dụng'
  | 'Vận dụng cao';

export type QuestionStatus =
  | 'approved'
  | 'pending'
  | 'draft'
  | 'rejected'
  | 'archived';

export type DuplicateStatus = 'unique' | 'similar' | 'exact';

export type QuestionSource = 'manual' | 'ai' | 'excel' | 'word';

export interface TrueFalseStatement {
  id: string;
  label: string; // 'a', 'b', 'c', 'd'
  content: string;
  isTrue: boolean;
}

export interface QuestionOption {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'...
  text: string;
  isCorrect: boolean;
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface QuestionItem {
  id: string;
  code: string;
  subject: string;
  gradeLevel: number;
  className?: string;
  chapter: string;
  topic: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  status: QuestionStatus;
  content: string;
  // For single_choice & multiple_choice
  options: QuestionOption[];
  // For true_false (supports multi-statement a,b,c,d or single statement)
  statements: TrueFalseStatement[];
  // For fill_blank / short_answer
  acceptedAnswers: string[];
  // For essay
  rubric: string;
  maxPoints: number;
  // Common fields
  explanation: string;
  tags: string[];
  source: QuestionSource;
  sourceNote?: string;
  createdAt: string;
  updatedAt: string;
  // Duplicate & quality tracking
  duplicateStatus: DuplicateStatus;
  duplicateScore?: number; // 0 - 100
  duplicateOfId?: string;
  duplicateOfCode?: string;
  duplicateReason?: string;
  validationIssues: ValidationIssue[];
}

export interface AiGenerateConfig {
  subject: string;
  gradeLevel: number;
  chapter: string;
  topic: string;
  questionType: QuestionType | 'mixed';
  difficulty: QuestionDifficulty | 'mixed';
  count: number;
  sourceMaterial?: string;
  extraInstructions?: string;
}

export interface ImportRowPreview {
  rowIndex: number;
  question: QuestionItem;
  isValid: boolean;
  hasWarnings: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExportConfig {
  scope: 'selected' | 'filtered' | 'approved' | 'all';
  format: 'excel' | 'word';
  includeAnswers: boolean;
  includeExplanation: boolean;
  includeMetadata: boolean;
  shuffleQuestions: boolean;
  examTitle: string;
  schoolName: string;
}

const STORAGE_KEY = 'smart_edu_question_bank_v1';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Trắc nghiệm 1 đáp án',
  multiple_choice: 'Trắc nghiệm nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền khuyết / Trả lời ngắn',
  essay: 'Tự luận'
};

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  draft: 'Bản nháp',
  rejected: 'Không đạt',
  archived: 'Đã lưu trữ'
};

export const DUPLICATE_STATUS_LABELS: Record<DuplicateStatus, string> = {
  unique: 'Không trùng',
  similar: 'Có khả năng trùng',
  exact: 'Trùng chính xác'
};

export const SUBJECT_LIST = [
  'Toán học',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'Tin học',
  'GDKT & Pháp luật'
];

export const GRADE_LIST = [10, 11, 12];

export const DIFFICULTY_LIST: QuestionDifficulty[] = [
  'Nhận biết',
  'Thông hiểu',
  'Vận dụng',
  'Vận dụng cao'
];

/**
 * Chuẩn hóa chuỗi tiếng Việt để so sánh trùng lặp chính xác & ngữ nghĩa
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/^(câu\s*\d+\s*[:.)-]?\s*)/i, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tính độ tương đồng giữa 2 câu hỏi (kết hợp Token Jaccard + Character Bigrams)
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const normA = normalizeQuestionText(textA);
  const normB = normalizeQuestionText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 100;

  // Token-level Jaccard similarity
  const tokensA = new Set(normA.split(' ').filter((w) => w.length > 1));
  const tokensB = new Set(normB.split(' ').filter((w) => w.length > 1));

  let intersection = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) intersection++;
  });
  const union = tokensA.size + tokensB.size - intersection;
  const jaccard = union === 0 ? 0 : intersection / union;

  // Character 2-gram Dice coefficient
  const getBigrams = (str: string) => {
    const s = str.replace(/\s+/g, '');
    const bigrams: string[] = [];
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.push(s.slice(i, i + 2));
    }
    return bigrams;
  };

  const bgA = getBigrams(normA);
  const bgB = getBigrams(normB);
  if (bgA.length === 0 || bgB.length === 0) {
    return Math.round(jaccard * 100);
  }

  const mapB = new Map<string, number>();
  bgB.forEach((b) => mapB.set(b, (mapB.get(b) || 0) + 1));

  let bgMatches = 0;
  bgA.forEach((b) => {
    const count = mapB.get(b) || 0;
    if (count > 0) {
      bgMatches++;
      mapB.set(b, count - 1);
    }
  });

  const dice = (2 * bgMatches) / (bgA.length + bgB.length);
  const combined = jaccard * 0.55 + dice * 0.45;
  return Math.min(99, Math.round(combined * 100));
}

/**
 * Kiểm tra cấu trúc, nội dung, đáp án và dữ liệu thiếu của 1 câu hỏi
 */
export function validateQuestionItem(q: Partial<QuestionItem>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const content = (q.content || '').trim();
  if (!content) {
    issues.push({
      field: 'content',
      severity: 'error',
      message: 'Nội dung câu hỏi không được để trống.'
    });
  } else if (content.length < 10) {
    issues.push({
      field: 'content',
      severity: 'warning',
      message: 'Nội dung câu hỏi quá ngắn (dưới 10 ký tự), cần kiểm tra lại.'
    });
  }

  if (!q.subject?.trim()) {
    issues.push({
      field: 'subject',
      severity: 'error',
      message: 'Thiếu thông tin môn học.'
    });
  }

  if (!q.chapter?.trim()) {
    issues.push({
      field: 'chapter',
      severity: 'warning',
      message: 'Chưa phân loại chương/bài học.'
    });
  }

  if (!q.topic?.trim()) {
    issues.push({
      field: 'topic',
      severity: 'warning',
      message: 'Chưa gắn chủ đề kiến thức.'
    });
  }

  const type = q.type || 'single_choice';

  if (type === 'single_choice' || type === 'multiple_choice') {
    const opts = q.options || [];
    if (opts.length < 2) {
      issues.push({
        field: 'options',
        severity: 'error',
        message: 'Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn.'
      });
    } else {
      const emptyOpts = opts.filter((o) => !o.text.trim());
      if (emptyOpts.length > 0) {
        issues.push({
          field: 'options',
          severity: 'error',
          message: `Có ${emptyOpts.length} phương án lựa chọn đang để trống nội dung.`
        });
      }

      const normOpts = opts.map((o) => o.text.trim().toLowerCase()).filter(Boolean);
      const uniqueOpts = new Set(normOpts);
      if (uniqueOpts.size < normOpts.length) {
        issues.push({
          field: 'options',
          severity: 'error',
          message: 'Có các phương án trả lời trùng lặp nội dung với nhau.'
        });
      }

      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        issues.push({
          field: 'options',
          severity: 'error',
          message: 'Chưa chọn đáp án đúng cho câu hỏi.'
        });
      } else if (type === 'single_choice' && correctCount > 1) {
        issues.push({
          field: 'options',
          severity: 'error',
          message: 'Dạng trắc nghiệm 1 đáp án chỉ được phép có duy nhất 1 phương án đúng.'
        });
      } else if (type === 'multiple_choice' && correctCount < 2) {
        issues.push({
          field: 'options',
          severity: 'warning',
          message: 'Dạng trắc nghiệm nhiều đáp án nên có từ 2 phương án đúng trở lên.'
        });
      }
    }
  } else if (type === 'true_false') {
    const stmts = q.statements || [];
    if (stmts.length === 0) {
      issues.push({
        field: 'statements',
        severity: 'error',
        message: 'Câu hỏi Đúng/Sai phải có ít nhất 1 mệnh đề để xét tính Đúng/Sai.'
      });
    } else if (stmts.some((s) => !s.content.trim())) {
      issues.push({
        field: 'statements',
        severity: 'error',
        message: 'Có mệnh đề Đúng/Sai đang để trống nội dung.'
      });
    }
  } else if (type === 'fill_blank') {
    const answers = (q.acceptedAnswers || []).map((a) => a.trim()).filter(Boolean);
    if (answers.length === 0) {
      issues.push({
        field: 'acceptedAnswers',
        severity: 'error',
        message: 'Câu hỏi điền khuyết/trả lời ngắn phải có ít nhất 1 đáp án đúng được chấp nhận.'
      });
    }
  } else if (type === 'essay') {
    if (!q.rubric?.trim()) {
      issues.push({
        field: 'rubric',
        severity: 'error',
        message: 'Câu hỏi tự luận cần có đáp án mẫu / hướng dẫn chấm điểm.'
      });
    }
  }

  if (!q.explanation?.trim() && type !== 'essay') {
    issues.push({
      field: 'explanation',
      severity: 'warning',
      message: 'Chưa có lời giải chi tiết hoặc giải thích đáp án.'
    });
  }

  return issues;
}

/**
 * Kiểm tra trùng lặp của 1 câu hỏi so với danh sách câu hỏi hiện có
 */
export function evaluateDuplicateForQuestion(
  target: Partial<QuestionItem>,
  existingBank: QuestionItem[]
): {
  duplicateStatus: DuplicateStatus;
  duplicateScore: number;
  duplicateOfId?: string;
  duplicateOfCode?: string;
  duplicateReason?: string;
} {
  const content = (target.content || '').trim();
  if (!content) {
    return { duplicateStatus: 'unique', duplicateScore: 0 };
  }

  const normTarget = normalizeQuestionText(content);
  let bestScore = 0;
  let bestMatch: QuestionItem | undefined;

  for (const item of existingBank) {
    if (target.id && item.id === target.id) continue;

    const normExisting = normalizeQuestionText(item.content);
    if (normTarget === normExisting && normTarget.length > 0) {
      return {
        duplicateStatus: 'exact',
        duplicateScore: 100,
        duplicateOfId: item.id,
        duplicateOfCode: item.code,
        duplicateReason: `Trùng khớp 100% nội dung với câu hỏi ${item.code}`
      };
    }

    const score = calculateTextSimilarity(content, item.content);
    // Boost similarity if options also overlap heavily
    let adjustedScore = score;
    if (
      target.options &&
      target.options.length > 0 &&
      item.options &&
      item.options.length > 0
    ) {
      const targetOpts = new Set(
        target.options.map((o) => normalizeQuestionText(o.text)).filter(Boolean)
      );
      const itemOpts = item.options
        .map((o) => normalizeQuestionText(o.text))
        .filter(Boolean);
      const matchedOpts = itemOpts.filter((o) => targetOpts.has(o)).length;
      if (matchedOpts >= 3 && score >= 45) {
        adjustedScore = Math.min(96, Math.max(score, 78));
      }
    }

    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore >= 64) {
    return {
      duplicateStatus: 'similar',
      duplicateScore: bestScore,
      duplicateOfId: bestMatch.id,
      duplicateOfCode: bestMatch.code,
      duplicateReason: `Tương đồng ${bestScore}% nội dung/cấu trúc với câu ${bestMatch.code}`
    };
  }

  return {
    duplicateStatus: 'unique',
    duplicateScore: bestScore
  };
}

/**
 * Khởi tạo dữ liệu mẫu đa dạng (đủ 5 dạng câu hỏi, đủ trạng thái duyệt & có ví dụ câu trùng để kiểm thử)
 */
function getInitialQuestions(): QuestionItem[] {
  const rawQuestions: Omit<
    QuestionItem,
    'duplicateStatus' | 'duplicateScore' | 'duplicateOfId' | 'duplicateOfCode' | 'duplicateReason' | 'validationIssues'
  >[] = [
    {
      id: 'qb-001',
      code: 'TOAN10-001',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 2: Hàm số bậc hai và đồ thị',
      topic: 'Hàm số bậc hai',
      type: 'single_choice',
      difficulty: 'Nhận biết',
      status: 'approved',
      content: 'Cho hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của đồ thị parabol là công thức nào sau đây?',
      options: [
        { id: 'opt-1', label: 'A', text: 'I(-b/(2a); -Δ/(4a))', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'I(b/(2a); Δ/(4a))', isCorrect: false },
        { id: 'opt-3', label: 'C', text: 'I(-b/a; -Δ/(2a))', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'I(-b/(4a); -Δ/(2a))', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: 'Theo định lý về đồ thị hàm số bậc hai y = ax² + bx + c (a ≠ 0), đỉnh parabol có hoành độ x = -b/(2a) và tung độ y = -Δ/(4a).',
      tags: ['Parabol', 'Đỉnh hàm số', 'Cơ bản'],
      source: 'manual',
      createdAt: '2025-02-10T08:00:00Z',
      updatedAt: '2025-02-10T08:00:00Z'
    },
    {
      id: 'qb-002',
      code: 'TOAN10-002',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 2: Hàm số bậc hai và đồ thị',
      topic: 'Dấu của tam thức bậc hai',
      type: 'single_choice',
      difficulty: 'Thông hiểu',
      status: 'approved',
      content: 'Tìm tập nghiệm S của bất phương trình bậc hai x² - 5x + 6 ≤ 0.',
      options: [
        { id: 'opt-1', label: 'A', text: 'S = [2; 3]', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'S = (2; 3)', isCorrect: false },
        { id: 'opt-3', label: 'C', text: 'S = (-∞; 2] ∪ [3; +∞)', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'S = [-3; -2]', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: 'Tam thức x² - 5x + 6 có 2 nghiệm x = 2 và x = 3, hệ số a = 1 > 0 nên x² - 5x + 6 ≤ 0 khi và chỉ khi x ∈ [2; 3].',
      tags: ['Bất phương trình', 'Tam thức bậc hai'],
      source: 'manual',
      createdAt: '2025-02-11T09:15:00Z',
      updatedAt: '2025-02-11T09:15:00Z'
    },
    {
      id: 'qb-003',
      code: 'TOAN10-003',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 4: Hệ thức lượng trong tam giác',
      topic: 'Định lý Cosin và Định lý Sin',
      type: 'true_false',
      difficulty: 'Vận dụng',
      status: 'approved',
      content: 'Cho tam giác ABC có độ dài các cạnh AB = c = 5, AC = b = 8 và góc A = 60°. Xét tính đúng sai của các mệnh đề sau:',
      options: [],
      statements: [
        { id: 'st-1', label: 'a', content: 'Độ dài cạnh BC tính theo định lý cosin là a = 7.', isTrue: true },
        { id: 'st-2', label: 'b', content: 'Diện tích tam giác ABC bằng 10√3.', isTrue: true },
        { id: 'st-3', label: 'c', content: 'Bán kính đường tròn ngoại tiếp tam giác ABC là R = 7/√3.', isTrue: false },
        { id: 'st-4', label: 'd', content: 'Độ dài đường cao kẻ từ đỉnh A xuống cạnh BC bằng (20√3)/7.', isTrue: true }
      ],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 1.0,
      explanation: 'a) a² = b² + c² - 2bc.cos60° = 64 + 25 - 40 = 49 => a = 7 (Đúng). b) S = 1/2.b.c.sin60° = 10√3 (Đúng). c) R = a/(2sin60°) = 7/√3 nên mệnh đề c ghi đúng công thức nhưng cần kiểm tra hệ số (Sai). d) ha = 2S/a = 20√3/7 (Đúng).',
      tags: ['Đúng/Sai THPT 2025', 'Hệ thức lượng'],
      source: 'manual',
      createdAt: '2025-02-12T10:30:00Z',
      updatedAt: '2025-02-12T10:30:00Z'
    },
    {
      id: 'qb-004',
      code: 'TOAN10-004',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 5: Vectơ',
      topic: 'Tích vô hướng của hai vectơ',
      type: 'fill_blank',
      difficulty: 'Vận dụng',
      status: 'approved',
      content: 'Trong mặt phẳng tọa độ Oxy, cho hai vectơ u = (3; -4) và v = (2; 5). Giá trị tích vô hướng u.v bằng bao nhiêu?',
      options: [],
      statements: [],
      acceptedAnswers: ['-14', '-14.0'],
      rubric: '',
      maxPoints: 0.5,
      explanation: 'Áp dụng công thức tích vô hướng: u.v = 3.2 + (-4).5 = 6 - 20 = -14.',
      tags: ['Trả lời ngắn', 'Vectơ', 'Oxy'],
      source: 'manual',
      createdAt: '2025-02-13T14:20:00Z',
      updatedAt: '2025-02-13T14:20:00Z'
    },
    {
      id: 'qb-005',
      code: 'TOAN10-005',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 2: Hàm số bậc hai và đồ thị',
      topic: 'Bài toán thực tế hàm bậc hai',
      type: 'essay',
      difficulty: 'Vận dụng cao',
      status: 'approved',
      content: 'Một cổng chào có hình dạng parabol chiều cao 9m và khoảng cách giữa hai chân cổng là 6m. Hãy lập phương trình chính tắc của parabol mô tả cổng chào và tính chiều cao của cổng tại vị trí cách chân cổng 1m.',
      options: [],
      statements: [],
      acceptedAnswers: [],
      rubric: '+ Chọn hệ trục tọa độ Oxy với đỉnh parabol I(0; 9) hoặc gốc O tại trung điểm hai chân cổng (0.5đ).\n+ Thay tọa độ chân cổng (3; 0) vào y = ax² + 9 => 9a + 9 = 0 => a = -1. Phương trình: y = -x² + 9 (1.0đ).\n+ Vị trí cách chân cổng 1m ứng với x = 2 => Chiều cao y = -(2)² + 9 = 5m (0.5đ).',
      maxPoints: 2.0,
      explanation: 'Chọn trục đối xứng làm trục tung Oy, mặt đất làm trục hoành Ox thì đỉnh I(0;9) và chân cổng tại (±3;0).',
      tags: ['Toán thực tế', 'Tự luận', 'Parabol'],
      source: 'manual',
      createdAt: '2025-02-14T11:00:00Z',
      updatedAt: '2025-02-14T11:00:00Z'
    },
    {
      id: 'qb-006',
      code: 'VAN10-001',
      subject: 'Ngữ văn',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Bài 1: Sức hấp dẫn của truyện kể',
      topic: 'Thần thoại và Sử thi',
      type: 'multiple_choice',
      difficulty: 'Thông hiểu',
      status: 'approved',
      content: 'Những đặc trưng nghệ thuật nào sau đây thuộc về thể loại Sử thi anh hùng trong văn học dân gian?',
      options: [
        { id: 'opt-1', label: 'A', text: 'Nhân vật trung tâm là người anh hùng đại diện cho sức mạnh và lý tưởng cộng đồng', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'Lời kể trang trọng, giàu nhịp điệu, sử dụng nhiều biện pháp phóng đại và so sánh trùng điệp', isCorrect: true },
        { id: 'opt-3', label: 'C', text: 'Chỉ phản ánh đời sống sinh hoạt đời thường vụn vặt của cá nhân đương đại', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'Không gian nghệ thuật kỳ vĩ, gắn liền với những biến cố lớn của bộ tộc', isCorrect: true }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.5,
      explanation: 'Sử thi anh hùng khắc họa hình tượng người anh hùng cộng đồng trong không gian kỳ vĩ với giọng điệu hào hùng, phóng đại.',
      tags: ['Sử thi', 'Văn học dân gian', 'Nhiều đáp án'],
      source: 'manual',
      createdAt: '2025-02-15T08:30:00Z',
      updatedAt: '2025-02-15T08:30:00Z'
    },
    {
      id: 'qb-007',
      code: 'ANH10-001',
      subject: 'Tiếng Anh',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Unit 1: Family Life',
      topic: 'Present Simple vs Present Continuous',
      type: 'single_choice',
      difficulty: 'Nhận biết',
      status: 'pending',
      content: 'Choose the correct verb form: My father usually _______ dinner for our family, but today he _______ late at the office.',
      options: [
        { id: 'opt-1', label: 'A', text: 'cooks / is working', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'is cooking / works', isCorrect: false },
        { id: 'opt-3', label: 'C', text: 'cook / working', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'cooked / was working', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: '"usually" là dấu hiệu thì Hiện tại đơn (cooks); "today" chỉ hành động đang diễn ra khác thường ngày nên chia Hiện tại tiếp diễn (is working).',
      tags: ['Grammar', 'Tenses', 'Unit 1'],
      source: 'ai',
      sourceNote: 'Đề xuất bởi AI (Chờ giáo viên duyệt)',
      createdAt: '2025-02-16T09:00:00Z',
      updatedAt: '2025-02-16T09:00:00Z'
    },
    {
      id: 'qb-008',
      code: 'LY10-001',
      subject: 'Vật lý',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 2: Động học',
      topic: 'Chuyển động thẳng biến đổi đều',
      type: 'single_choice',
      difficulty: 'Thông hiểu',
      status: 'pending',
      content: 'Một ô tô đang chạy với vận tốc 10 m/s thì tăng tốc chuyển động thẳng nhanh dần đều với gia tốc 2 m/s². Quãng đường ô tô đi được sau 5 giây kể từ lúc tăng tốc là:',
      options: [
        { id: 'opt-1', label: 'A', text: '75 m', isCorrect: true },
        { id: 'opt-2', label: 'B', text: '50 m', isCorrect: false },
        { id: 'opt-3', label: 'C', text: '25 m', isCorrect: false },
        { id: 'opt-4', label: 'D', text: '100 m', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: 'Áp dụng công thức s = v0.t + 1/2.a.t² = 10.5 + 0,5.2.5² = 50 + 25 = 75 m.',
      tags: ['Động học', 'Gia tốc'],
      source: 'ai',
      sourceNote: 'Đề xuất bởi AI (Chờ giáo viên duyệt)',
      createdAt: '2025-02-16T10:15:00Z',
      updatedAt: '2025-02-16T10:15:00Z'
    },
    {
      id: 'qb-009',
      code: 'TOAN10-006',
      subject: 'Toán học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 2: Hàm số bậc hai và đồ thị',
      topic: 'Hàm số bậc hai',
      type: 'single_choice',
      difficulty: 'Nhận biết',
      status: 'draft',
      // Intentional near-duplicate of TOAN10-001 to showcase Duplicate Detection
      content: 'Cho hàm số bậc hai y = ax² + bx + c với a ≠ 0. Tọa độ đỉnh I của đồ thị parabol được xác định bởi công thức nào?',
      options: [
        { id: 'opt-1', label: 'A', text: 'I(-b/(2a); -Δ/(4a))', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'I(b/(2a); Δ/(4a))', isCorrect: false },
        { id: 'opt-3', label: 'C', text: 'I(-b/a; -Δ/(2a))', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'I(-b/(4a); -Δ/(2a))', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: '',
      tags: ['Parabol', 'Cần kiểm tra'],
      source: 'excel',
      sourceNote: 'Import từ file Excel',
      createdAt: '2025-02-17T08:00:00Z',
      updatedAt: '2025-02-17T08:00:00Z'
    },
    {
      id: 'qb-010',
      code: 'HOA10-001',
      subject: 'Hóa học',
      gradeLevel: 10,
      className: '10A1',
      chapter: 'Chương 1: Cấu tạo nguyên tử',
      topic: 'Thành phần nguyên tử',
      type: 'single_choice',
      difficulty: 'Nhận biết',
      status: 'approved',
      content: 'Hạt nhân của hầu hết các nguyên tử được cấu tạo bởi các loại hạt cơ bản nào sau đây?',
      options: [
        { id: 'opt-1', label: 'A', text: 'Proton và Neutron', isCorrect: true },
        { id: 'opt-2', label: 'B', text: 'Proton và Electron', isCorrect: false },
        { id: 'opt-3', label: 'C', text: 'Neutron và Electron', isCorrect: false },
        { id: 'opt-4', label: 'D', text: 'Chỉ gồm các hạt Proton', isCorrect: false }
      ],
      statements: [],
      acceptedAnswers: [],
      rubric: '',
      maxPoints: 0.25,
      explanation: 'Hạt nhân nguyên tử gồm hạt proton (mang điện dương) và hạt neutron (không mang điện), trừ đồng vị H-1 chỉ có 1 proton.',
      tags: ['Nguyên tử', 'Hóa 10'],
      source: 'manual',
      createdAt: '2025-02-17T15:00:00Z',
      updatedAt: '2025-02-17T15:00:00Z'
    }
  ];

  return recomputeBankDiagnostics(
    rawQuestions.map((q) => ({
      ...q,
      duplicateStatus: 'unique',
      validationIssues: []
    }))
  );
}

/**
 * Quét lại toàn bộ ngân hàng câu hỏi để cập nhật trạng thái trùng lặp & lỗi dữ liệu
 */
export function recomputeBankDiagnostics(questions: QuestionItem[]): QuestionItem[] {
  return questions.map((q) => {
    const validationIssues = validateQuestionItem(q);
    const dup = evaluateDuplicateForQuestion(q, questions);
    return {
      ...q,
      validationIssues,
      duplicateStatus: dup.duplicateStatus,
      duplicateScore: dup.duplicateScore,
      duplicateOfId: dup.duplicateOfId,
      duplicateOfCode: dup.duplicateOfCode,
      duplicateReason: dup.duplicateReason
    };
  });
}

class QuestionBankService {
  private load(): QuestionItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = getInitialQuestions();
        this.save(initial);
        return initial;
      }
      const parsed = JSON.parse(raw) as QuestionItem[];
      return recomputeBankDiagnostics(parsed);
    } catch {
      return getInitialQuestions();
    }
  }

  private save(questions: QuestionItem[]): QuestionItem[] {
    const updated = recomputeBankDiagnostics(questions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save question bank to localStorage:', e);
    }
    return updated;
  }

  getAll(): QuestionItem[] {
    return this.load();
  }

  getById(id: string): QuestionItem | undefined {
    return this.load().find((q) => q.id === id);
  }

  generateNextCode(subject: string, gradeLevel: number, existingList?: QuestionItem[]): string {
    const list = existingList || this.load();
    const prefixMap: Record<string, string> = {
      'Toán học': 'TOAN',
      'Ngữ văn': 'VAN',
      'Tiếng Anh': 'ANH',
      'Vật lý': 'LY',
      'Hóa học': 'HOA',
      'Sinh học': 'SINH',
      'Lịch sử': 'SU',
      'Địa lý': 'DIA',
      'Tin học': 'TIN',
      'GDKT & Pháp luật': 'GDKT'
    };
    const prefix = `${prefixMap[subject] || 'CH'}${gradeLevel}`;
    const existingNums = list
      .filter((q) => q.code.startsWith(prefix))
      .map((q) => {
        const m = q.code.match(/-(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
    const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  create(data: Omit<QuestionItem, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'duplicateStatus' | 'validationIssues'> & { code?: string }): QuestionItem {
    const list = this.load();
    const now = new Date().toISOString();
    const newQuestion: QuestionItem = {
      ...data,
      id: `qb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: data.code?.trim() || this.generateNextCode(data.subject, data.gradeLevel, list),
      createdAt: now,
      updatedAt: now,
      duplicateStatus: 'unique',
      validationIssues: []
    };
    const updated = this.save([newQuestion, ...list]);
    return updated.find((q) => q.id === newQuestion.id)!;
  }

  createBatch(items: Array<Partial<QuestionItem>>): QuestionItem[] {
    const list = this.load();
    const now = new Date().toISOString();
    const workingList = [...list];
    const created: QuestionItem[] = [];

    items.forEach((data, idx) => {
      const subject = data.subject || 'Toán học';
      const gradeLevel = data.gradeLevel || 10;
      const code = data.code?.trim() || this.generateNextCode(subject, gradeLevel, workingList);
      const q: QuestionItem = {
        id: `qb-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        code,
        subject,
        gradeLevel,
        className: data.className || `${gradeLevel}A1`,
        chapter: data.chapter || 'Chương 1: Kiến thức trọng tâm',
        topic: data.topic || 'Chủ đề tổng hợp',
        type: data.type || 'single_choice',
        difficulty: data.difficulty || 'Thông hiểu',
        status: data.status || 'approved',
        content: data.content || '',
        options: data.options || [],
        statements: data.statements || [],
        acceptedAnswers: data.acceptedAnswers || [],
        rubric: data.rubric || '',
        maxPoints: data.maxPoints ?? 0.25,
        explanation: data.explanation || '',
        tags: data.tags || [],
        source: data.source || 'manual',
        sourceNote: data.sourceNote,
        createdAt: now,
        updatedAt: now,
        duplicateStatus: 'unique',
        validationIssues: []
      };
      workingList.unshift(q);
      created.push(q);
    });

    this.save(workingList);
    return created;
  }

  update(id: string, updates: Partial<QuestionItem>): QuestionItem | undefined {
    const list = this.load();
    const idx = list.findIndex((q) => q.id === id);
    if (idx === -1) return undefined;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const saved = this.save(list);
    return saved.find((q) => q.id === id);
  }

  duplicateQuestion(id: string): QuestionItem | undefined {
    const list = this.load();
    const source = list.find((q) => q.id === id);
    if (!source) return undefined;

    const now = new Date().toISOString();
    const copy: QuestionItem = {
      ...JSON.parse(JSON.stringify(source)),
      id: `qb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: this.generateNextCode(source.subject, source.gradeLevel, list),
      content: `${source.content} (Bản sao)`,
      status: 'draft',
      source: 'manual',
      sourceNote: `Nhân bản từ mã ${source.code}`,
      createdAt: now,
      updatedAt: now
    };

    const saved = this.save([copy, ...list]);
    return saved.find((q) => q.id === copy.id);
  }

  deleteMany(ids: string[]): QuestionItem[] {
    const idSet = new Set(ids);
    const filtered = this.load().filter((q) => !idSet.has(q.id));
    return this.save(filtered);
  }

  bulkUpdate(
    ids: string[],
    patch: {
      difficulty?: QuestionDifficulty;
      status?: QuestionStatus;
      chapter?: string;
      topic?: string;
      addTag?: string;
    }
  ): QuestionItem[] {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    const updated = this.load().map((q) => {
      if (!idSet.has(q.id)) return q;
      const nextTags = patch.addTag
        ? Array.from(new Set([...q.tags, patch.addTag.trim()]))
        : q.tags;
      return {
        ...q,
        difficulty: patch.difficulty ?? q.difficulty,
        status: patch.status ?? q.status,
        chapter: patch.chapter?.trim() ? patch.chapter.trim() : q.chapter,
        topic: patch.topic?.trim() ? patch.topic.trim() : q.topic,
        tags: nextTags,
        updatedAt: now
      };
    });
    return this.save(updated);
  }

  /**
   * Tạo hàng loạt câu hỏi bằng AI (Hỗ trợ Gemini API thực tế nếu có key + Fallback dữ liệu mô phỏng thông minh có ghi chú rõ ràng)
   */
  async generateQuestionsWithAI(config: AiGenerateConfig): Promise<{
    questions: QuestionItem[];
    isRealAi: boolean;
    sourceLabel: string;
  }> {
    const existingBank = this.load();
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia khảo thí và biên soạn đề thi THPT/THCS Việt Nam.
Hãy tạo ${config.count} câu hỏi môn ${config.subject} lớp ${config.gradeLevel}.
- Chương/Bài: ${config.chapter}
- Chủ đề trọng tâm: ${config.topic}
- Dạng câu hỏi yêu cầu: ${config.questionType === 'mixed' ? 'Kết hợp đa dạng các dạng (single_choice, multiple_choice, true_false, fill_blank, essay)' : QUESTION_TYPE_LABELS[config.questionType]}
- Mức độ nhận thức: ${config.difficulty === 'mixed' ? 'Phân bổ từ Nhận biết, Thông hiểu đến Vận dụng' : config.difficulty}
${config.sourceMaterial ? `- Ngữ liệu / Tài liệu nguồn: ${config.sourceMaterial}` : ''}
${config.extraInstructions ? `- Yêu cầu bổ sung: ${config.extraInstructions}` : ''}

Lưu ý quan trọng:
- Với dạng single_choice: tạo 4 phương án A, B, C, D và đúng 1 phương án isCorrect = true.
- Với dạng multiple_choice: tạo 4 phương án A, B, C, D và từ 2-3 phương án isCorrect = true.
- Với dạng true_false: tạo 4 mệnh đề a, b, c, d với trường isTrue (true/false).
- Với dạng fill_blank: cung cấp mảng acceptedAnswers chứa các cách ghi đáp án ngắn đúng.
- Với dạng essay: cung cấp hướng dẫn chấm chi tiết vào trường rubric.
- Luôn có giải thích chi tiết (explanation) bằng tiếng Việt chuẩn mực.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  content: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        text: { type: Type.STRING },
                        isCorrect: { type: Type.BOOLEAN }
                      }
                    }
                  },
                  statements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        content: { type: Type.STRING },
                        isTrue: { type: Type.BOOLEAN }
                      }
                    }
                  },
                  acceptedAnswers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  rubric: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['type', 'difficulty', 'content', 'explanation']
              }
            }
          }
        });

        const parsed = JSON.parse(response.text || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const now = new Date().toISOString();
          const result: QuestionItem[] = parsed.map((raw: any, i: number) => {
            const qType: QuestionType = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'essay'].includes(raw.type)
              ? raw.type
              : config.questionType === 'mixed'
              ? 'single_choice'
              : config.questionType;
            const qDiff: QuestionDifficulty = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'].includes(raw.difficulty)
              ? raw.difficulty
              : config.difficulty === 'mixed'
              ? 'Thông hiểu'
              : config.difficulty;

            const draftItem: QuestionItem = {
              id: `ai-stage-${Date.now()}-${i}`,
              code: `AI-${i + 1}`,
              subject: config.subject,
              gradeLevel: config.gradeLevel,
              className: `${config.gradeLevel}A1`,
              chapter: config.chapter || 'Chương 1',
              topic: config.topic || 'Chủ đề trọng tâm',
              type: qType,
              difficulty: qDiff,
              status: 'pending',
              content: raw.content || '',
              options: (raw.options || []).map((o: any, idx: number) => ({
                id: `opt-${i}-${idx}`,
                label: o.label || String.fromCharCode(65 + idx),
                text: o.text || '',
                isCorrect: Boolean(o.isCorrect)
              })),
              statements: (raw.statements || []).map((s: any, idx: number) => ({
                id: `st-${i}-${idx}`,
                label: s.label || String.fromCharCode(97 + idx),
                content: s.content || '',
                isTrue: Boolean(s.isTrue)
              })),
              acceptedAnswers: Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers : [],
              rubric: raw.rubric || '',
              maxPoints: qType === 'essay' ? 2.0 : qType === 'true_false' ? 1.0 : 0.25,
              explanation: raw.explanation || '',
              tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : [config.topic, 'AI đề xuất'],
              source: 'ai',
              sourceNote: 'Sinh bởi Gemini AI (Chờ duyệt)',
              createdAt: now,
              updatedAt: now,
              duplicateStatus: 'unique',
              validationIssues: []
            };
            const dup = evaluateDuplicateForQuestion(draftItem, existingBank);
            return {
              ...draftItem,
              ...dup,
              validationIssues: validateQuestionItem(draftItem)
            };
          });

          return {
            questions: result,
            isRealAi: true,
            sourceLabel: 'Được tạo trực tiếp bởi Gemini AI (gemini-3.8-flash)'
          };
        }
      } catch (err) {
        console.warn('Gemini API fallback to simulated generator:', err);
      }
    }

    // Fallback: Dữ liệu mẫu mô phỏng thông minh có ghi chú rõ ràng
    await new Promise((r) => setTimeout(r, 650));
    const now = new Date().toISOString();
    const typesCycle: QuestionType[] =
      config.questionType === 'mixed'
        ? ['single_choice', 'true_false', 'fill_blank', 'multiple_choice', 'essay']
        : [config.questionType];
    const diffsCycle: QuestionDifficulty[] =
      config.difficulty === 'mixed'
        ? ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao']
        : [config.difficulty];

    const simulated: QuestionItem[] = [];
    for (let i = 0; i < config.count; i++) {
      const qType = typesCycle[i % typesCycle.length];
      const qDiff = diffsCycle[i % diffsCycle.length];
      const topicName = config.topic.trim() || 'Kiến thức trọng tâm';
      const chapterName = config.chapter.trim() || 'Chương 1';

      let content = '';
      let options: QuestionOption[] = [];
      let statements: TrueFalseStatement[] = [];
      let acceptedAnswers: string[] = [];
      let rubric = '';
      let explanation = '';

      if (qType === 'single_choice') {
        content = `[${config.subject} ${config.gradeLevel}] Trong chủ đề "${topicName}" (${chapterName}), phát biểu hoặc kết quả nào sau đây là chuẩn xác nhất ở mức độ ${qDiff.toLowerCase()} (Câu ${i + 1})?`;
        options = [
          {
            id: `opt-${i}-0`,
            label: 'A',
            text: `Định lý và tính chất cốt lõi của ${topicName} thỏa mãn đầy đủ điều kiện xác định.`,
            isCorrect: true
          },
          {
            id: `opt-${i}-1`,
            label: 'B',
            text: `Trường hợp suy biến khi bỏ qua điều kiện biên của ${topicName}.`,
            isCorrect: false
          },
          {
            id: `opt-${i}-2`,
            label: 'C',
            text: `Giá trị đại lượng biến thiên ngược chiều với giả thiết bài toán.`,
            isCorrect: false
          },
          {
            id: `opt-${i}-3`,
            label: 'D',
            text: `Phương án gây nhiễu do nhầm lẫn dấu công thức trong ${chapterName}.`,
            isCorrect: false
          }
        ];
        explanation = `Dựa vào kiến thức trọng tâm phần "${topicName}" (${chapterName} - ${config.subject} ${config.gradeLevel}), phương án A thỏa mãn đầy đủ điều kiện cần và đủ.`;
      } else if (qType === 'multiple_choice') {
        content = `[${config.subject} ${config.gradeLevel}] Chọn TẤT CẢ các nhận định đúng khi phân tích về "${topicName}" (${chapterName}) (Câu ${i + 1}):`;
        options = [
          {
            id: `opt-${i}-0`,
            label: 'A',
            text: `Nắm vững bản chất khái niệm và điều kiện áp dụng của ${topicName}.`,
            isCorrect: true
          },
          {
            id: `opt-${i}-1`,
            label: 'B',
            text: `Có thể vận dụng trực tiếp vào giải quyết các bài toán thực tiễn liên quan.`,
            isCorrect: true
          },
          {
            id: `opt-${i}-2`,
            label: 'C',
            text: `Mọi trường hợp đều không cần kiểm tra điều kiện xác định ban đầu.`,
            isCorrect: false
          },
          {
            id: `opt-${i}-3`,
            label: 'D',
            text: `Liên hệ chặt chẽ với các định lý nền tảng trong ${chapterName}.`,
            isCorrect: true
          }
        ];
        explanation = `Các phương án A, B và D đều đúng theo chuẩn kiến thức kỹ năng môn ${config.subject} lớp ${config.gradeLevel}. Phương án C sai vì luôn phải xét điều kiện xác định.`;
      } else if (qType === 'true_false') {
        content = `[${config.subject} ${config.gradeLevel}] Cho tình huống học tập về "${topicName}" thuộc ${chapterName}. Xét tính Đúng/Sai của các mệnh đề a, b, c, d sau đây (Câu ${i + 1}):`;
        statements = [
          {
            id: `st-${i}-a`,
            label: 'a',
            content: `Khái niệm cơ sở của ${topicName} được xác định duy nhất khi thỏa mãn điều kiện chuẩn.`,
            isTrue: true
          },
          {
            id: `st-${i}-b`,
            label: 'b',
            content: `Khi thay đổi tham số đầu vào gấp đôi thì kết quả luôn giữ nguyên không đổi.`,
            isTrue: false
          },
          {
            id: `st-${i}-c`,
            label: 'c',
            content: `Công thức tổng quát của ${topicName} cho phép suy ra nghiệm duy nhất trong miền xác định.`,
            isTrue: true
          },
          {
            id: `st-${i}-d`,
            label: 'd',
            content: `Ứng dụng thực tế của ${topicName} giúp tối ưu hóa bài toán trong ${chapterName}.`,
            isTrue: true
          }
        ];
        explanation = `Mệnh đề a, c, d là Đúng theo lý thuyết ${topicName}. Mệnh đề b Sai vì kết quả phụ thuộc tuyến tính/bậc hai vào tham số đầu vào.`;
      } else if (qType === 'fill_blank') {
        content = `[${config.subject} ${config.gradeLevel}] Điền kết quả hoặc thuật ngữ chính xác vào chỗ trống: Trong chuyên đề "${topicName}" (${chapterName}), hệ số chuẩn hóa cơ bản ở trạng thái cân bằng có giá trị bằng [___] (Câu ${i + 1}).`;
        acceptedAnswers = ['1', '1.0', 'một'];
        explanation = `Theo quy ước chuẩn hóa trong ${topicName}, hệ số cơ bản tại trạng thái chuẩn bằng 1.`;
      } else {
        content = `[${config.subject} ${config.gradeLevel}] Trình bày cơ sở lý thuyết và giải bài toán vận dụng về "${topicName}" (${chapterName}). Nêu rõ các bước lập luận và ý nghĩa thực tiễn (Câu ${i + 1}).`;
        rubric = `+ Bước 1 (0.5 điểm): Phát biểu đúng định nghĩa và điều kiện áp dụng của ${topicName}.\n+ Bước 2 (1.0 điểm): Thiết lập công thức/luận điểm chính xác và biến đổi thu gọn.\n+ Bước 3 (0.5 điểm): Kết luận nghiệm và nêu ý nghĩa thực tế trong ${chapterName}.`;
        explanation = `Học sinh cần trình bày đủ 3 bước theo thang điểm hướng dẫn chấm.`;
      }

      const item: QuestionItem = {
        id: `ai-stage-${Date.now()}-${i}`,
        code: `AI-${i + 1}`,
        subject: config.subject,
        gradeLevel: config.gradeLevel,
        className: `${config.gradeLevel}A1`,
        chapter: chapterName,
        topic: topicName,
        type: qType,
        difficulty: qDiff,
        status: 'pending',
        content,
        options,
        statements,
        acceptedAnswers,
        rubric,
        maxPoints: qType === 'essay' ? 2.0 : qType === 'true_false' ? 1.0 : 0.25,
        explanation,
        tags: [topicName, qDiff, 'AI đề xuất'],
        source: 'ai',
        sourceNote: 'Dữ liệu mẫu mô phỏng AI (Chưa kết nối API Key thực)',
        createdAt: now,
        updatedAt: now,
        duplicateStatus: 'unique',
        validationIssues: []
      };

      const dup = evaluateDuplicateForQuestion(item, [...existingBank, ...simulated]);
      item.duplicateStatus = dup.duplicateStatus;
      item.duplicateScore = dup.duplicateScore;
      item.duplicateOfId = dup.duplicateOfId;
      item.duplicateOfCode = dup.duplicateOfCode;
      item.duplicateReason = dup.duplicateReason;
      item.validationIssues = validateQuestionItem(item);

      simulated.push(item);
    }

    return {
      questions: simulated,
      isRealAi: false,
      sourceLabel: 'Chế độ Mô phỏng AI thông minh (Sử dụng mẫu cấu trúc chuẩn — Chưa cấu hình GEMINI_API_KEY)'
    };
  }

  /**
   * Tải file Excel mẫu (.xlsx) chuẩn cho giáo viên nhập liệu
   */
  downloadSampleExcelTemplate() {
    const rows = [
      {
        'Môn học': 'Toán học',
        'Khối lớp': 10,
        'Chương / Bài': 'Chương 2: Hàm số bậc hai và đồ thị',
        'Chủ đề': 'Hàm số bậc hai',
        'Dạng câu hỏi (single_choice / multiple_choice / true_false / fill_blank / essay)': 'single_choice',
        'Mức độ (Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao)': 'Nhận biết',
        'Nội dung câu hỏi': 'Hàm số y = 2x² - 4x + 1 có trục đối xứng là đường thẳng nào?',
        'Phương án A': 'x = 1',
        'Phương án B': 'x = -1',
        'Phương án C': 'x = 2',
        'Phương án D': 'x = -2',
        'Đáp án đúng (VD: A hoặc A,B hoặc Đ,S,Đ,Đ hoặc đáp án ngắn)': 'A',
        'Lời giải / Hướng dẫn chấm': 'Trục đối xứng của parabol y = ax² + bx + c là x = -b/(2a) = 4/(2.2) = 1.',
        'Tags (cách nhau bởi dấu phẩy)': 'Parabol, Trục đối xứng'
      },
      {
        'Môn học': 'Toán học',
        'Khối lớp': 10,
        'Chương / Bài': 'Chương 5: Vectơ',
        'Chủ đề': 'Tổng và hiệu của hai vectơ',
        'Dạng câu hỏi (single_choice / multiple_choice / true_false / fill_blank / essay)': 'fill_blank',
        'Mức độ (Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao)': 'Thông hiểu',
        'Nội dung câu hỏi': 'Cho hình vuông ABCD cạnh bằng 4. Độ dài vectơ tổng AB + AD bằng bao nhiêu (làm tròn 2 chữ số thập phân)?',
        'Phương án A': '',
        'Phương án B': '',
        'Phương án C': '',
        'Phương án D': '',
        'Đáp án đúng (VD: A hoặc A,B hoặc Đ,S,Đ,Đ hoặc đáp án ngắn)': '5.66 | 4√2',
        'Lời giải / Hướng dẫn chấm': 'Theo quy tắc hình bình hành, |AB + AD| = |AC| = 4√2 ≈ 5.66.',
        'Tags (cách nhau bởi dấu phẩy)': 'Vectơ, Trả lời ngắn'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Ngan_Hang_Cau_Hoi');
    XLSX.writeFile(wb, 'Mau_Import_Ngan_Hang_Cau_Hoi.xlsx');
  }

  /**
   * Đọc và kiểm tra dữ liệu từ file Excel (.xlsx / .csv)
   */
  async parseExcelFile(file: File, defaultSubject: string, defaultGrade: number): Promise<ImportRowPreview[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

    const existingBank = this.load();
    const previews: ImportRowPreview[] = [];
    const stagedQuestions: QuestionItem[] = [];

    jsonRows.forEach((row, index) => {
      const getVal = (keys: string[]): string => {
        for (const k of Object.keys(row)) {
          const normKey = k.toLowerCase().trim();
          if (keys.some((target) => normKey.includes(target))) {
            return String(row[k] ?? '').trim();
          }
        }
        return '';
      };

      const subject = getVal(['môn', 'subject']) || defaultSubject;
      const gradeRaw = parseInt(getVal(['khối', 'lớp', 'grade']), 10);
      const gradeLevel = [10, 11, 12].includes(gradeRaw) ? gradeRaw : defaultGrade;
      const chapter = getVal(['chương', 'bài', 'chapter']) || 'Chương 1: Kiến thức chung';
      const topic = getVal(['chủ đề', 'topic']) || 'Chủ đề tổng hợp';

      const rawType = getVal(['dạng', 'loại', 'type']).toLowerCase();
      let type: QuestionType = 'single_choice';
      if (rawType.includes('multiple') || rawType.includes('nhiều')) type = 'multiple_choice';
      else if (rawType.includes('true') || rawType.includes('đúng')) type = 'true_false';
      else if (rawType.includes('fill') || rawType.includes('điền') || rawType.includes('ngắn')) type = 'fill_blank';
      else if (rawType.includes('essay') || rawType.includes('tự luận')) type = 'essay';

      const rawDiff = getVal(['mức độ', 'độ khó', 'difficulty']);
      let difficulty: QuestionDifficulty = 'Thông hiểu';
      if (rawDiff.includes('Nhận biết')) difficulty = 'Nhận biết';
      else if (rawDiff.includes('Vận dụng cao')) difficulty = 'Vận dụng cao';
      else if (rawDiff.includes('Vận dụng')) difficulty = 'Vận dụng';

      const content = getVal(['nội dung', 'câu hỏi', 'question']);
      const optA = getVal(['phương án a', 'đáp án a', 'câu a']);
      const optB = getVal(['phương án b', 'đáp án b', 'câu b']);
      const optC = getVal(['phương án c', 'đáp án c', 'câu c']);
      const optD = getVal(['phương án d', 'đáp án d', 'câu d']);
      const correctRaw = getVal(['đáp án đúng', 'correct', 'đáp án']);
      const explanation = getVal(['lời giải', 'giải thích', 'hướng dẫn chấm', 'explanation']);
      const tagsRaw = getVal(['tag', 'nhãn']);

      const correctTokens = correctRaw
        .toUpperCase()
        .split(/[,;|/\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let options: QuestionOption[] = [];
      let statements: TrueFalseStatement[] = [];
      let acceptedAnswers: string[] = [];
      let rubric = '';

      if (type === 'single_choice' || type === 'multiple_choice') {
        const rawOpts = [
          { label: 'A', text: optA },
          { label: 'B', text: optB },
          { label: 'C', text: optC },
          { label: 'D', text: optD }
        ].filter((o) => o.text !== '');

        options = (rawOpts.length > 0 ? rawOpts : [
          { label: 'A', text: optA },
          { label: 'B', text: optB },
          { label: 'C', text: optC },
          { label: 'D', text: optD }
        ]).map((o, i) => ({
          id: `imp-opt-${index}-${i}`,
          label: o.label,
          text: o.text,
          isCorrect: correctTokens.includes(o.label)
        }));
      } else if (type === 'true_false') {
        const rawStmts = [optA, optB, optC, optD].filter(Boolean);
        statements = rawStmts.map((text, i) => {
          const token = correctTokens[i] || 'Đ';
          const isTrue = token === 'Đ' || token === 'D' || token === 'TRUE' || token === '1';
          return {
            id: `imp-st-${index}-${i}`,
            label: String.fromCharCode(97 + i),
            content: text,
            isTrue
          };
        });
      } else if (type === 'fill_blank') {
        acceptedAnswers = correctRaw
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (type === 'essay') {
        rubric = explanation || correctRaw;
      }

      const now = new Date().toISOString();
      const questionItem: QuestionItem = {
        id: `imp-excel-${Date.now()}-${index}`,
        code: `IMP-${index + 1}`,
        subject,
        gradeLevel,
        className: `${gradeLevel}A1`,
        chapter,
        topic,
        type,
        difficulty,
        status: 'pending',
        content,
        options,
        statements,
        acceptedAnswers,
        rubric,
        maxPoints: type === 'essay' ? 2.0 : type === 'true_false' ? 1.0 : 0.25,
        explanation,
        tags: tagsRaw
          ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
          : ['Import Excel'],
        source: 'excel',
        sourceNote: `Import từ file ${file.name} (Dòng ${index + 2})`,
        createdAt: now,
        updatedAt: now,
        duplicateStatus: 'unique',
        validationIssues: []
      };

      const issues = validateQuestionItem(questionItem);
      const dup = evaluateDuplicateForQuestion(questionItem, [...existingBank, ...stagedQuestions]);

      questionItem.validationIssues = issues;
      questionItem.duplicateStatus = dup.duplicateStatus;
      questionItem.duplicateScore = dup.duplicateScore;
      questionItem.duplicateOfId = dup.duplicateOfId;
      questionItem.duplicateOfCode = dup.duplicateOfCode;
      questionItem.duplicateReason = dup.duplicateReason;

      stagedQuestions.push(questionItem);

      const errors = issues.filter((i) => i.severity === 'error').map((i) => i.message);
      const warnings = [
        ...issues.filter((i) => i.severity === 'warning').map((i) => i.message),
        ...(dup.duplicateStatus !== 'unique' && dup.duplicateReason ? [dup.duplicateReason] : [])
      ];

      previews.push({
        rowIndex: index + 2,
        question: questionItem,
        isValid: errors.length === 0,
        hasWarnings: warnings.length > 0,
        errors,
        warnings
      });
    });

    return previews;
  }

  /**
   * Phân tích định dạng câu hỏi từ văn bản Word (.docx text / nội dung copy từ Word)
   * Hỗ trợ chuẩn:
   * Câu 1: [Mức độ] Nội dung câu hỏi...
   * A. Phương án A
   * B. Phương án B
   * C. Phương án C
   * D. Phương án D
   * Đáp án: A
   * Lời giải: ...
   */
  parseWordFormattedText(
    rawText: string,
    defaultSubject: string,
    defaultGrade: number,
    defaultChapter: string,
    defaultTopic: string
  ): ImportRowPreview[] {
    const existingBank = this.load();
    const blocks = rawText
      .split(/(?=(?:^|\n)\s*(?:Câu|Question)\s*\d+\s*[:.)])/i)
      .map((b) => b.trim())
      .filter(Boolean);

    const previews: ImportRowPreview[] = [];
    const stagedQuestions: QuestionItem[] = [];

    blocks.forEach((block, index) => {
      const lines = block
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return;

      let headerLine = lines[0].replace(/^(?:Câu|Question)\s*\d+\s*[:.)]?\s*/i, '').trim();
      let difficulty: QuestionDifficulty = 'Thông hiểu';

      const diffMatch = headerLine.match(/^\[(Nhận biết|Thông hiểu|Vận dụng cao|Vận dụng)\]\s*/i);
      if (diffMatch) {
        const d = diffMatch[1].toLowerCase();
        if (d === 'nhận biết') difficulty = 'Nhận biết';
        else if (d === 'vận dụng cao') difficulty = 'Vận dụng cao';
        else if (d === 'vận dụng') difficulty = 'Vận dụng';
        else difficulty = 'Thông hiểu';
        headerLine = headerLine.slice(diffMatch[0].length).trim();
      }

      const contentLines: string[] = [headerLine];
      const optMap: { label: string; text: string; starred: boolean }[] = [];
      let answerLine = '';
      let explanationLine = '';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const optMatch = line.match(/^(\*)?([A-D])[.)]\s*(.+)$/);
        const ansMatch = line.match(/^(?:Đáp án|ĐA|Answer)\s*[:=]\s*(.+)$/i);
        const expMatch = line.match(/^(?:Lời giải|Giải thích|Hướng dẫn|HD)\s*[:=]\s*(.+)$/i);

        if (optMatch) {
          optMap.push({
            starred: Boolean(optMatch[1]),
            label: optMatch[2].toUpperCase(),
            text: optMatch[3].trim()
          });
        } else if (ansMatch) {
          answerLine = ansMatch[1].trim();
        } else if (expMatch) {
          explanationLine = expMatch[1].trim();
        } else if (optMap.length === 0 && !answerLine && !explanationLine) {
          contentLines.push(line);
        } else if (explanationLine) {
          explanationLine += ' ' + line;
        }
      }

      const content = contentLines.join(' ').trim();
      const correctTokens = answerLine
        .toUpperCase()
        .split(/[,;\s]+/)
        .filter(Boolean);

      let type: QuestionType = 'single_choice';
      let options: QuestionOption[] = [];
      let acceptedAnswers: string[] = [];
      let rubric = '';

      if (optMap.length >= 2) {
        options = optMap.map((o, idx) => ({
          id: `w-opt-${index}-${idx}`,
          label: o.label,
          text: o.text,
          isCorrect: o.starred || correctTokens.includes(o.label)
        }));
        const correctCount = options.filter((o) => o.isCorrect).length;
        type = correctCount > 1 ? 'multiple_choice' : 'single_choice';
      } else if (answerLine) {
        type = 'fill_blank';
        acceptedAnswers = answerLine.split('|').map((s) => s.trim()).filter(Boolean);
      } else {
        type = 'essay';
        rubric = explanationLine || 'Chấm theo ý đúng của học sinh.';
      }

      const now = new Date().toISOString();
      const questionItem: QuestionItem = {
        id: `imp-word-${Date.now()}-${index}`,
        code: `WORD-${index + 1}`,
        subject: defaultSubject,
        gradeLevel: defaultGrade,
        className: `${defaultGrade}A1`,
        chapter: defaultChapter || 'Chương 1',
        topic: defaultTopic || 'Chủ đề chung',
        type,
        difficulty,
        status: 'pending',
        content,
        options,
        statements: [],
        acceptedAnswers,
        rubric,
        maxPoints: type === 'essay' ? 2.0 : 0.25,
        explanation: explanationLine,
        tags: ['Import Word'],
        source: 'word',
        sourceNote: `Phân tích từ định dạng Word (Câu ${index + 1})`,
        createdAt: now,
        updatedAt: now,
        duplicateStatus: 'unique',
        validationIssues: []
      };

      const issues = validateQuestionItem(questionItem);
      const dup = evaluateDuplicateForQuestion(questionItem, [...existingBank, ...stagedQuestions]);

      questionItem.validationIssues = issues;
      questionItem.duplicateStatus = dup.duplicateStatus;
      questionItem.duplicateScore = dup.duplicateScore;
      questionItem.duplicateOfId = dup.duplicateOfId;
      questionItem.duplicateOfCode = dup.duplicateOfCode;
      questionItem.duplicateReason = dup.duplicateReason;

      stagedQuestions.push(questionItem);

      const errors = issues.filter((i) => i.severity === 'error').map((i) => i.message);
      const warnings = [
        ...issues.filter((i) => i.severity === 'warning').map((i) => i.message),
        ...(dup.duplicateStatus !== 'unique' && dup.duplicateReason ? [dup.duplicateReason] : [])
      ];

      previews.push({
        rowIndex: index + 1,
        question: questionItem,
        isValid: errors.length === 0,
        hasWarnings: warnings.length > 0,
        errors,
        warnings
      });
    });

    return previews;
  }

  /**
   * Xuất danh sách câu hỏi ra Excel (.xlsx) hoặc Word (.doc)
   */
  exportQuestions(questions: QuestionItem[], config: ExportConfig) {
    let list = [...questions];
    if (config.shuffleQuestions) {
      list = list.sort(() => Math.random() - 0.5);
    }

    const dateStr = new Date().toISOString().split('T')[0];

    if (config.format === 'excel') {
      const rows = list.map((q, idx) => {
        const row: Record<string, any> = {
          STT: idx + 1,
          'Mã câu hỏi': q.code,
          'Môn học': q.subject,
          'Khối lớp': q.gradeLevel,
          'Chương / Bài': q.chapter,
          'Chủ đề': q.topic,
          'Dạng câu hỏi': QUESTION_TYPE_LABELS[q.type],
          'Nội dung câu hỏi': q.content
        };

        if (config.includeMetadata) {
          row['Mức độ'] = q.difficulty;
          row['Trạng thái'] = QUESTION_STATUS_LABELS[q.status];
          row['Tags'] = q.tags.join(', ');
        }

        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          q.options.forEach((o) => {
            row[`Phương án ${o.label}`] = o.text;
          });
        } else if (q.type === 'true_false') {
          q.statements.forEach((s) => {
            row[`Mệnh đề ${s.label.toUpperCase()}`] = s.content;
          });
        }

        if (config.includeAnswers) {
          if (q.type === 'single_choice' || q.type === 'multiple_choice') {
            row['Đáp án đúng'] = q.options
              .filter((o) => o.isCorrect)
              .map((o) => o.label)
              .join(', ');
          } else if (q.type === 'true_false') {
            row['Đáp án đúng'] = q.statements
              .map((s) => `${s.label}) ${s.isTrue ? 'Đúng' : 'Sai'}`)
              .join('; ');
          } else if (q.type === 'fill_blank') {
            row['Đáp án đúng'] = q.acceptedAnswers.join(' | ');
          } else {
            row['Đáp án đúng'] = q.rubric;
          }
        }

        if (config.includeExplanation) {
          row['Lời giải chi tiết'] = q.explanation || q.rubric || '';
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ngan_Hang_Cau_Hoi');
      XLSX.writeFile(wb, `Ngan_Hang_Cau_Hoi_${dateStr}.xlsx`);
      return;
    }

    // Xuất ra file Word (.doc) chuẩn in ấn đề thi & ngân hàng câu hỏi
    const questionsHtml = list
      .map((q, idx) => {
        const metaBadge = config.includeMetadata
          ? `<span style="color:#475569;font-size:10pt;font-weight:normal;"> [${q.code} · ${q.difficulty} · ${QUESTION_TYPE_LABELS[q.type]}]</span>`
          : '';

        let bodyHtml = '';
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          bodyHtml = `<table style="width:100%;margin-top:6px;margin-bottom:6px;border-collapse:collapse;">
            <tr>
              ${q.options
                .map((o) => {
                  const highlight =
                    config.includeAnswers && o.isCorrect
                      ? 'font-weight:bold;text-decoration:underline;color:#047857;'
                      : '';
                  return `<td style="width:50%;padding:3px 8px;font-size:11pt;${highlight}">${o.label}. ${o.text}</td>`;
                })
                .reduce((acc: string[], td, i) => {
                  if (i % 2 === 0) acc.push(`<tr>${td}`);
                  else acc[acc.length - 1] += `${td}</tr>`;
                  return acc;
                }, [])
                .join('')}
            </tr>
          </table>`;
        } else if (q.type === 'true_false') {
          bodyHtml = `<div style="margin-left:16px;margin-top:6px;">
            ${q.statements
              .map(
                (s) =>
                  `<p style="margin:3px 0;font-size:11pt;"><strong>${s.label})</strong> ${s.content} ${
                    config.includeAnswers
                      ? `<strong style="color:#047857;">[${s.isTrue ? 'Đúng' : 'Sai'}]</strong>`
                      : '[Đ / S]'
                  }</p>`
              )
              .join('')}
          </div>`;
        } else if (q.type === 'fill_blank') {
          bodyHtml = `<p style="margin:6px 0 6px 16px;font-size:11pt;color:#334155;">Trả lời ngắn: ........................................................ ${
            config.includeAnswers
              ? `<strong style="color:#047857;">(Đáp án: ${q.acceptedAnswers.join(' hoặc ')})</strong>`
              : ''
          }</p>`;
        } else if (q.type === 'essay') {
          bodyHtml = `<p style="margin:6px 0 6px 16px;font-size:11pt;color:#334155;"><em>(Tự luận - ${q.maxPoints} điểm)</em></p>`;
        }

        const expHtml =
          config.includeExplanation && (q.explanation || q.rubric)
            ? `<div style="margin:4px 0 10px 16px;padding:6px 10px;background:#f8fafc;border-left:3px solid #0284c7;font-size:10.5pt;color:#334155;">
                <strong>Lời giải / Hướng dẫn chấm:</strong> ${q.explanation || q.rubric}
              </div>`
            : '';

        return `<div style="margin-bottom:14px;page-break-inside:avoid;">
          <p style="margin:0;font-size:11.5pt;line-height:1.45;">
            <strong>Câu ${idx + 1}:</strong> ${q.content}${metaBadge}
          </p>
          ${bodyHtml}
          ${expHtml}
        </div>`;
      })
      .join('\n');

    const htmlDocument = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${config.examTitle}</title>
        <style>
          body { font-family: "Times New Roman", serif; font-size: 12pt; color: #0f172a; line-height: 1.4; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 1.5px solid #0f172a; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width:45%;text-align:center;vertical-align:top;">
              <p style="margin:0;font-size:11pt;font-weight:bold;text-transform:uppercase;">${config.schoolName}</p>
              <p style="margin:2px 0 0 0;font-size:10.5pt;">TỔ CHUYÊN MÔN</p>
            </td>
            <td style="width:55%;text-align:center;vertical-align:top;">
              <p style="margin:0;font-size:12pt;font-weight:bold;text-transform:uppercase;">${config.examTitle}</p>
              <p style="margin:3px 0 0 0;font-size:10.5pt;font-style:italic;">Tổng số: ${list.length} câu hỏi · Ngày xuất: ${dateStr}</p>
            </td>
          </tr>
        </table>
        <hr style="border:0;border-top:1px solid #cbd5e1;margin-bottom:16px;" />
        ${questionsHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlDocument], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `De_Thi_Ngan_Hang_Cau_Hoi_${dateStr}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Đồng bộ toàn bộ ngân hàng câu hỏi lên Cloud Firestore
   */
  async syncAllToFirestore(authorId?: string, authorName?: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const list = this.load();
      const uid = authorId || auth.currentUser?.uid || 'teacher-default';
      const uName = authorName || auth.currentUser?.displayName || 'Giáo viên';
      let synced = 0;

      for (const q of list) {
        const qDocRef = doc(firestoreDb, 'questions', q.id);
        const payload = {
          id: q.id,
          code: q.code,
          subject: q.subject,
          gradeLevel: q.gradeLevel,
          className: q.className || '',
          chapter: q.chapter || '',
          topic: q.topic || '',
          type: q.type,
          difficulty: q.difficulty,
          status: q.status,
          content: q.content,
          authorId: uid,
          authorName: uName,
          createdAt: q.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(qDocRef, payload);
        synced++;
      }
      return { success: true, count: synced };
    } catch (err) {
      console.error('Lỗi đồng bộ Firestore:', err);
      return { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Tải câu hỏi từ Cloud Firestore về kho ứng dụng
   */
  async loadAllFromFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const qCol = collection(firestoreDb, 'questions');
      const snapshot = await getDocs(qCol);
      if (!snapshot.empty) {
        const remoteList: QuestionItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          remoteList.push({
            id: d.id || docSnap.id,
            code: d.code || 'QB-001',
            subject: d.subject || 'Toán học',
            gradeLevel: d.gradeLevel || 10,
            className: d.className || '',
            chapter: d.chapter || '',
            topic: d.topic || '',
            type: d.type || 'single_choice',
            difficulty: d.difficulty || 'Nhận biết',
            status: d.status || 'approved',
            content: d.content || '',
            options: d.options || [],
            statements: d.statements || [],
            acceptedAnswers: d.acceptedAnswers || [],
            rubric: d.rubric || '',
            maxPoints: d.maxPoints || 0.25,
            explanation: d.explanation || '',
            tags: d.tags || [],
            source: d.source || 'manual',
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
            duplicateStatus: 'unique',
            validationIssues: []
          });
        });
        if (remoteList.length > 0) {
          this.save(remoteList);
          return { success: true, count: remoteList.length };
        }
      }
      return { success: true, count: 0 };
    } catch (err) {
      console.error('Lỗi tải từ Firestore:', err);
      return { success: false, count: 0, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

export const questionBankService = new QuestionBankService();
