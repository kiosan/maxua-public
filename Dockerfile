FROM node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY server/ ./server/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Expose port
EXPOSE 8080

# Start the server
CMD [ "node", "server/index.js" ]
