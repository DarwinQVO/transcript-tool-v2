# Railway-optimized Dockerfile
FROM node:18-alpine

# Install system dependencies for Railway
RUN apk add --no-cache \
    ffmpeg \
    yt-dlp \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]