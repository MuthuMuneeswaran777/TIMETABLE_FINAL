-- Timetable Scheduler Database Schema - SQLite Version
-- Created for SIH Final Project

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS timetable_slots;
DROP TABLE IF EXISTS timetables;
DROP TABLE IF EXISTS subject_offerings;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;

-- Users table (for authentication)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    department_id INTEGER,
    section VARCHAR(10),
    semester INTEGER,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teachers table
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    max_sessions_per_week INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('classroom', 'laboratory')),
    department_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Subjects table
CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    is_lab BOOLEAN DEFAULT FALSE,
    credits INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Subject offerings table
CREATE TABLE subject_offerings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    max_periods_per_week INTEGER DEFAULT 3,
    max_periods_per_day INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE (subject_id, teacher_id, department_id)
);

-- Timetables table
CREATE TABLE timetables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    metadata TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Timetable slots table
CREATE TABLE timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timetable_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    time_slot INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    is_lab_session BOOLEAN DEFAULT FALSE,
    lab_duration INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE (timetable_id, day_of_week, time_slot)
);

-- Create indexes for better performance
CREATE INDEX idx_teachers_department ON teachers(department_id);
CREATE INDEX idx_subjects_department ON subjects(department_id);
CREATE INDEX idx_rooms_department ON rooms(department_id);
CREATE INDEX idx_subject_offerings_teacher ON subject_offerings(teacher_id);
CREATE INDEX idx_subject_offerings_subject ON subject_offerings(subject_id);
CREATE INDEX idx_timetable_slots_timetable ON timetable_slots(timetable_id);
CREATE INDEX idx_timetable_slots_day_time ON timetable_slots(day_of_week, time_slot);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Insert sample data for testing

-- Sample departments (first department with code CSE)
INSERT INTO departments (name, code, section, semester, year) VALUES
('Computer Science Engineering', 'CSE-A', 'A', 6, 3);

-- Insert admin user
INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, NULL, NULL, NULL);

-- Insert two teachers for CSE department
INSERT INTO teachers (name, email, department_id, max_sessions_per_week) VALUES
('Dr. John Smith', 'john.smith@example.com', 1, 20),
('Prof. Sarah Johnson', 'sarah.johnson@example.com', 1, 18);

-- Insert rooms for CSE department
INSERT INTO rooms (name, capacity, type, department_id) VALUES
('CSE-101', 60, 'classroom', 1),
('CSE-102', 60, 'classroom', 1),
('CSE-Lab1', 30, 'laboratory', 1),
('CSE-Lab2', 30, 'laboratory', 1);

-- Insert subjects for CSE department
INSERT INTO subjects (name, code, department_id, is_lab, credits) VALUES
('Data Structures and Algorithms', 'CS301', 1, 0, 4),
('Database Management Systems', 'CS302', 1, 0, 3),
('DBMS Laboratory', 'CS302L', 1, 1, 2),
('Computer Networks', 'CS303', 1, 0, 3),
('Networks Laboratory', 'CS303L', 1, 1, 2),
('Software Engineering', 'CS304', 1, 0, 4),
('Machine Learning', 'CS305', 1, 0, 3),
('ML Laboratory', 'CS305L', 1, 1, 2);

-- Insert subject offerings for CSE department
INSERT INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day) VALUES
(1, 1, 1, 4, 2), -- Data Structures - Dr. John Smith
(2, 2, 1, 3, 2), -- DBMS - Prof. Sarah Johnson
(3, 2, 1, 3, 3), -- DBMS Lab - Prof. Sarah Johnson
(4, 1, 1, 3, 2), -- Computer Networks - Dr. John Smith
(5, 1, 1, 3, 3), -- Networks Lab - Dr. John Smith
(6, 2, 1, 4, 2), -- Software Engineering - Prof. Sarah Johnson
(7, 1, 1, 3, 2), -- Machine Learning - Dr. John Smith
(8, 2, 1, 3, 3); -- ML Lab - Prof. Sarah Johnson

-- Insert teacher and student users
INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES
('Dr. John Smith', 'john.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 1, NULL, NULL, NULL),
('Prof. Sarah Johnson', 'sarah.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 1, NULL, NULL, NULL),
('Alice Brown', 'alice.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 1, 'A', 6, 3),
('Bob Wilson', 'bob.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 1, 'A', 6, 3); -- ML Lab - Prof. Sarah Johnson
