const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Schema path
const schemaPath = path.join(__dirname, 'schema-sqlite.sql');

console.log('Setting up database schema...');
console.log('Schema file:', schemaPath);
console.log('Database:', dbPath);

// Read the schema script
const schemaScript = fs.readFileSync(schemaPath, 'utf8');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Execute the schema script
db.exec(schemaScript, (err) => {
    if (err) {
        console.error('Error executing schema script:', err.message);
        db.close();
        process.exit(1);
    }
    
    console.log('Database schema created successfully!');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
            console.log('\nNow you can run the Mechanical Engineering script:');
            console.log('node database/run-sql-script.js');
        }
    });
});
