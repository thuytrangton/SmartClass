import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { RoleGuard } from './RoleGuard';

// Auth Pages
import { Login } from '../pages/auth/Login';
import { Forbidden, NotFound } from '../pages/auth/Forbidden';

// Teacher Pages
import { TeacherDashboard } from '../pages/teacher/TeacherDashboard';
import { ClassList } from '../pages/teacher/ClassList';
import { StudentList } from '../pages/teacher/StudentList';
import { StudentProfile360 } from '../pages/teacher/StudentProfile360';
import { AttendanceManager } from '../pages/teacher/AttendanceManager';
import { GradebookManager } from '../pages/teacher/GradebookManager';
import { AssignmentList } from '../pages/teacher/AssignmentList';
import { AutoGrading } from '../pages/teacher/AutoGrading';
import { QuizManager } from '../pages/teacher/QuizManager';
import { ClassroomTools } from '../pages/teacher/ClassroomTools';
import { BehaviorRewards } from '../pages/teacher/BehaviorRewards';
import { SmartAlerts } from '../pages/teacher/SmartAlerts';
import { TeacherAiAssistant } from '../pages/teacher/TeacherAiAssistant';
import { Announcements } from '../pages/teacher/Announcements';
import { ClassSchedule } from '../pages/teacher/ClassSchedule';
import { LearningResources } from '../pages/teacher/LearningResources';
import { TeacherReports } from '../pages/teacher/TeacherReports';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentAssignments } from '../pages/student/StudentAssignments';
import { StudentQuizTake } from '../pages/student/StudentQuizTake';
import { StudentGrades } from '../pages/student/StudentGrades';
import { StudentAttendance } from '../pages/student/StudentAttendance';

// Parent Pages
import { ParentDashboard } from '../pages/parent/ParentDashboard';
import { ParentChat } from '../pages/parent/ParentChat';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminUserManagement } from '../pages/admin/AdminUserManagement';
import { AdminAuditLogs } from '../pages/admin/AdminAuditLogs';
import { AdminBackupRestore } from '../pages/admin/AdminBackupRestore';
import { AdminSettings } from '../pages/admin/AdminSettings';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login defaultTab="login" />} />
      <Route path="/register" element={<Login defaultTab="register" />} />
      <Route path="/403" element={<Forbidden />} />

      {/* Redirect root to teacher dashboard or login */}
      <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />

      {/* Teacher Protected Routes */}
      <Route
        path="/teacher"
        element={
          <RoleGuard allowedRoles={['teacher', 'admin']}>
            <AppLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<ClassList />} />
        <Route path="students" element={<StudentList />} />
        <Route path="students/:id" element={<StudentProfile360 />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="grades" element={<GradebookManager />} />
        <Route path="assignments" element={<AssignmentList />} />
        <Route path="auto-grading" element={<AutoGrading />} />
        <Route path="quizzes" element={<QuizManager />} />
        <Route path="tools" element={<ClassroomTools />} />
        <Route path="behavior" element={<BehaviorRewards />} />
        <Route path="alerts" element={<SmartAlerts />} />
        <Route path="ai" element={<TeacherAiAssistant />} />
        <Route path="schedule" element={<ClassSchedule />} />
        <Route path="resources" element={<LearningResources />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reports" element={<TeacherReports />} />
      </Route>

      {/* Student Protected Routes */}
      <Route
        path="/student"
        element={
          <RoleGuard allowedRoles={['student', 'admin', 'teacher']}>
            <AppLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="schedule" element={<ClassSchedule />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="quizzes" element={<StudentQuizTake />} />
        <Route path="grades" element={<StudentGrades />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="resources" element={<LearningResources />} />
        <Route path="notifications" element={<Announcements />} />
      </Route>

      {/* Parent Protected Routes */}
      <Route
        path="/parent"
        element={
          <RoleGuard allowedRoles={['parent', 'admin', 'teacher']}>
            <AppLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="children" element={<StudentProfile360 />} />
        <Route path="grades" element={<StudentGrades />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="messages" element={<ParentChat />} />
        <Route path="notifications" element={<Announcements />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <AppLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="classes" element={<ClassList />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="backups" element={<AdminBackupRestore />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
