const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// SQLite database configuration
const dbPath = path.join(__dirname, '..', 'database', 'timetable_scheduler.db');

// Create connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection failed:', err.message);
  } else {
    console.log('✅ SQLite database connected');
  }
});

// Test connection function
const testConnection = async () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT 1", (err, row) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        resolve(false);
      } else {
        console.log('✅ Database connection established');
        resolve(true);
      }
    });
  });
};

// Execute query helper function
const execute = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    // Convert MySQL syntax to SQLite
    let sqliteQuery = query
      .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
      .replace(/INT PRIMARY KEY AUTO_INCREMENT/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
      .replace(/ON UPDATE CURRENT_TIMESTAMP/g, '')
      .replace(/ENUM\([^)]+\)/g, 'TEXT')
      .replace(/CHECK \([^)]+\)/g, '');

    if (query.toLowerCase().includes('select')) {
      db.all(sqliteQuery, params, (err, rows) => {
        if (err) {
          console.error('Database query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } else {
      db.run(sqliteQuery, params, function(err) {
        if (err) {
          console.error('Database query error:', err);
          reject(err);
        } else {
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        }
      });
    }
  });
};

// Query helper function
const query = async (sql, params = []) => {
  const rows = await execute(sql, params);
  return { rows, fields: [] };
};

// Transaction helper function
const transaction = async (callback) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      try {
        const result = callback(db);
        db.run("COMMIT");
        resolve(result);
      } catch (error) {
        db.run("ROLLBACK");
        reject(error);
      }
    });
  });
};

// Close database function
const closePool = async () => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
};

module.exports = {
  pool: db,
  execute,
  query,
  transaction,
  testConnection,
  closePool,
};
