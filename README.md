# YouTube Transcript Tool V2

A lightweight web application that extracts metadata and generates transcripts from YouTube videos using OpenAI's Whisper API.

## Features

- Extract video metadata (title, channel, duration, publish date)
- Generate high-quality transcripts using OpenAI Whisper
- Modern, responsive UI with dark mode support
- Download transcripts as text files
- Copy transcripts to clipboard
- 61-minute video duration limit to control costs

## Environment Variables

Set these in Railway → Settings → Variables:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Metadata**: ytdl-core
- **Transcription**: OpenAI Whisper API
- **Deployment**: Railway

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

This project is configured for zero-config deployment on Railway using Nixpacks.

1. Connect your GitHub repository to Railway
2. Set the `OPENAI_API_KEY` environment variable
3. Deploy automatically on push to main branch