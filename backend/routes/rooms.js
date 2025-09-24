const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly, authenticated } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const roomValidation = [
  body('name').trim().isLength({ min: 1, max: 50 }),
  body('capacity').isInt({ min: 1, max: 200 }),
  body('type').isIn(['classroom', 'laboratory']),
  body('department_id').isInt({ min: 1 }),
];

// Get all rooms
router.get('/', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id, type } = req.query;
    
    let query = `
      SELECT r.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT ts.id) as usage_count
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN timetable_slots ts ON r.id = ts.room_id
    `;
    
    let params = [];
    let whereConditions = [];
    
    if (department_id) {
      whereConditions.push('r.department_id = ?');
      params.push(department_id);
    }
    
    if (type) {
      whereConditions.push('r.type = ?');
      params.push(type);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' GROUP BY r.id ORDER BY r.name';

    const rooms = await db.execute(query, params);
    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get room by ID
router.get('/:id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const rooms = await db.execute(`
      SELECT r.*, d.name as department_name, d.code as department_code
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id = ?
    `, [id]);

    if (rooms.length === 0) {
      return res.status(404).json({
        message: 'Room not found'
      });
    }

    res.json(rooms[0]);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Create new room (admin only)
router.post('/', authenticateToken, adminOnly, roomValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, capacity, type, department_id } = req.body;

    // Check if room name already exists in the same department
    const existingRooms = await db.execute(
      'SELECT id FROM rooms WHERE name = ? AND department_id = ?',
      [name, department_id]
    );

    if (existingRooms.length > 0) {
      return res.status(409).json({
        message: 'Room with this name already exists in the department'
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

    // Insert new room
    const result = await db.execute(
      'INSERT INTO rooms (name, capacity, type, department_id) VALUES (?, ?, ?, ?)',
      [name, capacity, type, department_id]
    );

    // Get created room with department info
    const newRooms = await db.execute(`
      SELECT r.*, d.name as department_name, d.code as department_code
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id = ?
    `, [result.insertId]);

    res.status(201).json({
      message: 'Room created successfully',
      room: newRooms[0]
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Update room (admin only)
router.put('/:id', authenticateToken, adminOnly, roomValidation, async (req, res) => {
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
    const { name, capacity, type, department_id } = req.body;

    // Check if room exists
    const existingRooms = await db.execute(
      'SELECT id FROM rooms WHERE id = ?',
      [id]
    );

    if (existingRooms.length === 0) {
      return res.status(404).json({
        message: 'Room not found'
      });
    }

    // Check if name is already used by another room in the same department
    const duplicateName = await db.execute(
      'SELECT id FROM rooms WHERE name = ? AND department_id = ? AND id != ?',
      [name, department_id, id]
    );

    if (duplicateName.length > 0) {
      return res.status(409).json({
        message: 'Room name already exists in this department'
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

    // Update room
    await db.execute(
      'UPDATE rooms SET name = ?, capacity = ?, type = ?, department_id = ? WHERE id = ?',
      [name, capacity, type, department_id, id]
    );

    // Get updated room
    const updatedRooms = await db.execute(`
      SELECT r.*, d.name as department_name, d.code as department_code
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id = ?
    `, [id]);

    res.json({
      message: 'Room updated successfully',
      room: updatedRooms[0]
    });

  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Delete room (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const existingRooms = await db.execute(
      'SELECT id FROM rooms WHERE id = ?',
      [id]
    );

    if (existingRooms.length === 0) {
      return res.status(404).json({
        message: 'Room not found'
      });
    }

    // Check if room is being used in timetables
    const timetableUsage = await db.execute(
      'SELECT COUNT(*) as count FROM timetable_slots WHERE room_id = ?',
      [id]
    );

    if (timetableUsage[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete room that is being used in timetables',
        usageCount: timetableUsage[0].count
      });
    }

    // Delete room
    await db.execute('DELETE FROM rooms WHERE id = ?', [id]);

    res.json({
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get rooms by department
router.get('/department/:department_id', authenticateToken, authenticated, async (req, res) => {
  try {
    const { department_id } = req.params;
    const { type } = req.query;

    let query = `
      SELECT r.*, d.name as department_name, d.code as department_code,
             COUNT(DISTINCT ts.id) as usage_count
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN timetable_slots ts ON r.id = ts.room_id
      WHERE r.department_id = ?
    `;
    
    let params = [department_id];
    
    if (type) {
      query += ' AND r.type = ?';
      params.push(type);
    }
    
    query += ' GROUP BY r.id ORDER BY r.type, r.name';

    const rooms = await db.execute(query, params);
    res.json(rooms);

  } catch (error) {
    console.error('Get rooms by department error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get room utilization
router.get('/:id/utilization', authenticateToken, authenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const rooms = await db.execute('SELECT * FROM rooms WHERE id = ?', [id]);
    if (rooms.length === 0) {
      return res.status(404).json({
        message: 'Room not found'
      });
    }

    // Get room utilization data
    const utilization = await db.execute(`
      SELECT 
        r.name as room_name,
        r.type,
        r.capacity,
        COUNT(DISTINCT ts.id) as total_slots,
        COUNT(DISTINCT CASE WHEN ts.day_of_week < 5 THEN ts.id END) as weekday_slots,
        COUNT(DISTINCT ts.timetable_id) as timetables_using,
        ROUND((COUNT(DISTINCT ts.id) / (5 * 8)) * 100, 2) as utilization_percentage
      FROM rooms r
      LEFT JOIN timetable_slots ts ON r.id = ts.room_id
      LEFT JOIN timetables t ON ts.timetable_id = t.id AND t.is_active = 1
      WHERE r.id = ?
      GROUP BY r.id
    `, [id]);

    // Get detailed schedule
    const schedule = await db.execute(`
      SELECT 
        ts.day_of_week,
        ts.time_slot,
        s.name as subject_name,
        s.code as subject_code,
        te.name as teacher_name,
        d.name as department_name,
        d.section,
        ts.is_lab_session
      FROM timetable_slots ts
      JOIN subjects s ON ts.subject_id = s.id
      JOIN teachers te ON ts.teacher_id = te.id
      JOIN timetables t ON ts.timetable_id = t.id
      JOIN departments d ON t.department_id = d.id
      WHERE ts.room_id = ? AND t.is_active = 1
      ORDER BY ts.day_of_week, ts.time_slot
    `, [id]);

    res.json({
      room: rooms[0],
      utilization: utilization[0],
      schedule
    });

  } catch (error) {
    console.error('Get room utilization error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

// Get available rooms for a specific time slot
router.get('/available/:day/:time_slot', authenticateToken, authenticated, async (req, res) => {
  try {
    const { day, time_slot } = req.params;
    const { department_id, type } = req.query;

    let query = `
      SELECT r.*, d.name as department_name
      FROM rooms r
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE r.id NOT IN (
        SELECT DISTINCT ts.room_id 
        FROM timetable_slots ts 
        JOIN timetables t ON ts.timetable_id = t.id 
        WHERE ts.day_of_week = ? AND ts.time_slot = ? AND t.is_active = 1
      )
    `;
    
    let params = [day, time_slot];
    
    if (department_id) {
      query += ' AND r.department_id = ?';
      params.push(department_id);
    }
    
    if (type) {
      query += ' AND r.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY r.name';

    const availableRooms = await db.execute(query, params);
    res.json(availableRooms);

  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router;
