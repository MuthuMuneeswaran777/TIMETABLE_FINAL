const express = require('express');
const { body, validationResult } = require('express-validator');
const { PythonShell } = require('python-shell');
const path = require('path');
const db = require('../config/database');
const { authenticateToken, adminOnly, authenticated } = require('../middleware/auth');

const router = express.Router();

// Validation rules for timetable generation
const generateValidation = [
  body('department_id').isInt({ min: 1 }),
  body('section').trim().isLength({ min: 1 }),
  body('semester').optional().isInt({ min: 1, max: 8 }),
];

// Get timetables
router.get('/', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, section, semester, is_active } = req.query;
    const user = req.user;

    let query = `
      SELECT t.*, d.name as department_name, d.code as department_code,
             u.name as generated_by_name,
             COUNT(DISTINCT ts.id) as total_slots
      FROM timetables t
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.generated_by = u.id
      LEFT JOIN timetable_slots ts ON t.id = ts.timetable_id
    `;
    
    let params = [];
    let whereConditions = [];

    // Access control
    if (user.role !== 'admin') {
      whereConditions.push('t.department_id = ?');
      params.push(user.department_id);
    }

    if (department_id) {
      whereConditions.push('t.department_id = ?');
      params.push(department_id);
    }

    if (section) {
      whereConditions.push('t.section = ?');
      params.push(section);
    }

    if (semester) {
      whereConditions.push('t.semester = ?');
      params.push(semester);
    }

    if (is_active !== undefined) {
      whereConditions.push('t.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' GROUP BY t.id ORDER BY t.generated_at DESC';

    const timetables = await db.execute(query, params);
    res.json({
      success: true,
      data: timetables
    });

  } catch (error) {
    console.error('Get timetables error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get specific timetable with details
router.get('/:id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get timetable info
    const timetables = await db.execute(`
      SELECT t.*, d.name as department_name, d.code as department_code,
             u.name as generated_by_name
      FROM timetables t
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.id = ?
    `, [id]);

    if (timetables.length === 0) {
      return res.status(404).json({
        message: 'Timetable not found'
      });
    }

    const timetable = timetables[0];

    // Check access permissions
    if (user.role !== 'admin' && user.department_id !== timetable.department_id) {
      return res.status(403).json({
        message: 'Access denied to this timetable'
      });
    }

    // Get timetable slots
    const slots = await db.execute(`
      SELECT 
        ts.*,
        s.name as subject_name,
        s.code as subject_code,
        s.is_lab,
        t.name as teacher_name,
        r.name as room_name,
        r.type as room_type
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN teachers t ON ts.teacher_id = t.id
      JOIN rooms r ON ts.room_id = r.id
      WHERE ts.timetable_id = ?
      ORDER BY ts.day_of_week, ts.time_slot
    `, [id]);

    // Organize slots into schedule format
    const schedule = Array(5).fill(null).map(() => Array(8).fill(null));
    
    slots.forEach(slot => {
      if (slot.day_of_week < 5 && slot.time_slot < 8) {
        schedule[slot.day_of_week][slot.time_slot] = {
          subject: slot.subject_name,
          subject_code: slot.subject_code,
          teacher: slot.teacher_name,
          room: slot.room_name,
          room_type: slot.room_type,
          is_lab: slot.is_lab,
          is_lab_session: slot.is_lab_session,
          lab_duration: slot.lab_duration
        };
      }
    });

    res.json({
      ...timetable,
      schedule,
      slots: slots.length
    });

  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Generate new timetable (admin only)
router.post('/generate', authenticateToken, adminOnly, generateValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { department_id, section, semester, regenerate = false } = req.body;
    const userId = req.user.id;

    // Validate department exists
    const departments = await db.execute(
      'SELECT * FROM departments WHERE id = ?',
      [department_id]
    );

    if (departments.length === 0) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }

    const department = departments[0];

    // If regenerating, deactivate existing timetables
    if (regenerate) {
      await db.execute(
        'UPDATE timetables SET is_active = 0 WHERE department_id = ? AND section = ?',
        [department_id, section]
      );
    } else {
      // Check if active timetable already exists
      const existingTimetables = await db.execute(
        'SELECT id FROM timetables WHERE department_id = ? AND section = ? AND is_active = 1',
        [department_id, section]
      );

      if (existingTimetables.length > 0) {
        return res.status(409).json({
          message: 'Active timetable already exists for this department and section',
          existing_timetable_id: existingTimetables[0].id
        });
      }
    }

    // Get subject offerings for this department
    const subjectOfferings = await db.execute(`
      SELECT 
        so.*,
        s.name as subject_name,
        s.code as subject_code,
        s.is_lab,
        s.credits,
        t.name as teacher_name,
        t.max_sessions_per_week as teacher_max_sessions
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN teachers t ON so.teacher_id = t.id
      WHERE so.department_id = ?
    `, [department_id]);

    if (subjectOfferings.length === 0) {
      return res.status(400).json({
        message: 'No subject offerings found for this department'
      });
    }

    // Get available rooms for this department
    const rooms = await db.execute(`
      SELECT * FROM rooms WHERE department_id = ?
    `, [department_id]);

    if (rooms.length === 0) {
      return res.status(400).json({
        message: 'No rooms found for this department'
      });
    }

    // Prepare data for OR-Tools optimization
    const optimizationData = {
      department: {
        id: department.id,
        name: department.name,
        section: section || department.section,
        semester: semester || department.semester
      },
      subjects: subjectOfferings.map(so => ({
        id: so.subject_id,
        name: so.subject_name,
        code: so.subject_code,
        is_lab: so.is_lab,
        teacher_id: so.teacher_id,
        teacher_name: so.teacher_name,
        max_periods_per_week: so.max_periods_per_week,
        max_periods_per_day: so.max_periods_per_day,
        teacher_max_sessions: so.teacher_max_sessions
      })),
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity
      })),
      constraints: {
        days_per_week: 5,
        periods_per_day: 8,
        morning_periods: 4, // 0-3
        evening_periods: 4, // 4-7
        lab_duration: 3, // Lab sessions take 3 continuous periods
        no_lab_first_period: true, // C6: No lab in 1st period of morning/evening
        max_teacher_sessions_per_day: 2 // C3: Max 2 sessions per teacher per day
      }
    };

    // Create new timetable record
    const timetableResult = await db.execute(
      'INSERT INTO timetables (department_id, section, semester, year, generated_by, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [
        department_id,
        section || department.section,
        semester || department.semester,
        department.year,
        userId,
        JSON.stringify({ constraints_applied: Object.keys(optimizationData.constraints) })
      ]
    );

    const timetableId = timetableResult.insertId;

    try {
      // Call OR-Tools Python script
      const scriptPath = path.join(__dirname, '..', 'scripts', 'timetable_optimizer.py');
      console.log('Using Python script path:', scriptPath);
      
      // Prepare optimization data with default constraints if not provided
      const optimizationInput = {
        ...optimizationData,
        constraints: {
          days_per_week: 5,
          periods_per_day: 8,
          morning_periods: [0, 1, 2, 3],
          evening_periods: [4, 5, 6, 7],
          lab_duration: 3,
          ...(optimizationData.constraints || {})
        }
      };

      const options = {
        mode: 'text',
        pythonPath: 'C:/Users/praga/AppData/Local/Microsoft/WindowsApps/python3.11.exe',
        pythonOptions: ['-u'], // Unbuffered output
        args: [JSON.stringify(optimizationInput)]
      };

      console.log('Running optimization with data:', JSON.stringify(optimizationInput, null, 2));

      const results = await new Promise((resolve, reject) => {
        let outputData = '';
        let errorData = '';

        try {
          const pyshell = new PythonShell(scriptPath, options);
          
          pyshell.on('message', function (message) {
            console.log('Python output:', message);
            outputData += message;
          });

          pyshell.on('stderr', function (stderr) {
            console.error('Python stderr:', stderr);
            errorData += stderr;
          });

          pyshell.on('error', function (err) {
            console.error('Python error:', err);
            errorData += err.toString();
          });

          pyshell.on('close', function (code) {
            console.log('Python script finished with code:', code);
            if (code !== 0) {
              reject(new Error(`Python script failed with code ${code}: ${errorData}`));
            } else {
              try {
                const parsedOutput = JSON.parse(outputData);
                resolve(parsedOutput);
              } catch (parseError) {
                reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${outputData}`));
              }
            }
          });
        } catch (err) {
          console.error('Error running Python script:', err);
          reject(err);
        }
      });

      if (!results || results.length === 0) {
        throw new Error('No results from optimization script');
      }

      const optimizedSchedule = results[0];

      if (!optimizedSchedule.success) {
        throw new Error(optimizedSchedule.error || 'Optimization failed');
      }

      // Save optimized schedule to database
      const slots = optimizedSchedule.schedule;
      
      for (const slot of slots) {
        await db.execute(
          `INSERT INTO timetable_slots 
           (timetable_id, day_of_week, time_slot, subject_id, teacher_id, room_id, is_lab_session, lab_duration) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            timetableId,
            slot.day,
            slot.time_slot,
            slot.subject_id,
            slot.teacher_id,
            slot.room_id,
            slot.is_lab_session || false,
            slot.lab_duration || 1
          ]
        );
      }

      // Update timetable as active and successful
      await db.execute(
        'UPDATE timetables SET is_active = 1, metadata = ? WHERE id = ?',
        [
          JSON.stringify({
            ...optimizationData.constraints,
            generation_stats: optimizedSchedule.stats,
            generated_at: new Date().toISOString()
          }),
          timetableId
        ]
      );

      // Get the generated timetable with details
      const generatedTimetable = await db.execute(`
        SELECT t.*, d.name as department_name
        FROM timetables t
        JOIN departments d ON t.department_id = d.id
        WHERE t.id = ?
      `, [timetableId]);

      res.status(201).json({
        message: 'Timetable generated successfully',
        timetable: generatedTimetable[0],
        stats: optimizedSchedule.stats,
        total_slots: slots.length
      });

    } catch (optimizationError) {
      console.error('Optimization error:', optimizationError);
      
      // Mark timetable as failed
      await db.execute(
        'UPDATE timetables SET is_active = 0, metadata = ? WHERE id = ?',
        [
          JSON.stringify({
            error: optimizationError.message,
            failed_at: new Date().toISOString()
          }),
          timetableId
        ]
      );

      res.status(500).json({
        message: 'Timetable generation failed',
        error: optimizationError.message,
        timetable_id: timetableId
      });
    }

  } catch (error) {
    console.error('Generate timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Delete timetable (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if timetable exists
    const timetables = await db.execute(
      'SELECT id FROM timetables WHERE id = ?',
      [id]
    );

    if (timetables.length === 0) {
      return res.status(404).json({
        message: 'Timetable not found'
      });
    }

    // Delete timetable (cascade will delete slots)
    await db.execute('DELETE FROM timetables WHERE id = ?', [id]);

    res.json({
      message: 'Timetable deleted successfully'
    });

  } catch (error) {
    console.error('Delete timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Toggle timetable active status (admin only)
router.patch('/:id/toggle-active', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current timetable
    const timetables = await db.execute(
      'SELECT * FROM timetables WHERE id = ?',
      [id]
    );

    if (timetables.length === 0) {
      return res.status(404).json({
        message: 'Timetable not found'
      });
    }

    const timetable = timetables[0];
    const newStatus = !timetable.is_active;

    // If activating, deactivate other timetables for same department/section
    if (newStatus) {
      await db.execute(
        'UPDATE timetables SET is_active = 0 WHERE department_id = ? AND section = ? AND id != ?',
        [timetable.department_id, timetable.section, id]
      );
    }

    // Update timetable status
    await db.execute(
      'UPDATE timetables SET is_active = ? WHERE id = ?',
      [newStatus, id]
    );

    res.json({
      message: `Timetable ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });

  } catch (error) {
    console.error('Toggle timetable status error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Export timetable as PDF (placeholder - would need PDF generation library)
router.get('/:id/export', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // This is a placeholder - in a real implementation, you would:
    // 1. Get timetable data
    // 2. Use a PDF generation library (like puppeteer, jsPDF, or PDFKit)
    // 3. Generate and return the PDF
    
    res.status(501).json({
      message: 'PDF export not implemented yet',
      note: 'This would generate a PDF of the timetable'
    });

  } catch (error) {
    console.error('Export timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get timetable conflicts and validation
router.get('/:id/validate', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Check room conflicts
    const roomConflicts = await db.execute(`
      SELECT 
        ts1.day_of_week,
        ts1.time_slot,
        r.name as room_name,
        COUNT(*) as conflict_count,
        GROUP_CONCAT(CONCAT(s.name, ' (', t.name, ')') SEPARATOR ', ') as conflicting_classes
      FROM timetable_slots ts1
      JOIN timetable_slots ts2 ON ts1.room_id = ts2.room_id 
        AND ts1.day_of_week = ts2.day_of_week 
        AND ts1.time_slot = ts2.time_slot 
        AND ts1.id != ts2.id
      JOIN rooms r ON ts1.room_id = r.id
      JOIN subjects s ON ts1.subject_id = s.id
      JOIN teachers t ON ts1.teacher_id = t.id
      WHERE ts1.timetable_id = ?
      GROUP BY ts1.room_id, ts1.day_of_week, ts1.time_slot
    `, [id]);

    // Check teacher conflicts
    const teacherConflicts = await db.execute(`
      SELECT 
        ts1.day_of_week,
        ts1.time_slot,
        te.name as teacher_name,
        COUNT(*) as conflict_count,
        GROUP_CONCAT(CONCAT(s.name, ' in ', r.name) SEPARATOR ', ') as conflicting_classes
      FROM timetable_slots ts1
      JOIN timetable_slots ts2 ON ts1.teacher_id = ts2.teacher_id 
        AND ts1.day_of_week = ts2.day_of_week 
        AND ts1.time_slot = ts2.time_slot 
        AND ts1.id != ts2.id
      JOIN teachers te ON ts1.teacher_id = te.id
      JOIN subjects s ON ts1.subject_id = s.id
      JOIN rooms r ON ts1.room_id = r.id
      WHERE ts1.timetable_id = ?
      GROUP BY ts1.teacher_id, ts1.day_of_week, ts1.time_slot
    `, [id]);

    // Check constraint violations
    const constraintViolations = [];

    // Check C6: No lab in first period
    const labFirstPeriod = await db.execute(`
      SELECT COUNT(*) as violations
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      WHERE ts.timetable_id = ? AND s.is_lab = 1 AND (ts.time_slot = 0 OR ts.time_slot = 4)
    `, [id]);

    if (labFirstPeriod[0].violations > 0) {
      constraintViolations.push({
        constraint: 'C6',
        description: 'Labs scheduled in first period of morning/evening sessions',
        violations: labFirstPeriod[0].violations
      });
    }

    // Check C3: Max 2 sessions per teacher per day
    const teacherDailyOverload = await db.execute(`
      SELECT 
        te.name as teacher_name,
        ts.day_of_week,
        COUNT(*) as sessions_count
      FROM timetable_slots ts
      JOIN teachers te ON ts.teacher_id = te.id
      WHERE ts.timetable_id = ?
      GROUP BY ts.teacher_id, ts.day_of_week
      HAVING sessions_count > 2
    `, [id]);

    if (teacherDailyOverload.length > 0) {
      constraintViolations.push({
        constraint: 'C3',
        description: 'Teachers with more than 2 sessions per day',
        violations: teacherDailyOverload
      });
    }

    res.json({
      timetable_id: id,
      is_valid: roomConflicts.length === 0 && teacherConflicts.length === 0 && constraintViolations.length === 0,
      room_conflicts: roomConflicts,
      teacher_conflicts: teacherConflicts,
      constraint_violations: constraintViolations,
      total_issues: roomConflicts.length + teacherConflicts.length + constraintViolations.length
    });

  } catch (error) {
    console.error('Validate timetable error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
