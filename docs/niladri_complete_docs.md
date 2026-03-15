# Niladri Academic Management System - Complete Documentation & Development Guide

**Version:** 1.0  
**Last Updated:** October 2025  
**Document Type:** Master Blueprint & Technical Specification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Vision & Technology Stack](#architectural-vision--technology-stack)
3. [User Roles & Permissions (RBAC)](#user-roles--permissions-rbac)
4. [Portal Architecture](#portal-architecture)
5. [Database Schema & Models](#database-schema--models)
6. [Complete Feature Specifications](#complete-feature-specifications)
7. [API Endpoints Structure](#api-endpoints-structure)
8. [Development Roadmap (Phased Approach)](#development-roadmap-phased-approach)
9. [Security & Authentication](#security--authentication)
10. [Deployment & DevOps](#deployment--devops)
11. [Quality Assurance & Testing](#quality-assurance--testing)
12. [File Structure](#file-structure)

---

## Executive Summary

The Niladri Academic Management System is a **production-level, multi-tenant school management platform** designed to streamline administrative and academic processes for educational institutions. The system features:

- **Multi-tenant architecture** with school-based data isolation
- **Three distinct portals** serving different user groups
- **Comprehensive RBAC** with five user roles
- **Modular feature system** with toggle controls
- **Enterprise-grade security** and scalability
- **Full API documentation** with Swagger/OpenAPI

### Key Objectives

1. Create a scalable solution handling 1000+ concurrent users
2. Implement strict multi-tenant data isolation
3. Build intuitive, role-specific user interfaces
4. Ensure production-ready code with 80%+ test coverage
5. Enable easy deployment with Docker containerization

---

## Architectural Vision & Technology Stack

### Backend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | Python 3.11+ | High-performance async API |
| **Database** | PostgreSQL | 14+ | Relational data storage |
| **ORM** | SQLAlchemy | 2.x | Database abstraction |
| **Authentication** | JWT | - | Token-based auth |
| **Password Security** | Bcrypt | - | Password hashing |
| **Validation** | Pydantic | v2 | Data validation |
| **Migrations** | Alembic | - | Database versioning |
| **Environment** | Python venv | - | Dependency isolation |

### Frontend Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18+ | UI library |
| **Language** | TypeScript | 5.x | Type safety |
| **State Management** | Redux Toolkit | - | Global state |
| **Data Fetching** | RTK Query | - | API integration |
| **UI Components** | Material-UI / Ant Design | - | Component library |
| **Routing** | React Router | v6 | Navigation |
| **Build Tool** | Vite | 5.x | Fast development |
| **HTTP Client** | Axios | - | API requests |

### Infrastructure & DevOps

- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Structlog + Sentry integration
- **Rate Limiting**: SlowAPI
- **Documentation**: Auto-generated Swagger/OpenAPI

---

## User Roles & Permissions (RBAC)

The system implements granular role-based access control with five distinct roles:

### 1. SuperAdmin

**Scope**: Global system administration across all schools

**Permissions**:
- ✅ School Management: Full CRUD on all schools
- ✅ User Management: Full CRUD on all users across all schools
- ✅ Academic Management: Full CRUD on classes and subjects
- ✅ Student Management: Full CRUD on all students
- ✅ Finance Management: Complete access to funds, fees, payments, salaries
- ✅ Library Management: Full access across all schools
- ✅ Transport Management: Full access across all schools
- ✅ Dashboard: System-wide analytics and metrics
- ✅ Feature Toggles: Enable/disable modules globally

### 2. Admin (School Administrator)

**Scope**: Single school administration

**Permissions**:
- ✅ User Management: CRUD within their school only
- ✅ Academic Management: CRUD on classes/subjects within school
- ✅ Student Management: CRUD on students within school
- ✅ Attendance: View student attendance records
- ✅ Grades: View student grades
- ✅ Finance: Full access within their school
- ✅ Library: Full access within their school
- ✅ Transport: Full access within their school
- ✅ Announcements: Create school-wide announcements
- ✅ Timetable: Create and manage schedules
- ✅ Dashboard: School-specific metrics
- ❌ Cannot access other schools' data
- ❌ Cannot modify system-wide settings

### 3. Teacher

**Scope**: Academic and classroom management

**Permissions**:
- ✅ Academic: View classes and subjects
- ✅ Students: View list of students in their school
- ✅ Attendance: Mark and view attendance
- ✅ Grades: Enter and view grades for assigned classes
- ✅ Library: View book catalog
- ✅ Announcements: Create class-specific announcements
- ✅ Timetable: View personal schedule
- ✅ Exams: Create exams, enter marks
- ❌ Cannot manage users or school settings
- ❌ Limited financial access

### 4. Student

**Scope**: Personal academic information

**Permissions**:
- ✅ Grades: View own grades and report cards
- ✅ Attendance: View own attendance history
- ✅ Library: View books, check borrowed books
- ✅ Profile: View and update personal profile
- ✅ Timetable: View personal schedule
- ✅ Announcements: View relevant announcements
- ❌ Cannot view other students' data
- ❌ Read-only access only

### 5. Parent

**Scope**: Children's academic monitoring

**Permissions**:
- ✅ My Children: View list of enrolled children
- ✅ Grades: View children's grades
- ✅ Attendance: View children's attendance
- ✅ Library: View book catalog
- ✅ Announcements: View school announcements
- ✅ Communication: Message teachers
- ❌ Cannot modify any data
- ❌ View-only access

---

## Portal Architecture

### Three-Portal System

The system delivers functionality through three specialized web applications:

#### 1. SuperAdmin Portal

**Target Users**: SuperAdmins  
**Primary URL**: `/superadmin`

**Key Features**:
- Multi-school dashboard with global analytics
- School creation and management wizard
- System-wide user management
- Global feature toggle controls
- Revenue and financial overview across schools
- System health monitoring
- Bulk operations for multiple schools

**Technology**:
- React 18 + TypeScript
- Redux Toolkit for state
- Material-UI components
- Role: SUPERADMIN only

#### 2. School Portal

**Target Users**: Admins and Teachers  
**Primary URL**: `/school`

**Key Features**:

**For Admins**:
- School-specific dashboard with KPIs
- Student and staff management
- Class and subject administration
- Attendance oversight
- Grade management
- Financial management (fees, payments, salaries)
- Library and transport management
- Announcement creation
- Timetable management
- Reports and analytics

**For Teachers**:
- Personal dashboard
- Class roster and student information
- Attendance marking interface
- Grade entry system
- Exam creation and marking
- Class announcements
- Personal timetable
- Resource access

**Technology**:
- React 18 + TypeScript
- Role-based UI rendering
- Ant Design components
- Roles: ADMIN, TEACHER

#### 3. Family Portal

**Target Users**: Students and Parents  
**Primary URL**: `/family`

**Key Features**:

**For Students**:
- Personal dashboard with academic overview
- Grade viewing with subject breakdown
- Attendance calendar and history
- Personal timetable
- Library book status
- Profile management
- Announcement feed
- Download certificates and reports

**For Parents**:
- Multi-child selector interface
- Children's academic progress tracking
- Grade reports with trend analysis
- Attendance monitoring with alerts
- Fee payment status
- Teacher communication interface
- School announcements
- Event calendar

**Technology**:
- React 18 + TypeScript
- Family-friendly UI design
- Responsive mobile-first design
- Roles: STUDENT, PARENT

---

## Database Schema & Models

### Core Tables with Relationships

```sql
-- ============================================
-- CORE USER & AUTHENTICATION TABLES
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMIN', 'TEACHER', 'STUDENT', 'PARENT')),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school ON users(school_id);

-- ============================================
-- SCHOOL & MULTI-TENANCY
-- ============================================

CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    principal_name VARCHAR(100),
    established_date DATE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schools_code ON schools(code);

-- ============================================
-- ACADEMIC STRUCTURE
-- ============================================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    section VARCHAR(10) NOT NULL,
    grade_level INTEGER,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year VARCHAR(10) NOT NULL,
    class_teacher_id UUID REFERENCES users(id),
    max_students INTEGER DEFAULT 40,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, name, section, academic_year)
);

CREATE INDEX idx_classes_school ON classes(school_id);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, code)
);

CREATE INDEX idx_subjects_school ON subjects(school_id);
CREATE INDEX idx_subjects_class ON subjects(class_id);

-- ============================================
-- STUDENT INFORMATION
-- ============================================

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_group VARCHAR(5),
    aadhar_number VARCHAR(12),
    class_id UUID REFERENCES classes(id),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    roll_number VARCHAR(20),
    admission_date DATE NOT NULL,
    academic_year VARCHAR(10),
    transport_required BOOLEAN DEFAULT FALSE,
    hostel_required BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'GRADUATED', 'TRANSFERRED')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_admission ON students(admission_number);

-- ============================================
-- PARENT-STUDENT RELATIONSHIP
-- ============================================

CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parent_student_relation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('Father', 'Mother', 'Guardian')),
    father_name VARCHAR(100),
    father_phone VARCHAR(20),
    father_occupation VARCHAR(100),
    mother_name VARCHAR(100),
    mother_phone VARCHAR(20),
    mother_occupation VARCHAR(100),
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    primary_contact BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_student ON parent_student_relation(student_id);

-- ============================================
-- TEACHER INFORMATION
-- ============================================

CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    department VARCHAR(100),
    qualification VARCHAR(200),
    specialization TEXT[],
    hire_date DATE,
    experience_years INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    is_lead_teacher BOOLEAN DEFAULT FALSE,
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id, class_id, academic_year)
);

-- ============================================
-- ATTENDANCE TRACKING
-- ============================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('P', 'A', 'L', 'HL')),
    -- P=Present, A=Absent, L=Late, HL=Half-day Leave
    period_id UUID,
    subject_id UUID REFERENCES subjects(id),
    marked_by_user_id UUID REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, date, period_id)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_school ON attendance(school_id);

-- ============================================
-- GRADE & ASSESSMENT MANAGEMENT
-- ============================================

CREATE TABLE assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    default_weightage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    assessment_type_id UUID REFERENCES assessment_types(id),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id),
    max_marks DECIMAL(6,2) NOT NULL,
    due_date DATE,
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    score_achieved DECIMAL(6,2) NOT NULL,
    grade_letter VARCHAR(5),
    remarks TEXT,
    entered_by_user_id UUID REFERENCES users(id),
    exam_type VARCHAR(50),
    academic_year VARCHAR(10),
    date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, assessment_id)
);

CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_assessment ON grades(assessment_id);
CREATE INDEX idx_grades_school ON grades(school_id);

-- ============================================
-- EXAM MANAGEMENT
-- ============================================

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id),
    subject_id UUID NOT NULL REFERENCES subjects(id),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME,
    duration_minutes INTEGER,
    max_marks DECIMAL(6,2),
    syllabus TEXT,
    created_by_user_id UUID REFERENCES users(id),
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FINANCIAL MANAGEMENT
-- ============================================

CREATE TABLE funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    receipt_series_prefix VARCHAR(10),
    receipt_number_start INTEGER DEFAULT 1,
    current_receipt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_name VARCHAR(100) NOT NULL,
    fee_short_name VARCHAR(20),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES funds(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE class_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id UUID NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    installment_type VARCHAR(20) CHECK (installment_type IN ('Monthly', 'Quarterly', 'Annually')),
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES funds(id),
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Cash', 'Card', 'UPI', 'Bank Transfer')),
    transaction_id VARCHAR(100),
    remarks TEXT,
    received_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_school ON payments(school_id);

CREATE TABLE concessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_id UUID NOT NULL REFERENCES fees(id),
    discount_amount DECIMAL(10,2),
    discount_percentage DECIMAL(5,2),
    reason TEXT,
    approved_by_user_id UUID REFERENCES users(id),
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES teachers(id),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- YYYY-MM format
    basic_salary DECIMAL(10,2),
    allowances DECIMAL(10,2),
    deductions DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    payment_date DATE,
    payment_mode VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS & COMMUNICATION
-- ============================================

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    target_roles VARCHAR(20)[], -- Array: ['ADMIN', 'TEACHER', 'STUDENT']
    target_classes UUID[], -- Array of class IDs
    is_high_priority BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_announcements_school ON announcements(school_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(200),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TIMETABLE MANAGEMENT
-- ============================================

CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, period_number)
);

CREATE TABLE timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id),
    teacher_id UUID REFERENCES teachers(id),
    period_id UUID NOT NULL REFERENCES periods(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    room_id UUID,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(class_id, period_id, day_of_week, academic_year)
);

-- ============================================
-- LIBRARY MANAGEMENT
-- ============================================

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100),
    publisher VARCHAR(100),
    publication_year INTEGER,
    category VARCHAR(50),
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE book_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id),
    student_id UUID NOT NULL REFERENCES students(id),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    checkout_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(8,2) DEFAULT 0.00,
    status VARCHAR(20) CHECK (status IN ('ISSUED', 'RETURNED', 'OVERDUE')),
    issued_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TRANSPORT MANAGEMENT
-- ============================================

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_name VARCHAR(100) NOT NULL,
    route_number VARCHAR(20),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    pickup_points TEXT[],
    distance_km DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE route_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    installment_type VARCHAR(20) CHECK (installment_type IN ('Monthly', 'Quarterly', 'Annually')),
    fund_id UUID REFERENCES funds(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES routes(id),
    pickup_point VARCHAR(200),
    academic_year VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, academic_year)
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50),
    capacity INTEGER,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- HOSTEL MANAGEMENT
-- ============================================

CREATE TABLE hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    hostel_type VARCHAR(20) CHECK (hostel_type IN ('Boys', 'Girls')),
    total_rooms INTEGER,
    warden_name VARCHAR(100),
    warden_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE hostel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL,
    occupied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(hostel_id, room_number)
);

CREATE TABLE hostel_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES hostel_rooms(id),
    allocation_date DATE NOT NULL,
    academic_year VARCHAR(10),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VACATED')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FEATURE TOGGLES
-- ============================================

CREATE TABLE feature_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    updated_by_user_id UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize default features
INSERT INTO feature_toggles (feature_name, description) VALUES
('library_management', 'Enable library book management system'),
('transport_management', 'Enable transportation and route management'),
('hostel_management', 'Enable hostel room allocation system'),
('exam_management', 'Enable examination and assessment system'),
('fee_management', 'Enable financial and fee management');
```

---

## Complete Feature Specifications

### 1. Student Admissions Module

**Purpose**: Handle new student intake and enrollment

**Mandatory Fields**:
- Admission Number (unique identifier)
- First Name
- Last Name
- Admission Class
- Section
- Gender (Male/Female/Other)
- Admission Date
- Father Name & Phone
- Mother Name & Phone

**Optional Fields**:
- Aadhar Number
- Date of Birth
- Transport Preference (Yes/No)
- Blood Group
- Previous School Details

**Process Flow**:
1. Admin initiates new admission
2. System generates unique admission number
3. Basic student details entered
4. Parent information captured
5. Class and section assigned
6. User account auto-created (Student role)
7. Welcome email/SMS sent
8. Admission confirmation generated

---

### 2. Financial Management Module

#### 2.1 Master Data Setup

**Fund Management**:
- Purpose: Define high-level revenue accounts
- Fields: Name, Short Name, Receipt Series Prefix, Starting Number
- Use Case: Tuition Fund, Transport Fund, Library Fund

**Fee Structure**:
- Purpose: Define fee types and amounts
- Configuration:
  - Fee Name (e.g., "Tuition Fee")
  - Associated Fund
  - Class-wise amounts
  - Installment type (Monthly/Quarterly/Annually)

**Bus Route Fees**:
- Link transport routes to fee structure
- Variable pricing by distance/zone

#### 2.2 Transactional Features

**Fee Concessions**:
- Target: Individual students or groups
- Types: Fixed amount or percentage discount
- Approval workflow
- Audit trail

**Payment Collection**:
1. Search student by name/admission number
2. Display all dues with breakdown
3. Select fees to pay
4. Record payment mode (Cash/Card/UPI/Bank)
5. Generate unique receipt number
6. Print/email receipt
7. Update ledger automatically

**Payment Modes**:
- Cash
- Card (Credit/Debit)
- UPI
- Bank Transfer
- Cheque

**Financial Reports**:
- Collection summary by date range
- Outstanding dues report
- Fund-wise income report
- Student payment history
- Defaulter list

---

### 3. Attendance Tracking Module

#### 3.1 Daily Attendance

**Marking Interface**:
- Grid view with all students
- Date selector
- Status options: P (Present), A (Absent), L (Late), HL (Half Leave)
- Bulk actions: Mark all present
- Save and submit
- SMS alert to parents on absence

**Subject/Period Attendance**:
- Track attendance by specific periods
- Link to timetable
- Subject-wise analytics

#### 3.2 Attendance Reports

**For Teachers**:
- Daily attendance summary
- Monthly attendance percentage
- Identify students with low attendance

**For Admins**:
- Class-wise attendance trends
- Teacher attendance marking compliance
- School-wide attendance statistics

**For Students/Parents**:
- Personal attendance calendar
- Monthly percentage
- Absence history with dates

**Real-time Alerts**:
- SMS to parents when student marked absent
- Email digest of weekly attendance
- Low attendance warnings (<75%)

---

### 4. Gradebook & Assessment Module

#### 4.1 Assessment Setup

**Assessment Types**:
- Define types: Homework, Quiz, Midterm, Final Exam, Project
- Set default weightage for each type
- Configure grading scale (A-F or percentage)

**Creating Assessments**:
- Assessment name (e.g., "Chapter 3 Quiz")
- Associated class and subject
- Maximum marks
- Due date
- Assessment type
- Assigned teacher

#### 4.2 Grade Entry

**Teacher Interface**:
- Grid-based entry system
- Student list with input fields
- Bulk import from Excel/CSV
- Validation (marks not exceeding maximum)
- Save draft or finalize
- Edit history tracking

**Grade Calculation**:
- Weighted average based on assessment types
- Automatic GPA calculation
- Letter grade assignment
- Percentile ranking

#### 4.3 Report Cards

**Generation**:
- Subject-wise marks breakdown
- Overall percentage and grade
- Teacher remarks section
- Attendance summary
- Behavioral comments
- Customizable template
- Digital signature support

**Distribution**:
- PDF download
- Email to parents
- Print batch reports
- Student portal access

---

### 5. Staff Management Module

#### 5.1 Teacher/Staff CRUD

**Teacher Profile**:
- Employee ID (unique)
- Personal details
- Qualification and specialization
- Department assignment
- Hire date
- Experience years
- Contact information
- Emergency contacts

**Department Management**:
- Create departments (Science, Math, Admin, etc.)
- Assign head of department
- Department budget allocation

#### 5.2 Class & Subject Assignment

**Teacher Assignment**:
- Assign teachers to specific classes
- Link subjects to teachers
- Set class teacher (homeroom)
- Multiple class assignments
- Substitute teacher management

**Workload Tracking**:
- Total periods per week
- Class strength summary
- Subject distribution

---

### 6. Timetable Management Module

#### 6.1 Period Configuration

**Time Slot Setup**:
- Define school timings
- Create period slots (Period 1: 9:00-9:45)
- Break times (Recess, Lunch)
- Different schedules for different days

#### 6.2 Timetable Builder

**Interface Features**:
- Drag-and-drop period assignment
- Week view calendar
- Assign subject, teacher, and room per period
- Color coding by subject
- Copy from previous week/term

**Conflict Detection**:
- Teacher double-booking prevention
- Room overlap detection
- Maximum periods per day check
- Balanced distribution verification

#### 6.3 Timetable Views

**For Teachers**:
- Personal weekly schedule
- Daily view with room numbers
- Free period identification

**For Students**:
- Class timetable
- Subject-wise teacher names
- Room locations

**For Admins**:
- All classes overview
- Teacher utilization report
- Room occupancy schedule

---

### 7. Communication Module

#### 7.1 Announcements

**Creation**:
- Title and detailed content
- Rich text editor support
- Attach files/images
- Target audience selection:
  - All users
  - Specific roles (Teachers, Students, Parents)
  - Specific classes
  - Individual students
- Priority flag (High/Normal)
- Schedule for future posting

**Display**:
- Dashboard feed
- Dedicated announcements page
- Email notifications
- SMS for high-priority items
- Read/unread status

#### 7.2 Internal Messaging

**Features**:
- One-to-one messaging
- Teacher-parent communication
- Admin-teacher communication
- Message threading
- Attachment support
- Read receipts
- Search and filter messages

**Moderation**:
- Admin can view all messages (if needed)
- Report inappropriate content
- Message archival

---

### 8. Library Management Module

#### 8.1 Book Catalog

**Book Entry**:
- ISBN number
- Title and author
- Publisher and publication year
- Category/genre
- Total copies
- Available copies
- Shelf location
- Book condition

**Catalog Management**:
- Add new books
- Update book details
- Mark books as lost/damaged
- Book reservation system

#### 8.2 Checkout System

**Issue Book**:
- Search student by ID/name
- Select book from catalog
- Set due date (configurable, e.g., 14 days)
- Print/email checkout receipt
- Update available count

**Return Book**:
- Scan/enter book ID
- Calculate fine if overdue
- Update book status
- Add return notes (condition)

**Fine Calculation**:
- Configurable per-day fine rate
- Automatic calculation
- Fine waiver by admin
- Payment integration

#### 8.3 Library Reports

- Most borrowed books
- Books overdue
- Student borrowing history
- Category-wise statistics
- Popular authors/genres

---

### 9. Transport Management Module

#### 9.1 Route Management

**Route Creation**:
- Route name and number
- Pickup points (stops) array
- Total distance
- Estimated time
- Map integration (optional)

**Vehicle Assignment**:
- Vehicle registration number
- Vehicle type (Bus/Van/Car)
- Seating capacity
- Driver name and contact
- Route assignment
- Maintenance schedule

#### 9.2 Student Transport Allocation

**Assignment Process**:
- Select student
- Choose route
- Specify pickup point
- Set start date
- Calculate transport fee

**Route Optimization**:
- Student count per route
- Capacity monitoring
- Route efficiency analysis

#### 9.3 Transport Fees

**Fee Structure**:
- Route-based pricing
- Distance-based pricing
- Installment options
- Link to fund management

---

### 10. Hostel Management Module

#### 10.1 Hostel Setup

**Hostel Configuration**:
- Hostel name
- Type (Boys/Girls)
- Total rooms
- Warden details
- Contact information

**Room Management**:
- Room number
- Capacity (2/4/6 beds)
- Current occupancy
- Amenities list
- Room condition

#### 10.2 Student Allocation

**Allocation Process**:
- Select student
- Choose available room
- Set allocation date
- Academic year tracking
- Roommate preferences

**Check-in/Check-out**:
- Daily attendance tracking
- Weekend home tracking
- Visitor log
- Disciplinary records

#### 10.3 Hostel Reports

- Occupancy rate
- Vacant rooms
- Student list by room
- Attendance summary

---

### 11. Examination Management Module

#### 11.1 Exam Scheduling

**Exam Creation**:
- Exam name (e.g., "Mid-Term 2024")
- Class and subject
- Exam date and time
- Duration
- Maximum marks
- Syllabus details
- Exam hall assignment

**Exam Calendar**:
- Monthly/yearly view
- Avoid date conflicts
- Student exam schedule
- Invigilator assignment

#### 11.2 Admit Card Generation

**Card Content**:
- Student photo
- Exam schedule
- Roll number
- Exam center
- Instructions
- QR code (optional)

**Distribution**:
- Bulk generation
- PDF download
- Print batch
- Digital delivery

#### 11.3 Result Processing

**Mark Entry**:
- Subject-wise mark entry
- Bulk import support
- Validation checks
- Moderation workflow

**Result Publication**:
- Grade calculation
- Rank assignment
- Result announcement
- Student/parent notification
- Result portal access

---

### 12. Dashboard & Analytics

#### 12.1 SuperAdmin Dashboard

**Metrics Displayed**:
- Total schools count
- Total users across all schools
- Total students enrolled
- System-wide revenue
- Active/inactive schools
- User role distribution

**Visualizations**:
- School growth chart
- Revenue trends
- User activity heatmap
- Geographic distribution (if applicable)

#### 12.2 School Admin Dashboard

**Key Metrics**:
- Total students
- Total teachers
- Total classes
- Today's attendance rate
- Outstanding fees
- Recent announcements
- Upcoming events

**Quick Actions**:
- Add new student
- Mark attendance
- Create announcement
- Generate reports
- View finance summary

**Charts & Graphs**:
- Monthly attendance trends
- Fee collection vs target
- Class-wise strength
- Subject-wise performance

#### 12.3 Teacher Dashboard

**Display**:
- Today's schedule (periods)
- Assigned classes
- Pending attendance marking
- Pending grade entries
- Recent announcements
- Student count

**Quick Links**:
- Mark attendance
- Enter grades
- View timetable
- Student list

#### 12.4 Student Dashboard

**Information**:
- Personal profile card
- Today's timetable
- Recent grades
- Attendance summary
- Library books issued
- Announcements feed
- Upcoming exams

#### 12.5 Parent Dashboard

**Overview**:
- Children selector dropdown
- Selected child's info card
- Academic performance graph
- Attendance percentage
- Fee payment status
- Recent teacher communications
- School announcements

---

## API Endpoints Structure

### Authentication Endpoints

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - User login (returns JWT)
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Logout user
POST   /api/auth/forgot-password   - Initiate password reset
POST   /api/auth/reset-password    - Complete password reset
GET    /api/auth/me                - Get current user info
PUT    /api/auth/change-password   - Change user password
```

### School Management (SuperAdmin Only)

```
GET    /api/schools/               - List all schools
POST   /api/schools/               - Create new school
GET    /api/schools/{id}           - Get school details
PUT    /api/schools/{id}           - Update school
DELETE /api/schools/{id}           - Delete school
GET    /api/schools/{id}/stats     - Get school statistics
```

### User Management

```
GET    /api/users/                 - List users (filtered by role/school)
POST   /api/users/                 - Create new user
GET    /api/users/{id}             - Get user details
PUT    /api/users/{id}             - Update user
DELETE /api/users/{id}             - Delete user
GET    /api/users/profile          - Get own profile
PUT    /api/users/profile          - Update own profile
GET    /api/users/roles            - List available roles
POST   /api/users/bulk-import      - Bulk user import (CSV)
```

### Academic Management

```
# Classes
GET    /api/classes/               - List classes
POST   /api/classes/               - Create class
GET    /api/classes/{id}           - Get class details
PUT    /api/classes/{id}           - Update class
DELETE /api/classes/{id}           - Delete class
GET    /api/classes/{id}/students  - Get students in class

# Subjects
GET    /api/subjects/              - List subjects
POST   /api/subjects/              - Create subject
GET    /api/subjects/{id}          - Get subject details
PUT    /api/subjects/{id}          - Update subject
DELETE /api/subjects/{id}          - Delete subject
```

### Student Management

```
GET    /api/students/              - List students
POST   /api/students/              - Create/admit student
GET    /api/students/{id}          - Get student details
PUT    /api/students/{id}          - Update student
DELETE /api/students/{id}          - Delete student
GET    /api/students/{id}/grades   - Get student grades
GET    /api/students/{id}/attendance - Get student attendance
POST   /api/students/bulk-import   - Bulk student import
GET    /api/students/export        - Export students to CSV
```

### Parent Management

```
GET    /api/parents/               - List parents
POST   /api/parents/               - Create parent
GET    /api/parents/{id}/children  - Get parent's children
POST   /api/parents/{id}/link-student - Link student to parent
```

### Teacher Management

```
GET    /api/teachers/              - List teachers
POST   /api/teachers/              - Create teacher
GET    /api/teachers/{id}          - Get teacher details
PUT    /api/teachers/{id}          - Update teacher
DELETE /api/teachers/{id}          - Delete teacher
GET    /api/teachers/{id}/subjects - Get assigned subjects
POST   /api/teachers/{id}/assign-subject - Assign subject/class
```

### Attendance Management

```
POST   /api/attendance/mark        - Mark attendance (single/bulk)
GET    /api/attendance/class/{class_id}/date/{date} - Get class attendance
GET    /api/attendance/student/{id} - Get student attendance history
GET    /api/attendance/reports     - Get attendance reports
PUT    /api/attendance/{id}        - Update attendance record (admin)
GET    /api/attendance/summary     - Get attendance summary statistics
```

### Grade Management

```
# Assessments
GET    /api/assessments/           - List assessments
POST   /api/assessments/           - Create assessment
GET    /api/assessments/{id}       - Get assessment details
PUT    /api/assessments/{id}       - Update assessment
DELETE /api/assessments/{id}       - Delete assessment

# Grades
POST   /api/grades/entry           - Enter grades (single/bulk)
GET    /api/grades/student/{id}    - Get student grades
GET    /api/grades/class/{id}      - Get class grades
GET    /api/grades/assessment/{id} - Get grades for assessment
PUT    /api/grades/{id}            - Update grade
GET    /api/grades/reports/student/{id} - Generate student report card
```

### Exam Management

```
GET    /api/exams/                 - List exams
POST   /api/exams/                 - Create exam
GET    /api/exams/{id}             - Get exam details
PUT    /api/exams/{id}             - Update exam
DELETE /api/exams/{id}             - Delete exam
GET    /api/exams/{id}/schedule    - Get exam schedule
POST   /api/exams/{id}/admit-cards - Generate admit cards
```

### Financial Management

```
# Funds
GET    /api/funds/                 - List funds
POST   /api/funds/                 - Create fund
PUT    /api/funds/{id}             - Update fund

# Fees
GET    /api/fees/                  - List fee types
POST   /api/fees/                  - Create fee type
GET    /api/fees/class/{id}        - Get class fee structure
POST   /api/fees/set-class-fee     - Set fee for class

# Payments
POST   /api/payments/              - Record payment
GET    /api/payments/student/{id}  - Get student payment history
GET    /api/payments/receipt/{id}  - Get payment receipt
GET    /api/payments/outstanding   - Get outstanding fees report
GET    /api/payments/reports       - Financial reports

# Concessions
POST   /api/concessions/           - Apply concession
GET    /api/concessions/student/{id} - Get student concessions

# Salaries
POST   /api/salaries/              - Process salary
GET    /api/salaries/teacher/{id}  - Get teacher salary history
GET    /api/salaries/month/{month} - Get monthly salary report
```

### Announcements & Communication

```
# Announcements
GET    /api/announcements/         - List announcements
POST   /api/announcements/         - Create announcement
GET    /api/announcements/{id}     - Get announcement details
PUT    /api/announcements/{id}     - Update announcement
DELETE /api/announcements/{id}     - Delete announcement
GET    /api/announcements/my       - Get announcements for current user

# Messages
GET    /api/messages/              - List messages (inbox)
POST   /api/messages/              - Send message
GET    /api/messages/{id}          - Get message details
PUT    /api/messages/{id}/read     - Mark as read
DELETE /api/messages/{id}          - Delete message
```

### Timetable Management

```
# Periods
GET    /api/periods/               - List periods
POST   /api/periods/               - Create period
PUT    /api/periods/{id}           - Update period

# Timetable
GET    /api/timetable/class/{id}   - Get class timetable
POST   /api/timetable/             - Create timetable entry
PUT    /api/timetable/{id}         - Update timetable entry
DELETE /api/timetable/{id}         - Delete timetable entry
GET    /api/timetable/teacher/{id} - Get teacher schedule
GET    /api/timetable/student/{id} - Get student timetable
```

### Library Management

```
# Books
GET    /api/library/books/         - List books
POST   /api/library/books/         - Add book
GET    /api/library/books/{id}     - Get book details
PUT    /api/library/books/{id}     - Update book
DELETE /api/library/books/{id}     - Delete book
GET    /api/library/books/search   - Search books

# Transactions
POST   /api/library/checkout       - Issue book
POST   /api/library/return         - Return book
GET    /api/library/transactions   - List transactions
GET    /api/library/student/{id}/books - Get student's borrowed books
GET    /api/library/overdue        - Get overdue books
```

### Transport Management

```
# Routes
GET    /api/transport/routes/      - List routes
POST   /api/transport/routes/      - Create route
GET    /api/transport/routes/{id}  - Get route details
PUT    /api/transport/routes/{id}  - Update route
DELETE /api/transport/routes/{id}  - Delete route

# Vehicles
GET    /api/transport/vehicles/    - List vehicles
POST   /api/transport/vehicles/    - Add vehicle
PUT    /api/transport/vehicles/{id} - Update vehicle

# Student Routes
POST   /api/transport/assign       - Assign student to route
GET    /api/transport/student/{id}/route - Get student's route
GET    /api/transport/route/{id}/students - Get students on route
```

### Hostel Management

```
# Hostels
GET    /api/hostels/               - List hostels
POST   /api/hostels/               - Create hostel
PUT    /api/hostels/{id}           - Update hostel

# Rooms
GET    /api/hostels/{id}/rooms     - List rooms in hostel
POST   /api/hostels/rooms/         - Create room
PUT    /api/hostels/rooms/{id}     - Update room

# Allocations
POST   /api/hostels/allocate       - Allocate student to room
GET    /api/hostels/student/{id}/allocation - Get student allocation
GET    /api/hostels/room/{id}/students - Get students in room
POST   /api/hostels/vacate         - Vacate student from room
```

### Feature Toggles (SuperAdmin Only)

```
GET    /api/features/toggles       - List all feature toggles
PUT    /api/features/toggles/{name} - Enable/disable feature
GET    /api/features/enabled       - Get enabled features
```

### Dashboard & Reports

```
GET    /api/dashboard/superadmin   - SuperAdmin dashboard data
GET    /api/dashboard/admin        - School Admin dashboard data
GET    /api/dashboard/teacher      - Teacher dashboard data
GET    /api/dashboard/student      - Student dashboard data
GET    /api/dashboard/parent       - Parent dashboard data

# Reports
GET    /api/reports/attendance     - Attendance reports
GET    /api/reports/grades         - Grade reports
GET    /api/reports/financial      - Financial reports
GET    /api/reports/students       - Student reports
POST   /api/reports/custom         - Generate custom report
```

---

## Development Roadmap (Phased Approach)

### PHASE 1: Foundation & Core Setup (Weeks 1-3)

#### Week 1: Project Initialization

**Backend Setup**:
```bash
# Create project structure
mkdir -p backend/{app/{api,core,db,models,schemas,services,utils},tests,alembic}
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-jose bcrypt python-multipart alembic
pip freeze > requirements.txt
```

**Database Configuration**:
- Set up PostgreSQL locally or use Docker
- Configure SQLAlchemy engine with connection pooling
- Create base model class with common fields
- Set up Alembic for migrations
- Create initial migration

**Frontend Setup**:
```bash
# Create portals
npm create vite@latest superadmin-portal -- --template react-ts
npm create vite@latest school-portal -- --template react-ts
npm create vite@latest family-portal -- --template react-ts

# Install common dependencies for each portal
cd superadmin-portal
npm install react-router-dom @reduxjs/toolkit react-redux axios @mui/material @emotion/react @emotion/styled
```

#### Week 2: Authentication & Authorization

**Tasks**:
1. Create User model with role enum
2. Implement password hashing with bcrypt
3. Create JWT token generation/verification
4. Build login endpoint
5. Build register endpoint
6. Create auth middleware for protected routes
7. Implement permission decorators
8. Set up refresh token mechanism

**Deliverables**:
- Working login system
- JWT authentication
- Role-based route protection
- User registration API

#### Week 3: Multi-Tenancy & Core Models

**Tasks**:
1. Create School model
2. Implement school_id filtering middleware
3. Create Class and Subject models
4. Create Student, Teacher, Parent models
5. Set up relationships and foreign keys
6. Write tenant-aware query utilities
7. Test multi-tenant data isolation

**Deliverables**:
- Complete core data models
- Multi-tenant query system
- Database migrations
- Sample seed data

---

### PHASE 2: SuperAdmin Portal (Weeks 4-5)

#### Week 4: SuperAdmin Backend APIs

**Tasks**:
1. School CRUD endpoints
2. Global user management endpoints
3. System-wide statistics API
4. Feature toggle management API
5. School admin assignment logic

**Deliverables**:
- Complete SuperAdmin API routes
- Swagger documentation
- Unit tests for endpoints

#### Week 5: SuperAdmin Frontend

**Tasks**:
1. Login page with authentication
2. Dashboard with system metrics
3. Schools listing page with data table
4. School creation/edit form
5. User management interface
6. Feature toggle control panel
7. Analytics charts

**Deliverables**:
- Fully functional SuperAdmin portal
- Responsive UI
- State management with Redux

---

### PHASE 3: School Portal - Admin Features (Weeks 6-8)

#### Week 6: Academic Management

**Backend**:
- Student CRUD endpoints
- Class/Section management APIs
- Subject management APIs
- Bulk import functionality

**Frontend**:
- Student list with search/filter
- Student admission form
- Class management UI
- Subject assignment interface

#### Week 7: Attendance & Grades

**Backend**:
- Attendance marking API
- Attendance reports API
- Grade entry endpoints
- Assessment management APIs

**Frontend**:
- Attendance marking grid
- Attendance reports page
- Grade entry interface
- Assessment creation form

#### Week 8: Financial Module

**Backend**:
- Fund and fee structure APIs
- Payment recording endpoints
- Concession management
- Financial reports API

**Frontend**:
- Fee structure setup
- Payment collection interface
- Receipt generation
- Financial reports dashboard

---

### PHASE 4: School Portal - Teacher Features (Weeks 9-10)

#### Week 9: Teacher Workflows

**Backend**:
- Teacher-specific data filtering
- Subject assignment APIs
- Class roster endpoints

**Frontend**:
- Teacher dashboard
- Assigned classes view
- Student list for teachers
- Quick attendance marking

#### Week 10: Exam & Communication

**Backend**:
- Exam management APIs
- Announcement CRUD
- Internal messaging system

**Frontend**:
- Exam creation interface
- Announcement posting
- Message inbox
- Notifications panel

---

### PHASE 5: Family Portal (Weeks 11-12)

#### Week 11: Student Portal

**Backend**:
- Student-specific data endpoints
- Grade retrieval API
- Attendance history API

**Frontend**:
- Student dashboard
- Grades display with charts
- Attendance calendar
- Profile management
- Timetable view

#### Week 12: Parent Portal

**Backend**:
- Parent-children linking API
- Multi-child data retrieval

**Frontend**:
- Parent dashboard
- Child selector
- Combined grades view
- Attendance monitoring
- Teacher communication

---

### PHASE 6: Advanced Modules (Weeks 13-15)

#### Week 13: Library & Transport

**Library**:
- Book catalog management
- Checkout/return system
- Fine calculation
- Reports

**Transport**:
- Route management
- Vehicle tracking
- Student route assignment
- Transport fee integration

#### Week 14: Timetable & Hostel

**Timetable**:
- Period configuration
- Timetable builder with drag-drop
- Conflict detection
- Multiple views (teacher/student/class)

**Hostel**:
- Hostel and room setup
- Student allocation
- Check-in/check-out tracking
- Occupancy reports

#### Week 15: Analytics & Reports

**Tasks**:
- Dashboard visualizations
- Custom report builder
- Export functionality (PDF/Excel)
- Email report scheduling
- Data visualization with charts

---

### PHASE 7: Testing & Quality Assurance (Weeks 16-17)

#### Week 16: Backend Testing

**Tasks**:
- Unit tests for all service functions
- Integration tests for API endpoints
- Test multi-tenant data isolation
- Test permission system
- Test authentication flows
- Achieve 80%+ code coverage

**Tools**:
- pytest for Python
- pytest-cov for coverage
- Factory Boy for test data

#### Week 17: Frontend Testing

**Tasks**:
- Component unit tests with Jest
- Integration tests with React Testing Library
- E2E tests with Cypress/Playwright
- Accessibility testing
- Performance testing

---

### PHASE 8: Deployment & DevOps (Weeks 18-19)

#### Week 18: Containerization

**Docker Setup**:
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile (for each portal)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: niladri_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://admin:secure_password@db:5432/niladri_db
      JWT_SECRET: your_jwt_secret
    depends_on:
      - db

  superadmin-portal:
    build: ./frontend/superadmin-portal
    ports:
      - "3000:80"

  school-portal:
    build: ./frontend/school-portal
    ports:
      - "3001:80"

  family-portal:
    build: ./frontend/family-portal
    ports:
      - "3002:80"

volumes:
  postgres_data:
```

#### Week 19: CI/CD Pipeline

**GitHub Actions Workflow**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app tests/
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        portal: [superadmin-portal, school-portal, family-portal]
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend/${{ matrix.portal }}
          npm ci
      - name: Run tests
        run: |
          cd frontend/${{ matrix.portal }}
          npm test
      - name: Build
        run: |
          cd frontend/${{ matrix.portal }}
          npm run build

  deploy:
    needs: [backend-test, frontend-test]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Add deployment scripts here
          echo "Deploying to production..."
```

---

## Security & Authentication

### 1. Password Security

**Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Implementation**:
```python
import bcrypt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

### 2. JWT Token Management

**Token Structure**:
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry

**Token Payload**:
```json
{
  "sub": "user_id",
  "role": "ADMIN",
  "school_id": "school_uuid",
  "exp": 1234567890
}
```

**Implementation**:
```python
from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### 3. API Security Measures

**CORS Configuration**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Rate Limiting**:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(credentials: LoginSchema):
    # Login logic
    pass
```

**Input Sanitization**:
```python
from pydantic import BaseModel, validator
import html

class UserCreate(BaseModel):
    username: str
    email: str
    
    @validator('username', 'email')
    def sanitize_input(cls, v):
        return html.escape(v.strip())
```

**SQL Injection Prevention**:
- Always use SQLAlchemy ORM
- Never use raw SQL with string concatenation
- Use parameterized queries if raw SQL is necessary

**XSS Protection**:
- Sanitize all user inputs
- Escape HTML in frontend
- Use Content Security Policy headers

### 4. Multi-Tenant Security

**Automatic School Filtering**:
```python
from fastapi import Depends
from sqlalchemy.orm import Session

def get_current_user_school(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "SUPERADMIN":
        return None  # Can access all schools
    return current_user.school_id

def get_students(
    school_id: str = Depends(get_current_user_school),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if school_id:
        query = query.filter(Student.school_id == school_id)
    return query.all()
```

**Permission Decorators**:
```python
from functools import wraps
from fastapi import HTTPException, status

def require_role(*roles):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: User = Depends(get_current_user), **kwargs):
            if current_user.role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

# Usage
@app.post("/api/schools/")
@require_role("SUPERADMIN")
async def create_school(school: SchoolCreate, current_user: User):
    # Only SuperAdmin can create schools
    pass
```

### 5. Data Encryption

**Environment Variables**:
```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost/dbname
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET_KEY=your-refresh-token-secret
ENCRYPTION_KEY=your-encryption-key-for-sensitive-data
SMTP_PASSWORD=your-email-password
```

**Sensitive Data Encryption**:
```python
from cryptography.fernet import Fernet
import os

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY").encode()
cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_data(data: str) -> str:
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    return cipher_suite.decrypt(encrypted_data.encode()).decode()
```

### 6. Account Security

**Failed Login Tracking**:
```python
from datetime import datetime, timedelta

class User(Base):
    # ... other fields
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)

async def check_account_lock(user: User):
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked until {user.locked_until}"
        )
    
    if user.failed_login_attempts >= 5:
        user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked due to multiple failed login attempts"
        )
```

**Session Management**:
```python
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    token_jti = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_revoked = Column(Boolean, default=False)
    ip_address = Column(String)
    user_agent = Column(String)

# Revoke session on logout
async def logout(token: str, db: Session):
    session = db.query(UserSession).filter_by(token_jti=token).first()
    if session:
        session.is_revoked = True
        db.commit()
```

---

## Deployment & DevOps

### 1. Environment Configuration

**Development Environment**:
```bash
# development.env
ENV=development
DEBUG=True
DATABASE_URL=postgresql://localhost/niladri_dev
JWT_SECRET_KEY=dev-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
LOG_LEVEL=DEBUG
```

**Production Environment**:
```bash
# production.env
ENV=production
DEBUG=False
DATABASE_URL=postgresql://prod-server/niladri_prod
JWT_SECRET_KEY=${PRODUCTION_JWT_SECRET}
CORS_ORIGINS=https://superadmin.niladri.com,https://school.niladri.com,https://family.niladri.com
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn
```

### 2. Database Migrations

**Alembic Setup**:
```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Create initial tables"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

**Migration Script Example**:
```python
"""create users table

Revision ID: 001
Revises: 
Create Date: 2024-01-01

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(100), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

def downgrade():
    op.drop_table('users')
```

### 3. Logging & Monitoring

**Structured Logging**:
```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Usage
logger.info("user_login", user_id=user.id, role=user.role)
logger.error("payment_failed", student_id=student.id, amount=amount)
```

**Error Tracking with Sentry**:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    environment=os.getenv("ENV"),
    traces_sample_rate=1.0,
)
```

**Health Check Endpoint**:
```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
```

### 4. Performance Optimization

**Database Connection Pooling**:
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

**Query Optimization**:
```python
# Use eager loading to avoid N+1 queries
from sqlalchemy.orm import joinedload

students = db.query(Student)\
    .options(joinedload(Student.class_))\
    .options(joinedload(Student.user))\
    .all()

# Use pagination
from fastapi import Query

@app.get("/api/students/")
async def list_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    students = db.query(Student).offset(skip).limit(limit).all()
    total = db.query(Student).count()
    return {"items": students, "total": total, "skip": skip, "limit": limit}
```

**Caching Strategy**:
```python
from functools import lru_cache
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

# Redis caching
@cache(expire=300)  # 5 minutes
async def get_school_dashboard(school_id: str):
    # Expensive computation
    return dashboard_data

# In-memory caching for static data
@lru_cache(maxsize=128)
def get_feature_toggles():
    return db.query(FeatureToggle).all()
```

**Background Tasks**:
```python
from fastapi import BackgroundTasks

async def send_email_notification(email: str, message: str):
    # Email sending logic
    await asyncio.sleep(2)  # Simulate email sending
    logger.info("email_sent", email=email)

@app.post("/api/announcements/")
async def create_announcement(
    announcement: AnnouncementCreate,
    background_tasks: BackgroundTasks
):
    # Save announcement
    db_announcement = Announcement(**announcement.dict())
    db.add(db_announcement)
    db.commit()
    
    # Send emails in background
    background_tasks.add_task(
        send_email_notification,
        email="recipients@example.com",
        message=announcement.content
    )
    
    return db_announcement
```

### 5. Backup & Recovery

**Database Backup Script**:
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/niladri"
DB_NAME="niladri_prod"

# Create backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Automated Backup Cron Job**:
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh >> /var/log/niladri_backup.log 2>&1
```

**Restore Procedure**:
```bash
# Restore from backup
gunzip -c backup_20240101_020000.sql.gz | psql niladri_prod
```

### 6. SSL/TLS Configuration

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name school.niladri.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name school.niladri.com;

    ssl_certificate /etc/letsencrypt/live/school.niladri.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/school.niladri.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://school-portal:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Quality Assurance & Testing

### 1. Backend Testing Strategy

**Unit Tests**:
```python
# tests/test_auth.py
import pytest
from app.core.security import hash_password, verify_password, create_access_token

def test_password_hashing():
    password = "SecurePass123!"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPass", hashed) is False

def test_jwt_token_creation():
    data = {"sub": "user123", "role": "ADMIN"}
    token = create_access_token(data)
    assert token is not None
    assert len(token) > 0
```

**Integration Tests**:
```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_create_student_unauthorized():
    response = client.post(
        "/api/students/",
        json={"name": "John Doe"}
    )
    assert response.status_code == 401

def test_multi_tenant_isolation():
    # Login as school1 admin
    token1 = get_auth_token("school1_admin")
    
    # Create student in school1
    response = client.post(
        "/api/students/",
        headers={"Authorization": f"Bearer {token1}"},
        json={"name": "Student1", "school_id": "school1"}
    )
    student_id = response.json()["id"]
    
    # Login as school2 admin
    token2 = get_auth_token("school2_admin")
    
    # Try to access school1 student - should fail
    response = client.get(
        f"/api/students/{student_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert response.status_code == 403
```

**Database Test Fixtures**:
```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(engine)

@pytest.fixture
def sample_school(db_session):
    school = School(name="Test School", code="TS001")
    db_session.add(school)
    db_session.commit()
    return school
```

### 2. Frontend Testing

**Component Unit Tests**:
```typescript
// tests/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '../components/LoginForm';

test('renders login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('validates empty form submission', async () => {
    render(<LoginForm />);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
});
```

**Integration Tests with RTK Query**:
```typescript
// tests/studentSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';
import studentReducer from '../features/students/studentSlice';

const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        students: studentReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(api.middleware),
});

test('fetches students from API', async () => {
    const result = await store.dispatch(
        api.endpoints.getStudents.initiate({ schoolId: 'test-school' })
    );
    
    expect(result.data).toHaveLength(5);
    expect(result.data[0]).toHaveProperty('id');
    expect(result.data[0]).toHaveProperty('name');
});
```

**E2E Tests with Cypress**:
```typescript
// cypress/e2e/student-management.cy.ts
describe('Student Management Flow', () => {
    beforeEach(() => {
        cy.login('admin@school.com', 'password123');
    });

    it('creates a new student', () => {
        cy.visit('/students');
        cy.get('[data-testid="add-student-btn"]').click();
        
        cy.get('#admission-number').type('2024001');
        cy.get('#first-name').type('John');
        cy.get('#last-name').type('Doe');
        cy.get('#class-select').select('Grade 10');
        cy.get('#section-select').select('A');
        
        cy.get('[data-testid="submit-btn"]').click();
        
        cy.contains('Student created successfully').should('be.visible');
        cy.url().should('include', '/students');
        cy.contains('John Doe').should('be.visible');
    });

    it('searches for a student', () => {
        cy.visit('/students');
        cy.get('[data-testid="search-input"]').type('John');
        
        cy.get('[data-testid="student-row"]').should('have.length', 1);
        cy.contains('John Doe').should('be.visible');
    });
});
```

### 3. Performance Testing

**Load Testing with Locust**:
```python
# locustfile.py
from locust import HttpUser, task, between

class SchoolPortalUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/auth/login", json={
            "email": "test@school.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    @task(3)
    def view_students(self):
        self.client.get("/api/students/")
    
    @task(2)
    def view_dashboard(self):
        self.client.get("/api/dashboard/admin")
    
    @task(1)
    def mark_attendance(self):
        self.client.post("/api/attendance/mark", json={
            "student_id": "test-student",
            "date": "2024-01-01",
            "status": "P"
        })
```

**Run Load Test**:
```bash
locust -f locustfile.py --host=http://localhost:8000 --users 100 --spawn-rate 10
```

### 4. Security Testing

**SQL Injection Test**:
```python
def test_sql_injection_prevention():
    malicious_input = "admin' OR '1'='1"
    response = client.post(
        "/api/auth/login",
        json={"email": malicious_input, "password": "test"}
    )
    assert response.status_code == 401
    # Should not return successful login
```

**XSS Prevention Test**:
```python
def test_xss_prevention():
    malicious_content = "<script>alert('XSS')</script>"
    response = client.post(
        "/api/announcements/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"title": "Test", "content": malicious_content}
    )
    
    announcement = response.json()
    # Content should be escaped
    assert "<script>" not in announcement["content"]
    assert "&lt;script&gt;" in announcement["content"]
```

### 5. Accessibility Testing

**WCAG Compliance**:
```typescript
// tests/a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LoginPage from '../pages/Login';

expect.extend(toHaveNoViolations);

test('Login page should have no accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
});
```

---

## File Structure

```
niladri-academic-management/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                      # FastAPI app initialization
│   │   │
│   │   ├── api/                         # API routes
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                  # Dependencies (auth, db)
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py              # Authentication endpoints
│   │   │       ├── schools.py           # School management
│   │   │       ├── users.py             # User management
│   │   │       ├── students.py          # Student CRUD
│   │   │       ├── teachers.py          # Teacher management
│   │   │       ├── classes.py           # Class management
│   │   │       ├── subjects.py          # Subject management
│   │   │       ├── attendance.py        # Attendance endpoints
│   │   │       ├── grades.py            # Grade management
│   │   │       ├── exams.py             # Exam management
│   │   │       ├── finance.py           # Financial operations
│   │   │       ├── announcements.py     # Announcements
│   │   │       ├── timetable.py         # Timetable management
│   │   │       ├── library.py           # Library operations
│   │   │       ├── transport.py         # Transport management
│   │   │       ├── hostel.py            # Hostel management
│   │   │       ├── features.py          # Feature toggles
│   │   │       └── dashboard.py         # Dashboard data
│   │   │
│   │   ├── core/                        # Core functionality
│   │   │   ├── __init__.py
│   │   │   ├── config.py                # Configuration settings
│   │   │   ├── security.py              # JWT, password hashing
│   │   │   ├── database.py              # Database connection
│   │   │   └── permissions.py           # RBAC implementation
│   │   │
│   │   ├── db/                          # Database configuration
│   │   │   ├── __init__.py
│   │   │   ├── base.py                  # Base class import
│   │   │   └── session.py               # Session management
│   │   │
│   │   ├── models/                      # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── school.py
│   │   │   ├── student.py
│   │   │   ├── teacher.py
│   │   │   ├── parent.py
│   │   │   ├── class_model.py
│   │   │   ├── subject.py
│   │   │   ├── attendance.py
│   │   │   ├── grade.py
│   │   │   ├── exam.py
│   │   │   ├── finance.py
│   │   │   ├── announcement.py
│   │   │   ├── timetable.py
│   │   │   ├── library.py
│   │   │   ├── transport.py
│   │   │   ├── hostel.py
│   │   │   └── feature_toggle.py
│   │   │
│   │   ├── schemas/                     # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── school.py
│   │   │   ├── student.py
│   │   │   ├── teacher.py
│   │   │   ├── attendance.py
│   │   │   ├── grade.py
│   │   │   ├── finance.py
│   │   │   └── ...
│   │   │
│   │   ├── services/                    # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── student_service.py
│   │   │   ├── attendance_service.py
│   │   │   ├── grade_service.py
│   │   │   ├── finance_service.py
│   │   │   └── notification_service.py
│   │   │
│   │   └── utils/                       # Utility functions
│   │       ├── __init__.py
│   │       ├── email.py                 # Email utilities
│   │       ├── sms.py                   # SMS utilities
│   │       ├── pdf.py                   # PDF generation
│   │       └── validators.py            # Custom validators
│   │
│   ├── tests/                           # Backend tests
│   │   ├── __init__.py
│   │   ├── conftest.py                  # Test fixtures
│   │   ├── test_auth.py
│   │   ├── test_students.py
│   │   ├── test_attendance.py
│   │   ├── test_multi_tenant.py
│   │   └── ...
│   │
│   ├── alembic/                         # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── alembic.ini
│   │
│   ├── .env.example                     # Environment variables template
│   ├── requirements.txt                 # Python dependencies
│   ├── Dockerfile                       # Docker configuration
│   └── README.md
│
├── frontend/
│   │
│   ├── superadmin-portal/               # SuperAdmin Portal
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/                  # Images, fonts
│   │   │   ├── components/              # Reusable components
│   │   │   │   ├── Layout/
│   │   │   │   ├── Sidebar/
│   │   │   │   ├── Navbar/
│   │   │   │   ├── DataTable/
│   │   │   │   └── ...
│   │   │   ├── features/                # Feature slices
│   │   │   │   ├── auth/
│   │   │   │   ├── schools/
│   │   │   │   ├── users/
│   │   │   │   └── dashboard/
│   │   │   ├── pages/                   # Page components
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Schools.tsx
│   │   │   │   ├── Users.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── services/                # API services
│   │   │   │   ├── api.ts               # Base API setup
│   │   │   │   ├── authApi.ts
│   │   │   │   └── schoolsApi.ts
│   │   │   ├── store/                   # Redux store
│   │   │   │   ├── index.ts
│   │   │   │   └── hooks.ts
│   │   │   ├── types/                   # TypeScript types
│   │   │   ├── utils/                   # Utility functions
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── Dockerfile
│   │
│   ├── school-portal/                   # School Portal
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AttendanceGrid/
│   │   │   │   ├── GradeEntry/
│   │   │   │   ├── StudentForm/
│   │   │   │   └── ...
│   │   │   ├── features/
│   │   │   │   ├── students/
│   │   │   │   ├── attendance/
│   │   │   │   ├── grades/
│   │   │   │   ├── finance/
│   │   │   │   └── announcements/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Students/
│   │   │   │   │   ├── StudentList.tsx
│   │   │   │   │   ├── StudentDetails.tsx
│   │   │   │   │   └── StudentForm.tsx
│   │   │   │   ├── Attendance/
│   │   │   │   │   ├── MarkAttendance.tsx
│   │   │   │   │   └── AttendanceReports.tsx
│   │   │   │   ├── Grades/
│   │   │   │   │   ├── GradeEntry.tsx
│   │   │   │   │   └── ReportCards.tsx
│   │   │   │   ├── Finance/
│   │   │   │   │   ├── FeeStructure.tsx
│   │   │   │   │   ├── Payments.tsx
│   │   │   │   │   └── Reports.tsx
│   │   │   │   ├── Library/
│   │   │   │   ├── Transport/
│   │   │   │   └── Settings/
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── studentsApi.ts
│   │   │   │   ├── attendanceApi.ts
│   │   │   │   └── gradesApi.ts
│   │   │   ├── store/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── Dockerfile
│   │
│   └── family-portal/                   # Family Portal
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   ├── GradeCard/
│       │   │   ├── AttendanceCalendar/
│       │   │   ├── TimetableView/
│       │   │   └── ProfileCard/
│       │   ├── features/
│       │   │   ├── profile/
│       │   │   ├── grades/
│       │   │   ├── attendance/
│       │   │   └── announcements/
│       │   ├── pages/
│       │   │   ├── StudentDashboard.tsx
│       │   │   ├── ParentDashboard.tsx
│       │   │   ├── Grades.tsx
│       │   │   ├── Attendance.tsx
│       │   │   ├── Profile.tsx
│       │   │   └── Announcements.tsx
│       │   ├── services/
│       │   ├── store/
│       │   ├── types/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── Dockerfile
│
├── shared/                              # Shared resources
│   ├── components/                      # Shared React components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── ...
│   ├── types/                           # Shared TypeScript types
│   │   ├── user.types.ts
│   │   ├── student.types.ts
│   │   └── ...
│   └── utils/                           # Shared utilities
│       ├── formatters.ts
│       ├── validators.ts
│       └── constants.ts
│
├── deployment/                          # Deployment configurations
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   ├── kubernetes/                      # K8s manifests (optional)
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   └── scripts/
│       ├── deploy.sh
│       ├── backup.sh
│       └── restore.sh
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml               # Backend CI/CD
│       ├── frontend-ci.yml              # Frontend CI/CD
│       └── deploy.yml                   # Deployment workflow
│
├── docs/                                # Documentation
│   ├── API.md                           # API documentation
│   ├── SETUP.md                         # Setup instructions
│   ├── DEPLOYMENT.md                    # Deployment guide
│   ├── ARCHITECTURE.md                  # Architecture details
│   └── USER_GUIDE.md                    # User manual
│
├── docker-compose.yml                   # Local development setup
├── docker-compose.prod.yml              # Production setup
├── .gitignore
├── README.md                            # Project overview
└── LICENSE
```

---

## Development Best Practices

### 1. Code Organization

**Backend Module Structure**:
```python
# Good: Separation of concerns
# models/student.py - Data model only
class Student(Base):
    __tablename__ = "students"
    id = Column(UUID, primary_key=True)
    name = Column(String(100))

# services/student_service.py - Business logic
class StudentService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_student(self, student_data: StudentCreate) -> Student:
        # Validation and business logic here
        student = Student(**student_data.dict())
        self.db.add(student)
        self.db.commit()
        return student

# api/v1/students.py - API endpoints only
@router.post("/students/")
async def create_student(
    student: StudentCreate,
    service: StudentService = Depends(get_student_service)
):
    return service.create_student(student)
```

**Frontend Module Structure**:
```typescript
// Good: Feature-based organization
// features/students/studentsSlice.ts - Redux slice
export const studentsSlice = createSlice({
    name: 'students',
    initialState,
    reducers: { /* reducers */ }
});

// features/students/studentsApi.ts - API calls
export const studentsApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getStudents: builder.query<Student[], void>({
            query: () => '/students'
        })
    })
});

// features/students/StudentList.tsx - Component
export const StudentList: React.FC = () => {
    const { data: students } = useGetStudentsQuery();
    return <Table data={students} />;
};
```

### 2. Error Handling Patterns

**Backend Error Handling**:
```python
from fastapi import HTTPException, status
from app.core.exceptions import (
    NotFoundException,
    PermissionDeniedException,
    ValidationException
)

class ErrorResponse(BaseModel):
    error: str
    detail: str
    status_code: int

@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content=ErrorResponse(
            error="Not Found",
            detail=str(exc),
            status_code=404
        ).dict()
    )

@app.exception_handler(PermissionDeniedException)
async def permission_denied_handler(request: Request, exc: PermissionDeniedException):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content=ErrorResponse(
            error="Permission Denied",
            detail=str(exc),
            status_code=403
        ).dict()
    )

# Usage in service
def get_student(student_id: str, current_user: User) -> Student:
    student = db.query(Student).filter_by(id=student_id).first()
    if not student:
        raise NotFoundException(f"Student with id {student_id} not found")
    
    if student.school_id != current_user.school_id and current_user.role != "SUPERADMIN":
        raise PermissionDeniedException("You don't have access to this student")
    
    return student
```

**Frontend Error Handling**:
```typescript
// services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { toast } from 'react-toastify';

const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    
    if (result.error) {
        const error = result.error as any;
        
        if (error.status === 401) {
            // Logout user
            api.dispatch(logout());
            toast.error('Session expired. Please login again.');
        } else if (error.status === 403) {
            toast.error('You do not have permission to perform this action.');
        } else if (error.status === 404) {
            toast.error('Resource not found.');
        } else if (error.status >= 500) {
            toast.error('Server error. Please try again later.');
        } else {
            toast.error(error.data?.detail || 'An error occurred');
        }
    }
    
    return result;
};

export const api = createApi({
    baseQuery: baseQueryWithErrorHandling,
    endpoints: () => ({}),
});
```

### 3. Data Validation

**Backend Validation**:
```python
from pydantic import BaseModel, validator, Field
from typing import Optional
from datetime import date

class StudentCreate(BaseModel):
    admission_number: str = Field(..., min_length=5, max_length=20)
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    date_of_birth: date
    email: Optional[str] = Field(None, regex=r'^[\w\.-]+@[\w\.-]+\.\w+)
    phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-()]+)
    
    @validator('date_of_birth')
    def validate_age(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 5 or age > 25:
            raise ValueError('Student age must be between 5 and 25 years')
        return v
    
    @validator('admission_number')
    def validate_admission_number(cls, v):
        if not v.isalnum():
            raise ValueError('Admission number must be alphanumeric')
        return v.upper()
    
    class Config:
        schema_extra = {
            "example": {
                "admission_number": "2024001",
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "2010-01-15",
                "email": "john.doe@example.com",
                "phone": "+1234567890"
            }
        }
```

**Frontend Validation**:
```typescript
// utils/validators.ts
import * as yup from 'yup';

export const studentSchema = yup.object({
    admissionNumber: yup
        .string()
        .required('Admission number is required')
        .matches(/^[A-Z0-9]+$/, 'Must be alphanumeric'),
    
    firstName: yup
        .string()
        .required('First name is required')
        .min(2, 'Must be at least 2 characters')
        .max(50, 'Must be less than 50 characters'),
    
    lastName: yup
        .string()
        .required('Last name is required')
        .min(2, 'Must be at least 2 characters'),
    
    dateOfBirth: yup
        .date()
        .required('Date of birth is required')
        .max(new Date(), 'Date cannot be in the future')
        .test('age', 'Student must be between 5 and 25 years old', function(value) {
            const age = new Date().getFullYear() - new Date(value).getFullYear();
            return age >= 5 && age <= 25;
        }),
    
    email: yup
        .string()
        .email('Invalid email address')
        .nullable(),
    
    phone: yup
        .string()
        .matches(/^\+?[\d\s\-()]+$/, 'Invalid phone number')
        .nullable()
});

// Component usage with Formik
import { Formik, Form, Field } from 'formik';

const StudentForm: React.FC = () => {
    return (
        <Formik
            initialValues={initialValues}
            validationSchema={studentSchema}
            onSubmit={handleSubmit}
        >
            {({ errors, touched }) => (
                <Form>
                    <Field name="firstName" />
                    {errors.firstName && touched.firstName && (
                        <div className="error">{errors.firstName}</div>
                        
                    )}
                    {/* More fields */}
                </Form>
            )}
        </Formik>
    );
};
```

### 4. API Documentation

**OpenAPI/Swagger Configuration**:
```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="Niladri Academic Management API",
    description="Complete API documentation for school management system",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@niladri.com"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    }
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Endpoint documentation
@router.post(
    "/students/",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new student",
    description="Create a new student record with admission details",
    responses={
        201: {"description": "Student created successfully"},
        400: {"description": "Invalid input data"},
        401: {"description": "Authentication required"},
        403: {"description": "Insufficient permissions"},
        409: {"description": "Admission number already exists"}
    },
    tags=["Students"]
)
async def create_student(
    student: StudentCreate = Body(..., example={
        "admission_number": "2024001",
        "first_name": "John",
        "last_name": "Doe",
        "class_id": "uuid-here"
    }),
    current_user: User = Depends(require_role("ADMIN", "SUPERADMIN"))
):
    """
    Create a new student with the following information:
    
    - **admission_number**: Unique student identifier
    - **first_name**: Student's first name
    - **last_name**: Student's last name
    - **class_id**: UUID of the class to enroll in
    """
    return await student_service.create(student)
```

### 5. Logging Strategy

**Structured Logging**:
```python
import structlog
from contextvars import ContextVar

# Context variable for request tracking
request_id_var: ContextVar[str] = ContextVar('request_id', default='')

def configure_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()

# Middleware to add request ID
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    request_id_var.set(request_id)
    structlog.contextvars.bind_contextvars(request_id=request_id)
    
    response = await call_next(request)
    response.headers['X-Request-ID'] = request_id
    return response

# Usage in code
logger.info(
    "student_created",
    student_id=student.id,
    admission_number=student.admission_number,
    school_id=student.school_id,
    created_by=current_user.id
)

logger.error(
    "payment_processing_failed",
    student_id=student.id,
    amount=amount,
    payment_mode=payment_mode,
    error=str(e)
)
```

### 6. Database Best Practices

**Connection Management**:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False  # Set to True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@contextmanager
def get_db_context():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Query Optimization**:
```python
# Bad: N+1 query problem
students = db.query(Student).all()
for student in students:
    print(student.class_.name)  # Triggers separate query for each student

# Good: Use eager loading
from sqlalchemy.orm import joinedload

students = db.query(Student)\
    .options(joinedload(Student.class_))\
    .options(joinedload(Student.user))\
    .all()

# Good: Use selectinload for collections
classes = db.query(Class)\
    .options(selectinload(Class.students))\
    .all()

# Index usage
class Student(Base):
    __tablename__ = "students"
    
    id = Column(UUID, primary_key=True)
    admission_number = Column(String(50), unique=True, index=True)
    school_id = Column(UUID, ForeignKey("schools.id"), index=True)
    class_id = Column(UUID, ForeignKey("classes.id"), index=True)
    
    __table_args__ = (
        Index('idx_student_school_class', 'school_id', 'class_id'),
    )
```

---

## Maintenance & Support

### 1. Database Maintenance

**Regular Vacuum**:
```sql
-- PostgreSQL maintenance
VACUUM ANALYZE;

-- Reindex for performance
REINDEX DATABASE niladri_prod;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Automated Cleanup Script**:
```python
# scripts/cleanup.py
from datetime import datetime, timedelta
from app.db.session import SessionLocal
from app.models import UserSession, Announcement

def cleanup_old_sessions():
    """Remove expired sessions older than 30 days"""
    db = SessionLocal()
    cutoff_date = datetime.utcnow() - timedelta(days=30)
    
    deleted = db.query(UserSession)\
        .filter(UserSession.expires_at < cutoff_date)\
        .delete()
    
    db.commit()
    db.close()
    
    print(f"Deleted {deleted} expired sessions")

def archive_old_announcements():
    """Archive announcements older than 1 year"""
    db = SessionLocal()
    cutoff_date = datetime.utcnow() - timedelta(days=365)
    
    old_announcements = db.query(Announcement)\
        .filter(Announcement.created_at < cutoff_date)\
        .all()
    
    # Move to archive table or mark as archived
    for announcement in old_announcements:
        announcement.is_archived = True
    
    db.commit()
    db.close()
    
    print(f"Archived {len(old_announcements)} old announcements")

if __name__ == "__main__":
    cleanup_old_sessions()
    archive_old_announcements()
```

### 2. Monitoring Alerts

**Health Check Monitoring**:
```python
from fastapi import APIRouter
from sqlalchemy import text
import redis

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/live")
async def liveness():
    """Kubernetes liveness probe"""
    return {"status": "alive"}

@router.get("/ready")
async def readiness(db: Session = Depends(get_db)):
    """Kubernetes readiness probe"""
    try:
        # Check database
        db.execute(text("SELECT 1"))
        
        # Check Redis (if using)
        # redis_client.ping()
        
        return {
            "status": "ready",
            "database": "connected",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not ready",
                "error": str(e)
            }
        )

@router.get("/metrics")
async def metrics(db: Session = Depends(get_db)):
    """Application metrics"""
    total_users = db.query(User).count()
    total_students = db.query(Student).count()
    total_schools = db.query(School).count()
    
    return {
        "users": total_users,
        "students": total_students,
        "schools": total_schools,
        "timestamp": datetime.utcnow()
    }
```

### 3. Update & Upgrade Strategy

**Zero-Downtime Deployment**:
```bash
#!/bin/bash
# deploy.sh

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Build new Docker images
docker-compose build

# Run database migrations
docker-compose run --rm backend alembic upgrade head

# Rolling update (start new containers before stopping old ones)
docker-compose up -d --no-deps --build backend

# Wait for health check
sleep 10

# Check if new container is healthy
if curl -f http://localhost:8000/health/ready; then
    echo "Deployment successful"
    # Remove old containers
    docker system prune -f
else
    echo "Deployment failed, rolling back"
    docker-compose down
    # Restore from backup if needed
    exit 1
fi
```

### 4. User Support

**Support Ticket System Integration**:
```python
# models/support.py
class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    school_id = Column(UUID, ForeignKey("schools.id"))
    subject = Column(String(200))
    description = Column(Text)
    priority = Column(Enum("LOW", "MEDIUM", "HIGH", "URGENT"))
    status = Column(Enum("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"))
    category = Column(String(50))  # Technical, Billing, Feature Request, etc.
    assigned_to = Column(UUID, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    school = relationship("School")
    assignee = relationship("User", foreign_keys=[assigned_to])

# API endpoint
@router.post("/support/tickets/")
async def create_support_ticket(
    ticket: SupportTicketCreate,
    current_user: User = Depends(get_current_user)
):
    db_ticket = SupportTicket(
        user_id=current_user.id,
        school_id=current_user.school_id,
        **ticket.dict()
    )
    db.add(db_ticket)
    db.commit()
    
    # Send notification to support team
    await notify_support_team(db_ticket)
    
    return db_ticket
```

---

## Additional Resources

### 1. Useful Commands

**Backend Development**:
```bash
# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v --cov=app --cov-report=html

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Lint code
flake8 app/
black app/
isort app/

# Type checking
mypy app/
```

**Frontend Development**:
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

**Docker Commands**:
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Remove volumes
docker-compose down -v

# Execute command in container
docker-compose exec backend bash

# Database backup
docker-compose exec db pg_dump -U postgres niladri_db > backup.sql

# Database restore
docker-compose exec -T db psql -U postgres niladri_db < backup.sql
```

### 2. Environment Variables Reference

```bash
# Backend Environment Variables
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET_KEY=your-secret-key-min-32-characters-long
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@niladri.com

# SMS Configuration (optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379/0

# Sentry (error tracking)
SENTRY_DSN=your-sentry-dsn

# Application Settings
ENV=development
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=DEBUG
```

```bash
# Frontend Environment Variables
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Niladri Academic Management
VITE_ENABLE_ANALYTICS=false
VITE_SENTRY_DSN=your-frontend-sentry-dsn
```

---

## Conclusion

This comprehensive documentation provides everything needed to build, deploy, and maintain the Niladri Academic Management System. The system is designed with:

✅ **Scalability**: Multi-tenant architecture supporting multiple schools  
✅ **Security**: JWT authentication, RBAC, encrypted data, SQL injection prevention  
✅ **Maintainability**: Modular code structure, comprehensive testing, detailed logging  
✅ **Performance**: Optimized queries, caching strategies, connection pooling  
✅ **Reliability**: Automated backups, health monitoring, error tracking  
✅ **User Experience**: Three specialized portals, responsive design, real-time updates  

### Next Steps

1. **Phase 1**: Set up development environment and core authentication
2. **Phase 2**: Build SuperAdmin portal and school management
3. **Phase 3**: Develop School portal with admin features
4. **Phase 4**: Implement teacher workflows and academic management
5. **Phase 5**: Create Family portal for students and parents
6. **Phase 6**: Add advanced modules (Library, Transport, Hostel)
7. **Phase 7**: Comprehensive testing and quality assurance
8. **Phase 8**: Production deployment and monitoring

### Support & Contribution

For questions, issues, or contributions:
- Documentation: `/docs` directory
- Issue Tracker: GitHub Issues
- API Documentation: `https://api.niladri.com/docs` (Swagger UI)
- Support Email: support@niladri.com

---

**Document Version**: 1.0  
**Last Updated**: October 2025  
**Maintained By**: Niladri Development Team