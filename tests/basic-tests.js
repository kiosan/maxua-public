// tests/basic-tests.js
// Basic functional tests for sbondar.com website
// Run with: node tests/basic-tests.js

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'https://sbondar.com';
const VERBOSE = process.env.TEST_VERBOSE === 'true';

// Utility functions
const log = (...args) => VERBOSE && console.log(...args);
const logSuccess = (msg) => console.log(`✅ ${msg}`);
const logError = (msg, error) => {
  console.error(`❌ ${msg}`);
  if (error && VERBOSE) {
    console.error(error);
  }
};

/**
 * Perform a GET request and validate the response
 */
async function testEndpoint(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { 
    expectStatus = 200, 
    contentChecks = [], 
    contentMissing = [],
    responseType = 'text'
  } = options;
  
  try {
    log(`Testing ${url}...`);
    const response = await axios.get(url, { responseType });
    
    // Check status code
    assert.strictEqual(response.status, expectStatus, `Expected status ${expectStatus} but got ${response.status}`);
    
    // For non-text responses, skip content checks
    if (responseType !== 'text') {
      logSuccess(`${path} returned ${response.status} with valid ${responseType} response`);
      return true;
    }
    
    const content = response.data;
    
    // Check for required content
    for (const check of contentChecks) {
      if (typeof check === 'string') {
        assert(content.includes(check), `Content should include "${check}"`);
      } else if (check instanceof RegExp) {
        assert(check.test(content), `Content should match ${check}`);
      }
    }
    
    // Check for content that should NOT be present
    for (const missing of contentMissing) {
      if (typeof missing === 'string') {
        assert(!content.includes(missing), `Content should NOT include "${missing}"`);
      } else if (missing instanceof RegExp) {
        assert(!missing.test(content), `Content should NOT match ${missing}`);
      }
    }
    
    logSuccess(`${path} passed all checks`);
    return true;
  } catch (error) {
    logError(`${path} failed: ${error.message}`, error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  
  console.log(`🧪 Running basic tests against ${BASE_URL}`);
  
  // Homepage loads and contains basic structural elements
  if (await testEndpoint('/', {
    contentChecks: [
      '<title>Sasha Bondar',
      '<img src="/images/mouse.jpeg"',
      'class="profile-image"',
      'class="post-card"'
    ]
  })) passed++; else failed++;
  
  // Single post page
  if (await testEndpoint('/p/1', {
    contentChecks: [
      'asdf dsaf', // post content
      '<div class="post-card"',
      'data-post-id="1"',
      'class="post-content"',
      'class="comment-form"'
    ]
  })) passed++; else failed++;
  
  // Topic page
  if (await testEndpoint('/t/startups', {
    contentChecks: [
      '<title>Startups: .. are hard. Do anyway', 
    ]
  })) passed++; else failed++;
  
  // Search page
  if (await testEndpoint('/search', {
    contentChecks: [
      '<title>Search - Sasha Bondar</title>',
      'class="search-input"',
      'class="search-button"'
    ]
  })) passed++; else failed++;
  
  // Search with query
  if (await testEndpoint('/search?q=coming+out', {
    contentChecks: [
      'Found 1 result',
      'розповідаю над чим працюю',
      'href="/p/84' // Link to the post
    ]
  })) passed++; else failed++;
  
  // RSS feed
  if (await testEndpoint('/rss', {
    responseType: 'text',
    contentChecks: [
      '<?xml version="1.0" encoding="UTF-8" ?>',
      '<rss version="2.0"',
      '<channel>',
      '<title>Sasha Bondar'
    ]
  })) passed++; else failed++;
  
  // About page
  if (await testEndpoint('/about', {
    contentChecks: [
      '<title>About - Sasha Bondar</title>',
      'Фаундер DOU.ua та Djinni'
    ]
  })) passed++; else failed++;
  
  // Books page
  if (await testEndpoint('/books', {
    contentChecks: [
      '<title>books - Sasha Bondar</title>',
      'Contagious', // some of the book titles
      'Andy Grove'
    ]
  })) passed++; else failed++;
  
  // Podcast page
  if (await testEndpoint('/podcast', {
    contentChecks: [
      'Startups Are Hard',
      'transistor.fm',  // Should embed Transistor player
      'Apple Podcast'   // Should have a link to Apple Podcast
    ]
  })) passed++; else failed++;
  
  // Print test summary
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🏁 Tests completed in ${duration.toFixed(2)}s`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
