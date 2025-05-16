FROM node:18-slim

# Install SQLite dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    python3 \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

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


RUN npm run migrate

# Expose port
EXPOSE 8080

# Run migrations and start the server
CMD sh -c "node server/index.js"
