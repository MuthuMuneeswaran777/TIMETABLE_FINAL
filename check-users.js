const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database', 'timetable_scheduler.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking admin users in database...\n');

db.all("SELECT id, name, email, role FROM users WHERE role = 'admin'", (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('📋 Admin Users Found:');
    console.table(rows);
  }
  
  console.log('\n🔍 All users in database:');
  db.all("SELECT id, name, email, role FROM users", (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.table(rows);
    }
    db.close();
  });
});
