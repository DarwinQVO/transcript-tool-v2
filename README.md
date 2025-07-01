# 🎥 YouTube Transcript Tool v2

Enterprise-grade YouTube transcript extraction with speaker identification. Built with Next.js 14, OpenAI Whisper, and optimized for Railway deployment.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## ✨ Features

- 🎬 **YouTube Video Transcription** - Support for videos up to 3 hours
- 🎭 **Speaker Identification** - Distinguishes between different speakers
- ⚡ **Parallel Processing** - 3x faster with concurrent chunk processing
- 📁 **Multiple Formats** - MP3, WAV, M4A, MP4 support
- 🧠 **Smart Caching** - Reduces API costs and improves speed
- 🚀 **Railway Ready** - One-click deployment with Dockerfile
- 💡 **Intelligent Chunking** - Automatic splitting for long videos
- 🔄 **Real-time Progress** - Live updates and error handling

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/DarwinQVO/transcript-tool-v2.git
cd transcript-tool-v2
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install system dependencies (macOS)
brew install ffmpeg yt-dlp
```

### 3. Configure Environment
```bash
cp .env.example .env.local
```

Add your API keys to `.env.local`:
```env
OPENAI_API_KEY=sk-proj-your-openai-key
HUGGING_FACE_TOKEN=hf_your-huggingface-token
MAX_MINUTES=180
```

### 4. Run the Application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

Visit `http://localhost:3000` and start transcribing!

## 🌐 Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. **Connect your GitHub repo** to Railway
2. **Set environment variables**:
   - `OPENAI_API_KEY`
   - `HUGGING_FACE_TOKEN` (optional)
3. **Deploy!** Railway will automatically use the Dockerfile

## 🔧 API Endpoints

### `POST /api/transcribe`
Transcribe YouTube videos with optional speaker identification.

```typescript
{
  "url": "https://youtube.com/watch?v=...",
  "enableSpeakerIdentification": true
}
```

### `POST /api/transcribe-file`
Upload and transcribe audio files directly.

### `POST /api/metadata`
Extract video metadata from YouTube URLs.

## 📋 Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **Transcription**: OpenAI Whisper API
- **Speaker ID**: Hugging Face (simplified approach)
- **Audio Processing**: FFmpeg + yt-dlp
- **Deployment**: Railway (Docker)

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key for Whisper |
| `HUGGING_FACE_TOKEN` | ⚠️ | HF token for speaker identification |
| `MAX_MINUTES` | ❌ | Max video duration (default: 180) |

## 🚨 Limitations

- **Video Length**: Maximum 3 hours per video
- **File Size**: 25MB limit for direct uploads
- **Rate Limits**: Respects OpenAI API limits
- **Speaker ID**: Currently uses mock segmentation (Beta)

---

<div align="center">

**🚀 Built by [DarwinQVO](https://github.com/DarwinQVO) with [Claude Code](https://claude.ai/code)**

[⭐ Star this repo](https://github.com/DarwinQVO/transcript-tool-v2) • [🐛 Report bugs](https://github.com/DarwinQVO/transcript-tool-v2/issues) • [💡 Request features](https://github.com/DarwinQVO/transcript-tool-v2/issues)

</div>