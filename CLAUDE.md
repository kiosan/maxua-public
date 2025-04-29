# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Run server: `npm start`
- Development mode: `npm run dev`
- Database migrations: `npm run migrate`
- Deploy to Fly.io: `npm run deploy`
- Run specific test: `node tests/[test-file].js`

## Code Style
- Use 2 space indentation
- Use semicolons consistently
- Use camelCase for variables, functions, and file names
- Use snake_case for database fields and query parameters
- Use CommonJS pattern (require/module.exports)
- Group multiple exports in object literals
- Use destructuring for imports
- Add JSDoc comments for function documentation
- Implement error handling with try/catch blocks
- Log errors with console.error and Sentry
- Include error details in HTTP 500 responses
- Handle async operations with async/await