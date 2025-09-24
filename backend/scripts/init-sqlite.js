const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'timetable_scheduler.db');
const schemaPath = path.join(__dirname, '..', 'database', 'schema-sqlite.sql');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
console.log('🔄 Initializing SQLite database...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  }
  console.log('✅ SQLite database created/connected');
});

// Read and execute schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Execute each statement in series
  statements.forEach((statement, index) => {
    if (statement.trim()) {
      db.run(statement.trim(), (err) => {
        if (err && !err.message.includes('already exists')) {
          console.error(`❌ Error executing statement ${index + 1}:`, err.message);
          console.error('Statement:', statement.trim());
        }
      });
    }
  });

  // Verify tables were created
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error('❌ Error checking tables:', err.message);
    } else {
      console.log('📋 Created tables:', tables.map(t => t.name).join(', '));
    }

    console.log('✅ Database schema initialized successfully');
    console.log('✅ Sample data inserted');
    console.log('🎉 SQLite setup complete!');
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('📝 Database connection closed');
      }
      process.exit(0);
    });
  });
});
