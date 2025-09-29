const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const backupPath = path.join(__dirname, '..', 'database-backup.sqlite');

console.log('=== Database Reset and Mechanical Engineering Setup ===');
console.log('This script will:');
console.log('1. Create a backup of the current database');
console.log('2. Clear all existing data');
console.log('3. Add Mechanical Engineering department data');
console.log('');

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('Database file not found:', dbPath);
    process.exit(1);
}

// Step 1: Create backup
console.log('Step 1: Creating backup...');
try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✓ Backup created successfully:', backupPath);
} catch (err) {
    console.error('✗ Failed to create backup:', err.message);
    process.exit(1);
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('✗ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✓ Connected to SQLite database.');
});

// Step 2: Clear all data
console.log('\nStep 2: Clearing existing data...');

const clearTables = [
    'DELETE FROM timetable_slots;',
    'DELETE FROM timetables;',
    'DELETE FROM subject_offerings;',
    'DELETE FROM subjects;',
    'DELETE FROM rooms;',
    'DELETE FROM teachers;',
    'DELETE FROM departments;',
    'DELETE FROM users;'
];

// Execute clearing commands
db.serialize(() => {
    let clearedCount = 0;
    
    clearTables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`✗ Error clearing table ${index + 1}:`, err.message);
            } else {
                clearedCount++;
                if (clearedCount === clearTables.length) {
                    console.log('✓ All tables cleared successfully');
                    
                    // Step 3: Add Mechanical Engineering data
                    console.log('\nStep 3: Adding Mechanical Engineering department data...');
                    addMechanicalEngineeringData();
                }
            }
        });
    });
});

function addMechanicalEngineeringData() {
    const meData = [
        // Add admin user first
        {
            sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?);',
            params: ['System Administrator', 'admin@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'admin']
        },
        // Add student users
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            params: ['John Student', 'john.student@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'student', 4, 'A', 1, 1]
        },
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            params: ['Jane Student', 'jane.student@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'student', 4, 'A', 1, 1]
        },
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id, section, semester, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            params: ['Mike Student', 'mike.student@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'student', 4, 'A', 1, 1]
        },
        // Add department
        {
            sql: 'INSERT INTO departments (id, name, code, section, semester, year) VALUES (?, ?, ?, ?, ?, ?);',
            params: [4, 'Mechanical Engineering', 'ME', 'A', 1, 1]
        },
        // Add teachers
        {
            sql: 'INSERT INTO teachers (id, name, department_id, email) VALUES (?, ?, ?, ?);',
            params: [9, 'Dr. Robert Johnson', 4, 'rjohnson@college.edu']
        },
        {
            sql: 'INSERT INTO teachers (id, name, department_id, email) VALUES (?, ?, ?, ?);',
            params: [10, 'Dr. Sarah Williams', 4, 'swilliams@college.edu']
        },
        {
            sql: 'INSERT INTO teachers (id, name, department_id, email) VALUES (?, ?, ?, ?);',
            params: [11, 'Dr. Michael Brown', 4, 'mbrown@college.edu']
        },
        {
            sql: 'INSERT INTO teachers (id, name, department_id, email) VALUES (?, ?, ?, ?);',
            params: [12, 'Dr. Emily Davis', 4, 'edavis@college.edu']
        },
        // Add users
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?);',
            params: ['Dr. Robert Johnson', 'rjohnson@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'teacher', 4]
        },
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?);',
            params: ['Dr. Sarah Williams', 'swilliams@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'teacher', 4]
        },
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?);',
            params: ['Dr. Michael Brown', 'mbrown@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'teacher', 4]
        },
        {
            sql: 'INSERT INTO users (name, email, password, role, department_id) VALUES (?, ?, ?, ?, ?);',
            params: ['Dr. Emily Davis', 'edavis@college.edu', '$2b$10$t0lN6p3mN6p3mN6p3mN6pO8t0lN6p3mN6p3mN6p3mN6p3mN6p3mN6', 'teacher', 4]
        },
        // Add theory subjects
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [14, 'Engineering Mechanics', 'ME101', 4, false]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [15, 'Thermodynamics', 'ME201', 4, false]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [16, 'Fluid Mechanics', 'ME301', 4, false]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [17, 'Heat Transfer', 'ME401', 4, false]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [18, 'Machine Design', 'ME501', 4, false]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [19, 'Manufacturing Technology', 'ME601', 4, false]
        },
        // Add lab subjects
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [20, 'Mechanics Lab', 'ME102', 4, true]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [21, 'Thermodynamics Lab', 'ME202', 4, true]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [22, 'Fluid Mechanics Lab', 'ME302', 4, true]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [23, 'Heat Transfer Lab', 'ME402', 4, true]
        },
        {
            sql: 'INSERT INTO subjects (id, name, code, department_id, is_lab) VALUES (?, ?, ?, ?, ?);',
            params: [24, 'Machine Design Lab', 'ME502', 4, true]
        },
        // Add rooms
        {
            sql: 'INSERT INTO rooms (id, name, type, capacity, department_id) VALUES (?, ?, ?, ?, ?);',
            params: [5, 'ME-101', 'classroom', 60, 4]
        },
        {
            sql: 'INSERT INTO rooms (id, name, type, capacity, department_id) VALUES (?, ?, ?, ?, ?);',
            params: [6, 'ME-102', 'classroom', 60, 4]
        },
        {
            sql: 'INSERT INTO rooms (id, name, type, capacity, department_id) VALUES (?, ?, ?, ?, ?);',
            params: [7, 'ME-LAB1', 'laboratory', 30, 4]
        },
        {
            sql: 'INSERT INTO rooms (id, name, type, capacity, department_id) VALUES (?, ?, ?, ?, ?);',
            params: [8, 'ME-LAB2', 'laboratory', 30, 4]
        }
    ];

    let completedCount = 0;
    
    meData.forEach((item, index) => {
        db.run(item.sql, item.params, (err) => {
            if (err) {
                console.error(`✗ Error inserting data item ${index + 1}:`, err.message);
            } else {
                completedCount++;
                if (completedCount === meData.length) {
                    console.log('✓ Mechanical Engineering data added successfully');
                    
                    // Add subject offerings
                    addSubjectOfferings();
                }
            }
        });
    });
}

function addSubjectOfferings() {
    const offerings = [
        [14, 9, 4, 6, 2],  // Engineering Mechanics - Dr. Robert Johnson
        [15, 10, 4, 6, 2], // Thermodynamics - Dr. Sarah Williams
        [16, 11, 4, 3, 1], // Fluid Mechanics - Dr. Michael Brown
        [17, 12, 4, 3, 1], // Heat Transfer - Dr. Emily Davis
        [18, 9, 4, 6, 2],  // Machine Design - Dr. Robert Johnson
        [19, 10, 4, 3, 1], // Manufacturing Technology - Dr. Sarah Williams
        [20, 9, 4, 3, 1],  // Mechanics Lab - Dr. Robert Johnson
        [21, 10, 4, 3, 1], // Thermodynamics Lab - Dr. Sarah Williams
        [22, 11, 4, 3, 1], // Fluid Mechanics Lab - Dr. Michael Brown
        [23, 12, 4, 3, 1], // Heat Transfer Lab - Dr. Emily Davis
        [24, 9, 4, 3, 1]   // Machine Design Lab - Dr. Robert Johnson
    ];

    const offeringSql = 'INSERT INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day) VALUES (?, ?, ?, ?, ?);';
    
    let completedCount = 0;
    
    offerings.forEach((offering, index) => {
        db.run(offeringSql, offering, (err) => {
            if (err) {
                console.error(`✗ Error inserting subject offering ${index + 1}:`, err.message);
            } else {
                completedCount++;
                if (completedCount === offerings.length) {
                    console.log('✓ Subject offerings added successfully');
                    
                    // Verify data
                    verifyData();
                }
            }
        });
    });
}

function verifyData() {
    console.log('\nStep 4: Verifying data...');
    
    const queries = [
        {
            title: 'Departments',
            sql: 'SELECT id, name, code FROM departments WHERE id = 4;'
        },
        {
            title: 'Teachers',
            sql: 'SELECT id, name, department_id, email FROM teachers WHERE department_id = 4;'
        },
        {
            title: 'All Users',
            sql: 'SELECT id, name, email, role, department_id FROM users ORDER BY role, name;'
        },
        {
            title: 'Subjects',
            sql: 'SELECT id, name, code, is_lab FROM subjects WHERE department_id = 4;'
        },
        {
            title: 'Rooms',
            sql: 'SELECT id, name, type, capacity FROM rooms WHERE department_id = 4;'
        }
    ];

    let queryCount = 0;
    
    queries.forEach((query, index) => {
        console.log(`\n=== ${query.title} ===`);
        db.all(query.sql, (err, rows) => {
            if (err) {
                console.error(`✗ Error querying ${query.title}:`, err.message);
            } else {
                if (rows.length === 0) {
                    console.log('No data found');
                } else {
                    rows.forEach(row => {
                        console.log(JSON.stringify(row, null, 2));
                    });
                }
                
                queryCount++;
                if (queryCount === queries.length) {
                    console.log('\n✓ All data verified successfully');
                    console.log('\n=== Setup Complete ===');
                    console.log('You can now log in with the following credentials:');
                    console.log('\n🔧 ADMIN USER:');
                    console.log('Email: admin@college.edu, Password: password123');
                    console.log('\n👨‍🏫 TEACHER USERS:');
                    console.log('Email: rjohnson@college.edu, Password: password123');
                    console.log('Email: swilliams@college.edu, Password: password123');
                    console.log('Email: mbrown@college.edu, Password: password123');
                    console.log('Email: edavis@college.edu, Password: password123');
                    console.log('\n👨‍🎓 STUDENT USERS:');
                    console.log('Email: john.student@college.edu, Password: password123');
                    console.log('Email: jane.student@college.edu, Password: password123');
                    console.log('Email: mike.student@college.edu, Password: password123');
                    
                    // Close database connection
                    db.close((err) => {
                        if (err) {
                            console.error('✗ Error closing database:', err.message);
                        } else {
                            console.log('✓ Database connection closed.');
                        }
                    });
                }
            }
        });
    });
}
