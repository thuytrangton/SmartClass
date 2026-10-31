export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
  schoolId?: string;
  schoolName?: string;
  createdAt?: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  principal: string;
  academicYear: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g. "10A1"
  code?: string; // e.g. "CLS-10A1-982"
  gradeLevel: number; // 10, 11, 12
  homeroomTeacherId: string;
  homeroomTeacherName: string;
  academicYear: string;
  roomNumber: string;
  studentCount: number;
  maxCapacity: number;
  subjectNames?: string[];
  bannerGradient?: string;
  dotColor?: string;
}

export interface Student {
  id: string;
  code: string; // "HS-10A1-01"
  fullName: string;
  dateOfBirth: string;
  gender: 'Nam' | 'Nữ';
  avatar: string;
  classId: string;
  className: string;
  phone?: string;
  email?: string;
  address: string;
  status: 'active' | 'transferred' | 'suspended';
  // 360 profile stats
  gpa: number;
  conduct: 'Tốt' | 'Khá' | 'Trung bình' | 'Yếu';
  attendanceRate: number; // percentage, e.g. 96
  stars: number; // thi đua / rewards
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  parentRelationship?: string;
  notes?: string;
  healthNotes?: string;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late' | 'early_leave';

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  studentName: string;
  studentCode: string;
  status: AttendanceStatus;
  note?: string;
  recordedByTeacherId: string;
  updatedAt: string;
}

export interface GradeItem {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  semester: 'HK1' | 'HK2';
  tx1?: number; // Thường xuyên 1
  tx2?: number; // Thường xuyên 2
  tx3?: number; // Thường xuyên 3
  gk?: number; // Giữa kỳ (hệ số 2)
  ck?: number; // Cuối kỳ (hệ số 3)
  average?: number;
  notes?: string;
}

export interface GradeHistoryEntry {
  id: string;
  gradeItemId: string;
  studentName: string;
  subject: string;
  columnChanged: string;
  oldValue: number | string | null;
  newValue: number | string | null;
  reason: string;
  changedBy: string;
  timestamp: string;
}

export type AssignmentStatus = 'draft' | 'published' | 'closed';

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  dueDate: string; // ISO string
  createdAt: string;
  totalPoints: number;
  status: AssignmentStatus;
  submissionCount: number;
  gradedCount: number;
  totalStudents: number;
  attachmentName?: string;
  attachmentSize?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
  content?: string;
  fileName?: string;
  fileSize?: string;
  score?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  subject?: string;
  gradeLevel?: number;
  difficulty?: 'Dễ' | 'Trung bình' | 'Khó';
}

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  classId: string;
  className: string;
  teacherId: string;
  durationMinutes: number;
  questions: QuizQuestion[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  totalPoints: number;
  status: 'draft' | 'active' | 'closed';
  dueDate: string;
  attemptsCount: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  completedAt: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: { questionId: string; selectedIndex: number; isCorrect: boolean }[];
}

export interface BehaviorRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  type: 'positive' | 'negative';
  points: number; // e.g. +5 or -3
  category: string; // "Hăng hái phát biểu", "Giúp đỡ bạn", "Đi trễ", "Không làm bài"
  note: string;
  date: string;
  teacherName: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'new' | 'viewed' | 'processing' | 'resolved';

export interface SmartAlert {
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  type: 'attendance' | 'academic' | 'behavior';
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  suggestedAction: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedNote?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetRole: 'all' | 'teachers' | 'students' | 'parents';
  targetClassId?: string; // Optional for class-specific announcements
  targetClassName?: string;
  isUrgent: boolean;
  createdAt: string;
  readCount: number;
}

export interface ScheduleItem {
  id: string;
  dayOfWeek: 2 | 3 | 4 | 5 | 6 | 7; // Thứ 2 - Thứ 7
  period: number; // Tiết 1 - 5 (sáng), 6 - 9 (chiều)
  startTime: string;
  endTime: string;
  subject: string;
  className: string;
  classId: string;
  teacherName: string;
  room: string;
}

export interface LearningResource {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  folder: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'video' | 'link';
  fileSize?: string;
  url?: string;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'auth' | 'student' | 'class' | 'grade' | 'attendance' | 'assignment' | 'system';
  userId: string;
  userName: string;
  userRole: UserRole;
  details: string;
  ipAddress: string;
  timestamp: string;
}
