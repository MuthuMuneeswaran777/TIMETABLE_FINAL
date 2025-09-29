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
        lab_duration: 2, // Lab sessions take 2 continuous periods (relaxed)
        no_lab_first_period: false, // Allow labs in first period (relaxed)
        max_teacher_sessions_per_day: 6, // Max 6 sessions per teacher per day (further relaxed)
        allow_labs_in_classrooms: true, // Allow labs to use classrooms if needed
        allow_theory_in_labs: true // Allow theory classes to use labs if needed
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
      const scriptPath = path.resolve(__dirname, '..', 'scripts', 'timetable_optimizer.py');
      console.log('Using Python script path:', scriptPath);
      
      // Prepare optimization data with relaxed constraints for better feasibility
      const optimizationInput = {
        ...optimizationData,
        constraints: {
          days_per_week: 5,
          periods_per_day: 8,
          morning_periods: [0, 1, 2, 3],
          evening_periods: [4, 5, 6, 7],
          lab_duration: 2, // Lab sessions take 2 continuous periods
          no_lab_first_period: false, // Allow labs in first period
          max_teacher_sessions_per_day: 6, // Further increased to handle teacher overload
          allow_labs_in_classrooms: true, // Allow labs to use classrooms if needed
          allow_theory_in_labs: true, // Allow theory classes to use labs if needed
          enforce_lab_continuity: false, // Disable lab continuity constraints for difficult scenarios
          ...(optimizationData.constraints || {})
        }
      };

      // Debug: Log the exact data being sent to Python
      console.log('=== OPTIMIZATION INPUT DATA ===');
      console.log('Department:', optimizationInput.department);
      console.log('Subjects count:', optimizationInput.subjects?.length || 0);
      console.log('Rooms count:', optimizationInput.rooms?.length || 0);
      console.log('Constraints:', optimizationInput.constraints);
      
      // Log all subjects for detailed analysis
      if (optimizationInput.subjects && optimizationInput.subjects.length > 0) {
        console.log('=== ALL SUBJECTS ===');
        optimizationInput.subjects.forEach((subject, index) => {
          console.log(`Subject ${index + 1}:`, {
            id: subject.id,
            name: subject.name,
            code: subject.code,
            is_lab: subject.is_lab,
            teacher_id: subject.teacher_id,
            teacher_name: subject.teacher_name,
            max_periods_per_week: subject.max_periods_per_week,
            max_periods_per_day: subject.max_periods_per_day,
            teacher_max_sessions: subject.teacher_max_sessions
          });
        });
        console.log('=== END ALL SUBJECTS ===');
      }
      
      // Log all rooms for detailed analysis
      if (optimizationInput.rooms && optimizationInput.rooms.length > 0) {
        console.log('=== ALL ROOMS ===');
        optimizationInput.rooms.forEach((room, index) => {
          console.log(`Room ${index + 1}:`, room);
        });
        console.log('=== END ALL ROOMS ===');
      }
      
      // Calculate total periods required
      if (optimizationInput.subjects) {
        const totalPeriodsRequired = optimizationInput.subjects.reduce((sum, subject) => {
          return sum + (subject.max_periods_per_week || 0);
        }, 0);
        const totalAvailableSlots = optimizationInput.constraints.days_per_week * optimizationInput.constraints.periods_per_day * optimizationInput.rooms.length;
        console.log('=== SCHEDULING ANALYSIS ===');
        console.log('Total periods required:', totalPeriodsRequired);
        console.log('Total available slots:', totalAvailableSlots);
        console.log('Utilization percentage:', Math.round((totalPeriodsRequired / totalAvailableSlots) * 100) + '%');
        console.log('=== END SCHEDULING ANALYSIS ===');
      }
      
      console.log('=== END OPTIMIZATION INPUT DATA ===');

      const options = {
        mode: 'text',
        pythonPath: process.env.PYTHON_PATH || 'python',
        pythonOptions: ['-u'], // Unbuffered output
        args: [JSON.stringify(optimizationInput)],
        stderrParser: (data) => {
          // Parse stderr data but don't mix with stdout
          console.error('Python stderr:', data);
          return data;
        }
      };

      console.log('Running optimization with data:', JSON.stringify(optimizationInput, null, 2));

      const results = await new Promise((resolve, reject) => {
        let outputData = '';
        let errorData = '';

        try {
          const pyshell = new PythonShell(scriptPath, options);
          
          // Add a timeout to prevent hanging
          const timeout = setTimeout(() => {
            pyshell.terminate();
            reject(new Error('Optimization timed out after 5 minutes'));
          }, 300000); // 5 minutes timeout

          pyshell.on('message', function (message) {
            console.log('Python stdout:', message);
            outputData += message;
          });

          pyshell.on('stderr', function (stderr) {
            console.error('Python stderr:', stderr);
            errorData += stderr + '\n';
          });

          pyshell.on('error', function (err) {
            console.error('Python error:', err);
            errorData += err.toString();
          });

          pyshell.on('close', function (code) {
            clearTimeout(timeout);
            console.log('Python script finished with code:', code);
            console.log('Full output:', outputData);
            
            // Handle undefined exit code (PythonShell sometimes doesn't provide it)
            if (code === undefined) {
              console.log('Exit code undefined, treating as success');
              code = 0; // Treat undefined as success
            }
            
            try {
              // Clean the output - remove any non-JSON content
              // Look for JSON object in the output
              const jsonMatch = outputData.match(/\{[\s\S]*\}/);
              if (!jsonMatch) {
                throw new Error('No JSON object found in Python output');
              }
              
              const jsonStr = jsonMatch[0];
              console.log('Extracted JSON:', jsonStr);
              const parsedOutput = JSON.parse(jsonStr);
              
              if (parsedOutput.success === false) {
                console.error('Optimization failed:', parsedOutput.error);
                reject(new Error(parsedOutput.error || 'Optimization failed'));
              } else if (parsedOutput.timetable && Array.isArray(parsedOutput.timetable)) {
                console.log('Optimization succeeded with', parsedOutput.timetable.length, 'slots');
                resolve(parsedOutput);
              } else {
                reject(new Error('Invalid optimization result format'));
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
              console.error('Raw output:', outputData);
              reject(new Error(`Failed to parse Python output: ${parseError.message}`));
            }
          });
        } catch (err) {
          console.error('Error running Python script:', err);
          reject(err);
        }
      });

      // Validate results structure
      if (!results) {
        throw new Error('No results from optimization script');
      }

      // Check if optimization was successful
      if (!results.success) {
        throw new Error(results.error || 'Optimization failed without specific error message');
      }

      // Validate timetable data
      if (!results.timetable || !Array.isArray(results.timetable)) {
        throw new Error('Invalid timetable data returned from optimization script');
      }

      const slots = results.timetable;
      
      // Only insert slots if we have valid data
      if (slots.length > 0) {
        console.log(`Inserting ${slots.length} timetable slots into database...`);
        
        for (const slot of slots) {
          // Validate slot data before insertion
          if (!slot.subject_id || !slot.teacher_id || !slot.room_id || 
              slot.day === undefined || slot.time_slot === undefined) {
            console.error('Invalid slot data:', slot);
            continue;
          }

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
              generation_stats: results.stats || {},
              generated_at: new Date().toISOString(),
              total_slots: slots.length
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
          success: true,
          message: 'Timetable generated successfully',
          timetable: generatedTimetable[0],
          stats: results.stats || {},
          total_slots: slots.length
        });
      } else {
        throw new Error('Optimization completed but no valid schedule slots were generated');
      }

    } catch (optimizationError) {
      console.error('Optimization error:', optimizationError);
      
      // Mark timetable as failed
      await db.execute(
        'UPDATE timetables SET is_active = 0, metadata = ? WHERE id = ?',
        [
          JSON.stringify({
            error: optimizationError.message,
            failed_at: new Date().toISOString(),
            error_type: 'optimization_failure'
          }),
          timetableId
        ]
      );

      // Determine appropriate error message
      let errorMessage = optimizationError.message;
      if (errorMessage.includes('No output from Python script')) {
        errorMessage = 'Python optimization script produced no output. Check if OR-Tools is installed and the script is working correctly.';
      } else if (errorMessage.includes('Failed to parse Python output')) {
        errorMessage = 'Python script output was not valid JSON. Check script logs for syntax errors.';
      } else if (errorMessage.includes('Python script failed with code')) {
        errorMessage = `Python optimization script failed: ${errorMessage}`;
      }

      res.status(500).json({
        success: false,
        message: 'Timetable generation failed',
        error: errorMessage,
        timetable_id: timetableId,
        details: {
          timestamp: new Date().toISOString(),
          error_type: 'optimization_failure'
        }
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

// Export timetable as PDF
router.get('/:id/export', authenticateToken, authenticated, async (req, res) => {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { id } = req.params;
    const user = req.user;

    // Get timetable data with department information
    const [timetableRows] = await db.execute(`
      SELECT 
        t.*, 
        COALESCE(d.name, 'N/A') as department_name, 
        COALESCE(d.code, 'DEPT') as department_code,
        COALESCE(u.name, 'System') as generated_by_name
      FROM timetables t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.generated_by = u.id
      WHERE t.id = ?
    `, [id]);

    if (!timetableRows || timetableRows.length === 0) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    const timetable = timetableRows[0];
    
    // Ensure we have default values for required fields
    timetable.department_name = timetable.department_name || 'Department';
    timetable.department_code = timetable.department_code || 'DEPT';
    timetable.section = timetable.section || 'A';
    timetable.semester = timetable.semester || '1';
    timetable.generated_by_name = timetable.generated_by_name || 'System';
    
    // Check access permissions
    if (user.role !== 'admin' && user.department_id !== timetable.department_id) {
      return res.status(403).json({ message: 'Access denied to this timetable' });
    }

    // Get timetable slots
    const [slots] = await db.execute(`
      SELECT 
        ts.*,
        COALESCE(s.name, 'Subject') as subject_name,
        COALESCE(s.code, 'SUB') as subject_code,
        COALESCE(s.is_lab, 0) as is_lab,
        COALESCE(t.name, 'Teacher') as teacher_name,
        COALESCE(r.name, 'Room') as room_name,
        COALESCE(r.type, 'Classroom') as room_type
      FROM timetable_slots ts
      LEFT JOIN subjects s ON ts.subject_id = s.id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      LEFT JOIN rooms r ON ts.room_id = r.id
      WHERE ts.timetable_id = ?
      ORDER BY ts.day_of_week, ts.time_slot
    `, [id]);

    // Create PDF
    const doc = new PDFDocument({ margin: 30 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timetable_${timetable.department_code}_${timetable.section}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Class Timetable', { align: 'center' });
    doc.fontSize(12).text(`${timetable.department_name} - Section ${timetable.section}`, { align: 'center' });
    doc.moveDown();

    // Timetable info
    doc.fontSize(10);
    doc.text(`Semester: ${timetable.semester}`, { continued: true });
    doc.text(`Generated on: ${new Date(timetable.generated_at || new Date()).toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Create table
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = Array.from({ length: 8 }, (_, i) => `${i + 9}:00 - ${i + 10}:00`);
    const cellWidth = 100;
    const cellHeight = 40;
    const startX = 50;
    let startY = 150;

    // Draw table headers (days)
    doc.font('Helvetica-Bold');
    doc.rect(startX, startY, cellWidth, cellHeight).stroke();
    doc.text('Time', startX + 5, startY + 15);
    
    days.forEach((day, i) => {
      const x = startX + (i + 1) * cellWidth;
      doc.rect(x, startY, cellWidth, cellHeight).stroke();
      doc.text(day, x + 5, startY + 15, { width: cellWidth - 10, align: 'center' });
    });

    // Draw time slots and data
    doc.font('Helvetica');
    timeSlots.forEach((time, timeIndex) => {
      startY += cellHeight;
      const y = startY;
      
      // Time slot header
      doc.rect(startX, y, cellWidth, cellHeight).stroke();
      doc.text(time, startX + 5, y + 15);
      
      // Day cells
      days.forEach((day, dayIndex) => {
        const x = startX + (dayIndex + 1) * cellWidth;
        doc.rect(x, y, cellWidth, cellHeight).stroke();
        
        const slot = slots.find(s => 
          s.day_of_week === dayIndex && s.time_slot === timeIndex
        );
        
        if (slot) {
          doc.fontSize(8);
          doc.text(slot.subject_name || 'Subject', x + 5, y + 5, { width: cellWidth - 10, align: 'left' });
          doc.text(`Room: ${slot.room_name || 'N/A'}`, x + 5, y + 20, { width: cellWidth - 10, align: 'left', fontSize: 7 });
          doc.text(`Teacher: ${slot.teacher_name || 'N/A'}`, x + 5, y + 30, { width: cellWidth - 10, align: 'left', fontSize: 7 });
          doc.fontSize(10);
        }
      });
    });

    // Footer
    doc.fontSize(8).text(
      `Generated by ${timetable.generated_by_name} on ${new Date().toLocaleString()}`,
      50, doc.page.height - 50,
      { align: 'center', width: doc.page.width - 100 }
    );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Export timetable error:', error);
    res.status(500).json({
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

module.exports = router;
