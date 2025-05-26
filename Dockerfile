FROM node:22-alpine

# Install SQLite dependencies
RUN apk update && apk add \
    sqlite3 \
    python3 \
    build-essential \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Add this to your Dockerfile
RUN apk add --no-cache dcron

# Create a crontab file
COPY crontab /etc/crontabs/root

# Add this to your CMD or as an entrypoint script

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY server/ ./server/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY migrations/ ./migrations/

# Make sure database directory exists
RUN mkdir -p database

# Create volume for SQLite database
VOLUME /app/database

# Expose port
EXPOSE 8080

# Create logs directory for cron output
RUN mkdir -p logs && chmod -R 755 logs

# Copy the entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Default command (will be overridden by entrypoint script)
CMD ["node", "server/index.js"]
