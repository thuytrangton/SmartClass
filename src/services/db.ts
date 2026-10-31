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
  Submission,
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

type Listener = () => void;

class ReactiveDatabase {
  private school: School = { ...INITIAL_SCHOOL };
  private classes: ClassRoom[] = [...INITIAL_CLASSES];
  private students: Student[] = [...INITIAL_STUDENTS];
  private attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
  private grades: GradeItem[] = [...INITIAL_GRADES];
  private gradeHistory: GradeHistoryEntry[] = [...INITIAL_GRADE_HISTORY];
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

  constructor() {
    this.loadFromStorage();
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private saveToStorage() {
    try {
      const data = {
        classes: this.classes,
        students: this.students,
        attendance: this.attendance,
        grades: this.grades,
        gradeHistory: this.gradeHistory,
        assignments: this.assignments,
        submissions: this.submissions,
        quizzes: this.quizzes,
        quizAttempts: this.quizAttempts,
        behaviors: this.behaviors,
        alerts: this.alerts,
        announcements: this.announcements,
        messages: this.messages,
        auditLogs: this.auditLogs,
        schedules: this.schedules
      };
      sessionStorage.setItem('smart_class_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  private loadFromStorage() {
    try {
      const saved = sessionStorage.getItem('smart_class_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.classes) this.classes = parsed.classes;
        if (parsed.students) this.students = parsed.students;
        if (parsed.attendance) this.attendance = parsed.attendance;
        if (parsed.grades) this.grades = parsed.grades;
        if (parsed.gradeHistory) this.gradeHistory = parsed.gradeHistory;
        if (parsed.assignments) this.assignments = parsed.assignments;
        if (parsed.submissions) this.submissions = parsed.submissions;
        if (parsed.quizzes) this.quizzes = parsed.quizzes;
        if (parsed.quizAttempts) this.quizAttempts = parsed.quizAttempts;
        if (parsed.behaviors) this.behaviors = parsed.behaviors;
        if (parsed.alerts) this.alerts = parsed.alerts;
        if (parsed.announcements) this.announcements = parsed.announcements;
        if (parsed.messages) this.messages = parsed.messages;
        if (parsed.auditLogs) this.auditLogs = parsed.auditLogs;
        if (parsed.schedules) this.schedules = parsed.schedules;
      }
    } catch {
      // fallback to initial
    }
  }

  // School
  public getSchool(): School {
    return { ...this.school };
  }
  public updateSchool(updated: Partial<School>) {
    this.school = { ...this.school, ...updated };
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
    this.addAuditLog('Tạo lớp học mới', 'class', `Tạo lớp ${newClass.name} - GVCN: ${newClass.homeroomTeacherName}`);
    this.notify();
    return newClass;
  }
  public updateClass(id: string, updates: Partial<ClassRoom>) {
    this.classes = this.classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.addAuditLog('Cập nhật lớp học', 'class', `Cập nhật thông tin lớp ID: ${id}`);
    this.notify();
  }
  public deleteClass(id: string) {
    const cls = this.classes.find((c) => c.id === id);
    this.classes = this.classes.filter((c) => c.id !== id);
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
    }
    this.addAuditLog('Thêm học sinh mới', 'student', `Thêm học sinh ${newStudent.fullName} (${newStudent.code}) vào lớp ${newStudent.className}`);
    this.notify();
    return newStudent;
  }
  public updateStudent(id: string, updates: Partial<Student>) {
    this.students = this.students.map((s) => (s.id === id ? { ...s, ...updates } : s));
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
      }
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

      // Add to grade history
      this.gradeHistory.unshift({
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
      });

      this.addAuditLog('Chỉnh sửa sổ điểm', 'grade', `Cập nhật điểm ${field.toUpperCase()} của ${updated.studentName} thành ${value}`);
      this.notify();
    }
  }
  public getGradeHistory(): GradeHistoryEntry[] {
    return [...this.gradeHistory];
  }

  // Assignments
  public getAssignments(classId?: string): Assignment[] {
    if (classId) return this.assignments.filter((a) => a.classId === classId);
    return [...this.assignments];
  }
  public getAssignmentById(id: string): Assignment | undefined {
    return this.assignments.find((a) => a.id === id);
  }
  public addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'submissionCount' | 'gradedCount'>): Assignment {
    const newAsn: Assignment = {
      ...assignment,
      id: `asn-${Date.now()}`,
      createdAt: new Date().toISOString(),
      submissionCount: 0,
      gradedCount: 0
    };
    this.assignments.unshift(newAsn);
    this.addAuditLog('Tạo bài tập mới', 'assignment', `Giao bài tập "${newAsn.title}" cho lớp ${newAsn.className}`);
    this.notify();
    return newAsn;
  }
  public getSubmissions(assignmentId: string): Submission[] {
    return this.submissions.filter((s) => s.assignmentId === assignmentId);
  }
  public gradeSubmission(submissionId: string, score: number, feedback: string, teacherName: string) {
    const sub = this.submissions.find((s) => s.id === submissionId);
    if (sub) {
      sub.score = score;
      sub.feedback = feedback;
      sub.status = 'graded';
      sub.gradedAt = new Date().toISOString();
      sub.gradedBy = teacherName;

      // Update gradedCount in assignment
      const asn = this.assignments.find((a) => a.id === sub.assignmentId);
      if (asn) {
        asn.gradedCount = this.submissions.filter((s) => s.assignmentId === asn.id && s.status === 'graded').length;
      }
      this.notify();
    }
  }
  public submitAssignment(assignmentId: string, studentId: string, studentName: string, content: string, fileName?: string) {
    const existing = this.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
    if (existing) {
      existing.content = content;
      existing.fileName = fileName || existing.fileName;
      existing.submittedAt = new Date().toISOString();
      existing.status = 'submitted';
    } else {
      this.submissions.push({
        id: `sub-${Date.now()}`,
        assignmentId,
        studentId,
        studentName,
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        content,
        fileName: fileName || 'BaiLam_HocSinh.pdf',
        fileSize: '1.2 MB'
      });
      const asn = this.assignments.find((a) => a.id === assignmentId);
      if (asn) asn.submissionCount += 1;
    }
    this.notify();
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
    const qz = this.quizzes.find((q) => q.id === attempt.quizId);
    if (qz) qz.attemptsCount += 1;
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
    // Update student stars
    const student = this.students.find((s) => s.id === rec.studentId);
    if (student) {
      student.stars = Math.max(0, (student.stars || 0) + rec.points);
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
      this.notify();
    }
  }
  public addAlert(alertData: Omit<SmartAlert, 'id' | 'createdAt' | 'status'>) {
    this.alerts.unshift({
      ...alertData,
      id: `alt-${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString()
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
    this.addAuditLog('Khôi phục thời khóa biểu', 'class', `Khôi phục TKB mặc định cho lớp`);
    this.notify();
  }

  public setClassSchedules(classId: string, items: ScheduleItem[]): void {
    this.schedules = this.schedules.filter((s) => s.classId !== classId).concat(items);
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
    this.notify();
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }
  public addAuditLog(action: string, category: AuditLog['category'], details: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      category,
      userId: 'usr-current',
      userName: 'Người dùng hiện tại',
      userRole: 'teacher',
      details,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toLocaleString('vi-VN')
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
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
    sessionStorage.removeItem('smart_class_data');
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
    this.notify();
  }
}

export const db = new ReactiveDatabase();
