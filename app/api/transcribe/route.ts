import { NextRequest, NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'
import OpenAI from 'openai'
import { unlinkSync, existsSync, readFileSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { extractYouTubeAudio } from '@/lib/youtube-extractor'
import { simpleExtractAudio } from '@/lib/simple-extractor'

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const { url } = await req.json()

    if (!url || !ytdl.validateURL(url)) {
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

    // Get video info first
    const info = await ytdl.getInfo(url)
    const duration = parseInt(info.videoDetails.lengthSeconds)
    
    // Support videos up to 4 hours (Railway compatible)
    if (duration > 14400) {
      return NextResponse.json(
        { error: 'Video too long (max 4 hours)' },
        { status: 400 }
      )
    }

    tempFilePath = join(tmpdir(), `audio-${Date.now()}.webm`)

    // Try multiple extraction methods
    let audioBuffer: Buffer
    
    try {
      // Method 1: Enhanced simple extractor with retry logic
      console.log('Trying enhanced simple extractor...')
      audioBuffer = await simpleExtractAudio(url)
      
    } catch (simpleError) {
      console.log('Simple extractor failed, trying enterprise extractor...')
      
      try {
        // Method 2: Enterprise browser-based extractor (Railway)
        if (process.env.NODE_ENV === 'production') {
          const videoData = await extractYouTubeAudio(url)
          
          const audioResponse = await fetch(videoData.audioUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Referer': 'https://www.youtube.com/',
            }
          })

          if (!audioResponse.ok) {
            throw new Error('Failed to download audio via enterprise method')
          }

          audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
        } else {
          throw new Error('Enterprise extractor only available in production')
        }
        
      } catch (enterpriseError) {
        console.log('All extraction methods failed')
        throw new Error('Unable to extract audio from this video. Please try a different video or try again later.')
      }
    }

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

export const maxDuration = 300 // 5 minutes Railway timeout