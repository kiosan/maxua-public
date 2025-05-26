FROM node:22-alpine

# Install SQLite dependencies
RUN apk update && apk add \
    sqlite3 \
    python3 \
    build-essential \
    && rm -rf /var/cache/apk/*

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

# Expose port
EXPOSE 8080

# Run migrations and start the server
CMD sh -c "npm start"
