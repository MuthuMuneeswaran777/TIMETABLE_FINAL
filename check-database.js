const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'backend', 'database', 'timetable_scheduler.db');

console.log('🔍 Checking database contents...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

db.serialize(() => {
  // Check timetables
  db.all("SELECT * FROM timetables", (err, rows) => {
    if (err) {
      console.error('❌ Error checking timetables:', err.message);
      return;
    }
    console.log(`\n📋 Timetables (${rows.length} found):`);
    rows.forEach(row => {
      console.log(`- ID: ${row.id}, Dept: ${row.department_id}, Section: ${row.section}, Active: ${row.is_active}`);
    });

    // Check timetable slots
    db.all("SELECT COUNT(*) as count FROM timetable_slots", (err, countRows) => {
      if (err) {
        console.error('❌ Error checking timetable slots:', err.message);
        return;
      }
      console.log(`\n📅 Timetable Slots: ${countRows[0].count} total`);

      // Check slots for teacher ID 2
      db.all(`
        SELECT ts.*, s.name as subject_name, t.name as teacher_name, r.name as room_name
        FROM timetable_slots ts
        JOIN subjects s ON ts.subject_id = s.id
        JOIN teachers t ON ts.teacher_id = t.id
        JOIN rooms r ON ts.room_id = r.id
        JOIN timetables tt ON ts.timetable_id = tt.id
        WHERE ts.teacher_id = 2 AND tt.is_active = 1
        ORDER BY ts.day_of_week, ts.time_slot
      `, (err, teacherSlots) => {
        if (err) {
          console.error('❌ Error checking teacher 2 slots:', err.message);
          return;
        }
        console.log(`\n👨‍🏫 Teacher ID 2 slots (${teacherSlots.length} found):`);
        teacherSlots.forEach(slot => {
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          console.log(`- ${days[slot.day_of_week]} ${slot.time_slot}: ${slot.subject_name} in ${slot.room_name}`);
        });

        // Check teachers
        db.all("SELECT * FROM teachers", (err, teachers) => {
          if (err) {
            console.error('❌ Error checking teachers:', err.message);
            return;
          }
          console.log(`\n👥 Teachers (${teachers.length} found):`);
          teachers.forEach(teacher => {
            console.log(`- ID: ${teacher.id}, Name: ${teacher.name}, Email: ${teacher.email}`);
          });

          // Check if there are any active timetables
          db.all("SELECT * FROM timetables WHERE is_active = 1", (err, activeTimetables) => {
            if (err) {
              console.error('❌ Error checking active timetables:', err.message);
              return;
            }
            console.log(`\n✅ Active Timetables: ${activeTimetables.length}`);
            activeTimetables.forEach(tt => {
              console.log(`- ID: ${tt.id}, Dept: ${tt.department_id}, Section: ${tt.section}`);
            });

            db.close();
          });
        });
      });
    });
  });
});
