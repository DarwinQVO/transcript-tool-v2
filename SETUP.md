# 🎥 YouTube Transcript Tool - Setup Guide

## 📋 Prerequisites

- Node.js 18+ 
- npm or pnpm
- ffmpeg (via Homebrew on macOS)
- yt-dlp (via Homebrew on macOS)

## 🔧 Installation

1. **Install system dependencies:**
   ```bash
   brew install ffmpeg yt-dlp
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and fill in your API keys:
   ```bash
   cp .env.example .env.local
   ```

## 🔑 Environment Variables

### Required:
- `OPENAI_API_KEY` - Your OpenAI API key for Whisper transcription

### Optional:
- `HUGGING_FACE_TOKEN` - For speaker identification (get from: https://huggingface.co/settings/tokens)
- `MAX_MINUTES` - Maximum video duration (default: 180 minutes)

## 🚀 Running the Application

### Development:
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

## ✨ Features

- ✅ YouTube video transcription (up to 3 hours)
- ✅ Multiple audio formats support
- ✅ Smart caching system
- ✅ Speaker identification (Beta)
- ✅ Automatic chunking for long videos
- ✅ Railway deployment ready

## 🎯 Usage

1. **Enter YouTube URL** in the input field
2. **Optional:** Enable speaker identification checkbox
3. **Click Process** to start transcription
4. **Download or copy** the resulting transcript

## 🔍 Technical Details

- **Frontend:** Next.js 14 with TypeScript & Tailwind CSS
- **Transcription:** OpenAI Whisper API
- **Audio Processing:** FFmpeg + yt-dlp
- **Speaker ID:** Hugging Face (simplified approach)
- **Deployment:** Railway compatible

## ⚠️ Important Notes

- Videos longer than 3 hours are not supported
- Speaker identification is in beta (uses mock segmentation)
- Local caching resets on server restart
- Requires stable internet connection for API calls

## 🐛 Troubleshooting

- **FFmpeg errors:** Ensure FFmpeg is installed via Homebrew
- **yt-dlp errors:** Update yt-dlp: `brew upgrade yt-dlp`
- **OpenAI errors:** Check your API key and billing status
- **Speaker ID not working:** Verify your Hugging Face token