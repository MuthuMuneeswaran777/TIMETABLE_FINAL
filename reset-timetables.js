const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'backend', 'database', 'timetable_scheduler.db');

console.log('🔄 Resetting and creating sample timetable data...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

db.serialize(() => {
  // Clear existing timetable data
  db.run("DELETE FROM timetable_slots", (err) => {
    if (err) {
      console.error('❌ Error clearing timetable slots:', err.message);
      return;
    }
    console.log('🗑️  Cleared existing timetable slots');

    db.run("DELETE FROM timetables", (err) => {
      if (err) {
        console.error('❌ Error clearing timetables:', err.message);
        return;
      }
      console.log('🗑️  Cleared existing timetables');

      // Create new timetable
      db.run(
        `INSERT INTO timetables (department_id, section, semester, year, generated_by, is_active, metadata) 
         VALUES (1, 'A', 6, 3, 1, 1, ?)`,
        [JSON.stringify({"sample_data": true, "created": new Date().toISOString()})],
        function(err) {
          if (err) {
            console.error('❌ Error creating timetable:', err.message);
            return;
          }

          const timetableId = this.lastID;
          console.log(`✅ Created new timetable with ID: ${timetableId}`);

          // Create comprehensive timetable slots
          const slots = [
            // Teacher 2 (Prof. Sarah Johnson) - DBMS, Software Engineering, DBMS Lab, ML Lab
            // Monday
            { day: 0, time: 0, subject: 2, teacher: 2, room: 1, lab: 0 }, // DBMS
            { day: 0, time: 1, subject: 6, teacher: 2, room: 2, lab: 0 }, // Software Engineering
            { day: 0, time: 4, subject: 3, teacher: 2, room: 3, lab: 1 }, // DBMS Lab
            { day: 0, time: 5, subject: 3, teacher: 2, room: 3, lab: 1 }, // DBMS Lab cont.
            
            // Tuesday
            { day: 1, time: 0, subject: 6, teacher: 2, room: 1, lab: 0 }, // Software Engineering
            { day: 1, time: 1, subject: 2, teacher: 2, room: 2, lab: 0 }, // DBMS
            { day: 1, time: 4, subject: 8, teacher: 2, room: 4, lab: 1 }, // ML Lab
            { day: 1, time: 5, subject: 8, teacher: 2, room: 4, lab: 1 }, // ML Lab cont.
            
            // Wednesday
            { day: 2, time: 0, subject: 2, teacher: 2, room: 1, lab: 0 }, // DBMS
            { day: 2, time: 1, subject: 6, teacher: 2, room: 2, lab: 0 }, // Software Engineering
            { day: 2, time: 4, subject: 6, teacher: 2, room: 1, lab: 0 }, // Software Engineering
            
            // Thursday
            { day: 3, time: 0, subject: 6, teacher: 2, room: 1, lab: 0 }, // Software Engineering
            { day: 3, time: 1, subject: 2, teacher: 2, room: 2, lab: 0 }, // DBMS
            { day: 3, time: 4, subject: 3, teacher: 2, room: 3, lab: 1 }, // DBMS Lab
            
            // Friday
            { day: 4, time: 0, subject: 2, teacher: 2, room: 1, lab: 0 }, // DBMS
            { day: 4, time: 1, subject: 6, teacher: 2, room: 2, lab: 0 }, // Software Engineering

            // Teacher 1 (Dr. John Smith) - Data Structures, Computer Networks, Machine Learning, Networks Lab
            // Monday
            { day: 0, time: 2, subject: 1, teacher: 1, room: 1, lab: 0 }, // Data Structures
            { day: 0, time: 3, subject: 4, teacher: 1, room: 2, lab: 0 }, // Computer Networks
            
            // Tuesday
            { day: 1, time: 2, subject: 7, teacher: 1, room: 1, lab: 0 }, // Machine Learning
            { day: 1, time: 3, subject: 1, teacher: 1, room: 2, lab: 0 }, // Data Structures
            
            // Wednesday
            { day: 2, time: 2, subject: 4, teacher: 1, room: 2, lab: 0 }, // Computer Networks
            { day: 2, time: 5, subject: 5, teacher: 1, room: 3, lab: 1 }, // Networks Lab
            { day: 2, time: 6, subject: 5, teacher: 1, room: 3, lab: 1 }, // Networks Lab cont.
            
            // Thursday
            { day: 3, time: 2, subject: 1, teacher: 1, room: 1, lab: 0 }, // Data Structures
            { day: 3, time: 3, subject: 7, teacher: 1, room: 2, lab: 0 }, // Machine Learning
            
            // Friday
            { day: 4, time: 2, subject: 4, teacher: 1, room: 1, lab: 0 }, // Computer Networks
            { day: 4, time: 3, subject: 1, teacher: 1, room: 2, lab: 0 }, // Data Structures
          ];

          let completed = 0;
          const total = slots.length;

          slots.forEach((slot, index) => {
            db.run(
              `INSERT INTO timetable_slots 
               (timetable_id, day_of_week, time_slot, subject_id, teacher_id, room_id, is_lab_session, lab_duration) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                timetableId,
                slot.day,
                slot.time,
                slot.subject,
                slot.teacher,
                slot.room,
                slot.lab,
                slot.lab ? 2 : 1
              ],
              function(err) {
                completed++;
                if (err) {
                  console.error(`❌ Error inserting slot ${index + 1}:`, err.message);
                }

                if (completed === total) {
                  console.log(`✅ Created ${total} timetable slots`);
                  
                  // Verify the data
                  db.all(`
                    SELECT 
                      ts.teacher_id,
                      t.name as teacher_name,
                      COUNT(*) as slot_count
                    FROM timetable_slots ts
                    JOIN teachers t ON ts.teacher_id = t.id
                    WHERE ts.timetable_id = ?
                    GROUP BY ts.teacher_id, t.name
                  `, [timetableId], (err, results) => {
                    if (err) {
                      console.error('❌ Error verifying data:', err.message);
                    } else {
                      console.log('\n👨‍🏫 Teacher Schedule Summary:');
                      results.forEach(row => {
                        console.log(`- ${row.teacher_name} (ID: ${row.teacher_id}): ${row.slot_count} slots`);
                      });
                    }

                    console.log('\n🎯 Test the endpoints now:');
                    console.log('GET http://localhost:3000/api/teachers/1/timetable');
                    console.log('GET http://localhost:3000/api/teachers/2/timetable');
                    console.log('\n✅ Sample timetable data created successfully!');

                    db.close();
                  });
                }
              }
            );
          });
        }
      );
    });
  });
});
