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

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]