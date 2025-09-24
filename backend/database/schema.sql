-- Timetable Scheduler Database Schema
-- Created for SIH Final Project

CREATE DATABASE IF NOT EXISTS timetable_scheduler;
USE timetable_scheduler;

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
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher', 'student') NOT NULL,
    department_id INT,
    section VARCHAR(10),
    semester INT,
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Teachers table
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    max_sessions_per_week INT DEFAULT 20 CHECK (max_sessions_per_week > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    type ENUM('classroom', 'laboratory') NOT NULL,
    department_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Subjects table
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    is_lab BOOLEAN DEFAULT FALSE,
    credits INT DEFAULT 3 CHECK (credits > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Subject offerings table (links subjects, teachers, and departments with constraints)
CREATE TABLE subject_offerings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    department_id INT NOT NULL,
    max_periods_per_week INT DEFAULT 3 CHECK (max_periods_per_week > 0),
    max_periods_per_day INT DEFAULT 2 CHECK (max_periods_per_day > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_teacher_dept (subject_id, teacher_id, department_id)
);

-- Timetables table (stores generated timetables)
CREATE TABLE timetables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INT NOT NULL,
    year INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INT, -- user who generated it
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSON, -- store additional info like constraints used, generation time, etc.
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Timetable slots table (individual time slots in the timetable)
CREATE TABLE timetable_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timetable_id INT NOT NULL,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
    time_slot INT NOT NULL CHECK (time_slot BETWEEN 0 AND 7), -- 0-7 for 8 periods
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    room_id INT NOT NULL,
    is_lab_session BOOLEAN DEFAULT FALSE,
    lab_duration INT DEFAULT 1, -- for lab sessions that span multiple periods
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_timetable_day_time (timetable_id, day_of_week, time_slot)
);

-- Add foreign key for users table (department reference)
ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

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

-- Sample departments
INSERT INTO departments (name, code, section, semester, year) VALUES
('Computer Science Engineering', 'CSE', 'A', 6, 3),
('Computer Science Engineering', 'CSE', 'B', 6, 3),
('Electronics and Communication', 'ECE', 'A', 4, 2),
('Mechanical Engineering', 'MECH', 'A', 2, 1),
('Information Technology', 'IT', 'A', 8, 4);

-- Sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL, NULL, NULL, NULL),
('Dr. John Smith', 'john.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 1, NULL, NULL, NULL),
('Prof. Sarah Johnson', 'sarah.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 1, NULL, NULL, NULL),
('Alice Brown', 'alice.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 1, 'A', 6, 3),
('Bob Wilson', 'bob.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 1, 'A', 6, 3);

-- Sample teachers
INSERT INTO teachers (name, email, department_id, max_sessions_per_week) VALUES
('Dr. John Smith', 'john.smith@example.com', 1, 20),
('Prof. Sarah Johnson', 'sarah.johnson@example.com', 1, 18),
('Dr. Michael Brown', 'michael.brown@example.com', 3, 22),
('Prof. Lisa Davis', 'lisa.davis@example.com', 4, 16),
('Dr. Robert Wilson', 'robert.wilson@example.com', 5, 20);

-- Sample rooms
INSERT INTO rooms (name, capacity, type, department_id) VALUES
('CSE-101', 60, 'classroom', 1),
('CSE-102', 60, 'classroom', 1),
('CSE-Lab1', 30, 'laboratory', 1),
('CSE-Lab2', 30, 'laboratory', 1),
('ECE-201', 50, 'classroom', 3),
('ECE-Lab1', 25, 'laboratory', 3),
('MECH-301', 70, 'classroom', 4),
('IT-401', 55, 'classroom', 5),
('IT-Lab1', 35, 'laboratory', 5);

-- Sample subjects
INSERT INTO subjects (name, code, department_id, is_lab, credits) VALUES
('Data Structures and Algorithms', 'CS301', 1, FALSE, 4),
('Database Management Systems', 'CS302', 1, FALSE, 3),
('DBMS Laboratory', 'CS302L', 1, TRUE, 2),
('Computer Networks', 'CS303', 1, FALSE, 3),
('Networks Laboratory', 'CS303L', 1, TRUE, 2),
('Software Engineering', 'CS304', 1, FALSE, 4),
('Machine Learning', 'CS305', 1, FALSE, 3),
('ML Laboratory', 'CS305L', 1, TRUE, 2);

-- Sample subject offerings
INSERT INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day) VALUES
(1, 1, 1, 4, 2), -- Data Structures - Dr. John Smith
(2, 2, 1, 3, 2), -- DBMS - Prof. Sarah Johnson
(3, 2, 1, 3, 3), -- DBMS Lab - Prof. Sarah Johnson
(4, 1, 1, 3, 2), -- Computer Networks - Dr. John Smith
(5, 1, 1, 3, 3), -- Networks Lab - Dr. John Smith
(6, 2, 1, 4, 2), -- Software Engineering - Prof. Sarah Johnson
(7, 1, 1, 3, 2), -- Machine Learning - Dr. John Smith
(8, 2, 1, 3, 3); -- ML Lab - Prof. Sarah Johnson

-- Create a view for easy timetable display
CREATE VIEW timetable_view AS
SELECT 
    ts.id,
    ts.timetable_id,
    ts.day_of_week,
    ts.time_slot,
    s.name as subject_name,
    s.code as subject_code,
    s.is_lab,
    t.name as teacher_name,
    r.name as room_name,
    r.type as room_type,
    d.name as department_name,
    d.section,
    ts.is_lab_session,
    ts.lab_duration
FROM timetable_slots ts
JOIN subjects s ON ts.subject_id = s.id
JOIN teachers t ON ts.teacher_id = t.id
JOIN rooms r ON ts.room_id = r.id
JOIN timetables tt ON ts.timetable_id = tt.id
JOIN departments d ON tt.department_id = d.id
ORDER BY ts.day_of_week, ts.time_slot;
