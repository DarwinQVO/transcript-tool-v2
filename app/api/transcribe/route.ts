import { NextRequest, NextResponse } from 'next/server'
import ytdl from 'ytdl-core'
import OpenAI from 'openai'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    const info = await ytdl.getInfo(url)
    const duration = parseInt(info.videoDetails.lengthSeconds)
    
    if (duration > 3660) {
      return NextResponse.json(
        { error: 'Video too long (max 61 minutes)' },
        { status: 400 }
      )
    }

    tempFilePath = join(tmpdir(), `audio-${Date.now()}.webm`)

    const audioStream = ytdl(url, {
      quality: 'lowestaudio',
      filter: 'audioonly',
    })

    const chunks: Buffer[] = []
    
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk) => chunks.push(chunk))
      audioStream.on('end', () => resolve())
      audioStream.on('error', reject)
    })

    const audioBuffer = Buffer.concat(chunks)
    writeFileSync(tempFilePath, audioBuffer)

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
    if (tempFilePath) {
      try {
        unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }
  }
}

export const maxDuration = 300