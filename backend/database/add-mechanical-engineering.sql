-- Add Mechanical Engineering Department Data
-- Run this script to add Mechanical Engineering department to your database

-- Add the new department
INSERT INTO departments (id, name, code, section, semester, year) VALUES 
(4, 'Mechanical Engineering', 'ME', 'A', 1, 1);

-- Add teachers for Mechanical Engineering department
INSERT INTO teachers (id, name, department_id, email) VALUES 
(9, 'Dr. Robert Johnson', 4, 'rjohnson@college.edu'),
(10, 'Dr. Sarah Williams', 4, 'swilliams@college.edu'),
(11, 'Dr. Michael Brown', 4, 'mbrown@college.edu'),
(12, 'Dr. Emily Davis', 4, 'edavis@college.edu');

-- Add user accounts for Mechanical Engineering teachers
-- Note: Passwords are hashed using bcrypt. For demo purposes, these are simple passwords.
-- In production, use proper password hashing and security practices.
INSERT INTO users (name, email, password, role, department_id) VALUES 
('Dr. Robert Johnson', 'rjohnson@college.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 4),
('Dr. Sarah Williams', 'swilliams@college.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 4),
('Dr. Michael Brown', 'mbrown@college.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 4),
('Dr. Emily Davis', 'edavis@college.edu', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 4);

-- Add subjects for Mechanical Engineering department
-- Theory subjects
INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES 
(14, 'Engineering Mechanics', 'ME101', 4, false),
(15, 'Thermodynamics', 'ME201', 4, false),
(16, 'Fluid Mechanics', 'ME301', 4, false),
(17, 'Heat Transfer', 'ME401', 4, false),
(18, 'Machine Design', 'ME501', 4, false),
(19, 'Manufacturing Technology', 'ME601', 4, false);

-- Lab subjects
INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES 
(20, 'Mechanics Lab', 'ME102', 4, true),
(21, 'Thermodynamics Lab', 'ME202', 4, true),
(22, 'Fluid Mechanics Lab', 'ME302', 4, true),
(23, 'Heat Transfer Lab', 'ME402', 4, true),
(24, 'Machine Design Lab', 'ME502', 4, true);

-- Add subject offerings (teacher assignments and scheduling info)
INSERT INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day) VALUES
-- Theory subjects
(14, 9, 4, 6, 2),  -- Engineering Mechanics - Dr. Robert Johnson
(15, 10, 4, 6, 2), -- Thermodynamics - Dr. Sarah Williams
(16, 11, 4, 3, 1), -- Fluid Mechanics - Dr. Michael Brown
(17, 12, 4, 3, 1), -- Heat Transfer - Dr. Emily Davis
(18, 9, 4, 6, 2),  -- Machine Design - Dr. Robert Johnson
(19, 10, 4, 3, 1), -- Manufacturing Technology - Dr. Sarah Williams
-- Lab subjects
(20, 9, 4, 3, 1),  -- Mechanics Lab - Dr. Robert Johnson
(21, 10, 4, 3, 1), -- Thermodynamics Lab - Dr. Sarah Williams
(22, 11, 4, 3, 1), -- Fluid Mechanics Lab - Dr. Michael Brown
(23, 12, 4, 3, 1), -- Heat Transfer Lab - Dr. Emily Davis
(24, 9, 4, 3, 1);  -- Machine Design Lab - Dr. Robert Johnson

-- Add rooms for Mechanical Engineering department
INSERT INTO rooms (id, name, type, capacity, department_id) VALUES 
(5, 'ME-101', 'classroom', 60, 4),
(6, 'ME-102', 'classroom', 60, 4),
(7, 'ME-LAB1', 'laboratory', 30, 4),
(8, 'ME-LAB2', 'laboratory', 30, 4);

-- Verify the data was inserted correctly
SELECT '=== Departments ===' as category;
SELECT id, name, code FROM departments WHERE id = 4;

SELECT '=== Teachers ===' as category;
SELECT id, name, department_id, email FROM teachers WHERE department_id = 4;

SELECT '=== Subjects ===' as category;
SELECT id, name, code, is_lab FROM subjects WHERE department_id = 4;

SELECT '=== Subject Offerings ===' as category;
SELECT so.subject_id, s.name as subject_name, so.teacher_id, t.name as teacher_name, so.max_periods_per_week, so.max_periods_per_day
FROM subject_offerings so
JOIN subjects s ON so.subject_id = s.id
JOIN teachers t ON so.teacher_id = t.id
WHERE so.department_id = 4;

SELECT '=== Rooms ===' as category;
SELECT id, name, type, capacity FROM rooms WHERE department_id = 4;

SELECT '=== Users ===' as category;
SELECT id, name, email, role, department_id FROM users WHERE department_id = 4;
