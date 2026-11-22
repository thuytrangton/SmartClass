import {
  User,
  School,
  ClassRoom,
  Student,
  AttendanceRecord,
  AttendanceStatus,
  GradeItem,
  GradeHistoryEntry,
  Assignment,
  AssignmentTopic,
  Submission,
  SubmissionQuestionAnswer,
  Quiz,
  QuizAttempt,
  BehaviorRecord,
  SmartAlert,
  Announcement,
  ScheduleItem,
  LearningResource,
  ChatMessage,
  AuditLog
} from '../types';
import {
  INITIAL_SCHOOL,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_GRADES,
  INITIAL_GRADE_HISTORY,
  INITIAL_ASSIGNMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_QUIZZES,
  INITIAL_BEHAVIORS,
  INITIAL_ALERTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_SCHEDULE,
  INITIAL_RESOURCES,
  INITIAL_MESSAGES,
  INITIAL_AUDIT_LOGS
} from '../data/mockData';
import {
  db as firestoreDb,
  auth,
  handleFirestoreError,
  OperationType
} from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

type Listener = () => void;

const INITIAL_TOPICS: AssignmentTopic[] = [
  {
    id: 'top-1',
    name: 'Mệnh đề toán học',
    content: 'Khái niệm mệnh đề, mệnh đề chứa biến, mệnh đề phủ định, mệnh đề kéo theo, mệnh đề đảo, hai mệnh đề tương đương và các ký hiệu phổ biến ∀, ∃.',
    subject: 'Toán học',
    classId: 'cls-10a1',
    className: '10A1',
    gradeLevel: 10,
    chapter: 'Chương 1: Mệnh đề và Tập hợp',
    sessionLabel: 'Tiết 1-2 • Thứ 2 (Buổi học hiện tại)',
    isCurrentLesson: true,
    targetObjectiveCount: 4,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z'
  },
  {
    id: 'top-2',
    name: 'Tập hợp và các phép toán trên tập hợp',
    content: 'Cách xác định tập hợp, tập hợp con, hai tập hợp bằng nhau. Các phép toán giao (∩), hợp (∪), hiệu (\\) và phần bù của hai tập hợp số thực.',
    subject: 'Toán học',
    classId: 'cls-10a1',
    className: '10A1',
    gradeLevel: 10,
    chapter: 'Chương 1: Mệnh đề và Tập hợp',
    sessionLabel: 'Tiết 3-4 • Thứ 4 (Buổi học hiện tại)',
    isCurrentLesson: true,
    targetObjectiveCount: 3,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-10-03T08:00:00.000Z',
    updatedAt: '2026-10-03T08:00:00.000Z'
  },
  {
    id: 'top-3',
    name: 'Hàm số bậc hai và đồ thị Parabol',
    content: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tìm trục đối xứng, tọa độ đỉnh, giá trị lớn nhất - nhỏ nhất và ứng dụng thực tế.',
    subject: 'Toán học',
    classId: 'cls-10a1',
    className: '10A1',
    gradeLevel: 10,
    chapter: 'Chương 3: Hàm số bậc hai và đồ thị',
    sessionLabel: 'Tiết 1-2 • Thứ 6 (Buổi học hiện tại)',
    isCurrentLesson: true,
    targetObjectiveCount: 3,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-10-05T08:00:00.000Z',
    updatedAt: '2026-10-05T08:00:00.000Z'
  },
  {
    id: 'top-4',
    name: 'Hệ thức lượng trong tam giác',
    content: 'Định lý côsin, định lý sin, các công thức tính diện tích tam giác (Heron, bán kính đường tròn nội tiếp r, ngoại tiếp R) và bài toán giải tam giác thực tế.',
    subject: 'Toán học',
    classId: 'cls-10a2',
    className: '10A2',
    gradeLevel: 10,
    chapter: 'Chương 4: Hệ thức lượng trong tam giác',
    sessionLabel: 'Tiết 3 • Thứ 5 (Bài học tuần trước)',
    isCurrentLesson: false,
    targetObjectiveCount: 3,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-09-25T08:00:00.000Z',
    updatedAt: '2026-09-25T08:00:00.000Z'
  },
  {
    id: 'top-5',
    name: 'Tổng và hiệu của hai vectơ',
    content: 'Khái niệm vectơ, hai vectơ cùng phương, cùng hướng, bằng nhau. Quy tắc 3 điểm, quy tắc hình bình hành, tính chất trung điểm và trọng tâm tam giác.',
    subject: 'Toán học',
    classId: 'cls-10a2',
    className: '10A2',
    gradeLevel: 10,
    chapter: 'Chương 5: Vectơ',
    sessionLabel: 'Tiết 4 • Thứ 6 (Bài học cũ)',
    isCurrentLesson: false,
    targetObjectiveCount: 2,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z'
  },
  {
    id: 'top-6',
    name: 'Chuyển động thẳng biến đổi đều',
    content: 'Gia tốc trong chuyển động thẳng biến đổi đều, công thức vận tốc v = v0 + at, độ dịch chuyển d = v0.t + ½at² và phương trình liên hệ v² - v0² = 2ad.',
    subject: 'Vật lý',
    classId: 'cls-10a1',
    className: '10A1',
    gradeLevel: 10,
    chapter: 'Chương 2: Động học',
    sessionLabel: 'Tiết 2 • Thứ 3 (Buổi học hiện tại)',
    isCurrentLesson: true,
    targetObjectiveCount: 2,
    targetEssayCount: 1,
    status: 'active',
    teacherId: 'usr-t1',
    teacherName: 'Thầy Nguyễn Văn An',
    createdAt: '2026-10-06T08:00:00.000Z',
    updatedAt: '2026-10-06T08:00:00.000Z'
  }
];

class ReactiveDatabase {
  private school: School = { ...INITIAL_SCHOOL };
  private classes: ClassRoom[] = [...INITIAL_CLASSES];
  private students: Student[] = [...INITIAL_STUDENTS];
  private attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
  private grades: GradeItem[] = [...INITIAL_GRADES];
  private gradeHistory: GradeHistoryEntry[] = [...INITIAL_GRADE_HISTORY];
  private topics: AssignmentTopic[] = [...INITIAL_TOPICS];
  private assignments: Assignment[] = [...INITIAL_ASSIGNMENTS];
  private submissions: Submission[] = [...INITIAL_SUBMISSIONS];
  private quizzes: Quiz[] = [...INITIAL_QUIZZES];
  private quizAttempts: QuizAttempt[] = [];
  private behaviors: BehaviorRecord[] = [...INITIAL_BEHAVIORS];
  private alerts: SmartAlert[] = [...INITIAL_ALERTS];
  private announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
  private schedules: ScheduleItem[] = [...INITIAL_SCHEDULE];
  private resources: LearningResource[] = [...INITIAL_RESOURCES];
  private messages: ChatMessage[] = [...INITIAL_MESSAGES];
  private auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];

  private listeners: Set<Listener> = new Set();
  private isInitialized = false;

  constructor() {
    this.initFirestoreSync();
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Khởi tạo đồng bộ Realtime từ Cloud Firestore và gieo mầm dữ liệu (seed) nếu database trống
   */
  private async initFirestoreSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Đồng bộ Trường học
    try {
      const schoolRef = doc(firestoreDb, 'schools', 'default_school');
      getDoc(schoolRef).then((snap) => {
        if (snap.exists()) {
          this.school = { ...this.school, ...(snap.data() as School) };
          this.notify();
        } else {
          setDoc(schoolRef, this.school).catch((err) => {
            console.warn('Init school seed notice:', err);
          });
        }
      }).catch((err) => {
        console.warn('Get school notice:', err);
      });
    } catch (e) {
      console.warn('School sync init notice:', e);
    }

    // 2. Realtime listener cho Danh sách Lớp học (classes)
    const classesPath = 'classes';
    onSnapshot(collection(firestoreDb, classesPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: ClassRoom[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as ClassRoom));
        this.classes = loaded;
        this.notify();
      } else {
        // Database Firestore trống, seed dữ liệu mẫu
        this.seedInitialClasses();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, classesPath);
    });

    // 3. Realtime listener cho Học sinh (students)
    const studentsPath = 'students';
    onSnapshot(collection(firestoreDb, studentsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Student[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Student));
        this.students = loaded;
        this.notify();
      } else {
        this.seedInitialStudents();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, studentsPath);
    });

    // 4. Realtime listener cho Điểm danh (attendance)
    const attendancePath = 'attendance';
    onSnapshot(collection(firestoreDb, attendancePath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: AttendanceRecord[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as AttendanceRecord));
        this.attendance = loaded;
        this.notify();
      } else {
        this.seedInitialAttendance();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, attendancePath);
    });

    // 5. Realtime listener cho Sổ điểm (grades)
    const gradesPath = 'grades';
    onSnapshot(collection(firestoreDb, gradesPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: GradeItem[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as GradeItem));
        this.grades = loaded;
        this.notify();
      } else {
        this.seedInitialGrades();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, gradesPath);
    });

    // 6. Realtime listener cho Bài tập (assignments)
    const assignmentsPath = 'assignments';
    onSnapshot(collection(firestoreDb, assignmentsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Assignment[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Assignment));
        // Migrate legacy seed records if they still carry old 22-student / Oct-2026 placeholder metadata
        const hasLegacySeed = loaded.some(
          (a) => a.id === 'asn-01' && (a.totalStudents === 22 || a.dueDate === '2026-10-10T23:59:59')
        );
        if (hasLegacySeed) {
          const seedMap = new Map(INITIAL_ASSIGNMENTS.map((a) => [a.id, a]));
          this.assignments = loaded.map((a) => {
            const freshSeed = seedMap.get(a.id);
            if (freshSeed && (a.totalStudents === 22 || a.dueDate?.startsWith('2026-10-'))) {
              setDoc(doc(firestoreDb, 'assignments', a.id), freshSeed, { merge: true }).catch(console.warn);
              return { ...a, ...freshSeed };
            }
            return a;
          });
        } else {
          this.assignments = loaded;
        }
        this.notify();
      } else {
        this.seedInitialAssignments();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, assignmentsPath);
    });

    // 7. Realtime listener cho Bài nộp (submissions)
    const submissionsPath = 'submissions';
    onSnapshot(collection(firestoreDb, submissionsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Submission[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Submission));

        // Normalize any legacy studentId (e.g. 'std-1' -> 'std-10a1-01' or by studentName)
        const studentPool = this.students.length > 0 ? this.students : INITIAL_STUDENTS;
        const validStudentIds = new Set(studentPool.map((s) => s.id));
        const normalizedMap = new Map<string, Submission>();

        loaded.forEach((rawSub) => {
          let resolvedStudentId = rawSub.studentId;
          let resolvedStudentName = rawSub.studentName;

          if (!validStudentIds.has(resolvedStudentId)) {
            // Legacy pattern 'std-1' .. 'std-12'
            const legacyMatch = /^std-(\d+)$/i.exec(resolvedStudentId || '');
            if (legacyMatch) {
              const candidateId = `std-10a1-${legacyMatch[1].padStart(2, '0')}`;
              const candidateSt = studentPool.find((s) => s.id === candidateId);
              if (candidateSt) {
                resolvedStudentId = candidateSt.id;
                resolvedStudentName = candidateSt.fullName;
              }
            }
          }

          if (!validStudentIds.has(resolvedStudentId) && rawSub.studentName) {
            const byName = studentPool.find(
              (s) => s.fullName.trim().toLowerCase() === rawSub.studentName.trim().toLowerCase()
            );
            if (byName) {
              resolvedStudentId = byName.id;
              resolvedStudentName = byName.fullName;
            }
          }

          // Skip orphan submissions that do not belong to any student in the school
          if (!validStudentIds.has(resolvedStudentId)) {
            return;
          }

          const normalizedSub: Submission = {
            ...rawSub,
            studentId: resolvedStudentId,
            studentName: resolvedStudentName
          };

          const key = `${normalizedSub.assignmentId}__${normalizedSub.studentId}`;
          const existing = normalizedMap.get(key);
          if (!existing) {
            normalizedMap.set(key, normalizedSub);
          } else {
            const existingTime = new Date(existing.updatedAt || existing.submittedAt || 0).getTime();
            const nextTime = new Date(normalizedSub.updatedAt || normalizedSub.submittedAt || 0).getTime();
            if (nextTime >= existingTime) {
              normalizedMap.set(key, normalizedSub);
            }
          }
        });

        // Ensure all INITIAL_SUBMISSIONS for asn-01..asn-03 exist if database only had the old 3-item seed
        if (loaded.length <= 3) {
          INITIAL_SUBMISSIONS.forEach((seedSub) => {
            const key = `${seedSub.assignmentId}__${seedSub.studentId}`;
            if (!normalizedMap.has(key)) {
              normalizedMap.set(key, seedSub);
              setDoc(doc(firestoreDb, 'submissions', seedSub.id), seedSub, { merge: true }).catch(console.warn);
            }
          });
        }

        this.submissions = Array.from(normalizedMap.values());
        this.notify();
      } else {
        this.seedInitialSubmissions();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, submissionsPath);
    });

    // 8. Realtime listener cho Bài trắc nghiệm (quizzes)
    const quizzesPath = 'quizzes';
    onSnapshot(collection(firestoreDb, quizzesPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Quiz[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Quiz));
        this.quizzes = loaded;
        this.notify();
      } else {
        this.seedInitialQuizzes();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, quizzesPath);
    });

    // 9. Realtime listener cho Thời khóa biểu (schedules)
    const schedulesPath = 'schedules';
    onSnapshot(collection(firestoreDb, schedulesPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: ScheduleItem[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as ScheduleItem));
        this.schedules = loaded;
        this.notify();
      } else {
        this.seedInitialSchedules();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, schedulesPath);
    });

    // 10. Realtime listener cho Cảnh báo (alerts)
    const alertsPath = 'alerts';
    onSnapshot(collection(firestoreDb, alertsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: SmartAlert[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as SmartAlert));
        this.alerts = loaded;
        this.notify();
      } else {
        this.seedInitialAlerts();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, alertsPath);
    });

    // 11. Realtime listener cho Thông báo (announcements)
    const announcementsPath = 'announcements';
    onSnapshot(collection(firestoreDb, announcementsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Announcement[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Announcement));
        this.announcements = loaded;
        this.notify();
      } else {
        this.seedInitialAnnouncements();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, announcementsPath);
    });

    // 12. Realtime listener cho Nề nếp thi đua (behaviors)
    const behaviorsPath = 'behaviors';
    onSnapshot(collection(firestoreDb, behaviorsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: BehaviorRecord[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as BehaviorRecord));
        this.behaviors = loaded;
        this.notify();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, behaviorsPath);
    });

    // 13. Realtime listener cho Lịch sử điểm (gradeHistory)
    const gradeHistoryPath = 'gradeHistory';
    onSnapshot(collection(firestoreDb, gradeHistoryPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: GradeHistoryEntry[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as GradeHistoryEntry));
        this.gradeHistory = loaded;
        this.notify();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, gradeHistoryPath);
    });

    // 14. Realtime listener cho Kho tài liệu (resources)
    const resourcesPath = 'resources';
    onSnapshot(collection(firestoreDb, resourcesPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: LearningResource[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as LearningResource));
        this.resources = loaded;
        this.notify();
      } else {
        this.seedInitialResources();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, resourcesPath);
    });

    // 15. Realtime listener cho Chủ đề bài tập (topics)
    const topicsPath = 'topics';
    onSnapshot(collection(firestoreDb, topicsPath), (snapshot) => {
      if (!snapshot.empty) {
        const loaded: AssignmentTopic[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as AssignmentTopic));
        this.topics = loaded;
        this.notify();
      } else {
        this.seedInitialTopics();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, topicsPath);
    });
  }

  // --- Seed routines to populate Firestore on first run ---
  private async seedInitialTopics() {
    try {
      for (const top of INITIAL_TOPICS) {
        await setDoc(doc(firestoreDb, 'topics', top.id), top);
      }
    } catch (e) {
      console.warn('Seed topics notice:', e);
    }
  }

  private async seedInitialClasses() {
    try {
      for (const cls of INITIAL_CLASSES) {
        await setDoc(doc(firestoreDb, 'classes', cls.id), cls);
      }
    } catch (e) {
      console.warn('Seed classes notice:', e);
    }
  }

  private async seedInitialStudents() {
    try {
      for (const std of INITIAL_STUDENTS) {
        await setDoc(doc(firestoreDb, 'students', std.id), std);
      }
    } catch (e) {
      console.warn('Seed students notice:', e);
    }
  }

  private async seedInitialAttendance() {
    try {
      for (const att of INITIAL_ATTENDANCE) {
        await setDoc(doc(firestoreDb, 'attendance', att.id), att);
      }
    } catch (e) {
      console.warn('Seed attendance notice:', e);
    }
  }

  private async seedInitialGrades() {
    try {
      for (const gr of INITIAL_GRADES) {
        await setDoc(doc(firestoreDb, 'grades', gr.id), gr);
      }
    } catch (e) {
      console.warn('Seed grades notice:', e);
    }
  }

  private async seedInitialAssignments() {
    try {
      for (const asn of INITIAL_ASSIGNMENTS) {
        await setDoc(doc(firestoreDb, 'assignments', asn.id), asn);
      }
    } catch (e) {
      console.warn('Seed assignments notice:', e);
    }
  }

  private async seedInitialSubmissions() {
    try {
      for (const sub of INITIAL_SUBMISSIONS) {
        await setDoc(doc(firestoreDb, 'submissions', sub.id), sub);
      }
    } catch (e) {
      console.warn('Seed submissions notice:', e);
    }
  }

  private async seedInitialQuizzes() {
    try {
      for (const qz of INITIAL_QUIZZES) {
        await setDoc(doc(firestoreDb, 'quizzes', qz.id), qz);
      }
    } catch (e) {
      console.warn('Seed quizzes notice:', e);
    }
  }

  private async seedInitialSchedules() {
    try {
      for (const sch of INITIAL_SCHEDULE) {
        await setDoc(doc(firestoreDb, 'schedules', sch.id), sch);
      }
    } catch (e) {
      console.warn('Seed schedules notice:', e);
    }
  }

  private async seedInitialAlerts() {
    try {
      for (const alt of INITIAL_ALERTS) {
        await setDoc(doc(firestoreDb, 'alerts', alt.id), alt);
      }
    } catch (e) {
      console.warn('Seed alerts notice:', e);
    }
  }

  private async seedInitialAnnouncements() {
    try {
      for (const anc of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(firestoreDb, 'announcements', anc.id), anc);
      }
    } catch (e) {
      console.warn('Seed announcements notice:', e);
    }
  }

  private async seedInitialResources() {
    try {
      for (const res of INITIAL_RESOURCES) {
        await setDoc(doc(firestoreDb, 'resources', res.id), res);
      }
    } catch (e) {
      console.warn('Seed resources notice:', e);
    }
  }

  // School
  public getSchool(): School {
    return { ...this.school };
  }
  public async updateSchool(updated: Partial<School>) {
    this.school = { ...this.school, ...updated };
    const path = 'schools/default_school';
    try {
      await setDoc(doc(firestoreDb, 'schools', 'default_school'), this.school, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
    this.addAuditLog('Cập nhật thông tin trường', 'system', 'Hệ thống đã cập nhật thông tin chung của trường.');
    this.notify();
  }

  // Classes
  public getClasses(): ClassRoom[] {
    return [...this.classes];
  }
  public getClassById(id: string): ClassRoom | undefined {
    return this.classes.find((c) => c.id === id);
  }
  public addClass(item: Omit<ClassRoom, 'id' | 'studentCount'>): ClassRoom {
    const newClass: ClassRoom = {
      ...item,
      id: `cls-${Date.now()}`,
      studentCount: 0
    };
    this.classes.unshift(newClass);
    const path = `classes/${newClass.id}`;
    setDoc(doc(firestoreDb, 'classes', newClass.id), newClass).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Tạo lớp học mới', 'class', `Tạo lớp ${newClass.name} - GVCN: ${newClass.homeroomTeacherName}`);
    this.notify();
    return newClass;
  }
  public updateClass(id: string, updates: Partial<ClassRoom>) {
    this.classes = this.classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
    const path = `classes/${id}`;
    setDoc(doc(firestoreDb, 'classes', id), updates, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Cập nhật lớp học', 'class', `Cập nhật thông tin lớp ID: ${id}`);
    this.notify();
  }
  public deleteClass(id: string) {
    const cls = this.classes.find((c) => c.id === id);
    this.classes = this.classes.filter((c) => c.id !== id);
    const path = `classes/${id}`;
    deleteDoc(doc(firestoreDb, 'classes', id)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, path);
    });
    this.addAuditLog('Xóa lớp học', 'class', `Xóa lớp ${cls?.name || id}`);
    this.notify();
  }

  // Students
  public getStudents(): Student[] {
    return [...this.students];
  }
  public getStudentsByClass(classId: string): Student[] {
    return this.students.filter((s) => s.classId === classId);
  }
  public getStudentById(id: string): Student | undefined {
    return this.students.find((s) => s.id === id);
  }
  public addStudent(studentData: Omit<Student, 'id'>): Student {
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`
    };
    this.students.push(newStudent);
    // update class student count
    const cls = this.classes.find((c) => c.id === newStudent.classId);
    if (cls) {
      cls.studentCount = this.students.filter((s) => s.classId === cls.id).length;
      setDoc(doc(firestoreDb, 'classes', cls.id), { studentCount: cls.studentCount }, { merge: true }).catch(console.warn);
    }
    const path = `students/${newStudent.id}`;
    setDoc(doc(firestoreDb, 'students', newStudent.id), newStudent).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Thêm học sinh mới', 'student', `Thêm học sinh ${newStudent.fullName} (${newStudent.code}) vào lớp ${newStudent.className}`);
    this.notify();
    return newStudent;
  }
  public updateStudent(id: string, updates: Partial<Student>) {
    this.students = this.students.map((s) => (s.id === id ? { ...s, ...updates } : s));
    const path = `students/${id}`;
    setDoc(doc(firestoreDb, 'students', id), updates, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Cập nhật hồ sơ học sinh', 'student', `Cập nhật thông tin học sinh ID: ${id}`);
    this.notify();
  }
  public deleteStudent(id: string) {
    const std = this.students.find((s) => s.id === id);
    this.students = this.students.filter((s) => s.id !== id);
    if (std) {
      const cls = this.classes.find((c) => c.id === std.classId);
      if (cls) {
        cls.studentCount = this.students.filter((s) => s.classId === cls.id).length;
        setDoc(doc(firestoreDb, 'classes', cls.id), { studentCount: cls.studentCount }, { merge: true }).catch(console.warn);
      }
      const path = `students/${id}`;
      deleteDoc(doc(firestoreDb, 'students', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, path);
      });
      this.addAuditLog('Xóa học sinh', 'student', `Xóa học sinh ${std.fullName} (${std.code}) khỏi hệ thống`);
    }
    this.notify();
  }

  // Attendance
  public getAttendanceByClassAndDate(classId: string, date: string): AttendanceRecord[] {
    return this.attendance.filter((a) => a.classId === classId && a.date === date);
  }
  public markAttendance(record: Omit<AttendanceRecord, 'id' | 'updatedAt'>) {
    const existingIndex = this.attendance.findIndex(
      (a) => a.classId === record.classId && a.studentId === record.studentId && a.date === record.date
    );
    const updatedRecord: AttendanceRecord = {
      ...record,
      id: existingIndex >= 0 ? this.attendance[existingIndex].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      this.attendance[existingIndex] = updatedRecord;
    } else {
      this.attendance.push(updatedRecord);
    }
    const path = `attendance/${updatedRecord.id}`;
    setDoc(doc(firestoreDb, 'attendance', updatedRecord.id), updatedRecord).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.notify();
  }
  public bulkMarkAllPresent(classId: string, date: string, teacherId: string) {
    const classStudents = this.getStudentsByClass(classId);
    classStudents.forEach((student) => {
      this.markAttendance({
        classId,
        date,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        status: 'present',
        recordedByTeacherId: teacherId
      });
    });
    this.addAuditLog('Điểm danh nhanh', 'attendance', `Điểm danh tất cả Có mặt cho lớp ${classId} ngày ${date}`);
    this.notify();
  }

  // Grades
  public getGradesByClassAndSubject(classId: string, subject: string, semester: 'HK1' | 'HK2' = 'HK1'): GradeItem[] {
    return this.grades.filter((g) => g.classId === classId && g.subject === subject && g.semester === semester);
  }
  public getGradesByStudent(studentId: string): GradeItem[] {
    return this.grades.filter((g) => g.studentId === studentId);
  }
  public updateGradeItem(
    gradeId: string,
    field: 'tx1' | 'tx2' | 'tx3' | 'gk' | 'ck',
    value: number | undefined,
    reason: string,
    teacherName: string
  ) {
    const index = this.grades.findIndex((g) => g.id === gradeId);
    if (index >= 0) {
      const oldItem = this.grades[index];
      const oldValue = oldItem[field] ?? null;

      const updated = { ...oldItem, [field]: value };
      // Recalculate average: (tx1 + tx2 + tx3 + 2*gk + 3*ck) / total_weight
      let totalPoints = 0;
      let totalWeight = 0;
      if (updated.tx1 !== undefined) { totalPoints += updated.tx1; totalWeight += 1; }
      if (updated.tx2 !== undefined) { totalPoints += updated.tx2; totalWeight += 1; }
      if (updated.tx3 !== undefined) { totalPoints += updated.tx3; totalWeight += 1; }
      if (updated.gk !== undefined) { totalPoints += updated.gk * 2; totalWeight += 2; }
      if (updated.ck !== undefined) { totalPoints += updated.ck * 3; totalWeight += 3; }

      updated.average = totalWeight > 0 ? parseFloat((totalPoints / totalWeight).toFixed(1)) : undefined;
      this.grades[index] = updated;

      // Update Firestore grades
      const gradePath = `grades/${gradeId}`;
      setDoc(doc(firestoreDb, 'grades', gradeId), updated, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, gradePath);
      });

      // Add to grade history
      const historyItem: GradeHistoryEntry = {
        id: `gh-${Date.now()}`,
        gradeItemId: gradeId,
        studentName: updated.studentName,
        subject: updated.subject,
        columnChanged: field.toUpperCase(),
        oldValue: oldValue,
        newValue: value ?? null,
        reason: reason || 'Cập nhật điểm định kỳ',
        changedBy: teacherName,
        timestamp: new Date().toLocaleString('vi-VN')
      };
      this.gradeHistory.unshift(historyItem);
      const historyPath = `gradeHistory/${historyItem.id}`;
      setDoc(doc(firestoreDb, 'gradeHistory', historyItem.id), historyItem).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, historyPath);
      });

      this.addAuditLog('Chỉnh sửa sổ điểm', 'grade', `Cập nhật điểm ${field.toUpperCase()} của ${updated.studentName} thành ${value}`);
      this.notify();
    }
  }
  public getGradeHistory(): GradeHistoryEntry[] {
    return [...this.gradeHistory];
  }

  // Topics (Quản lý chủ đề bài tập)
  public getTopics(): AssignmentTopic[] {
    return [...this.topics];
  }
  public getTopicById(id: string): AssignmentTopic | undefined {
    return this.topics.find((t) => t.id === id);
  }
  public addTopic(topicData: Omit<AssignmentTopic, 'id' | 'createdAt' | 'updatedAt'>): AssignmentTopic {
    const nowIso = new Date().toISOString();
    const newTopic: AssignmentTopic = {
      ...topicData,
      id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: (topicData.content || '').slice(0, 8000),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.topics.unshift(newTopic);
    const path = `topics/${newTopic.id}`;
    setDoc(doc(firestoreDb, 'topics', newTopic.id), newTopic).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Tạo chủ đề mới', 'assignment', `Tạo chủ đề "${newTopic.name}" (${newTopic.subject} - Lớp ${newTopic.className})`);
    this.notify();
    return newTopic;
  }
  public updateTopic(id: string, updates: Partial<AssignmentTopic>): AssignmentTopic | undefined {
    const idx = this.topics.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const nowIso = new Date().toISOString();
    const updated: AssignmentTopic = {
      ...this.topics[idx],
      ...updates,
      content: updates.content !== undefined ? updates.content.slice(0, 8000) : this.topics[idx].content,
      updatedAt: nowIso
    };
    this.topics[idx] = updated;
    const path = `topics/${id}`;
    setDoc(doc(firestoreDb, 'topics', id), updated, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Cập nhật chủ đề', 'assignment', `Cập nhật chủ đề "${updated.name}"`);
    this.notify();
    return updated;
  }
  public duplicateTopic(id: string, customName?: string): AssignmentTopic | undefined {
    const source = this.topics.find((t) => t.id === id);
    if (!source) return undefined;
    const nowIso = new Date().toISOString();
    const duplicated: AssignmentTopic = {
      ...source,
      id: `top-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: customName?.trim() || `${source.name} (Bản sao)`,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.topics.unshift(duplicated);
    const path = `topics/${duplicated.id}`;
    setDoc(doc(firestoreDb, 'topics', duplicated.id), duplicated).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog(
      'Nhân bản chủ đề',
      'assignment',
      `Nhân bản chủ đề "${source.name}" thành "${duplicated.name}"`
    );
    this.notify();
    return duplicated;
  }
  public isTopicReferencedByAssignments(topicId: string, topicName?: string): boolean {
    return this.assignments.some((a) => {
      if (a.topicIds && a.topicIds.includes(topicId)) return true;
      if (topicName && a.topicNames && a.topicNames.includes(topicName)) return true;
      return false;
    });
  }
  public deleteOrArchiveTopic(
    id: string,
    forceDelete = false
  ): { mode: 'deleted' | 'archived'; topic?: AssignmentTopic } {
    const topic = this.topics.find((t) => t.id === id);
    if (!topic) return { mode: 'deleted' };
    const isReferenced = this.isTopicReferencedByAssignments(topic.id, topic.name);
    if (isReferenced && !forceDelete) {
      // Không xóa cứng chủ đề đang được bài tập tham chiếu, ưu tiên lưu trữ/ẩn
      const archived = this.updateTopic(id, { status: 'archived' });
      this.addAuditLog('Lưu trữ chủ đề', 'assignment', `Chủ đề "${topic.name}" đang được bài tập tham chiếu nên chuyển sang Lưu trữ/Ẩn.`);
      return { mode: 'archived', topic: archived };
    }
    this.topics = this.topics.filter((t) => t.id !== id);
    const path = `topics/${id}`;
    deleteDoc(doc(firestoreDb, 'topics', id)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, path);
    });
    this.addAuditLog('Xóa chủ đề', 'assignment', `Xóa chủ đề "${topic.name}"`);
    this.notify();
    return { mode: 'deleted', topic };
  }

  // Assignments
  public getAssignments(classId?: string): Assignment[] {
    if (classId) {
      return this.assignments.filter(
        (a) => a.classId === classId || (a.targetClassIds && a.targetClassIds.includes(classId))
      );
    }
    return [...this.assignments];
  }
  public getAssignmentById(id: string): Assignment | undefined {
    return this.assignments.find((a) => a.id === id);
  }
  public addAssignment(
    assignment: Omit<Assignment, 'id' | 'createdAt' | 'submissionCount' | 'gradedCount'>
  ): Assignment {
    const nowIso = new Date().toISOString();
    const targetIds = assignment.targetClassIds && assignment.targetClassIds.length > 0
      ? assignment.targetClassIds
      : [assignment.classId];

    const classStudents = this.students.filter(
      (s) => targetIds.includes(s.classId) && s.status === 'active'
    );
    const recipientIds = classStudents.map((s) => s.id);

    const newAsn: Assignment = {
      ...assignment,
      id: `asn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: nowIso,
      assignedAt: assignment.status === 'published' ? nowIso : assignment.assignedAt,
      updatedAt: nowIso,
      submissionCount: 0,
      gradedCount: 0,
      totalStudents: recipientIds.length || assignment.totalStudents || 0,
      assignedStudentIds: recipientIds
    };

    this.assignments.unshift(newAsn);
    const path = `assignments/${newAsn.id}`;
    setDoc(doc(firestoreDb, 'assignments', newAsn.id), newAsn).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });

    if (newAsn.status === 'published') {
      const formattedDeadline = newAsn.dueDate
        ? new Date(newAsn.dueDate).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : 'Chưa xác định';

      const targetLabel = newAsn.targetClassNames && newAsn.targetClassNames.length > 0
        ? newAsn.targetClassNames.join(', ')
        : newAsn.className;

      this.addAnnouncement({
        title: `Bài tập mới môn ${newAsn.subject}: ${newAsn.title}`,
        content: `${newAsn.teacherName} vừa giao "${newAsn.title}" cho lớp ${targetLabel} (${recipientIds.length} học sinh). Hạn hoàn thành: ${formattedDeadline}.`,
        authorId: newAsn.teacherId,
        authorName: newAsn.teacherName,
        targetRole: 'students',
        targetClassId: newAsn.classId,
        targetClassName: targetLabel,
        isUrgent: false
      });

      this.addAuditLog(
        'Giao bài tập mới',
        'assignment',
        `Giao bài tập "${newAsn.title}" cho lớp ${targetLabel} (${recipientIds.length} học sinh) - Hạn nộp: ${formattedDeadline}`
      );
    } else {
      this.addAuditLog(
        'Lưu bản nháp bài tập',
        'assignment',
        `Lưu nháp bài tập "${newAsn.title}" cho lớp ${newAsn.className}`
      );
    }

    this.notify();
    return newAsn;
  }

  public copyAssignment(
    id: string,
    options?: {
      title?: string;
      classId?: string;
      dueDate?: string;
      keepSnapshots?: boolean;
      teacherName?: string;
    }
  ): Assignment | undefined {
    const source = this.assignments.find((a) => a.id === id);
    if (!source) return undefined;
    const nowIso = new Date().toISOString();
    const targetCls = options?.classId
      ? this.classes.find((c) => c.id === options.classId)
      : this.classes.find((c) => c.id === source.classId);
    const nextClassId = targetCls?.id || source.classId;
    const nextClassName = targetCls?.name || source.className;
    const classStudents = this.students.filter(
      (s) => s.classId === nextClassId && s.status === 'active'
    );
    const keepSnaps = options?.keepSnapshots !== undefined ? options.keepSnapshots : true;

    const copied: Assignment = {
      ...source,
      id: `asn-${Date.now()}-copy`,
      code: `${source.code || 'BT'}-COPY`,
      title: options?.title?.trim() || `${source.title} (Bản sao)`,
      classId: nextClassId,
      className: nextClassName,
      targetClassIds: [nextClassId],
      targetClassNames: [nextClassName],
      assignedStudentIds: classStudents.map((s) => s.id),
      totalStudents: classStudents.length || source.totalStudents || 0,
      dueDate: options?.dueDate || source.dueDate,
      questionSnapshots: keepSnaps ? source.questionSnapshots : [],
      status: 'draft',
      receiveStatus: 'draft',
      withdrawnAt: undefined,
      withdrawReason: undefined,
      dueOverrides: {},
      reminderHistory: {},
      createdAt: nowIso,
      updatedAt: nowIso,
      assignedAt: undefined,
      submissionCount: 0,
      gradedCount: 0,
      publishedCount: 0
    };
    this.assignments.unshift(copied);
    const path = `assignments/${copied.id}`;
    setDoc(doc(firestoreDb, 'assignments', copied.id), copied).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog(
      'Sao chép bài tập',
      'assignment',
      `${options?.teacherName || source.teacherName} sao chép bài tập "${source.title}" thành bản nháp "${copied.title}" (Lớp ${nextClassName})`
    );
    this.notify();
    return copied;
  }

  public closeAssignment(id: string, teacherName: string, reason?: string): Assignment | undefined {
    const res = this.updateAssignment(id, {
      status: 'closed',
      receiveStatus: 'closed',
      closeReason: reason || 'Giáo viên đóng nhận bài'
    });
    if (res) {
      this.addAuditLog(
        'Đóng nhận bài tập',
        'assignment',
        `${teacherName} đã đóng nhận bài "${res.title}" (Lớp ${res.className}). Lý do: ${reason || 'Đóng theo kế hoạch'}`
      );
    }
    return res;
  }

  public toggleAssignmentReceiveStatus(
    id: string,
    targetStatus: 'open' | 'closed',
    reason: string,
    teacherName: string
  ): Assignment | undefined {
    const asn = this.assignments.find((a) => a.id === id);
    if (!asn) return undefined;
    const nextStatus = targetStatus === 'open' ? 'published' : 'closed';
    const updated = this.updateAssignment(id, {
      status: nextStatus,
      receiveStatus: targetStatus,
      closeReason: reason
    });
    if (updated) {
      this.addAuditLog(
        targetStatus === 'open' ? 'Mở lại nhận bài tập' : 'Đóng nhận bài tập',
        'assignment',
        `${teacherName} đã ${targetStatus === 'open' ? 'mở lại nhận bài' : 'đóng nhận bài'} "${updated.title}". Lý do: ${reason}`
      );
    }
    return updated;
  }

  public withdrawAssignment(id: string, reason: string, teacherName: string): Assignment | undefined {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    const nowIso = new Date().toISOString();
    const current = this.assignments[idx];
    const updated: Assignment = {
      ...current,
      status: 'withdrawn',
      receiveStatus: 'withdrawn',
      withdrawnAt: nowIso,
      withdrawReason: reason,
      updatedAt: nowIso
    };
    this.assignments[idx] = updated;
    const path = `assignments/${id}`;
    setDoc(doc(firestoreDb, 'assignments', id), updated, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog(
      'Thu hồi lượt giao bài tập',
      'assignment',
      `${teacherName} đã thu hồi bài tập "${current.title}" (Lớp ${current.className}). Lý do: ${reason}. Dữ liệu bài nộp và điểm lịch sử được giữ nguyên.`
    );
    this.notify();
    return updated;
  }

  public reassignAssignment(
    sourceId: string,
    targetClassIds: string[],
    newDueDate: string,
    customTitle: string,
    teacherName: string
  ): Assignment | undefined {
    const source = this.assignments.find((a) => a.id === sourceId);
    if (!source) return undefined;
    const chosenClasses = this.classes.filter((c) => targetClassIds.includes(c.id));
    const primaryClass = chosenClasses[0] || this.classes.find((c) => c.id === source.classId);
    const nowIso = new Date().toISOString();
    return this.addAssignment({
      ...source,
      title: customTitle.trim() || source.title,
      classId: primaryClass?.id || source.classId,
      className: chosenClasses.map((c) => c.name).join(', ') || source.className,
      targetClassIds: chosenClasses.map((c) => c.id),
      targetClassNames: chosenClasses.map((c) => c.name),
      openAt: nowIso,
      dueDate: newDueDate,
      status: 'published',
      receiveStatus: 'open',
      withdrawnAt: undefined,
      withdrawReason: undefined,
      dueOverrides: {},
      reminderHistory: {},
      teacherName: teacherName || source.teacherName
    });
  }

  public extendAssignmentDeadline(
    id: string,
    newDueDate: string,
    reason: string,
    teacherName: string,
    studentIds?: string[]
  ): Assignment | undefined {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    const current = this.assignments[idx];
    const nowIso = new Date().toISOString();

    // Case 1: Gia hạn cá nhân hoặc một nhóm học sinh cụ thể
    if (studentIds && studentIds.length > 0) {
      const nextOverrides = { ...(current.dueOverrides || {}) };
      studentIds.forEach((sid) => {
        nextOverrides[sid] = {
          studentId: sid,
          dueDate: newDueDate,
          reason,
          updatedBy: teacherName,
          updatedAt: nowIso
        };
      });

      const updatedAsn: Assignment = {
        ...current,
        dueOverrides: nextOverrides,
        updatedAt: nowIso
      };
      this.assignments[idx] = updatedAsn;
      const path = `assignments/${id}`;
      setDoc(
        doc(firestoreDb, 'assignments', id),
        { dueOverrides: nextOverrides, updatedAt: nowIso },
        { merge: true }
      ).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, path);
      });

      const newDueMs = new Date(newDueDate).getTime();
      this.submissions
        .filter((s) => s.assignmentId === id && studentIds.includes(s.studentId))
        .forEach((sub) => {
          sub.dueOverrideAt = newDueDate;
          if (sub.submittedAt) {
            const subMs = new Date(sub.submittedAt).getTime();
            const isLateNow = subMs > newDueMs;
            sub.isLate = isLateNow;
            sub.lateMinutes = isLateNow ? Math.max(1, Math.round((subMs - newDueMs) / 60000)) : 0;
            if (sub.status === 'submitted' || sub.status === 'late') {
              sub.status = isLateNow ? 'late' : 'submitted';
            }
          }
          sub.updatedAt = nowIso;
          setDoc(doc(firestoreDb, 'submissions', sub.id), sub, { merge: true }).catch(console.warn);
        });

      this.addAuditLog(
        'Gia hạn nộp bài cá nhân/nhóm',
        'assignment',
        `${teacherName} gia hạn bài "${current.title}" cho ${studentIds.length} học sinh tới ${new Date(newDueDate).toLocaleString('vi-VN')}. Lý do: ${reason}`
      );
      this.notify();
      return updatedAsn;
    }

    // Case 2: Gia hạn cho toàn bộ lớp
    const updated = this.updateAssignmentDeadline(id, newDueDate, teacherName);
    if (updated && reason) {
      this.addAuditLog(
        'Gia hạn nộp bài cả lớp',
        'assignment',
        `${teacherName} gia hạn bài "${updated.title}" tới ${new Date(newDueDate).toLocaleString('vi-VN')}. Lý do: ${reason}`
      );
    }
    return updated;
  }

  public remindStudentsAdvanced(
    id: string,
    studentIds: string[],
    channel: 'in_app' | 'email' | 'parent_app',
    message: string,
    teacherName: string,
    forceDuplicate = false
  ): { sentCount: number; skippedCount: number; failedCount: number; recipientNames: string[] } {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return { sentCount: 0, skippedCount: 0, failedCount: 0, recipientNames: [] };
    const asn = this.assignments[idx];
    const nowMs = Date.now();
    const nowIso = new Date().toISOString();
    const history = { ...(asn.reminderHistory || {}) };

    let sentCount = 0;
    let skippedCount = 0;
    const recipientNames: string[] = [];

    studentIds.forEach((sid) => {
      const lastSentIso = history[sid];
      const isRecent =
        !forceDuplicate && lastSentIso && nowMs - new Date(lastSentIso).getTime() < 15 * 60 * 1000;
      if (isRecent) {
        skippedCount += 1;
      } else {
        history[sid] = nowIso;
        sentCount += 1;
        const st = this.students.find((s) => s.id === sid);
        if (st) recipientNames.push(st.fullName);
      }
    });

    if (sentCount > 0) {
      const updatedAsn: Assignment = {
        ...asn,
        reminderHistory: history,
        updatedAt: nowIso
      };
      this.assignments[idx] = updatedAsn;
      setDoc(
        doc(firestoreDb, 'assignments', id),
        { reminderHistory: history, updatedAt: nowIso },
        { merge: true }
      ).catch(console.warn);

      this.addAnnouncement({
        title: `Nhắc nộp bài tập: ${asn.title}`,
        content:
          message.trim() ||
          `${teacherName} nhắc ${sentCount} học sinh lớp ${asn.className} hoàn thành bài "${asn.title}".`,
        authorId: asn.teacherId,
        authorName: teacherName,
        targetRole: channel === 'parent_app' ? 'parents' : 'students',
        targetClassId: asn.classId,
        targetClassName: asn.className,
        isUrgent: true
      });

      this.addAuditLog(
        'Gửi nhắc nộp bài tập',
        'assignment',
        `${teacherName} gửi nhắc nộp bài "${asn.title}" qua kênh ${channel} cho ${sentCount} học sinh (${skippedCount} bỏ qua chống trùng)`
      );
      this.notify();
    }

    return { sentCount, skippedCount, failedCount: 0, recipientNames };
  }

  public remindUnsubmittedStudents(id: string, teacherName: string): number {
    const asn = this.assignments.find((a) => a.id === id);
    if (!asn) return 0;
    const targetIds = asn.targetClassIds && asn.targetClassIds.length > 0 ? asn.targetClassIds : [asn.classId];
    const classStudents = this.students.filter((s) => targetIds.includes(s.classId) && s.status === 'active');
    const submittedIds = new Set(
      this.submissions
        .filter((s) => s.assignmentId === id && (s.status === 'submitted' || s.status === 'late' || s.status === 'graded'))
        .map((s) => s.studentId)
    );
    const unsubmitted = classStudents.filter((s) => !submittedIds.has(s.id));
    if (unsubmitted.length > 0) {
      const formattedDeadline = asn.dueDate
        ? new Date(asn.dueDate).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : '';
      this.addAnnouncement({
        title: `Nhắc nhở hoàn thành bài tập: ${asn.title}`,
        content: `${teacherName} nhắc ${unsubmitted.length} học sinh lớp ${asn.className} khẩn trương hoàn thành bài "${asn.title}" trước hạn ${formattedDeadline}.`,
        authorId: asn.teacherId,
        authorName: teacherName,
        targetRole: 'students',
        targetClassId: asn.classId,
        targetClassName: asn.className,
        isUrgent: true
      });
      this.addAuditLog('Nhắc nộp bài tập', 'assignment', `Gửi thông báo nhắc nộp bài "${asn.title}" cho ${unsubmitted.length} học sinh chưa nộp`);
    }
    return unsubmitted.length;
  }

  public updateAssignment(id: string, updates: Partial<Assignment>): Assignment | undefined {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;

    const current = this.assignments[idx];
    const nowIso = new Date().toISOString();
    const wasDraft = current.status === 'draft';
    const isNowPublished = updates.status === 'published';

    let assignedStudentIds = updates.assignedStudentIds || current.assignedStudentIds;
    let totalStudents = updates.totalStudents ?? current.totalStudents;

    const targetClassIds = updates.targetClassIds && updates.targetClassIds.length > 0
      ? updates.targetClassIds
      : [updates.classId || current.classId];

    if ((wasDraft && isNowPublished) || updates.classId || updates.targetClassIds) {
      const classStudents = this.students.filter((s) => targetClassIds.includes(s.classId) && s.status === 'active');
      assignedStudentIds = classStudents.map((s) => s.id);
      totalStudents = assignedStudentIds.length;
    }

    const updatedAsn: Assignment = {
      ...current,
      ...updates,
      assignedStudentIds,
      totalStudents,
      assignedAt: wasDraft && isNowPublished ? nowIso : current.assignedAt || current.createdAt,
      updatedAt: nowIso
    };

    this.assignments[idx] = updatedAsn;
    const path = `assignments/${id}`;
    setDoc(doc(firestoreDb, 'assignments', id), updatedAsn, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });

    if (wasDraft && isNowPublished) {
      const formattedDeadline = updatedAsn.dueDate
        ? new Date(updatedAsn.dueDate).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        : '';

      this.addAnnouncement({
        title: `Bài tập mới môn ${updatedAsn.subject}: ${updatedAsn.title}`,
        content: `${updatedAsn.teacherName} vừa phát hành bài tập "${updatedAsn.title}" cho lớp ${updatedAsn.className} (${totalStudents} học sinh). Hạn hoàn thành: ${formattedDeadline}.`,
        authorId: updatedAsn.teacherId,
        authorName: updatedAsn.teacherName,
        targetRole: 'students',
        targetClassId: updatedAsn.classId,
        targetClassName: updatedAsn.className,
        isUrgent: false
      });

      this.addAuditLog(
        'Phát hành bài tập từ bản nháp',
        'assignment',
        `Giao bài tập "${updatedAsn.title}" cho lớp ${updatedAsn.className} (${totalStudents} học sinh)`
      );
    } else {
      this.addAuditLog(
        'Cập nhật bài tập',
        'assignment',
        `Cập nhật bài tập "${updatedAsn.title}" (Lớp ${updatedAsn.className})`
      );
    }

    this.notify();
    return updatedAsn;
  }

  public updateAssignmentDeadline(id: string, newDueDate: string, teacherName: string): Assignment | undefined {
    const idx = this.assignments.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;

    const current = this.assignments[idx];
    const nowIso = new Date().toISOString();
    const updatedAsn: Assignment = {
      ...current,
      dueDate: newDueDate,
      updatedAt: nowIso
    };

    this.assignments[idx] = updatedAsn;
    const path = `assignments/${id}`;
    setDoc(doc(firestoreDb, 'assignments', id), { dueDate: newDueDate, updatedAt: nowIso }, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });

    // Re-evaluate late status for already submitted (ungraded) submissions against new deadline
    const newDueMs = new Date(newDueDate).getTime();
    this.submissions
      .filter((s) => s.assignmentId === id && (s.status === 'submitted' || s.status === 'late'))
      .forEach((sub) => {
        const effectiveDueIso = updatedAsn.dueOverrides?.[sub.studentId]?.dueDate || newDueDate;
        const effectiveDueMs = new Date(effectiveDueIso).getTime() || newDueMs;
        const subMs = new Date(sub.submittedAt).getTime();
        const isLateNow = subMs > effectiveDueMs;
        const nextStatus = isLateNow ? 'late' : 'submitted';
        if (sub.status !== nextStatus || sub.isLate !== isLateNow) {
          sub.status = nextStatus;
          sub.isLate = isLateNow;
          sub.lateMinutes = isLateNow ? Math.max(1, Math.round((subMs - effectiveDueMs) / 60000)) : 0;
          sub.updatedAt = nowIso;
          setDoc(doc(firestoreDb, 'submissions', sub.id), sub, { merge: true }).catch(console.warn);
        }
      });

    if (updatedAsn.status === 'published') {
      const formattedDeadline = new Date(newDueDate).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      this.addAnnouncement({
        title: `Cập nhật hạn nộp bài tập: ${updatedAsn.title}`,
        content: `${teacherName} đã điều chỉnh thời hạn làm bài "${updatedAsn.title}" (Lớp ${updatedAsn.className}) sang hạn mới: ${formattedDeadline}.`,
        authorId: updatedAsn.teacherId,
        authorName: teacherName,
        targetRole: 'students',
        targetClassId: updatedAsn.classId,
        targetClassName: updatedAsn.className,
        isUrgent: true
      });
    }

    this.addAuditLog(
      'Điều chỉnh hạn nộp bài tập',
      'assignment',
      `Đổi hạn nộp bài "${updatedAsn.title}" sang ${new Date(newDueDate).toLocaleString('vi-VN')}`
    );

    this.notify();
    return updatedAsn;
  }

  public getSubmissions(assignmentId: string): Submission[] {
    return this.submissions.filter((s) => s.assignmentId === assignmentId);
  }

  private syncAssignmentCounts(assignmentId: string) {
    const asn = this.assignments.find((a) => a.id === assignmentId);
    if (!asn) return;
    const targetIds =
      asn.targetClassIds && asn.targetClassIds.length > 0 ? asn.targetClassIds : [asn.classId];
    const recipients = this.students.filter(
      (s) =>
        (asn.assignedStudentIds && asn.assignedStudentIds.includes(s.id)) ||
        (targetIds.includes(s.classId) && s.status === 'active')
    );
    const recipientIds = new Set(recipients.map((r) => r.id));
    const asnSubs = this.submissions.filter(
      (s) =>
        s.assignmentId === asn.id &&
        (recipientIds.size === 0 || recipientIds.has(s.studentId))
    );

    const validSubs = asnSubs.filter(
      (s) =>
        s.status === 'submitted' ||
        s.status === 'late' ||
        s.status === 'graded' ||
        s.status === 'redo_requested'
    );
    const uniqueSubmitted = new Set(validSubs.map((s) => s.studentId));
    const uniqueGraded = new Set(
      validSubs
        .filter(
          (s) =>
            s.status === 'graded' ||
            s.gradeStatus === 'graded' ||
            s.gradeStatus === 'published'
        )
        .map((s) => s.studentId)
    );
    const uniquePublished = new Set(
      validSubs.filter((s) => s.gradeStatus === 'published').map((s) => s.studentId)
    );

    asn.totalStudents = recipients.length || asn.totalStudents || 0;
    asn.submissionCount = uniqueSubmitted.size;
    asn.gradedCount = uniqueGraded.size;
    asn.publishedCount = uniquePublished.size;

    setDoc(
      doc(firestoreDb, 'assignments', asn.id),
      {
        totalStudents: asn.totalStudents,
        gradedCount: asn.gradedCount,
        submissionCount: asn.submissionCount,
        publishedCount: asn.publishedCount
      },
      { merge: true }
    ).catch(console.warn);
  }

  public gradeSubmission(
    submissionId: string,
    score: number | undefined,
    feedback: string,
    teacherName: string,
    status: 'graded' | 'redo_requested' = 'graded',
    extra?: {
      objectiveScore?: number;
      essayScore?: number;
      answers?: SubmissionQuestionAnswer[];
      gradeStatus?: Submission['gradeStatus'];
      publishImmediately?: boolean;
    }
  ) {
    const sub = this.submissions.find((s) => s.id === submissionId);
    if (sub) {
      const nowIso = new Date().toISOString();
      const asn = this.assignments.find((a) => a.id === sub.assignmentId);
      const isDraft = extra?.gradeStatus === 'draft_grade';

      if (isDraft) {
        sub.draftScore = score;
        sub.draftFeedback = feedback;
        sub.gradeStatus = 'draft_grade';
      } else {
        if (score !== undefined) {
          sub.score = score;
        }
        sub.feedback = feedback;
        sub.status = status;
        sub.gradedAt = nowIso;
        sub.gradedBy = teacherName;
        if (status === 'graded') {
          const shouldPublish =
            extra?.publishImmediately ||
            extra?.gradeStatus === 'published' ||
            asn?.showResultPolicy === 'immediately';
          sub.gradeStatus = shouldPublish ? 'published' : 'graded';
          if (shouldPublish) sub.publishedAt = nowIso;
        } else {
          sub.gradeStatus = 'ungraded';
        }
      }

      if (extra?.objectiveScore !== undefined) sub.objectiveScore = extra.objectiveScore;
      if (extra?.essayScore !== undefined) sub.essayScore = extra.essayScore;
      if (extra?.answers) sub.answers = extra.answers;
      sub.updatedAt = nowIso;
      sub.version = (sub.version || 1) + 1;

      const subPath = `submissions/${sub.id}`;
      setDoc(doc(firestoreDb, 'submissions', sub.id), sub, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, subPath);
      });

      this.syncAssignmentCounts(sub.assignmentId);
      this.addAuditLog(
        isDraft
          ? 'Lưu nháp chấm bài'
          : status === 'redo_requested'
          ? 'Yêu cầu học sinh làm lại bài'
          : 'Chấm điểm bài nộp',
        'grade',
        `${teacherName} ${
          isDraft ? 'lưu nháp chấm' : status === 'redo_requested' ? 'yêu cầu làm lại' : `chấm ${score} điểm`
        } cho học sinh ${sub.studentName}`
      );
      this.notify();
    }
  }

  public reviseSubmissionGrade(
    submissionId: string,
    newScore: number,
    reason: string,
    teacherName: string,
    feedback?: string
  ): Submission | undefined {
    const sub = this.submissions.find((s) => s.id === submissionId);
    if (!sub) return undefined;
    const nowIso = new Date().toISOString();
    const oldScore = sub.score;

    const revision = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      submissionId: sub.id,
      oldScore,
      newScore,
      reason,
      changedBy: teacherName,
      changedAt: nowIso
    };

    sub.score = newScore;
    if (feedback !== undefined) sub.feedback = feedback;
    sub.gradedAt = nowIso;
    sub.gradedBy = teacherName;
    sub.updatedAt = nowIso;
    sub.status = 'graded';
    if (!sub.gradeStatus || sub.gradeStatus === 'ungraded' || sub.gradeStatus === 'draft_grade') {
      sub.gradeStatus = 'graded';
    }
    sub.revisions = [revision, ...(sub.revisions || [])];
    sub.version = (sub.version || 1) + 1;

    const subPath = `submissions/${sub.id}`;
    setDoc(doc(firestoreDb, 'submissions', sub.id), sub, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, subPath);
    });

    this.syncAssignmentCounts(sub.assignmentId);
    this.addAuditLog(
      'Sửa điểm bài tập (Có lý do)',
      'grade',
      `${teacherName} điều chỉnh điểm của ${sub.studentName} từ ${oldScore ?? 'Chưa có'} → ${newScore}. Lý do: ${reason}`
    );
    this.notify();
    return sub;
  }

  public publishAssignmentGrades(
    assignmentId: string,
    submissionIds: string[],
    notifyStudents: boolean,
    teacherName: string
  ): number {
    const asn = this.assignments.find((a) => a.id === assignmentId);
    if (!asn) return 0;
    const nowIso = new Date().toISOString();
    let count = 0;

    this.submissions
      .filter(
        (s) =>
          s.assignmentId === assignmentId &&
          (submissionIds.length === 0 || submissionIds.includes(s.id)) &&
          s.score !== undefined
      )
      .forEach((sub) => {
        sub.status = 'graded';
        sub.gradeStatus = 'published';
        sub.publishedAt = nowIso;
        sub.updatedAt = nowIso;
        count += 1;
        setDoc(doc(firestoreDb, 'submissions', sub.id), sub, { merge: true }).catch(console.warn);
      });

    if (count > 0) {
      this.syncAssignmentCounts(assignmentId);
      if (notifyStudents) {
        this.addAnnouncement({
          title: `Đã công bố điểm & nhận xét: ${asn.title}`,
          content: `${teacherName} vừa trả bài và công bố điểm cho ${count} học sinh lớp ${asn.className} ở bài "${asn.title}". Các em vào mục Bài tập để xem chi tiết.`,
          authorId: asn.teacherId,
          authorName: teacherName,
          targetRole: 'students',
          targetClassId: asn.classId,
          targetClassName: asn.className,
          isUrgent: false
        });
      }
      this.addAuditLog(
        'Trả bài & Công bố điểm',
        'grade',
        `${teacherName} đã công bố điểm cho ${count} bài nộp của "${asn.title}" (Lớp ${asn.className})`
      );
      this.notify();
    }
    return count;
  }

  public requestSubmissionRedo(
    assignmentId: string,
    studentId: string,
    studentName: string,
    allowedExtraAttempts: number,
    newDueDate: string,
    feedback: string,
    teacherName: string
  ): Submission {
    const nowIso = new Date().toISOString();
    const existing = this.submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId
    );
    let targetSub: Submission;

    if (existing) {
      existing.status = 'redo_requested';
      existing.gradeStatus = 'ungraded';
      existing.feedback = feedback;
      existing.dueOverrideAt = newDueDate;
      existing.allowedExtraAttempts = (existing.allowedExtraAttempts || 0) + allowedExtraAttempts;
      existing.updatedAt = nowIso;
      targetSub = existing;
      setDoc(doc(firestoreDb, 'submissions', existing.id), existing, { merge: true }).catch(console.warn);
    } else {
      targetSub = {
        id: `sub-${assignmentId}-${studentId}`,
        assignmentId,
        studentId,
        studentName,
        submittedAt: nowIso,
        updatedAt: nowIso,
        status: 'redo_requested',
        gradeStatus: 'ungraded',
        feedback,
        dueOverrideAt: newDueDate,
        allowedExtraAttempts,
        attemptCount: 0,
        content: ''
      };
      this.submissions.push(targetSub);
      setDoc(doc(firestoreDb, 'submissions', targetSub.id), targetSub).catch(console.warn);
    }

    // Also record personal deadline override on assignment
    this.extendAssignmentDeadline(
      assignmentId,
      newDueDate,
      `Yêu cầu làm lại bài (${feedback})`,
      teacherName,
      [studentId]
    );

    this.syncAssignmentCounts(assignmentId);
    this.addAuditLog(
      'Yêu cầu học sinh làm lại bài',
      'assignment',
      `${teacherName} yêu cầu ${studentName} làm lại bài (thêm ${allowedExtraAttempts} lượt, hạn mới: ${new Date(newDueDate).toLocaleString('vi-VN')})`
    );
    this.notify();
    return targetSub;
  }

  public submitAssignment(
    assignmentId: string,
    studentId: string,
    studentName: string,
    content: string,
    fileName?: string,
    fileSize?: string,
    answers?: SubmissionQuestionAnswer[],
    objectiveScore?: number
  ): Submission {
    const asn = this.assignments.find((a) => a.id === assignmentId);
    const now = new Date();
    const nowIso = now.toISOString();
    const effectiveDueIso = asn?.dueOverrides?.[studentId]?.dueDate || asn?.dueDate;
    const effectiveDueMs = effectiveDueIso ? new Date(effectiveDueIso).getTime() : Infinity;
    const isLate = effectiveDueIso ? now.getTime() > effectiveDueMs : false;
    const lateMinutes = isLate ? Math.max(1, Math.round((now.getTime() - effectiveDueMs) / 60000)) : 0;

    const hasOnlyObjective =
      asn?.questionSnapshots &&
      asn.questionSnapshots.length > 0 &&
      asn.questionSnapshots.every((q) => q.type !== 'essay');
    let autoFinalScore = objectiveScore;
    if (
      isLate &&
      asn?.latePolicy === 'deduct_points' &&
      asn.latePenaltyPercent &&
      autoFinalScore !== undefined
    ) {
      autoFinalScore = Math.max(
        0,
        Number((autoFinalScore * (1 - asn.latePenaltyPercent / 100)).toFixed(2))
      );
    }

    const submissionStatus: Submission['status'] =
      hasOnlyObjective && autoFinalScore !== undefined ? 'graded' : isLate ? 'late' : 'submitted';
    const initialGradeStatus: Submission['gradeStatus'] =
      hasOnlyObjective && autoFinalScore !== undefined
        ? asn?.showResultPolicy === 'immediately'
          ? 'published'
          : 'graded'
        : 'ungraded';

    // Ensure idempotency: only 1 record per (assignmentId, studentId)
    const existing = this.submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId
    );
    let targetSub: Submission;

    if (existing) {
      existing.content = content;
      if (fileName) existing.fileName = fileName;
      if (fileSize) existing.fileSize = fileSize;
      if (answers) existing.answers = answers;
      if (objectiveScore !== undefined) existing.objectiveScore = objectiveScore;
      if (hasOnlyObjective && autoFinalScore !== undefined) {
        existing.score = autoFinalScore;
        existing.gradedAt = nowIso;
        existing.gradedBy = 'Hệ thống chấm tự động';
      }
      existing.attemptCount = (existing.attemptCount || 1) + 1;
      existing.submittedAt = nowIso;
      existing.updatedAt = nowIso;
      existing.status = submissionStatus;
      existing.gradeStatus = initialGradeStatus;
      if (initialGradeStatus === 'published') existing.publishedAt = nowIso;
      existing.isLate = isLate;
      existing.lateMinutes = lateMinutes;
      targetSub = existing;

      const subPath = `submissions/${existing.id}`;
      setDoc(doc(firestoreDb, 'submissions', existing.id), existing, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, subPath);
      });
    } else {
      const deterministicId = `sub-${assignmentId}-${studentId}`;
      const newSub: Submission = {
        id: deterministicId,
        assignmentId,
        studentId,
        studentName,
        submittedAt: nowIso,
        updatedAt: nowIso,
        status: submissionStatus,
        gradeStatus: initialGradeStatus,
        ...(initialGradeStatus === 'published' ? { publishedAt: nowIso } : {}),
        isLate,
        lateMinutes,
        content,
        ...(fileName ? { fileName } : {}),
        ...(fileSize ? { fileSize } : fileName ? { fileSize: '1.2 MB' } : {}),
        ...(answers ? { answers } : {}),
        ...(objectiveScore !== undefined ? { objectiveScore } : {}),
        ...(hasOnlyObjective && autoFinalScore !== undefined
          ? { score: autoFinalScore, gradedAt: nowIso, gradedBy: 'Hệ thống chấm tự động' }
          : {}),
        attemptCount: 1
      };
      this.submissions.push(newSub);
      targetSub = newSub;

      const subPath = `submissions/${newSub.id}`;
      setDoc(doc(firestoreDb, 'submissions', newSub.id), newSub).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, subPath);
      });
    }

    this.syncAssignmentCounts(assignmentId);
    this.notify();
    return targetSub;
  }

  // Quizzes
  public getQuizzes(classId?: string): Quiz[] {
    if (classId) return this.quizzes.filter((q) => q.classId === classId);
    return [...this.quizzes];
  }
  public getQuizById(id: string): Quiz | undefined {
    return this.quizzes.find((q) => q.id === id);
  }
  public addQuiz(quiz: Omit<Quiz, 'id' | 'attemptsCount'>): Quiz {
    const newQuiz: Quiz = {
      ...quiz,
      id: `qz-${Date.now()}`,
      attemptsCount: 0
    };
    this.quizzes.unshift(newQuiz);
    const path = `quizzes/${newQuiz.id}`;
    setDoc(doc(firestoreDb, 'quizzes', newQuiz.id), newQuiz).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Tạo bài kiểm tra trắc nghiệm', 'assignment', `Tạo đề trắc nghiệm "${newQuiz.title}"`);
    this.notify();
    return newQuiz;
  }
  public submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `attp-${Date.now()}`,
      completedAt: new Date().toISOString()
    };
    this.quizAttempts.push(newAttempt);
    const path = `quizAttempts/${newAttempt.id}`;
    setDoc(doc(firestoreDb, 'quizAttempts', newAttempt.id), newAttempt).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    const qz = this.quizzes.find((q) => q.id === attempt.quizId);
    if (qz) {
      qz.attemptsCount += 1;
      setDoc(doc(firestoreDb, 'quizzes', qz.id), { attemptsCount: qz.attemptsCount }, { merge: true }).catch(console.warn);
    }
    this.notify();
    return newAttempt;
  }
  public getQuizAttempts(quizId: string): QuizAttempt[] {
    return this.quizAttempts.filter((a) => a.quizId === quizId);
  }

  // Behavior & Stars
  public getBehaviors(classId?: string): BehaviorRecord[] {
    if (classId) return this.behaviors.filter((b) => b.classId === classId);
    return [...this.behaviors];
  }
  public addBehavior(rec: Omit<BehaviorRecord, 'id' | 'date'>): BehaviorRecord {
    const newRec: BehaviorRecord = {
      ...rec,
      id: `bh-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    this.behaviors.unshift(newRec);
    const path = `behaviors/${newRec.id}`;
    setDoc(doc(firestoreDb, 'behaviors', newRec.id), newRec).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    // Update student stars
    const student = this.students.find((s) => s.id === rec.studentId);
    if (student) {
      student.stars = Math.max(0, (student.stars || 0) + rec.points);
      setDoc(doc(firestoreDb, 'students', student.id), { stars: student.stars }, { merge: true }).catch(console.warn);
    }
    this.notify();
    return newRec;
  }

  // Alerts
  public getAlerts(): SmartAlert[] {
    return [...this.alerts];
  }
  public updateAlertStatus(id: string, status: SmartAlert['status'], resolvedNote?: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.status = status;
      if (status === 'resolved') {
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedNote = resolvedNote;
      }
      const path = `alerts/${id}`;
      setDoc(doc(firestoreDb, 'alerts', id), {
        status,
        ...(status === 'resolved' ? { resolvedAt: alert.resolvedAt, resolvedNote: alert.resolvedNote } : {})
      }, { merge: true }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, path);
      });
      this.notify();
    }
  }
  public addAlert(alertData: Omit<SmartAlert, 'id' | 'createdAt' | 'status'>) {
    const newAlert: SmartAlert = {
      ...alertData,
      id: `alt-${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    this.alerts.unshift(newAlert);
    const path = `alerts/${newAlert.id}`;
    setDoc(doc(firestoreDb, 'alerts', newAlert.id), newAlert).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.notify();
  }

  // Announcements
  public getAnnouncements(): Announcement[] {
    return [...this.announcements];
  }
  public addAnnouncement(anc: Omit<Announcement, 'id' | 'createdAt' | 'readCount'>) {
    const newAnc: Announcement = {
      ...anc,
      id: `anc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      readCount: 0
    };
    this.announcements.unshift(newAnc);
    const path = `announcements/${newAnc.id}`;
    setDoc(doc(firestoreDb, 'announcements', newAnc.id), newAnc).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog('Đăng thông báo mới', 'system', `Đăng thông báo: "${newAnc.title}"`);
    this.notify();
    return newAnc;
  }

  // Schedules
  public getSchedules(classId?: string): ScheduleItem[] {
    if (classId) return this.schedules.filter((s) => s.classId === classId);
    return [...this.schedules];
  }

  public updateScheduleItem(id: string, updates: Partial<ScheduleItem>): ScheduleItem | null {
    const idx = this.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.schedules[idx] = { ...this.schedules[idx], ...updates };
    const path = `schedules/${id}`;
    setDoc(doc(firestoreDb, 'schedules', id), updates, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog(
      'Thay đổi thời khóa biểu',
      'class',
      `Cập nhật tiết học: Môn ${this.schedules[idx].subject} - Lớp ${this.schedules[idx].className}`
    );
    this.notify();
    return this.schedules[idx];
  }

  public addScheduleItem(item: Omit<ScheduleItem, 'id'>): ScheduleItem {
    const newItem: ScheduleItem = {
      ...item,
      id: `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    this.schedules.push(newItem);
    const path = `schedules/${newItem.id}`;
    setDoc(doc(firestoreDb, 'schedules', newItem.id), newItem).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.addAuditLog(
      'Thêm tiết thời khóa biểu',
      'class',
      `Thêm tiết học: Môn ${newItem.subject} - Lớp ${newItem.className}`
    );
    this.notify();
    return newItem;
  }

  public deleteScheduleItem(id: string): boolean {
    const idx = this.schedules.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    const removed = this.schedules[idx];
    this.schedules = this.schedules.filter((s) => s.id !== id);
    const path = `schedules/${id}`;
    deleteDoc(doc(firestoreDb, 'schedules', id)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, path);
    });
    this.addAuditLog(
      'Xóa tiết thời khóa biểu',
      'class',
      `Xóa tiết học: Môn ${removed.subject} - Lớp ${removed.className}`
    );
    this.notify();
    return true;
  }

  public resetClassSchedule(classId: string): void {
    const defaults = INITIAL_SCHEDULE.filter((s) => s.classId === classId);
    this.schedules = this.schedules.filter((s) => s.classId !== classId).concat(defaults);
    defaults.forEach((sch) => {
      setDoc(doc(firestoreDb, 'schedules', sch.id), sch).catch(console.warn);
    });
    this.addAuditLog('Khôi phục thời khóa biểu', 'class', `Khôi phục TKB mặc định cho lớp`);
    this.notify();
  }

  public setClassSchedules(classId: string, items: ScheduleItem[]): void {
    this.schedules = this.schedules.filter((s) => s.classId !== classId).concat(items);
    items.forEach((item) => {
      setDoc(doc(firestoreDb, 'schedules', item.id), item).catch(console.warn);
    });
    this.addAuditLog('Cập nhật thời khóa biểu', 'class', `Lưu thời khóa biểu mới`);
    this.notify();
  }

  // Resources
  public getResources(subject?: string): LearningResource[] {
    if (subject && subject !== 'all') return this.resources.filter((r) => r.subject === subject);
    return [...this.resources];
  }

  // Chat Messages
  public getMessages(user1Id: string, user2Id: string): ChatMessage[] {
    return this.messages.filter(
      (m) =>
        (m.senderId === user1Id && m.receiverId === user2Id) ||
        (m.senderId === user2Id && m.receiverId === user1Id)
    );
  }
  public sendMessage(msg: Omit<ChatMessage, 'id' | 'timestamp' | 'read'>) {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('vi-VN'),
      read: false
    };
    this.messages.push(newMsg);
    const path = `messages/${newMsg.id}`;
    setDoc(doc(firestoreDb, 'messages', newMsg.id), newMsg).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, path);
    });
    this.notify();
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
  public addAuditLog(action: string, category: AuditLog['category'], details: string) {
    const currentUid = auth.currentUser?.uid || 'usr-current';
    const currentName = auth.currentUser?.displayName || 'Người dùng hiện tại';
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      category,
      userId: currentUid,
      userName: currentName,
      userRole: 'teacher',
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toLocaleString('vi-VN')
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    const path = `auditLogs/${log.id}`;
    setDoc(doc(firestoreDb, 'auditLogs', log.id), log).catch((err) => {
      console.warn('AuditLog write notice:', err);
    });
  }

  // Backup & Reset
  public exportBackupJson(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      school: this.school,
      classes: this.classes,
      students: this.students,
      attendance: this.attendance,
      grades: this.grades,
      gradeHistory: this.gradeHistory,
      assignments: this.assignments,
      submissions: this.submissions,
      quizzes: this.quizzes,
      behaviors: this.behaviors,
      alerts: this.alerts,
      announcements: this.announcements,
      auditLogs: this.auditLogs
    };
    return JSON.stringify(data, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.classes && parsed.students) {
        this.classes = parsed.classes;
        this.students = parsed.students;
        if (parsed.attendance) this.attendance = parsed.attendance;
        if (parsed.grades) this.grades = parsed.grades;
        if (parsed.assignments) this.assignments = parsed.assignments;
        if (parsed.alerts) this.alerts = parsed.alerts;

        // Push restored data to Firestore
        this.classes.forEach((c) => setDoc(doc(firestoreDb, 'classes', c.id), c).catch(console.warn));
        this.students.forEach((s) => setDoc(doc(firestoreDb, 'students', s.id), s).catch(console.warn));

        this.addAuditLog('Khôi phục dữ liệu hệ thống', 'system', 'Hệ thống vừa được khôi phục từ tệp sao lưu JSON.');
        this.notify();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public resetToFactory() {
    this.school = { ...INITIAL_SCHOOL };
    this.classes = [...INITIAL_CLASSES];
    this.students = [...INITIAL_STUDENTS];
    this.attendance = [...INITIAL_ATTENDANCE];
    this.grades = [...INITIAL_GRADES];
    this.gradeHistory = [...INITIAL_GRADE_HISTORY];
    this.assignments = [...INITIAL_ASSIGNMENTS];
    this.submissions = [...INITIAL_SUBMISSIONS];
    this.quizzes = [...INITIAL_QUIZZES];
    this.quizAttempts = [];
    this.behaviors = [...INITIAL_BEHAVIORS];
    this.alerts = [...INITIAL_ALERTS];
    this.announcements = [...INITIAL_ANNOUNCEMENTS];
    this.messages = [...INITIAL_MESSAGES];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];

    // Seed back to Cloud Firestore
    this.seedInitialClasses();
    this.seedInitialStudents();
    this.seedInitialAttendance();
    this.seedInitialGrades();
    this.seedInitialAssignments();
    this.seedInitialSubmissions();
    this.seedInitialQuizzes();
    this.seedInitialSchedules();
    this.seedInitialAlerts();
    this.seedInitialAnnouncements();
    this.seedInitialResources();

    this.notify();
  }
}

export const db = new ReactiveDatabase();
