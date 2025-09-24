const express = require('express');
const db = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get basic dashboard statistics
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get basic counts - SQLite compatible
    const stats = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM teachers) as total_teachers,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT COUNT(*) FROM subject_offerings) as total_subject_offerings,
        (SELECT COUNT(*) FROM timetables WHERE is_active = 1) as total_timetables,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') as total_teacher_users
    `);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: error.message
    });
  }
});

// Get recent activities
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const activities = await db.execute(`
      SELECT 
        'Timetable Generated' as type,
        ('Department: ' || d.name || ' - Section: ' || t.section) as description,
        strftime('%Y-%m-%d %H:%M', t.generated_at) as timestamp,
        u.name as user_name
      FROM timetables t
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.is_active = 1
      ORDER BY t.generated_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Dashboard activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load activities',
      error: error.message
    });
  }
});

// Get department-wise statistics
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departmentStats = await db.execute(`
      SELECT 
        d.id,
        d.name as department_name,
        d.code,
        COUNT(DISTINCT t.id) as teachers_count,
        COUNT(DISTINCT s.id) as subjects_count,
        COUNT(DISTINCT r.id) as rooms_count,
        COUNT(DISTINCT so.id) as offerings_count,
        COUNT(DISTINCT tt.id) as timetables_count
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN rooms r ON d.id = r.department_id
      LEFT JOIN subject_offerings so ON d.id = so.department_id
      LEFT JOIN timetables tt ON d.id = tt.department_id AND tt.is_active = 1
      GROUP BY d.id, d.name, d.code
      ORDER BY d.name
    `);

    res.json({
      success: true,
      data: departmentStats
    });

  } catch (error) {
    console.error('Department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load department statistics',
      error: error.message
    });
  }
});

module.exports = router;
