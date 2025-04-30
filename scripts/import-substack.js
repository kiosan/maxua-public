#!/usr/bin/env node
/**
 * import-substack.js
 * 
 * A script to import Substack blog archives into a structured website format.
 * 
 * Usage:
 *   node import-substack.js [options]
 * 
 * Options:
 *   --input=<path>        Path to the Substack export directory (default: current dir)
 *   --output=<path>       Path to output directory (default: ./newsletter-archive)
 *   --type=<type>         Type of posts to import: 'newsletter', 'podcast', or 'all' (default: newsletter)
 *   --index=<true|false>  Whether to generate index files (default: true)
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const slugify = require('slugify');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  input: process.cwd(),
  output: path.join(process.cwd(), 'newsletter-archive'),
  type: 'newsletter',
  index: true
};

args.forEach(arg => {
  const [key, value] = arg.replace('--', '').split('=');
  if (key && value) {
    if (key === 'index' && value.toLowerCase() === 'false') {
      options.index = false;
    } else {
      options[key] = value;
    }
  }
});

// Ensure the output directory exists
if (!fs.existsSync(options.output)) {
  fs.mkdirSync(options.output, { recursive: true });
}

// Read and parse the CSV file
function readCSV(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    const records = parse(data, {
      columns: true,
      skip_empty_lines: true
    });
    return records;
  } catch (error) {
    console.error(`Error reading CSV file: ${error.message}`);
    return [];
  }
}

// Create a slug from a title
function createSlug(title) {
  return slugify(title, {
    lower: true,
    strict: true,
    replacement: '-'
  });
}

// Format a date as YYYY-MM-DD
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Extract the year from a date string
function getYear(dateString) {
  return new Date(dateString).getFullYear().toString();
}

// Copy HTML file with a new name
function copyHtmlFile(sourcePath, destPath) {
  try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error copying file ${sourcePath}: ${error.message}`);
    return false;
  }
}

// Generate an index.html file
function generateIndexHtml(posts, title) {
  // Sort posts by date in descending order
  posts.sort((a, b) => new Date(b.post_date) - new Date(a.post_date));
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #333;
    }
    h1 { margin-bottom: 1.5rem; }
    .post-list {
      list-style: none;
      padding: 0;
    }
    .post-item {
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #eee;
    }
    .post-date {
      font-size: 0.9rem;
      color: #666;
    }
    .post-title {
      margin: 0.3rem 0;
      font-size: 1.3rem;
    }
    .post-title a {
      color: #0366d6;
      text-decoration: none;
    }
    .post-title a:hover {
      text-decoration: underline;
    }
    .post-subtitle {
      margin-top: 0.5rem;
      color: #444;
    }
    .years-nav {
      margin-bottom: 2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .years-nav a {
      padding: 0.5rem 1rem;
      background: #f5f5f5;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
    }
    .years-nav a:hover {
      background: #e0e0e0;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div id="content">
    ${title === 'Newsletter Archive' ? generateYearsNav(posts) : ''}
    <ul class="post-list">
      ${posts.map(post => `
        <li class="post-item">
          <div class="post-date">${formatDate(post.post_date)}</div>
          <h2 class="post-title">
            <a href="${post.filename}">${post.title || 'Untitled'}</a>
          </h2>
          ${post.subtitle ? `<div class="post-subtitle">${post.subtitle}</div>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
</body>
</html>`;

  return html;
}

// Generate navigation links for years
function generateYearsNav(posts) {
  const years = [...new Set(posts.map(post => getYear(post.post_date)))].sort().reverse();
  
  return `<div class="years-nav">
    ${years.map(year => `<a href="${year}/index.html">${year}</a>`).join('')}
  </div>`;
}

// Main function to import Substack posts
async function importSubstack() {
  console.log('Starting Substack import...');
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);
  
  // Read the index CSV
  const csvPath = path.join(options.input, 'index.csv');
  console.log(`Reading index file: ${csvPath}`);
  const posts = readCSV(csvPath);
  
  if (!posts.length) {
    console.error('No posts found in the CSV or CSV file is missing.');
    return;
  }
  
  console.log(`Found ${posts.length} posts in CSV.`);
  
  // Filter posts based on options
  const filteredPosts = posts.filter(post => {
    // Only include published posts
    if (post.is_published !== 'true') return false;
    
    // Filter by type if needed
    if (options.type !== 'all' && post.type !== options.type) return false;
    
    return true;
  });
  
  console.log(`After filtering, processing ${filteredPosts.length} posts.`);
  
  // Track processed posts by year for index generation
  const postsByYear = {};
  const allProcessedPosts = [];
  
  // Process each post
  for (const post of filteredPosts) {
    // Extract necessary information
    const postId = post.post_id;
    const postDate = formatDate(post.post_date);
    const year = getYear(post.post_date);
    const title = post.title || 'Untitled';
    
    // Create a slug from the title
    const slug = createSlug(title);
    
    // Define the new filename
    const newFilename = `${postDate}-${slug}.html`;
    
    // Create year directory if it doesn't exist
    const yearDir = path.join(options.output, year);
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    
    // Define source and destination paths
    const sourcePath = path.join(options.input, 'posts', `${postId}.html`);
    const destPath = path.join(yearDir, newFilename);
    
    // Add to processed posts
    const processedPost = {
      ...post,
      year,
      slug,
      filename: newFilename
    };
    
    if (!postsByYear[year]) {
      postsByYear[year] = [];
    }
    postsByYear[year].push(processedPost);
    allProcessedPosts.push(processedPost);
    
    // Copy the file
    if (fs.existsSync(sourcePath)) {
      const success = copyHtmlFile(sourcePath, destPath);
      if (success) {
        console.log(`Processed: ${postDate} - ${title} -> ${year}/${newFilename}`);
      }
    } else {
      console.warn(`Warning: Source file not found for post: ${title} (${postId})`);
    }
  }
  
  // Generate index files if requested
  if (options.index) {
    console.log('Generating index files...');
    
    // Generate main index
    const mainIndexPath = path.join(options.output, 'index.html');
    const mainIndexHtml = generateIndexHtml(allProcessedPosts, 'Newsletter Archive');
    fs.writeFileSync(mainIndexPath, mainIndexHtml, 'utf8');
    console.log(`Generated main index: ${mainIndexPath}`);
    
    // Generate year indexes
    Object.entries(postsByYear).forEach(([year, yearPosts]) => {
      const yearIndexPath = path.join(options.output, year, 'index.html');
      const yearIndexHtml = generateIndexHtml(yearPosts, `${year} Newsletter Archive`);
      fs.writeFileSync(yearIndexPath, yearIndexHtml, 'utf8');
      console.log(`Generated year index: ${yearIndexPath}`);
    });
  }
  
  console.log('Import completed successfully!');
}

// Execute the main function
importSubstack().catch(error => {
  console.error('Error during import:', error);
  process.exit(1);
});
