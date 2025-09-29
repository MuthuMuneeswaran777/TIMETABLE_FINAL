-- Add Mechanical Engineering Department Data (Safe Version)
-- This script checks for existing data and handles duplicates properly

-- Check if Mechanical Engineering department already exists
INSERT OR IGNORE INTO departments (id, name, code, section, semester, year) VALUES 
(6, 'Mechanical Engineering', 'ME', 'A', 1, 1);

-- Add teachers for Mechanical Engineering department (only if they don't exist)
INSERT OR IGNORE INTO teachers (id, name, department_id, email) VALUES 
(13, 'Dr. Robert Johnson', 6, 'rjohnson@college.edu'),
(14, 'Dr. Sarah Williams', 6, 'swilliams@college.edu'),
(15, 'Dr. Michael Brown', 6, 'mbrown@college.edu'),
(16, 'Dr. Emily Davis', 6, 'edavis@college.edu');

-- Add user accounts for Mechanical Engineering teachers (only if they don't exist)
INSERT OR IGNORE INTO users (name, email, password, role, department_id) VALUES 
('Dr. Robert Johnson', 'rjohnson@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq5phD/3Ea0jeBUUrSlvQdT3tJX1C', 'teacher', 6),
('Dr. Sarah Williams', 'swilliams@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq5phD/3Ea0jeBUUrSlvQdT3tJX1C', 'teacher', 6),
('Dr. Michael Brown', 'mbrown@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq5phD/3Ea0jeBUUrSlvQdT3tJX1C', 'teacher', 6),
('Dr. Emily Davis', 'edavis@college.edu', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQDq5phD/3Ea0jeBUUrSlvQdT3tJX1C', 'teacher', 6);

-- Add subjects for Mechanical Engineering department (only if they don't exist)
-- Theory subjects
INSERT OR IGNORE INTO subjects (id, name, code, department_id, is_lab) VALUES 
(15, 'Engineering Mechanics', 'ME101', 6, false),
(16, 'Thermodynamics', 'ME201', 6, false),
(17, 'Fluid Mechanics', 'ME301', 6, false),
(18, 'Heat Transfer', 'ME401', 6, false),
(19, 'Machine Design', 'ME501', 6, false),
(20, 'Manufacturing Technology', 'ME601', 6, false);

-- Lab subjects
INSERT OR IGNORE INTO subjects (id, name, code, department_id, is_lab) VALUES 
(21, 'Mechanics Lab', 'ME102', 6, true),
(22, 'Thermodynamics Lab', 'ME202', 6, true),
(23, 'Fluid Mechanics Lab', 'ME302', 6, true),
(24, 'Heat Transfer Lab', 'ME402', 6, true),
(25, 'Machine Design Lab', 'ME502', 6, true);

-- Verify all required teachers and subjects exist before creating subject offerings
-- This helps identify any missing references before the foreign key constraint fails

-- Check for missing teachers
SELECT 'Checking for missing teachers...' as status;
SELECT id, name FROM teachers WHERE id IN (13, 14, 15, 16);

-- Check for missing subjects
SELECT 'Checking for missing subjects...' as status;
SELECT id, name, code FROM subjects WHERE id BETWEEN 15 AND 25;

-- Add subject offerings (teacher assignments and scheduling info) - only if they don't exist
-- Using INSERT OR IGNORE to skip any that already exist
INSERT OR IGNORE INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day)
SELECT * FROM (
    -- Engineering Mechanics - Dr. Robert Johnson
    SELECT 15, 13, 6, 6, 2
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 13)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 15)
    
    UNION ALL
    -- Thermodynamics - Dr. Sarah Williams
    SELECT 16, 14, 6, 6, 2
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 14)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 16)
    
    UNION ALL
    -- Fluid Mechanics - Dr. Michael Brown
    SELECT 17, 15, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 15)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 17)
    
    UNION ALL
    -- Heat Transfer - Dr. Emily Davis
    SELECT 18, 16, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 16)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 18)
    
    UNION ALL
    -- Machine Design - Dr. Robert Johnson
    SELECT 19, 13, 6, 6, 2
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 13)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 19)
    
    UNION ALL
    -- Manufacturing Technology - Dr. Sarah Williams
    SELECT 20, 14, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 14)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 20)
    
    UNION ALL
    -- Mechanics Lab - Dr. Robert Johnson
    SELECT 21, 13, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 13)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 21)
    
    UNION ALL
    -- Thermodynamics Lab - Dr. Sarah Williams
    SELECT 22, 14, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 14)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 22)
    
    UNION ALL
    -- Fluid Mechanics Lab - Dr. Michael Brown
    SELECT 23, 15, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 15)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 23)
    
    UNION ALL
    -- Heat Transfer Lab - Dr. Emily Davis
    SELECT 24, 16, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 16)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 24)
    
    UNION ALL
    -- Machine Design Lab - Dr. Robert Johnson
    SELECT 25, 13, 6, 3, 1
    WHERE EXISTS (SELECT 1 FROM teachers WHERE id = 13)
    AND EXISTS (SELECT 1 FROM subjects WHERE id = 25)
);

-- Add rooms for Mechanical Engineering department (only if they don't exist)
INSERT OR IGNORE INTO rooms (id, name, type, capacity, department_id) VALUES 
(10, 'ME-101', 'classroom', 60, 6),
(11, 'ME-102', 'classroom', 60, 6),
(12, 'ME-LAB1', 'laboratory', 30, 6),
(13, 'ME-LAB2', 'laboratory', 30, 6);

-- Verify the data was inserted correctly
SELECT '=== Departments ===' as category;
SELECT id, name, code FROM departments WHERE id = 6;

SELECT '=== Teachers ===' as category;
SELECT id, name, department_id, email FROM teachers WHERE department_id = 6;

SELECT '=== Users ===' as category;
SELECT id, name, email, role, department_id FROM users WHERE department_id = 6;

SELECT '=== Subjects ===' as category;
SELECT id, name, code, is_lab FROM subjects WHERE department_id = 6;

SELECT '=== Subject Offerings ===' as category;
SELECT so.subject_id, s.name as subject_name, so.teacher_id, t.name as teacher_name, so.max_periods_per_week, so.max_periods_per_day
FROM subject_offerings so
JOIN subjects s ON so.subject_id = s.id
JOIN teachers t ON so.teacher_id = t.id
WHERE so.department_id = 6;

SELECT '=== Rooms ===' as category;
SELECT id, name, type, capacity FROM rooms WHERE department_id = 6;
