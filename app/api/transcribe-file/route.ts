import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Verificar tipo de archivo
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'video/mp4']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|mp4)$/i)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please use MP3, WAV, M4A, or MP4' },
        { status: 400 }
      )
    }

    console.log('Transcribing uploaded file:', file.name, file.size, 'bytes')
    
    // Check file size limit (25MB for Whisper)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 413 }
      )
    }
    
    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: file,
      response_format: 'text'
    })
    
    return NextResponse.json({ transcript })

  } catch (error) {
    console.error('File transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe file' },
      { status: 500 }
    )
  }
}

export const maxDuration = 300