const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly, authenticated } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const subjectValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('code').trim().isLength({ min: 2, max: 20 }),
  body('department_id').isInt({ min: 1 }),
  body('is_lab').isBoolean(),
  body('credits').isInt({ min: 1, max: 10 }),
];

// Get all subjects
router.get('/', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let query = `
      SELECT s.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT so.id) as offering_count
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN subject_offerings so ON s.id = so.subject_id
    `;
    
    let params = [];
    
    if (department_id) {
      query += ' WHERE s.department_id = ?';
      params.push(department_id);
    }
    
    query += ' GROUP BY s.id ORDER BY s.name';

    const subjects = await db.execute(query, params);
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get subject by ID
router.get('/:id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const subjects = await db.execute(`
      SELECT s.*, d.name as department_name, d.code as department_code
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id = ?
    `, [id]);

    if (subjects.length === 0) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    res.json(subjects[0]);
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Create new subject (admin only)
router.post('/', authenticateToken, adminOnly, subjectValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, code, department_id, is_lab, credits } = req.body;

    // Check if subject code already exists
    const existingSubjects = await db.execute(
      'SELECT id FROM subjects WHERE code = ?',
      [code]
    );

    if (existingSubjects.length > 0) {
      return res.status(409).json({
        message: 'Subject with this code already exists'
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

    // Insert new subject
    const result = await db.execute(
      'INSERT INTO subjects (name, code, department_id, is_lab, credits) VALUES (?, ?, ?, ?, ?)',
      [name, code, department_id, is_lab, credits]
    );

    // Get created subject with department info
    const newSubjects = await db.execute(`
      SELECT s.*, d.name as department_name, d.code as department_code
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Subject created successfully',
      subject: newSubjects[0]
    });

  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Update subject (admin only)
router.put('/:id', authenticateToken, adminOnly, subjectValidation, async (req, res) => {
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
    const { name, code, department_id, is_lab, credits } = req.body;

    // Check if subject exists
    const existingSubjects = await db.execute(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );

    if (existingSubjects.length === 0) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    // Check if code is already used by another subject
    const duplicateCode = await db.execute(
      'SELECT id FROM subjects WHERE code = ? AND id != ?',
      [code, id]
    );

    if (duplicateCode.length > 0) {
      return res.status(409).json({
        message: 'Subject code already exists'
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

    // Update subject
    await db.execute(
      'UPDATE subjects SET name = ?, code = ?, department_id = ?, is_lab = ?, credits = ? WHERE id = ?',
      [name, code, department_id, is_lab, credits, id]
    );

    // Get updated subject
    const updatedSubjects = await db.execute(`
      SELECT s.*, d.name as department_name, d.code as department_code
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id = ?
    `, [id]);

    res.json({
      message: 'Subject updated successfully',
      subject: updatedSubjects[0]
    });

  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Delete subject (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subject exists
    const existingSubjects = await db.execute(
      'SELECT id FROM subjects WHERE id = ?',
      [id]
    );

    if (existingSubjects.length === 0) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    // Check if subject has offerings
    const subjectOfferings = await db.execute(
      'SELECT COUNT(*) as count FROM subject_offerings WHERE subject_id = ?',
      [id]
    );

    if (subjectOfferings[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete subject with existing offerings',
        offeringsCount: subjectOfferings[0].count
      });
    }

    // Delete subject
    await db.execute('DELETE FROM subjects WHERE id = ?', [id]);

    res.json({
      message: 'Subject deleted successfully'
    });

  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get subjects by department
router.get('/department/:department_id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id } = req.params;

    const subjects = await db.execute(`
      SELECT s.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT so.id) as offering_count,
             COUNT(DISTINCT CASE WHEN so.id IS NOT NULL THEN so.teacher_id END) as teacher_count
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN subject_offerings so ON s.id = so.subject_id
      WHERE s.department_id = ?
      GROUP BY s.id
      ORDER BY s.is_lab, s.name
    `, [department_id]);

    res.json(subjects);

  } catch (error) {
    console.error('Get subjects by department error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get subject statistics
router.get('/:id/stats', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await db.execute(`
      SELECT 
        s.name as subject_name,
        s.code,
        s.is_lab,
        s.credits,
        d.name as department_name,
        COUNT(DISTINCT so.id) as total_offerings,
        COUNT(DISTINCT so.teacher_id) as teachers_assigned,
        COUNT(DISTINCT so.department_id) as departments_offered,
        COALESCE(AVG(so.max_periods_per_week), 0) as avg_periods_per_week,
        (
          SELECT COUNT(*) 
          FROM timetable_slots ts 
          WHERE ts.subject_id = ?
        ) as scheduled_slots
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN subject_offerings so ON s.id = so.subject_id
      WHERE s.id = ?
      GROUP BY s.id
    `, [id, id]);

    if (stats.length === 0) {
      return res.status(404).json({
        message: 'Subject not found'
      });
    }

    res.json(stats[0]);

  } catch (error) {
    console.error('Get subject stats error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
