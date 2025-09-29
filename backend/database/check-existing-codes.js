const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('Checking existing subject codes...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Check existing subject codes
db.all("SELECT code, name, department_id FROM subjects ORDER BY code", (err, rows) => {
    if (err) {
        console.error('Error querying subjects:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('\n=== Existing Subject Codes ===');
    rows.forEach(row => {
        console.log(`${row.code} - ${row.name} (Dept: ${row.department_id})`);
    });
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('\nDatabase connection closed.');
        }
    });
});
