const db = require('../config/database');

async function createSampleTimetable() {
  try {
    console.log('🔄 Creating sample timetable data...');

    // First, let's check if we have the required data
    const teachers = await db.execute('SELECT * FROM teachers LIMIT 5');
    const subjects = await db.execute('SELECT * FROM subjects LIMIT 5');
    const rooms = await db.execute('SELECT * FROM rooms LIMIT 5');
    const departments = await db.execute('SELECT * FROM departments LIMIT 1');

    console.log(`Found ${teachers.length} teachers, ${subjects.length} subjects, ${rooms.length} rooms, ${departments.length} departments`);

    if (teachers.length === 0 || subjects.length === 0 || rooms.length === 0 || departments.length === 0) {
      console.log('❌ Missing required data. Please ensure you have teachers, subjects, rooms, and departments in the database.');
      return;
    }

    // Create a sample timetable
    const department = departments[0];
    const timetableResult = await db.execute(
      'INSERT INTO timetables (department_id, section, semester, year, generated_by, is_active, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        department.id,
        department.section,
        department.semester,
        department.year,
        1, // Assuming user ID 1 exists
        1, // is_active
        JSON.stringify({ sample_data: true, created_at: new Date().toISOString() })
      ]
    );

    const timetableId = timetableResult.insertId;
    console.log(`✅ Created timetable with ID: ${timetableId}`);

    // Create sample timetable slots
    const sampleSlots = [
      // Monday (day 0)
      { day: 0, time: 0, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 0, time: 1, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },
      { day: 0, time: 2, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 0, time: 4, subject_id: subjects[2]?.id, teacher_id: teachers[0]?.id, room_id: rooms[2]?.id },
      { day: 0, time: 5, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },

      // Tuesday (day 1)
      { day: 1, time: 0, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },
      { day: 1, time: 1, subject_id: subjects[2]?.id, teacher_id: teachers[0]?.id, room_id: rooms[2]?.id },
      { day: 1, time: 2, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 1, time: 4, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },

      // Wednesday (day 2)
      { day: 2, time: 0, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 2, time: 1, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },
      { day: 2, time: 4, subject_id: subjects[2]?.id, teacher_id: teachers[0]?.id, room_id: rooms[2]?.id },
      { day: 2, time: 5, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },

      // Thursday (day 3)
      { day: 3, time: 0, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },
      { day: 3, time: 1, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 3, time: 2, subject_id: subjects[2]?.id, teacher_id: teachers[0]?.id, room_id: rooms[2]?.id },

      // Friday (day 4)
      { day: 4, time: 0, subject_id: subjects[0]?.id, teacher_id: teachers[0]?.id, room_id: rooms[0]?.id },
      { day: 4, time: 1, subject_id: subjects[1]?.id, teacher_id: teachers[1]?.id, room_id: rooms[1]?.id },
      { day: 4, time: 4, subject_id: subjects[2]?.id, teacher_id: teachers[0]?.id, room_id: rooms[2]?.id },
    ];

    // Insert timetable slots
    let slotsCreated = 0;
    for (const slot of sampleSlots) {
      if (slot.subject_id && slot.teacher_id && slot.room_id) {
        await db.execute(
          'INSERT INTO timetable_slots (timetable_id, day_of_week, time_slot, subject_id, teacher_id, room_id, is_lab_session, lab_duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            timetableId,
            slot.day,
            slot.time,
            slot.subject_id,
            slot.teacher_id,
            slot.room_id,
            false, // is_lab_session
            1      // lab_duration
          ]
        );
        slotsCreated++;
      }
    }

    console.log(`✅ Created ${slotsCreated} timetable slots`);

    // Show summary
    console.log('\n📊 Sample Timetable Created Successfully!');
    console.log(`Timetable ID: ${timetableId}`);
    console.log(`Department: ${department.name} (${department.code})`);
    console.log(`Section: ${department.section}`);
    console.log(`Total Slots: ${slotsCreated}`);

    // Show teacher assignments
    console.log('\n👨‍🏫 Teacher Assignments:');
    for (let i = 0; i < Math.min(teachers.length, 3); i++) {
      const teacher = teachers[i];
      const teacherSlots = await db.execute(
        'SELECT COUNT(*) as count FROM timetable_slots WHERE teacher_id = ? AND timetable_id = ?',
        [teacher.id, timetableId]
      );
      console.log(`- ${teacher.name}: ${teacherSlots[0].count} slots`);
    }

    console.log('\n🎯 You can now test the teacher timetable endpoint:');
    console.log(`GET http://localhost:3000/api/teachers/${teachers[0]?.id}/timetable`);
    console.log(`GET http://localhost:3000/api/teachers/${teachers[1]?.id}/timetable`);

  } catch (error) {
    console.error('❌ Error creating sample timetable:', error);
  } finally {
    // Close database connection
    if (db.closePool) {
      await db.closePool();
    }
    process.exit(0);
  }
}

// Run the script
createSampleTimetable();
