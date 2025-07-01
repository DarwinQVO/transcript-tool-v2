import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { unlinkSync, existsSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { extractVideoInfo, downloadAudio } from '@/lib/professional-extractor'

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const { url } = await req.json()

    if (!url || !isValidYouTubeURL(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Extract video info using professional method
    console.log('Extracting video with professional method...')
    const videoInfo = await extractVideoInfo(url)
    
    // Support videos up to 4 hours (Railway compatible)
    if (videoInfo.duration > 14400) {
      return NextResponse.json(
        { error: 'Video too long (max 4 hours)' },
        { status: 400 }
      )
    }

    // Download audio
    console.log('Downloading audio...')
    const audioBuffer = await downloadAudio(videoInfo.audioUrl)

    tempFilePath = join(tmpdir(), `audio-${Date.now()}.webm`)
    require('fs').writeFileSync(tempFilePath, audioBuffer)

    // Check file size for Whisper API limit (25MB)
    const stats = statSync(tempFilePath)
    if (stats.size > 24 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large for processing. Try a shorter video.' },
        { status: 400 }
      )
    }

    const audioFile = new File([audioBuffer], 'audio.webm', {
      type: 'audio/webm'
    })

    const response = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      response_format: 'text',
    })

    return NextResponse.json({ transcript: response })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  } finally {
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }
  }
}

function isValidYouTubeURL(url: string): boolean {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/
  return regex.test(url)
}

export const maxDuration = 300 // 5 minutes Railway timeout