const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// SQL script path
const scriptPath = path.join(__dirname, 'add-mechanical-engineering.sql');

console.log('Running SQL script:', scriptPath);
console.log('Database:', dbPath);

// Read the SQL script
const sqlScript = fs.readFileSync(scriptPath, 'utf8');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Execute the SQL script
db.exec(sqlScript, (err) => {
    if (err) {
        console.error('Error executing SQL script:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('SQL script executed successfully!');
    console.log('Mechanical Engineering department data has been added.');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
});
