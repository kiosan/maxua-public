#!/usr/bin/env node

/**
 * This script helps automate the migration from PostgreSQL to SQLite
 * It processes JavaScript files and makes the following changes:
 * 1. Replaces PostgreSQL imports with SQLite imports
 * 2. Replaces pool.query calls with runQuery
 * 3. Replaces parameter placeholders ($1, $2, etc.) with SQLite's ?
 * 4. Replaces PostgreSQL-specific functions with SQLite equivalents
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Directory to process
const SERVER_DIR = path.resolve(__dirname, '../server');

// Replacements to apply
const replacements = [
  // Replace imports
  {
    regex: /const\s*\{\s*pool(\s*,[^}]+)?\s*\}\s*=\s*require\(['"]\.\/utils['"]\)/g,
    replacement: (match, additionalImports) => {
      const imports = additionalImports || '';
      return `const { db, runQuery${imports} } = require('./utils')`;
    }
  },
  // Replace pool.query with runQuery
  {
    regex: /await\s+pool\.query\(/g,
    replacement: 'await runQuery('
  },
  // Replace NOW() with datetime('now')
  {
    regex: /NOW\(\)/g,
    replacement: "datetime('now')"
  },
  // Replace parameter placeholders ($1, $2, ...) with ?
  {
    regex: /\$(\d+)/g,
    replacement: '?'
  }
];

/**
 * Process a single file
 */
async function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  try {
    let content = await readFileAsync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply each replacement
    for (const { regex, replacement } of replacements) {
      content = content.replace(regex, replacement);
    }
    
    // Only write to the file if changes were made
    if (content !== originalContent) {
      await writeFileAsync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
      return true;
    } else {
      console.log(`No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

/**
 * Process all JavaScript files in a directory recursively
 */
async function processDirectory(dirPath) {
  try {
    const entries = await readDirAsync(dirPath);
    let changedFiles = 0;
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = await statAsync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules directory
        if (entry !== 'node_modules') {
          changedFiles += await processDirectory(fullPath);
        }
      } else if (stat.isFile() && entry.endsWith('.js')) {
        if (await processFile(fullPath)) {
          changedFiles++;
        }
      }
    }
    
    return changedFiles;
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    return 0;
  }
}

// Main execution
(async () => {
  console.log('Starting PostgreSQL to SQLite migration...');
  const changedFiles = await processDirectory(SERVER_DIR);
  console.log(`Migration complete. Updated ${changedFiles} files.`);
})().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
