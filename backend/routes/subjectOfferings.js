const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly, authenticated } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const offeringValidation = [
  body('subject_id').isInt({ min: 1 }),
  body('teacher_id').isInt({ min: 1 }),
  body('department_id').isInt({ min: 1 }),
  body('max_periods_per_week').isInt({ min: 1, max: 10 }),
  body('max_periods_per_day').isInt({ min: 1, max: 4 }),
];

// Get all subject offerings
router.get('/', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, teacher_id, subject_id } = req.query;
    
    let query = `
      SELECT so.*, 
             s.name as subject_name, s.code as subject_code, s.is_lab, s.credits,
             t.name as teacher_name, t.email as teacher_email,
             d.name as department_name, d.code as department_code, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
    `;
    
    let params = [];
    let whereConditions = [];
    
    if (department_id) {
      whereConditions.push('so.department_id = ?');
      params.push(department_id);
    }
    
    if (teacher_id) {
      whereConditions.push('so.teacher_id = ?');
      params.push(teacher_id);
    }
    
    if (subject_id) {
      whereConditions.push('so.subject_id = ?');
      params.push(subject_id);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY d.name, s.name';

    const offerings = await db.execute(query, params);
    res.json(offerings);
  } catch (error) {
    console.error('Get subject offerings error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get subject offering by ID
router.get('/:id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const offerings = await db.execute(`
      SELECT so.*, 
             s.name as subject_name, s.code as subject_code, s.is_lab, s.credits,
             t.name as teacher_name, t.email as teacher_email,
             d.name as department_name, d.code as department_code, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.id = ?
    `, [id]);

    if (offerings.length === 0) {
      return res.status(404).json({
        message: 'Subject offering not found'
      });
    }

    res.json(offerings[0]);
  } catch (error) {
    console.error('Get subject offering error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Create new subject offering (admin only)
router.post('/', authenticateToken, adminOnly, offeringValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day } = req.body;

    // Check if the combination already exists
    const existingOfferings = await db.execute(
      'SELECT id FROM subject_offerings WHERE subject_id = ? AND teacher_id = ? AND department_id = ?',
      [subject_id, teacher_id, department_id]
    );

    if (existingOfferings.length > 0) {
      return res.status(409).json({
        message: 'Subject offering with this combination already exists'
      });
    }

    // Validate that subject, teacher, and department exist
    const validationChecks = await Promise.all([
      db.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]),
      db.execute('SELECT id FROM teachers WHERE id = ?', [teacher_id]),
      db.execute('SELECT id FROM departments WHERE id = ?', [department_id])
    ]);

    if (validationChecks[0].length === 0) {
      return res.status(400).json({ message: 'Subject not found' });
    }
    if (validationChecks[1].length === 0) {
      return res.status(400).json({ message: 'Teacher not found' });
    }
    if (validationChecks[2].length === 0) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check teacher's workload
    const teacherWorkload = await db.execute(`
      SELECT t.max_sessions_per_week,
             COALESCE(SUM(so.max_periods_per_week), 0) as current_periods
      FROM teachers t
      LEFT JOIN subject_offerings so ON t.id = so.teacher_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [teacher_id]);

    const teacher = teacherWorkload[0];
    const newTotalPeriods = teacher.current_periods + max_periods_per_week;

    if (newTotalPeriods > teacher.max_sessions_per_week) {
      return res.status(400).json({
        message: 'Teacher workload exceeds maximum sessions per week',
        current: teacher.current_periods,
        adding: max_periods_per_week,
        maximum: teacher.max_sessions_per_week
      });
    }

    // Insert new subject offering
    const result = await db.execute(
      'INSERT INTO subject_offerings (subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day) VALUES (?, ?, ?, ?, ?)',
      [subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day]
    );

    // Get created offering with full details
    const newOfferings = await db.execute(`
      SELECT so.*, 
             s.name as subject_name, s.code as subject_code, s.is_lab, s.credits,
             t.name as teacher_name, t.email as teacher_email,
             d.name as department_name, d.code as department_code, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Subject offering created successfully',
      offering: newOfferings[0]
    });

  } catch (error) {
    console.error('Create subject offering error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Update subject offering (admin only)
router.put('/:id', authenticateToken, adminOnly, offeringValidation, async (req, res) => {
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
    const { subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day } = req.body;

    // Check if offering exists
    const existingOfferings = await db.execute(
      'SELECT * FROM subject_offerings WHERE id = ?',
      [id]
    );

    if (existingOfferings.length === 0) {
      return res.status(404).json({
        message: 'Subject offering not found'
      });
    }

    const currentOffering = existingOfferings[0];

    // Check if the new combination already exists (excluding current record)
    const duplicateOfferings = await db.execute(
      'SELECT id FROM subject_offerings WHERE subject_id = ? AND teacher_id = ? AND department_id = ? AND id != ?',
      [subject_id, teacher_id, department_id, id]
    );

    if (duplicateOfferings.length > 0) {
      return res.status(409).json({
        message: 'Subject offering with this combination already exists'
      });
    }

    // Validate that subject, teacher, and department exist
    const validationChecks = await Promise.all([
      db.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]),
      db.execute('SELECT id FROM teachers WHERE id = ?', [teacher_id]),
      db.execute('SELECT id FROM departments WHERE id = ?', [department_id])
    ]);

    if (validationChecks[0].length === 0) {
      return res.status(400).json({ message: 'Subject not found' });
    }
    if (validationChecks[1].length === 0) {
      return res.status(400).json({ message: 'Teacher not found' });
    }
    if (validationChecks[2].length === 0) {
      return res.status(400).json({ message: 'Department not found' });
    }

    // Check teacher's workload (if teacher changed or periods changed)
    if (teacher_id !== currentOffering.teacher_id || max_periods_per_week !== currentOffering.max_periods_per_week) {
      const teacherWorkload = await db.execute(`
        SELECT t.max_sessions_per_week,
               COALESCE(SUM(CASE WHEN so.id != ? THEN so.max_periods_per_week ELSE 0 END), 0) as current_periods
        FROM teachers t
        LEFT JOIN subject_offerings so ON t.id = so.teacher_id
        WHERE t.id = ?
        GROUP BY t.id
      `, [id, teacher_id]);

      const teacher = teacherWorkload[0];
      const newTotalPeriods = teacher.current_periods + max_periods_per_week;

      if (newTotalPeriods > teacher.max_sessions_per_week) {
        return res.status(400).json({
          message: 'Teacher workload exceeds maximum sessions per week',
          current: teacher.current_periods,
          adding: max_periods_per_week,
          maximum: teacher.max_sessions_per_week
        });
      }
    }

    // Update subject offering
    await db.execute(
      'UPDATE subject_offerings SET subject_id = ?, teacher_id = ?, department_id = ?, max_periods_per_week = ?, max_periods_per_day = ? WHERE id = ?',
      [subject_id, teacher_id, department_id, max_periods_per_week, max_periods_per_day, id]
    );

    // Get updated offering
    const updatedOfferings = await db.execute(`
      SELECT so.*, 
             s.name as subject_name, s.code as subject_code, s.is_lab, s.credits,
             t.name as teacher_name, t.email as teacher_email,
             d.name as department_name, d.code as department_code, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.id = ?
    `, [id]);

    res.json({
      message: 'Subject offering updated successfully',
      offering: updatedOfferings[0]
    });

  } catch (error) {
    console.error('Update subject offering error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Delete subject offering (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if offering exists
    const existingOfferings = await db.execute(
      'SELECT id FROM subject_offerings WHERE id = ?',
      [id]
    );

    if (existingOfferings.length === 0) {
      return res.status(404).json({
        message: 'Subject offering not found'
      });
    }

    // Check if offering is being used in timetables
    const timetableUsage = await db.execute(`
      SELECT COUNT(*) as count 
      FROM timetable_slots ts
      JOIN subject_offerings so ON ts.subject_id = so.subject_id AND ts.teacher_id = so.teacher_id
      WHERE so.id = ?
    `, [id]);

    if (timetableUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete subject offering that is being used in timetables',
        usageCount: timetableUsage[0].count
      });
    }

    // Delete subject offering
    await db.execute('DELETE FROM subject_offerings WHERE id = ?', [id]);

    res.json({
      message: 'Subject offering deleted successfully'
    });

  } catch (error) {
    console.error('Delete subject offering error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get offerings by department
router.get('/department/:department_id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id } = req.params;

    const offerings = await db.execute(`
      SELECT so.*, 
             s.name as subject_name, s.code as subject_code, s.is_lab, s.credits,
             t.name as teacher_name, t.email as teacher_email,
             d.name as department_name, d.code as department_code, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.department_id = ?
      ORDER BY s.name
    `, [department_id]);

    res.json(offerings);

  } catch (error) {
    console.error('Get offerings by department error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get teacher workload summary
router.get('/teacher/:teacher_id/workload', authenticateToken, authenticated, async (req, res) => {
  try {
    const { teacher_id } = req.params;

    const workload = await db.execute(`
      SELECT 
        t.name as teacher_name,
        t.max_sessions_per_week,
        COUNT(so.id) as total_offerings,
        COALESCE(SUM(so.max_periods_per_week), 0) as total_periods_per_week,
        COALESCE(AVG(so.max_periods_per_day), 0) as avg_periods_per_day,
        COUNT(DISTINCT so.department_id) as departments_count,
        COUNT(DISTINCT CASE WHEN s.is_lab = 1 THEN so.id END) as lab_offerings,
        COUNT(DISTINCT CASE WHEN s.is_lab = 0 THEN so.id END) as theory_offerings
      FROM teachers t
      LEFT JOIN subject_offerings so ON t.id = so.teacher_id
      LEFT JOIN subjects s ON so.subject_id = s.id
      WHERE t.id = ?
      GROUP BY t.id
    `, [teacher_id]);

    if (workload.length === 0) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    // Get detailed offerings
    const offerings = await db.execute(`
      SELECT so.*, s.name as subject_name, s.code as subject_code, s.is_lab,
             d.name as department_name, d.section
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN departments d ON so.department_id = d.id
      WHERE so.teacher_id = ?
      ORDER BY d.name, s.name
    `, [teacher_id]);

    res.json({
      summary: workload[0],
      offerings: offerings
    });

  } catch (error) {
    console.error('Get teacher workload error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
