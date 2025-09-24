const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database', 'timetable_scheduler.db');

// Remove existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️ Removed existing database');
}

const db = new sqlite3.Database(dbPath);

console.log('🔄 Creating fresh database...');

// Create tables in correct order
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE users (
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
  )`);

  // Departments table
  db.run(`CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Teachers table
  db.run(`CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    max_sessions_per_week INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  // Subjects table
  db.run(`CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL,
    is_lab BOOLEAN DEFAULT FALSE,
    credits INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  // Rooms table
  db.run(`CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('classroom', 'laboratory')),
    department_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  // Subject offerings table
  db.run(`CREATE TABLE subject_offerings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    max_periods_per_week INTEGER DEFAULT 3,
    max_periods_per_day INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
  )`);

  // Timetables table
  db.run(`CREATE TABLE timetables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    section VARCHAR(10) NOT NULL,
    semester INTEGER NOT NULL,
    year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    generated_by INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (generated_by) REFERENCES users(id)
  )`);

  // Timetable slots table
  db.run(`CREATE TABLE timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timetable_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    time_slot INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timetable_id) REFERENCES timetables(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  )`);

  // Insert sample data
  console.log('📝 Inserting sample data...');

  // Hash password
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Insert departments
  db.run(`INSERT INTO departments (name, code, section, semester, year) VALUES 
    ('Computer Science', 'CSE', 'A', 6, 3),
    ('Information Technology', 'IT', 'A', 6, 3),
    ('Electronics', 'ECE', 'A', 6, 3)`);

  // Insert admin user
  db.run(`INSERT INTO users (name, email, password, role) VALUES 
    ('Admin User', 'admin@example.com', ?, 'admin')`, [hashedPassword]);

  // Insert teachers
  db.run(`INSERT INTO teachers (name, email, department_id, max_sessions_per_week) VALUES 
    ('Dr. John Smith', 'john.smith@example.com', 1, 20),
    ('Prof. Jane Doe', 'jane.doe@example.com', 1, 18),
    ('Dr. Bob Wilson', 'bob.wilson@example.com', 2, 20)`);

  // Insert subjects
  db.run(`INSERT INTO subjects (name, code, department_id, is_lab, credits) VALUES 
    ('Data Structures', 'CS301', 1, 0, 4),
    ('Database Systems', 'CS302', 1, 0, 3),
    ('Database Lab', 'CS302L', 1, 1, 2),
    ('Web Development', 'IT301', 2, 0, 3),
    ('Web Lab', 'IT301L', 2, 1, 2)`);

  // Insert rooms
  db.run(`INSERT INTO rooms (name, capacity, type, department_id) VALUES 
    ('Room 101', 60, 'classroom', 1),
    ('Room 102', 60, 'classroom', 1),
    ('Lab 201', 30, 'laboratory', 1),
    ('Room 301', 50, 'classroom', 2),
    ('Lab 302', 25, 'laboratory', 2)`);

  console.log('✅ Database setup complete!');
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('📝 Database connection closed');
    }
  });
});
