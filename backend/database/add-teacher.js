const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database path
const dbPath = path.join(__dirname, 'timetable_scheduler.db');

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// Function to hash password
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Function to add a new teacher user
async function addTeacherUser() {
    try {
        // Teacher details
        const teacher = {
            name: 'John Doe',
            email: 'john.doe@example.com',
            password: 'teacher123',
            role: 'teacher',
            department_id: 1  // Default to department_id 1, adjust as needed
        };

        // Hash the password
        const hashedPassword = await hashPassword(teacher.password);

        // SQL to insert new user
        const sql = `
            INSERT INTO users (name, email, password, role, department_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        // Execute the query
        db.run(sql, [teacher.name, teacher.email, hashedPassword, teacher.role, teacher.department_id], function(err) {
            if (err) {
                console.error('Error adding teacher user:', err.message);
                return;
            }
            console.log(`Teacher user added with ID: ${this.lastID}`);
            
            // Now add to teachers table
            const teacherSql = `
                INSERT INTO teachers (name, email, department_id, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
            `;
            
            db.run(teacherSql, [teacher.name, teacher.email, teacher.department_id], function(err) {
                if (err) {
                    console.error('Error adding to teachers table:', err.message);
                    return;
                }
                console.log(`Added to teachers table with ID: ${this.lastID}`);
                
                // Close the database connection
                db.close((err) => {
                    if (err) {
                        console.error('Error closing the database:', err.message);
                        return;
                    }
                    console.log('Database connection closed.');
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        db.close();
    }
}

// Execute the function
addTeacherUser();
