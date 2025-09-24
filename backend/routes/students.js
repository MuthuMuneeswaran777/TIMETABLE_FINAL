const express = require('express');
const db = require('../config/database');
const { authenticateToken, authenticated } = require('../middleware/auth');

const router = express.Router();

// Get student's timetable
router.get('/timetable', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, section } = req.query;
    const user = req.user;

    // Use user's department and section if not provided (for student users)
    const deptId = department_id || user.department_id;
    const sectionName = section || user.section;

    if (!deptId || !sectionName) {
      return res.status(400).json({
        message: 'Department ID and section are required'
      });
    }

    // Check if user has access to this department/section
    if (user.role === 'student' && (user.department_id !== parseInt(deptId) || user.section !== sectionName)) {
      return res.status(403).json({
        message: 'Access denied to this timetable'
      });
    }

    // Get active timetable for the department and section
    const timetables = await db.execute(`
      SELECT id FROM timetables 
      WHERE department_id = ? AND section = ? AND is_active = 1
      ORDER BY generated_at DESC
      LIMIT 1
    `, [deptId, sectionName]);

    if (timetables.length === 0) {
      return res.json({
        message: 'No active timetable found',
        schedule: null
      });
    }

    const timetableId = timetables[0].id;

    // Get timetable slots
    const timetableSlots = await db.execute(`
      SELECT 
        ts.day_of_week,
        ts.time_slot,
        s.name as subject,
        s.code as subject_code,
        s.is_lab,
        t.name as teacher,
        r.name as room,
        ts.is_lab_session,
        ts.lab_duration
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN rooms r ON ts.room_id = r.id
      WHERE ts.timetable_id = ?
      ORDER BY ts.day_of_week, ts.time_slot
    `, [timetableId]);

    // Organize timetable into a 2D array [day][time_slot]
    const schedule = Array(5).fill(null).map(() => Array(8).fill(null));
    
    timetableSlots.forEach(slot => {
      if (slot.day_of_week < 5 && slot.time_slot < 8) {
        schedule[slot.day_of_week][slot.time_slot] = {
          subject: slot.subject,
          subject_code: slot.subject_code,
          teacher: slot.teacher,
          room: slot.room,
          is_lab: slot.is_lab,
          is_lab_session: slot.is_lab_session,
          lab_duration: slot.lab_duration
        };
      }
    });

    // Find next class
    const now = new Date();
    const currentDay = now.getDay() - 1; // Convert to 0-4 (Mon-Fri)
    const currentHour = now.getHours();
    
    let nextClass = null;
    if (currentDay >= 0 && currentDay < 5) {
      // Look for next class today
      for (let timeSlot = Math.max(0, currentHour - 8); timeSlot < 8; timeSlot++) {
        if (schedule[currentDay][timeSlot]) {
          nextClass = {
            ...schedule[currentDay][timeSlot],
            day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][currentDay],
            time: ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '1:00-2:00', '2:00-3:00', '3:00-4:00', '4:00-5:00'][timeSlot]
          };
          break;
        }
      }
      
      // If no class found today, look for tomorrow
      if (!nextClass && currentDay < 4) {
        for (let timeSlot = 0; timeSlot < 8; timeSlot++) {
          if (schedule[currentDay + 1][timeSlot]) {
            nextClass = {
              ...schedule[currentDay + 1][timeSlot],
              day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][currentDay + 1],
              time: ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '1:00-2:00', '2:00-3:00', '3:00-4:00', '4:00-5:00'][timeSlot]
            };
            break;
          }
        }
      }
    }

    res.json({
      department_id: deptId,
      section: sectionName,
      schedule,
      nextClass,
      total_slots: timetableSlots.length
    });

  } catch (error) {
    console.error('Get student timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get student's subjects
router.get('/subjects', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, section, semester } = req.query;
    const user = req.user;

    // Use user's info if not provided (for student users)
    const deptId = department_id || user.department_id;
    const sectionName = section || user.section;
    const semesterNum = semester || user.semester;

    if (!deptId || !sectionName) {
      return res.status(400).json({
        message: 'Department ID and section are required'
      });
    }

    // Check if user has access to this data
    if (user.role === 'student' && (
      user.department_id !== parseInt(deptId) || 
      user.section !== sectionName ||
      (semesterNum && user.semester !== parseInt(semesterNum))
    )) {
      return res.status(403).json({
        message: 'Access denied to this subject data'
      });
    }

    // Get subjects offered to this department/section
    const subjects = await db.execute(`
      SELECT DISTINCT
        s.*,
        t.name as teacher_name,
        t.email as teacher_email,
        so.max_periods_per_week as periods_per_week
      FROM subjects s
      JOIN subject_offerings so ON s.id = so.subject_id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
      WHERE d.id = ? AND d.section = ?
      ${semesterNum ? 'AND d.semester = ?' : ''}
      ORDER BY s.is_lab, s.name
    `, semesterNum ? [deptId, sectionName, semesterNum] : [deptId, sectionName]);

    res.json(subjects);

  } catch (error) {
    console.error('Get student subjects error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get student's statistics
router.get('/stats', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, section } = req.query;
    const user = req.user;

    // Use user's info if not provided (for student users)
    const deptId = department_id || user.department_id;
    const sectionName = section || user.section;

    if (!deptId || !sectionName) {
      return res.status(400).json({
        message: 'Department ID and section are required'
      });
    }

    // Check access permissions
    if (user.role === 'student' && (user.department_id !== parseInt(deptId) || user.section !== sectionName)) {
      return res.status(403).json({
        message: 'Access denied to this data'
      });
    }

    // Get active timetable
    const timetables = await db.execute(`
      SELECT id FROM timetables 
      WHERE department_id = ? AND section = ? AND is_active = 1
      ORDER BY generated_at DESC
      LIMIT 1
    `, [deptId, sectionName]);

    if (timetables.length === 0) {
      return res.json({
        totalClasses: 0,
        subjectsCount: 0,
        labSessions: 0,
        theorySessions: 0
      });
    }

    const timetableId = timetables[0].id;

    // Get statistics
    const stats = await db.execute(`
      SELECT 
        COUNT(ts.id) as totalClasses,
        COUNT(DISTINCT ts.subject_id) as subjectsCount,
        COUNT(CASE WHEN s.is_lab = 1 THEN 1 END) as labSessions,
        COUNT(CASE WHEN s.is_lab = 0 THEN 1 END) as theorySessions
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.timetable_id = ?
    `, [timetableId]);

    res.json(stats[0] || {
      totalClasses: 0,
      subjectsCount: 0,
      labSessions: 0,
      theorySessions: 0
    });

  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get class schedule for a specific day
router.get('/schedule/:day', authenticateToken, authenticated, async (req, res) => {
  try {
    const { day } = req.params; // 0-4 for Mon-Fri
    const { department_id, section } = req.query;
    const user = req.user;

    const dayNum = parseInt(day);
    if (dayNum < 0 || dayNum > 4) {
      return res.status(400).json({
        message: 'Invalid day. Use 0-4 for Monday-Friday'
      });
    }

    // Use user's info if not provided
    const deptId = department_id || user.department_id;
    const sectionName = section || user.section;

    if (!deptId || !sectionName) {
      return res.status(400).json({
        message: 'Department ID and section are required'
      });
    }

    // Check access permissions
    if (user.role === 'student' && (user.department_id !== parseInt(deptId) || user.section !== sectionName)) {
      return res.status(403).json({
        message: 'Access denied to this schedule'
      });
    }

    // Get active timetable
    const timetables = await db.execute(`
      SELECT id FROM timetables 
      WHERE department_id = ? AND section = ? AND is_active = 1
      ORDER BY generated_at DESC
      LIMIT 1
    `, [deptId, sectionName]);

    if (timetables.length === 0) {
      return res.json({
        day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayNum],
        classes: []
      });
    }

    const timetableId = timetables[0].id;

    // Get day's schedule
    const daySchedule = await db.execute(`
      SELECT 
        ts.time_slot,
        s.name as subject_name,
        s.code as subject_code,
        s.is_lab,
        t.name as teacher_name,
        r.name as room_name,
        r.type as room_type,
        ts.is_lab_session,
        ts.lab_duration
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN rooms r ON ts.room_id = r.id
      WHERE ts.timetable_id = ? AND ts.day_of_week = ?
      ORDER BY ts.time_slot
    `, [timetableId, dayNum]);

    const timeSlots = [
      '9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00',
      '1:00-2:00', '2:00-3:00', '3:00-4:00', '4:00-5:00'
    ];

    const classes = daySchedule.map(slot => ({
      time: timeSlots[slot.time_slot],
      time_slot: slot.time_slot,
      subject: slot.subject_name,
      subject_code: slot.subject_code,
      teacher: slot.teacher_name,
      room: slot.room_name,
      room_type: slot.room_type,
      is_lab: slot.is_lab,
      is_lab_session: slot.is_lab_session,
      duration: slot.lab_duration || 1
    }));

    res.json({
      day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayNum],
      day_number: dayNum,
      classes
    });

  } catch (error) {
    console.error('Get day schedule error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get upcoming classes (next 5 classes)
router.get('/upcoming', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, section } = req.query;
    const user = req.user;

    // Use user's info if not provided
    const deptId = department_id || user.department_id;
    const sectionName = section || user.section;

    if (!deptId || !sectionName) {
      return res.status(400).json({
        message: 'Department ID and section are required'
      });
    }

    // Check access permissions
    if (user.role === 'student' && (user.department_id !== parseInt(deptId) || user.section !== sectionName)) {
      return res.status(403).json({
        message: 'Access denied to this data'
      });
    }

    // Get active timetable
    const timetables = await db.execute(`
      SELECT id FROM timetables 
      WHERE department_id = ? AND section = ? AND is_active = 1
      ORDER BY generated_at DESC
      LIMIT 1
    `, [deptId, sectionName]);

    if (timetables.length === 0) {
      return res.json({ upcomingClasses: [] });
    }

    const timetableId = timetables[0].id;

    // Get all classes for the week
    const allClasses = await db.execute(`
      SELECT 
        ts.day_of_week,
        ts.time_slot,
        s.name as subject_name,
        s.code as subject_code,
        t.name as teacher_name,
        r.name as room_name,
        ts.is_lab_session
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN rooms r ON ts.room_id = r.id
      WHERE ts.timetable_id = ?
      ORDER BY ts.day_of_week, ts.time_slot
    `, [timetableId]);

    const now = new Date();
    const currentDay = now.getDay() - 1; // Convert to 0-4 (Mon-Fri)
    const currentHour = now.getHours();
    const currentTimeSlot = Math.max(0, currentHour - 8); // 9 AM = slot 0

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = [
      '9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00',
      '1:00-2:00', '2:00-3:00', '3:00-4:00', '4:00-5:00'
    ];

    const upcomingClasses = [];
    
    // Find upcoming classes
    for (const classItem of allClasses) {
      const classDay = classItem.day_of_week;
      const classTimeSlot = classItem.time_slot;
      
      // Skip if it's a past class today or past days
      if (classDay < currentDay || (classDay === currentDay && classTimeSlot <= currentTimeSlot)) {
        continue;
      }
      
      // Only get weekdays (0-4)
      if (classDay >= 0 && classDay < 5) {
        upcomingClasses.push({
          day: dayNames[classDay],
          day_number: classDay,
          time: timeSlots[classTimeSlot],
          time_slot: classTimeSlot,
          subject: classItem.subject_name,
          subject_code: classItem.subject_code,
          teacher: classItem.teacher_name,
          room: classItem.room_name,
          is_lab_session: classItem.is_lab_session
        });
        
        if (upcomingClasses.length >= 5) break;
      }
    }

    res.json({ upcomingClasses });

  } catch (error) {
    console.error('Get upcoming classes error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
