const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'backend', 'database', 'timetable_scheduler.db');

console.log('🔄 Adding sample timetable data...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Create sample timetable and slots
db.serialize(() => {
  // First, check if we already have timetables
  db.get("SELECT COUNT(*) as count FROM timetables", (err, row) => {
    if (err) {
      console.error('❌ Error checking timetables:', err.message);
      return;
    }

    if (row.count > 0) {
      console.log('ℹ️  Timetables already exist. Skipping creation.');
      db.close();
      return;
    }

    // Create a sample timetable
    db.run(
      `INSERT INTO timetables (department_id, section, semester, year, generated_by, is_active, metadata) 
       VALUES (1, 'A', 6, 3, 1, 1, '{"sample_data": true}')`,
      function(err) {
        if (err) {
          console.error('❌ Error creating timetable:', err.message);
          return;
        }

        const timetableId = this.lastID;
        console.log(`✅ Created timetable with ID: ${timetableId}`);

        // Sample timetable slots for teacher ID 2 (Prof. Sarah Johnson)
        const sampleSlots = [
          // Monday (day 0)
          { day: 0, time: 0, subject_id: 2, teacher_id: 2, room_id: 1 }, // DBMS
          { day: 0, time: 1, subject_id: 6, teacher_id: 2, room_id: 2 }, // Software Engineering
          { day: 0, time: 4, subject_id: 3, teacher_id: 2, room_id: 3 }, // DBMS Lab
          { day: 0, time: 5, subject_id: 3, teacher_id: 2, room_id: 3 }, // DBMS Lab (continued)

          // Tuesday (day 1)
          { day: 1, time: 0, subject_id: 6, teacher_id: 2, room_id: 1 }, // Software Engineering
          { day: 1, time: 1, subject_id: 2, teacher_id: 2, room_id: 2 }, // DBMS
          { day: 1, time: 4, subject_id: 8, teacher_id: 2, room_id: 4 }, // ML Lab
          { day: 1, time: 5, subject_id: 8, teacher_id: 2, room_id: 4 }, // ML Lab (continued)

          // Wednesday (day 2)
          { day: 2, time: 0, subject_id: 2, teacher_id: 2, room_id: 1 }, // DBMS
          { day: 2, time: 1, subject_id: 6, teacher_id: 2, room_id: 2 }, // Software Engineering
          { day: 2, time: 4, subject_id: 6, teacher_id: 2, room_id: 1 }, // Software Engineering

          // Thursday (day 3)
          { day: 3, time: 0, subject_id: 6, teacher_id: 2, room_id: 1 }, // Software Engineering
          { day: 3, time: 1, subject_id: 2, teacher_id: 2, room_id: 2 }, // DBMS

          // Friday (day 4)
          { day: 4, time: 0, subject_id: 2, teacher_id: 2, room_id: 1 }, // DBMS
          { day: 4, time: 1, subject_id: 6, teacher_id: 2, room_id: 2 }, // Software Engineering

          // Also add some slots for teacher ID 1 (Dr. John Smith)
          // Monday
          { day: 0, time: 2, subject_id: 1, teacher_id: 1, room_id: 1 }, // Data Structures
          { day: 0, time: 3, subject_id: 4, teacher_id: 1, room_id: 2 }, // Computer Networks

          // Tuesday
          { day: 1, time: 2, subject_id: 7, teacher_id: 1, room_id: 1 }, // Machine Learning
          { day: 1, time: 3, subject_id: 1, teacher_id: 1, room_id: 2 }, // Data Structures

          // Wednesday
          { day: 2, time: 2, subject_id: 4, teacher_id: 1, room_id: 2 }, // Computer Networks
          { day: 2, time: 5, subject_id: 5, teacher_id: 1, room_id: 3 }, // Networks Lab
          { day: 2, time: 6, subject_id: 5, teacher_id: 1, room_id: 3 }, // Networks Lab (continued)

          // Thursday
          { day: 3, time: 2, subject_id: 1, teacher_id: 1, room_id: 1 }, // Data Structures
          { day: 3, time: 3, subject_id: 7, teacher_id: 1, room_id: 2 }, // Machine Learning

          // Friday
          { day: 4, time: 2, subject_id: 4, teacher_id: 1, room_id: 1 }, // Computer Networks
          { day: 4, time: 3, subject_id: 1, teacher_id: 1, room_id: 2 }, // Data Structures
        ];

        let slotsCreated = 0;
        let slotsProcessed = 0;

        // Insert each slot
        sampleSlots.forEach((slot) => {
          db.run(
            `INSERT INTO timetable_slots 
             (timetable_id, day_of_week, time_slot, subject_id, teacher_id, room_id, is_lab_session, lab_duration) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              timetableId,
              slot.day,
              slot.time,
              slot.subject_id,
              slot.teacher_id,
              slot.room_id,
              slot.subject_id === 3 || slot.subject_id === 5 || slot.subject_id === 8 ? 1 : 0, // Lab sessions
              slot.subject_id === 3 || slot.subject_id === 5 || slot.subject_id === 8 ? 2 : 1   // Lab duration
            ],
            function(err) {
              slotsProcessed++;
              if (err) {
                console.error(`❌ Error creating slot ${slotsProcessed}:`, err.message);
              } else {
                slotsCreated++;
              }

              // When all slots are processed, show summary
              if (slotsProcessed === sampleSlots.length) {
                console.log(`✅ Created ${slotsCreated} timetable slots out of ${sampleSlots.length} attempted`);

                // Show teacher slot counts
                db.all(
                  `SELECT t.name, COUNT(ts.id) as slot_count 
                   FROM teachers t 
                   LEFT JOIN timetable_slots ts ON t.id = ts.teacher_id 
                   WHERE ts.timetable_id = ? 
                   GROUP BY t.id, t.name`,
                  [timetableId],
                  (err, rows) => {
                    if (err) {
                      console.error('❌ Error getting teacher counts:', err.message);
                    } else {
                      console.log('\n👨‍🏫 Teacher Assignments:');
                      rows.forEach(row => {
                        console.log(`- ${row.name}: ${row.slot_count} slots`);
                      });
                    }

                    console.log('\n🎯 You can now test the teacher timetable endpoints:');
                    console.log('GET http://localhost:3000/api/teachers/1/timetable (Dr. John Smith)');
                    console.log('GET http://localhost:3000/api/teachers/2/timetable (Prof. Sarah Johnson)');
                    console.log('\n✅ Sample timetable data created successfully!');

                    db.close((err) => {
                      if (err) {
                        console.error('❌ Error closing database:', err.message);
                      }
                      process.exit(0);
                    });
                  }
                );
              }
            }
          );
        });
      }
    );
  });
});
