// scripts/import-qotd.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importQuotes() {
  try {
    console.log('Starting quote of the day import...');
    
    // Read the quotes file
    const quotesPath = process.argv[2] || path.join(__dirname, '../Quotes.md');
    if (!fs.existsSync(quotesPath)) {
      console.error(`File not found: ${quotesPath}`);
      process.exit(1);
    }
    
    const content = fs.readFileSync(quotesPath, 'utf8');
    
    // Split content into quotes (each line is a quote)
    const quotes = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // Skip empty lines
    
    console.log(`Found ${quotes.length} quotes to import`);
    
    // Clear existing quotes if needed
    await pool.query('TRUNCATE TABLE qotd RESTART IDENTITY');
    
    // Import each quote
    let importedCount = 0;
    for (const quote of quotes) {
      // Most quotes don't have authors in your file, but
      // if they do have an attribution format like "Quote text. - Author"
      // we could parse it here
      
      // For now, just insert the quotes without authors
      await pool.query(
        'INSERT INTO qotd (text) VALUES ($1)',
        [quote]
      );
      
      importedCount++;
    }
    
    console.log(`Successfully imported ${importedCount} quotes!`);
  } catch (error) {
    console.error('Error importing quotes:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the import
importQuotes();
