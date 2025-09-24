// Use SQLite for now (fallback from MySQL)
const USE_SQLITE = process.env.USE_SQLITE === 'true' || true; // Force SQLite for now

if (USE_SQLITE) {
  console.log('🔄 Using SQLite database...');
  module.exports = require('./database-sqlite');
} else {
  // MySQL configuration (original code)
  const mysql = require('mysql2/promise');
  require('dotenv').config();

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'timetable_scheduler',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
  };

  // Create connection pool
  const pool = mysql.createPool(dbConfig);

  // Test connection function
  const testConnection = async () => {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connection established');
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  };

  // Execute query helper function
  const execute = async (query, params = []) => {
    try {
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  // Execute query with metadata helper function
  const query = async (sql, params = []) => {
    try {
      const [rows, fields] = await pool.execute(sql, params);
      return { rows, fields };
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  // Transaction helper function
  const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  // Close pool function
  const closePool = async () => {
    try {
      await pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
    }
  };

  module.exports = {
    pool,
    execute,
    query,
    transaction,
    testConnection,
    closePool,
  };
}
