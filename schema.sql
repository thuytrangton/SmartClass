-- ====================================================================
-- SMART CLASS - HỆ THỐNG QUẢN LÝ LỚP HỌC THÔNG MINH
-- POSTGRESQL DATABASE SCHEMA (MULTI-TENANT / MULTI-SCHOOL READY)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role_enum AS ENUM ('admin', 'teacher', 'student', 'parent');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'excused', 'unexcused', 'late', 'early_leave');
CREATE TYPE assignment_status_enum AS ENUM ('draft', 'published', 'closed');
CREATE TYPE submission_status_enum AS ENUM ('draft', 'submitted', 'graded', 'late', 'missing');
CREATE TYPE alert_severity_enum AS ENUM ('critical', 'warning', 'info');
CREATE TYPE alert_status_enum AS ENUM ('new', 'viewed', 'processing', 'resolved');

-- 3. CORE TENANCY (SCHOOLS & ACADEMIC YEARS)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    principal VARCHAR(100),
    active_academic_year VARCHAR(20) DEFAULT '2025-2026',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. '2025-2026'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    level INTEGER NOT NULL, -- 10, 11, 12
    name VARCHAR(50) NOT NULL
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USERS & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role_enum NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_code VARCHAR(50) UNIQUE NOT NULL,
    specialized_subject_id UUID REFERENCES subjects(id),
    qualification VARCHAR(100) DEFAULT 'Cử nhân Sư phạm'
);

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    name VARCHAR(50) NOT NULL, -- e.g. '10A1'
    grade_level INTEGER NOT NULL,
    room_number VARCHAR(50),
    homeroom_teacher_id UUID REFERENCES teachers(id),
    max_capacity INTEGER DEFAULT 40,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    student_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Nam', 'Nữ')),
    address TEXT,
    gpa NUMERIC(3, 1) DEFAULT 0.0,
    conduct VARCHAR(20) DEFAULT 'Tốt',
    attendance_rate INTEGER DEFAULT 100,
    stars INTEGER DEFAULT 0,
    notes TEXT,
    health_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50) DEFAULT 'Phụ huynh'
);

CREATE TABLE parent_student_links (
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, student_id)
);

-- 5. ATTENDANCE MODULE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status_enum NOT NULL DEFAULT 'present',
    note TEXT,
    recorded_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_attendance_per_day UNIQUE (student_id, date)
);

-- 6. GRADEBOOK & AUDIT HISTORY
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester VARCHAR(10) NOT NULL CHECK (semester IN ('HK1', 'HK2')),
    tx1 NUMERIC(3, 1),
    tx2 NUMERIC(3, 1),
    tx3 NUMERIC(3, 1),
    gk NUMERIC(3, 1),
    ck NUMERIC(3, 1),
    average NUMERIC(3, 1),
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_student_grade_subject_semester UNIQUE (student_id, subject_id, semester)
);

CREATE TABLE grade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    column_changed VARCHAR(20) NOT NULL,
    old_value NUMERIC(3, 1),
    new_value NUMERIC(3, 1),
    reason TEXT NOT NULL,
    changed_by_user_id UUID REFERENCES users(id),
    changed_by_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ASSIGNMENTS & SUBMISSIONS
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_points INTEGER DEFAULT 10,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status assignment_status_enum DEFAULT 'published',
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    content TEXT,
    attachment_url TEXT,
    status submission_status_enum DEFAULT 'submitted',
    score NUMERIC(3, 1),
    feedback TEXT,
    graded_by_user_id UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_student_submission UNIQUE (assignment_id, student_id)
);

-- 8. QUIZZES & QUESTION BANK
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    duration_minutes INTEGER DEFAULT 15,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    shuffle_options BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'active',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings ['A', 'B', 'C', 'D']
    correct_option_index INTEGER NOT NULL,
    explanation TEXT,
    points NUMERIC(3, 1) DEFAULT 2.0
);

-- 9. BEHAVIOR & REWARDS (STARS)
CREATE TABLE behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('positive', 'negative')),
    points INTEGER NOT NULL, -- +5 or -3
    category VARCHAR(100) NOT NULL,
    note TEXT,
    teacher_id UUID REFERENCES users(id),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. SMART ALERTS WORKFLOW
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity alert_severity_enum NOT NULL DEFAULT 'warning',
    status alert_status_enum NOT NULL DEFAULT 'new',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    suggested_action TEXT,
    resolved_note TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ANNOUNCEMENTS & CHAT
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    target_class_id UUID REFERENCES classes(id),
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_role VARCHAR(20) DEFAULT 'all',
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(150),
    user_role VARCHAR(20),
    action VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_grades_student_subject ON grades(student_id, subject_id);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 14. ROW-LEVEL SECURITY (RLS) POLICIES EXAMPLE
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do anything
CREATE POLICY admin_all ON students TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Teachers can access students in their school / assigned classes
CREATE POLICY teacher_students ON students TO authenticated USING (
    auth.jwt() ->> 'role' = 'teacher' AND school_id = (auth.jwt() ->> 'school_id')::uuid
);

-- Policy: Students can view only their own record
CREATE POLICY student_self ON students TO authenticated USING (
    user_id = auth.uid()
);
