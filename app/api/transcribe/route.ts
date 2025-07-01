import { NextRequest, NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'
import OpenAI from 'openai'
import { unlinkSync, existsSync, readFileSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

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

    // Use ytdl-core with Railway-compatible settings
    const audioStream = ytdl(url, {
      quality: 'lowestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    })

    const chunks: Buffer[] = []
    
    await new Promise<void>((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error('Download timeout'))
      }, 240000) // 4 min timeout
      
      audioStream.on('data', (chunk) => {
        chunks.push(chunk)
        clearTimeout(timeout)
        timeout = setTimeout(() => reject(new Error('Download timeout')), 240000)
      })
      
      audioStream.on('end', () => {
        clearTimeout(timeout)
        resolve()
      })
      
      audioStream.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })

    const audioBuffer = Buffer.concat(chunks)
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