# Use Node.js LTS
FROM node:18-slim

# Install system dependencies for Railway
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (enterprise grade YouTube downloader)
RUN pip3 install yt-dlp

# Update yt-dlp to latest version
RUN yt-dlp --update || true

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]