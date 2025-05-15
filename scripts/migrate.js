
// scripts/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Ensure the database directory exists
const dbDirectory = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

// Database path from environment or default
const dbPath = process.env.DATABASE_URL || path.join(dbDirectory, 'sbondar.sqlite');
console.log(`Using SQLite database at: ${dbPath}`);

// Create/connect to SQLite database
const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Function to convert PostgreSQL SQL to SQLite compatible SQL
function convertToSQLite(sql) {
  return sql
    // Convert SERIAL PRIMARY KEY to INTEGER PRIMARY KEY
    .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    // Convert TIMESTAMPTZ to TEXT
    .replace(/TIMESTAMPTZ/g, 'TEXT')
    // Convert DEFAULT CURRENT_TIMESTAMP to DEFAULT (datetime('now'))
    .replace(/DEFAULT CURRENT_TIMESTAMP/g, "DEFAULT (datetime('now'))")
    // Convert NOW() to datetime('now')
    .replace(/NOW\(\)/g, "datetime('now')")
    // Convert gen_random_uuid() to a simpler UUID function
    .replace(/gen_random_uuid\(\)/g, "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))")
    // ILike to LIKE with lower
    .replace(/ILIKE/g, "LIKE")
    // Convert PostgreSQL param placeholders to SQLite
    .replace(/\$(\d+)/g, '?');
}

async function run() {
  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      run_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Begin transaction
  const runMigration = db.transaction(() => {
    for (const file of files) {
      // Check if migration already ran
      const alreadyRan = db.prepare('SELECT 1 FROM migrations WHERE filename = ?').get(file);
      if (alreadyRan) {
        console.log(`⏭️ Skipping ${file} (already applied)`);
        continue;
      }

      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`📦 Running ${file}`);
      
      // Convert PostgreSQL SQL to SQLite compatible SQL
      sql = convertToSQLite(sql);
      
      // Execute the entire SQL file at once
      // SQLite can handle full SQL files with comments
      try {
        db.exec(sql);
        
        // Record that migration ran
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file);
        console.log(`✅ Applied ${file}`);
      } catch (err) {
        console.error(`Error in ${file}:\n${err.message}`);
        throw err;
      }
    }
  });
  
  try {
    runMigration();
    console.log('✅ All migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    // Close the database connection
    db.close();
  }
}

run().catch(err => {
  console.error('❌ Migration runner error:', err);
  process.exit(1);
});

