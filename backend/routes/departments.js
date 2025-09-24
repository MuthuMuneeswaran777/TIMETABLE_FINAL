const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly, authenticated } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const departmentValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('code').trim().isLength({ min: 2, max: 20 }),
  body('section').trim().isLength({ min: 1, max: 10 }),
  body('semester').isInt({ min: 1, max: 8 }),
  body('year').isInt({ min: 1, max: 4 }),
];

// Get all departments
router.get('/', authenticateToken, authenticated, async (req, res) => {
  try {
    const departments = await db.execute(`
      SELECT d.*, 
             COUNT(DISTINCT t.id) as teacher_count,
             COUNT(DISTINCT s.id) as subject_count,
             COUNT(DISTINCT r.id) as room_count
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN rooms r ON d.id = r.department_id
      GROUP BY d.id
      ORDER BY d.name
    `);

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get department by ID
router.get('/:id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const departments = await db.execute(`
      SELECT d.*, 
             COUNT(DISTINCT t.id) as teacher_count,
             COUNT(DISTINCT s.id) as subject_count,
             COUNT(DISTINCT r.id) as room_count
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN rooms r ON d.id = r.department_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [id]);

    if (departments.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    res.json(departments[0]);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new department (admin only)
router.post('/', authenticateToken, adminOnly, departmentValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, code, section, semester, year } = req.body;

    // Check if department code already exists
    const existingDepartments = await db.execute(
      'SELECT id FROM departments WHERE code = ?',
      [code]
    );

    if (existingDepartments.length > 0) {
      return res.status(409).json({
        message: 'Department with this code already exists'
      });
    }

    // Insert new department
    const result = await db.execute(
      'INSERT INTO departments (name, code, section, semester, year) VALUES (?, ?, ?, ?, ?)',
      [name, code, section, semester, year]
    );

    // Get created department
    const newDepartments = await db.execute(
      'SELECT * FROM departments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartments[0]
    });

  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update department (admin only)
router.put('/:id', authenticateToken, adminOnly, departmentValidation, async (req, res) => {
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
    const { name, code, section, semester, year } = req.body;

    // Check if department exists
    const existingDepartments = await db.execute(
      'SELECT id FROM departments WHERE id = ?',
      [id]
    );

    if (existingDepartments.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    // Check if code is already used by another department
    const duplicateCode = await db.execute(
      'SELECT id FROM departments WHERE code = ? AND id != ?',
      [code, id]
    );

    if (duplicateCode.length > 0) {
      return res.status(409).json({
        message: 'Department code already exists'
      });
    }

    // Update department
    await db.execute(
      'UPDATE departments SET name = ?, code = ?, section = ?, semester = ?, year = ? WHERE id = ?',
      [name, code, section, semester, year, id]
    );

    // Get updated department
    const updatedDepartments = await db.execute(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Department updated successfully',
      department: updatedDepartments[0]
    });

  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete department (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const existingDepartments = await db.execute(
      'SELECT id FROM departments WHERE id = ?',
      [id]
    );

    if (existingDepartments.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    // Check if department has associated records
    const associatedRecords = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM teachers WHERE department_id = ?) as teacher_count,
        (SELECT COUNT(*) FROM subjects WHERE department_id = ?) as subject_count,
        (SELECT COUNT(*) FROM rooms WHERE department_id = ?) as room_count,
        (SELECT COUNT(*) FROM users WHERE department_id = ?) as user_count
    `, [id, id, id, id]);

    const counts = associatedRecords[0];
    if (counts.teacher_count > 0 || counts.subject_count > 0 || counts.room_count > 0 || counts.user_count > 0) {
      return res.status(400).json({
        message: 'Cannot delete department with associated records',
        details: {
          teachers: counts.teacher_count,
          subjects: counts.subject_count,
          rooms: counts.room_count,
          users: counts.user_count
        }
      });
    }

    // Delete department
    await db.execute('DELETE FROM departments WHERE id = ?', [id]);

    res.json({
      message: 'Department deleted successfully'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get department statistics
router.get('/:id/stats', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if department exists
    const departments = await db.execute(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );

    if (departments.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    // Get detailed statistics
    const stats = await db.execute(`
      SELECT 
        d.name as department_name,
        d.code,
        d.section,
        d.semester,
        d.year,
        COUNT(DISTINCT t.id) as total_teachers,
        COUNT(DISTINCT s.id) as total_subjects,
        COUNT(DISTINCT CASE WHEN s.is_lab = 1 THEN s.id END) as lab_subjects,
        COUNT(DISTINCT CASE WHEN s.is_lab = 0 THEN s.id END) as theory_subjects,
        COUNT(DISTINCT r.id) as total_rooms,
        COUNT(DISTINCT CASE WHEN r.type = 'laboratory' THEN r.id END) as lab_rooms,
        COUNT(DISTINCT CASE WHEN r.type = 'classroom' THEN r.id END) as classrooms,
        COUNT(DISTINCT so.id) as subject_offerings,
        SUM(DISTINCT s.credits) as total_credits
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN rooms r ON d.id = r.department_id
      LEFT JOIN subject_offerings so ON d.id = so.department_id
      WHERE d.id = ?
      GROUP BY d.id
    `, [id]);

    res.json(stats[0]);

  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
