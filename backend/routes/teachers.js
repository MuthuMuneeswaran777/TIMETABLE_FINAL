const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly, teacherOrAdmin, checkTeacherAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const teacherValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('department_id').isInt({ min: 1 }),
  body('max_sessions_per_week').isInt({ min: 1, max: 40 }),
];

// Get all teachers
router.get('/', authenticateToken, teacherOrAdmin, async (req, res) => {
  try {
    const teachers = await db.execute(`
      SELECT t.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT so.id) as subject_count,
             COALESCE(SUM(so.max_periods_per_week), 0) as total_periods_per_week
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN subject_offerings so ON t.id = so.teacher_id
      GROUP BY t.id
      ORDER BY t.name
    `);

    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get teacher by ID
router.get('/:id', authenticateToken, teacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const teachers = await db.execute(`
      SELECT t.*, d.name as department_name, d.code as department_code
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ?
    `, [id]);

    if (teachers.length === 0) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    res.json(teachers[0]);
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Create new teacher (admin only)
router.post('/', authenticateToken, adminOnly, teacherValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, department_id, max_sessions_per_week } = req.body;

    // Check if email already exists
    const existingTeachers = await db.execute(
      'SELECT id FROM teachers WHERE email = ?',
      [email]
    );

    if (existingTeachers.length > 0) {
      return res.status(409).json({
        message: 'Teacher with this email already exists'
      });
    }

    // Check if department exists
    const departments = await db.execute(
      'SELECT id FROM departments WHERE id = ?',
      [department_id]
    );

    if (departments.length === 0) {
      return res.status(400).json({
        message: 'Department not found'
      });
    }

    // Insert new teacher
    const result = await db.execute(
      'INSERT INTO teachers (name, email, department_id, max_sessions_per_week) VALUES (?, ?, ?, ?)',
      [name, email, department_id, max_sessions_per_week]
    );

    // Get created teacher with department info
    const newTeachers = await db.execute(`
      SELECT t.*, d.name as department_name, d.code as department_code
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Teacher created successfully',
      teacher: newTeachers[0]
    });

  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Update teacher (admin only)
router.put('/:id', authenticateToken, adminOnly, teacherValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, email, department_id, max_sessions_per_week } = req.body;

    // Check if teacher exists
    const existingTeachers = await db.execute(
      'SELECT id FROM teachers WHERE id = ?',
      [id]
    );

    if (existingTeachers.length === 0) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    // Check if email is already used by another teacher
    const duplicateEmail = await db.execute(
      'SELECT id FROM teachers WHERE email = ? AND id != ?',
      [email, id]
    );

    if (duplicateEmail.length > 0) {
      return res.status(409).json({
        message: 'Email already exists'
      });
    }

    // Check if department exists
    const departments = await db.execute(
      'SELECT id FROM departments WHERE id = ?',
      [department_id]
    );

    if (departments.length === 0) {
      return res.status(400).json({
        message: 'Department not found'
      });
    }

    // Update teacher
    await db.execute(
      'UPDATE teachers SET name = ?, email = ?, department_id = ?, max_sessions_per_week = ? WHERE id = ?',
      [name, email, department_id, max_sessions_per_week, id]
    );

    // Get updated teacher
    const updatedTeachers = await db.execute(`
      SELECT t.*, d.name as department_name, d.code as department_code
      FROM teachers t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = ?
    `, [id]);

    res.json({
      message: 'Teacher updated successfully',
      teacher: updatedTeachers[0]
    });

  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Delete teacher (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if teacher exists
    const existingTeachers = await db.execute(
      'SELECT id FROM teachers WHERE id = ?',
      [id]
    );

    if (existingTeachers.length === 0) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    // Check if teacher has subject offerings
    const subjectOfferings = await db.execute(
      'SELECT COUNT(*) as count FROM subject_offerings WHERE teacher_id = ?',
      [id]
    );

    if (subjectOfferings[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete teacher with subject offerings',
        subjectOfferingsCount: subjectOfferings[0].count
      });
    }

    // Delete teacher
    await db.execute('DELETE FROM teachers WHERE id = ?', [id]);

    res.json({
      message: 'Teacher deleted successfully'
    });

  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get teacher's timetable
router.get('/:id/timetable', authenticateToken, checkTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Get teacher's current timetable
    const timetableSlots = await db.execute(`
      SELECT 
        ts.day_of_week,
        ts.time_slot,
        s.name as subject,
        s.code as subject_code,
        s.is_lab,
        r.name as room,
        d.name as department,
        d.section,
        ts.is_lab_session,
        ts.lab_duration
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN rooms r ON ts.room_id = r.id
      JOIN timetables t ON ts.timetable_id = t.id
      JOIN departments d ON t.department_id = d.id
      WHERE ts.teacher_id = ? AND t.is_active = 1
      ORDER BY ts.day_of_week, ts.time_slot
    `, [id]);

    // Organize timetable into a 2D array [day][time_slot]
    const schedule = Array(5).fill(null).map(() => Array(8).fill(null));
    
    timetableSlots.forEach(slot => {
      if (slot.day_of_week < 5 && slot.time_slot < 8) {
        schedule[slot.day_of_week][slot.time_slot] = {
          subject: slot.subject,
          subject_code: slot.subject_code,
          room: slot.room,
          department: slot.department,
          section: slot.section,
          is_lab: slot.is_lab,
          is_lab_session: slot.is_lab_session,
          lab_duration: slot.lab_duration
        };
      }
    });

    res.json({
      teacher_id: id,
      schedule,
      total_slots: timetableSlots.length
    });

  } catch (error) {
    console.error('Get teacher timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get teacher's subject allocations
router.get('/:id/allocations', authenticateToken, checkTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const allocations = await db.execute(`
      SELECT 
        so.*,
        s.name as subject_name,
        s.code as subject_code,
        s.is_lab,
        s.credits,
        d.name as department_name,
        d.section,
        d.semester,
        d.year
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.teacher_id = ?
      ORDER BY d.name, s.name
    `, [id]);

    res.json(allocations);

  } catch (error) {
    console.error('Get teacher allocations error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get teacher's statistics
router.get('/:id/stats', authenticateToken, checkTeacherAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await db.execute(`
      SELECT 
        t.name as teacher_name,
        t.max_sessions_per_week,
        COUNT(DISTINCT so.subject_id) as subjects_count,
        COUNT(DISTINCT so.department_id) as departments_count,
        COALESCE(SUM(so.max_periods_per_week), 0) as total_periods_per_week,
        COUNT(DISTINCT CASE WHEN s.is_lab = 1 THEN so.id END) as lab_subjects,
        COUNT(DISTINCT CASE WHEN s.is_lab = 0 THEN so.id END) as theory_subjects,
        (
          SELECT COUNT(*) 
          FROM timetable_slots ts 
          JOIN timetables tt ON ts.timetable_id = tt.id 
          WHERE ts.teacher_id = ? AND tt.is_active = 1
        ) as total_classes
      FROM teachers t
      LEFT JOIN subject_offerings so ON t.id = so.teacher_id
      LEFT JOIN subjects s ON so.subject_id = s.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [id, id]);

    if (stats.length === 0) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    res.json(stats[0]);

  } catch (error) {
    console.error('Get teacher stats error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
