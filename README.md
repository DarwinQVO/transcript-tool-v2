# YouTube Transcript Tool v2

Enterprise-grade YouTube transcript extraction tool with multiple fallback methods and file upload support.

## Features

- 🎯 **Smart Transcript Extraction** - Multiple methods with automatic fallbacks
- 📤 **Direct File Upload** - Support for MP3, WAV, M4A, MP4 files
- 🚀 **Railway-Ready** - Optimized for deployment
- 🎨 **Apple-Grade UI/UX** - Clean, modern interface with dark mode
- ⚡ **Fast Processing** - Efficient transcription with progress indicators
- 📊 **Up to 4 Hours** - Support for long-form content

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment to Railway

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Next.js app
3. Add the `OPENAI_API_KEY` environment variable in Railway dashboard
4. Deploy!

## How It Works

### Method 1: Native YouTube Transcripts
Attempts to fetch existing transcripts directly from YouTube when available.

### Method 2: Interactive Guide
Provides users with multiple proven options to extract transcripts:
- Browser extensions
- Online services
- Professional tools
- Command-line options

### Method 3: File Upload
Users can upload audio files directly for 100% reliable transcription using OpenAI Whisper.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI Whisper** - Audio transcription
- **youtube-transcript** - YouTube transcript extraction

## Project Structure

```
├── app/
│   ├── page.tsx              # Main UI component
│   ├── api/
│   │   ├── metadata/         # Video metadata extraction
│   │   ├── transcribe/       # YouTube transcription
│   │   └── transcribe-file/  # File upload transcription
├── lib/
│   └── working-solution.ts   # Core transcription logic
└── public/                   # Static assets
```

## License

MIT