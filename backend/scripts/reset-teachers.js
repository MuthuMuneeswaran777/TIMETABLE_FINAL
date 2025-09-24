const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'timetable_scheduler.db');

console.log('🔄 Resetting teacher passwords...');

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
const hashedPassword = bcrypt.hashSync(password, saltRounds);

// Reset passwords for teachers
const teacherEmails = [
  'john.smith@example.com',
  'sarah.johnson@example.com'
];

// Insert teacher users if they don't exist
teacherEmails.forEach(email => {
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error(`❌ Error checking user ${email}:`, err.message);
      return;
    }

    if (!user) {
      // Get teacher info
      db.get('SELECT * FROM teachers WHERE email = ?', [email], (err, teacher) => {
        if (err || !teacher) {
          console.error(`❌ Error finding teacher ${email}:`, err?.message || 'Not found');
          return;
        }

        // Create user account for teacher
        db.run(`
          INSERT INTO users (name, email, password, role, department_id)
          VALUES (?, ?, ?, 'teacher', ?)
        `, [teacher.name, email, hashedPassword, teacher.department_id], (err) => {
          if (err) {
            console.error(`❌ Error creating user for ${email}:`, err.message);
          } else {
            console.log(`✅ Created user account for ${email}`);
          }
        });
      });
    } else {
      // Update existing user's password
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], (err) => {
        if (err) {
          console.error(`❌ Error updating password for ${email}:`, err.message);
        } else {
          console.log(`✅ Reset password for ${email}`);
        }
      });
    }
  });
});

// Wait a bit for operations to complete
setTimeout(() => {
  // Verify the users
  teacherEmails.forEach(email => {
    db.get('SELECT id, name, email, role FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        console.error(`❌ Error verifying user ${email}:`, err.message);
      } else if (user) {
        console.log(`✅ Verified user ${email}:`, user);
      } else {
        console.log(`❌ User ${email} not found`);
      }
    });
  });

  // Close database after verification
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('📝 Database connection closed');
      }
      process.exit(0);
    });
  }, 1000);
}, 2000);