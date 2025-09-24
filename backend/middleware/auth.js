const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and get latest info
    const users = await db.execute(
      'SELECT id, name, email, role, department_id, section, semester, year FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorizeRoles('admin');

// Teacher or Admin middleware
const teacherOrAdmin = authorizeRoles('teacher', 'admin');

// Student, Teacher or Admin middleware
const authenticated = authorizeRoles('student', 'teacher', 'admin');

// Check if user can access specific department data
const checkDepartmentAccess = async (req, res, next) => {
  const { department_id } = req.params;
  const user = req.user;

  // Admin can access all departments
  if (user.role === 'admin') {
    return next();
  }

  // Teachers and students can only access their own department
  if (user.department_id && user.department_id.toString() === department_id) {
    return next();
  }

  return res.status(403).json({ 
    message: 'Access denied to this department' 
  });
};

// Check if teacher can access their own data
const checkTeacherAccess = async (req, res, next) => {
  const { id } = req.params; // Changed from teacher_id to id to match route parameters
  const user = req.user;

  // Admin can access all teacher data
  if (user.role === 'admin') {
    return next();
  }

  // Teachers can only access their own data
  if (user.role === 'teacher') {
    // Get teacher record to match with user
    const teachers = await db.execute(
      'SELECT id FROM teachers WHERE email = ?',
      [user.email]
    );

    if (teachers.length > 0 && teachers[0].id.toString() === id) {
      return next();
    }
  }

  return res.status(403).json({ 
    message: 'Access denied to this teacher data' 
  });
};

// Validate request body middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Rate limiting for sensitive operations
const sensitiveOperationLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + ':' + req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => time > windowStart);

    if (recentAttempts.length >= max) {
      return res.status(429).json({
        message: 'Too many attempts, please try again later',
        retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000)
      });
    }

    // Record this attempt
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  adminOnly,
  teacherOrAdmin,
  authenticated,
  checkDepartmentAccess,
  checkTeacherAccess,
  validateRequest,
  sensitiveOperationLimit,
};
