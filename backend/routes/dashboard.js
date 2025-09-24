const express = require('express');
const db = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Use SQLite-compatible queries

// Get dashboard statistics (admin only)
router.get('/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    // Get basic counts
    const stats = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM teachers) as teachers,
        (SELECT COUNT(*) FROM subjects) as subjects,
        (SELECT COUNT(*) FROM departments) as departments,
        (SELECT COUNT(*) FROM rooms) as rooms,
        (SELECT COUNT(*) FROM timetables WHERE is_active = 1) as timetables,
        (SELECT COUNT(*) FROM subject_offerings) as subject_offerings,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') as teacher_users
    `);

    // Get recent activities (last 10) - SQLite compatible
    const recentActivities = await db.execute(`
      SELECT 
        'Timetable Generated' as description,
        ('Department: ' || d.name || ' - Section: ' || t.section) as details,
        strftime('%Y-%m-%d %H:%M', t.generated_at) as timestamp
      FROM timetables t
      JOIN departments d ON t.department_id = d.id
      WHERE t.is_active = 1
      ORDER BY t.generated_at DESC
      LIMIT 10
    `);

    // Get department-wise statistics
    const departmentStats = await db.execute(`
      SELECT 
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
      GROUP BY d.id
      ORDER BY d.name
    `);

    // Get system health indicators
    const systemHealth = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM teachers WHERE id NOT IN (SELECT DISTINCT teacher_id FROM subject_offerings WHERE teacher_id IS NOT NULL)) as unassigned_teachers,
        (SELECT COUNT(*) FROM subjects WHERE id NOT IN (SELECT DISTINCT subject_id FROM subject_offerings WHERE subject_id IS NOT NULL)) as unassigned_subjects,
        (SELECT COUNT(*) FROM rooms WHERE id NOT IN (SELECT DISTINCT room_id FROM timetable_slots WHERE room_id IS NOT NULL)) as unused_rooms,
        (SELECT COUNT(*) FROM departments WHERE id NOT IN (SELECT DISTINCT department_id FROM timetables WHERE is_active = 1 AND department_id IS NOT NULL)) as departments_without_timetables
    `);

    // Calculate workload distribution
    const workloadStats = await db.execute(`
      SELECT 
        AVG(t.max_sessions_per_week) as avg_max_sessions,
        AVG(COALESCE(workload.current_load, 0)) as avg_current_load,
        COUNT(CASE WHEN COALESCE(workload.current_load, 0) > t.max_sessions_per_week THEN 1 END) as overloaded_teachers,
        COUNT(CASE WHEN COALESCE(workload.current_load, 0) = 0 THEN 1 END) as idle_teachers
      FROM teachers t
      LEFT JOIN (
        SELECT teacher_id, SUM(max_periods_per_week) as current_load
        FROM subject_offerings
        GROUP BY teacher_id
      ) workload ON t.id = workload.teacher_id
    `);

    res.json({
      ...stats[0],
      recentActivities,
      departmentStats,
      systemHealth: systemHealth[0],
      workloadStats: workloadStats[0],
      lastBackup: null // This would be implemented based on your backup strategy
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get department-specific dashboard data
router.get('/department/:department_id', authenticateToken, async (req, res) => {
  try {
    const { department_id } = req.params;
    const user = req.user;

    // Check access permissions
    if (user.role !== 'admin' && user.department_id !== parseInt(department_id)) {
      return res.status(403).json({
        message: 'Access denied to this department data'
      });
    }

    // Get department overview
    const departmentOverview = await db.execute(`
      SELECT 
        d.*,
        COUNT(DISTINCT t.id) as teachers_count,
        COUNT(DISTINCT s.id) as subjects_count,
        COUNT(DISTINCT r.id) as rooms_count,
        COUNT(DISTINCT so.id) as offerings_count,
        COUNT(DISTINCT tt.id) as active_timetables,
        COUNT(DISTINCT u.id) as students_count
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN subjects s ON d.id = s.department_id
      LEFT JOIN rooms r ON d.id = r.department_id
      LEFT JOIN subject_offerings so ON d.id = so.department_id
      LEFT JOIN timetables tt ON d.id = tt.department_id AND tt.is_active = 1
      LEFT JOIN users u ON d.id = u.department_id AND u.role = 'student'
      WHERE d.id = ?
      GROUP BY d.id
    `, [department_id]);

    if (departmentOverview.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    // Get subject distribution
    const subjectDistribution = await db.execute(`
      SELECT 
        COUNT(CASE WHEN is_lab = 1 THEN 1 END) as lab_subjects,
        COUNT(CASE WHEN is_lab = 0 THEN 1 END) as theory_subjects,
        SUM(credits) as total_credits,
        AVG(credits) as avg_credits
      FROM subjects
      WHERE department_id = ?
    `, [department_id]);

    // Get room utilization
    const roomUtilization = await db.execute(`
      SELECT 
        r.type,
        COUNT(r.id) as total_rooms,
        COUNT(DISTINCT ts.room_id) as utilized_rooms,
        ROUND(CAST(COUNT(DISTINCT ts.room_id) AS FLOAT) / COUNT(r.id) * 100, 2) as utilization_percentage
      FROM rooms r
      LEFT JOIN timetable_slots ts ON r.id = ts.room_id
      LEFT JOIN timetables t ON ts.timetable_id = t.id AND t.is_active = 1
      WHERE r.department_id = ?
      GROUP BY r.type
    `, [department_id]);

    // Get teacher workload summary
    const teacherWorkload = await db.execute(`
      SELECT 
        t.name as teacher_name,
        t.max_sessions_per_week,
        COALESCE(SUM(so.max_periods_per_week), 0) as assigned_periods,
        COUNT(so.id) as subjects_assigned,
        ROUND(CAST(COALESCE(SUM(so.max_periods_per_week), 0) AS FLOAT) / t.max_sessions_per_week * 100, 2) as workload_percentage
      FROM teachers t
      LEFT JOIN subject_offerings so ON t.id = so.teacher_id AND so.department_id = ?
      WHERE t.department_id = ?
      GROUP BY t.id
      ORDER BY workload_percentage DESC
    `, [department_id, department_id]);

    // Get recent timetable activity
    const recentActivity = await db.execute(`
      SELECT 
        'Timetable Generated' as activity_type,
        ('Section ' || section || ' - Semester ' || semester) as description,
        generated_at as timestamp,
        u.name as generated_by_name
      FROM timetables t
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.department_id = ?
      ORDER BY t.generated_at DESC
      LIMIT 5
    `, [department_id]);

    res.json({
      department: departmentOverview[0],
      subjectDistribution: subjectDistribution[0],
      roomUtilization,
      teacherWorkload,
      recentActivity
    });

  } catch (error) {
    console.error('Get department dashboard error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get system performance metrics (admin only)
router.get('/performance', authenticateToken, adminOnly, async (req, res) => {
  try {
    // Database performance metrics (SQLite compatible)
    const dbMetrics = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM timetable_slots) + 
        (SELECT COUNT(*) FROM subject_offerings) + 
        (SELECT COUNT(*) FROM teachers) + 
        (SELECT COUNT(*) FROM subjects) + 
        (SELECT COUNT(*) FROM departments) + 
        (SELECT COUNT(*) FROM rooms) + 
        (SELECT COUNT(*) FROM users) as total_records,
        (SELECT COUNT(*) FROM timetable_slots) as timetable_slots_count,
        (SELECT COUNT(*) FROM subject_offerings) as subject_offerings_count
    `);

    // Constraint violations check
    const constraintViolations = await db.execute(`
      SELECT 
        'Teacher Overload' as violation_type,
        COUNT(*) as count
      FROM (
        SELECT t.id, t.max_sessions_per_week, COALESCE(SUM(so.max_periods_per_week), 0) as assigned
        FROM teachers t
        LEFT JOIN subject_offerings so ON t.id = so.teacher_id
        GROUP BY t.id
        HAVING assigned > t.max_sessions_per_week
      ) violations
      
      UNION ALL
      
      SELECT 
        'Room Conflicts' as violation_type,
        COUNT(*) as count
      FROM (
        SELECT ts1.room_id, ts1.day_of_week, ts1.time_slot, COUNT(*) as conflicts
        FROM timetable_slots ts1
        JOIN timetables t1 ON ts1.timetable_id = t1.id AND t1.is_active = 1
        GROUP BY ts1.room_id, ts1.day_of_week, ts1.time_slot
        HAVING conflicts > 1
      ) room_conflicts
      
      UNION ALL
      
      SELECT 
        'Teacher Conflicts' as violation_type,
        COUNT(*) as count
      FROM (
        SELECT ts1.teacher_id, ts1.day_of_week, ts1.time_slot, COUNT(*) as conflicts
        FROM timetable_slots ts1
        JOIN timetables t1 ON ts1.timetable_id = t1.id AND t1.is_active = 1
        GROUP BY ts1.teacher_id, ts1.day_of_week, ts1.time_slot
        HAVING conflicts > 1
      ) teacher_conflicts
    `);

    // Timetable generation success rate (last 30 days) - SQLite compatible
    const generationStats = await db.execute(`
      SELECT 
        COUNT(*) as total_generations,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as successful_generations,
        ROUND(CAST(COUNT(CASE WHEN is_active = 1 THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as success_rate
      FROM timetables
      WHERE generated_at >= datetime('now', '-30 days')
    `);

    res.json({
      database: dbMetrics[0],
      constraintViolations,
      generationStats: generationStats[0] || { total_generations: 0, successful_generations: 0, success_rate: 0 },
      systemStatus: {
        database_connected: true,
        ortools_available: true, // This would be checked by calling the Python script
        last_health_check: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get workload analysis (admin only)
router.get('/workload-analysis', authenticateToken, adminOnly, async (req, res) => {
  try {
    // Teacher workload distribution
    const workloadDistribution = await db.execute(`
      SELECT 
        CASE 
          WHEN workload_percentage <= 50 THEN 'Under-utilized (≤50%)'
          WHEN workload_percentage <= 75 THEN 'Normal (51-75%)'
          WHEN workload_percentage <= 100 THEN 'Well-utilized (76-100%)'
          ELSE 'Overloaded (>100%)'
        END as workload_category,
        COUNT(*) as teacher_count
      FROM (
        SELECT 
          t.id,
          ROUND(CAST(COALESCE(SUM(so.max_periods_per_week), 0) AS FLOAT) / t.max_sessions_per_week * 100, 2) as workload_percentage
        FROM teachers t
        LEFT JOIN subject_offerings so ON t.id = so.teacher_id
        GROUP BY t.id
      ) teacher_workloads
      GROUP BY workload_category
      ORDER BY 
        CASE workload_category
          WHEN 'Under-utilized (≤50%)' THEN 1
          WHEN 'Normal (51-75%)' THEN 2
          WHEN 'Well-utilized (76-100%)' THEN 3
          WHEN 'Overloaded (>100%)' THEN 4
        END
    `);

    // Department workload comparison
    const departmentWorkload = await db.execute(`
      SELECT 
        d.name as department_name,
        COUNT(t.id) as total_teachers,
        AVG(t.max_sessions_per_week) as avg_max_sessions,
        AVG(COALESCE(workload.assigned_periods, 0)) as avg_assigned_periods,
        ROUND(AVG(COALESCE(workload.assigned_periods, 0)) / AVG(t.max_sessions_per_week) * 100, 2) as avg_utilization
      FROM departments d
      LEFT JOIN teachers t ON d.id = t.department_id
      LEFT JOIN (
        SELECT teacher_id, SUM(max_periods_per_week) as assigned_periods
        FROM subject_offerings
        GROUP BY teacher_id
      ) workload ON t.id = workload.teacher_id
      GROUP BY d.id
      ORDER BY avg_utilization DESC
    `);

    // Subject load analysis
    const subjectLoad = await db.execute(`
      SELECT 
        s.name as subject_name,
        s.code,
        s.is_lab,
        COUNT(so.id) as offerings_count,
        SUM(so.max_periods_per_week) as total_periods,
        AVG(so.max_periods_per_week) as avg_periods_per_offering,
        COUNT(DISTINCT so.teacher_id) as teachers_involved
      FROM subjects s
      LEFT JOIN subject_offerings so ON s.id = so.subject_id
      GROUP BY s.id
      HAVING offerings_count > 0
      ORDER BY total_periods DESC
      LIMIT 20
    `);

    res.json({
      workloadDistribution,
      departmentWorkload,
      subjectLoad
    });

  } catch (error) {
    console.error('Get workload analysis error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
