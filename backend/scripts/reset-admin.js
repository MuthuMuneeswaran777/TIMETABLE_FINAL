const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// const dbPath = path.join(__dirname, '..', 'database.sqlite');
const dbPath = path.join(__dirname, '..', 'database', 'timetable_scheduler.db');

console.log('🔄 Resetting admin user...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Hash the password
const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('❌ Password hashing failed:', err);
    process.exit(1);
  }

  console.log('🔐 Password hashed successfully');

  // Delete existing admin user
  db.run("DELETE FROM users WHERE email = 'admin@example.com'", (err) => {
    if (err) {
      console.error('❌ Error deleting existing admin:', err.message);
    } else {
      console.log('🗑️ Existing admin user deleted');
    }

    // Insert new admin user
    const insertQuery = `
      INSERT INTO users (name, email, password, role, department_id, section, semester, year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      'Admin User',
      'admin@example.com',
      hashedPassword,
      'admin',
      null,
      null,
      null,
      null
    ], function(err) {
      if (err) {
        console.error('❌ Error creating admin user:', err.message);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@example.com');
        console.log('🔑 Password: password123');
        
        // Verify the user was created
        db.get("SELECT id, name, email, role FROM users WHERE email = 'admin@example.com'", (err, row) => {
          if (err) {
            console.error('❌ Error verifying user:', err.message);
          } else if (row) {
            console.log('✅ Verification successful:');
            console.log(row);
          } else {
            console.log('❌ User not found after creation');
          }
          
          db.close();
          process.exit(0);
        });
      }
    });
  });
});
