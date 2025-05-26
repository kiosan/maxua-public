#!/bin/sh
set -e

echo "Starting Sasha Bondar blog with daily email newsletter support..."

# Start the cron daemon in the background
echo "Starting cron daemon..."
crond -b -L /app/logs/cron.log

# Run database migrations if needed
echo "Running database migrations..."
npm run migrate

# Start the Node.js application
echo "Starting Node.js application..."
exec node server/index.js
