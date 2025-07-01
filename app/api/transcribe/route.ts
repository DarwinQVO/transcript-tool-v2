import { NextRequest, NextResponse } from 'next/server'
import { transcribeYouTubeVideo } from '@/lib/ultimate-solution'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !isValidYouTubeURL(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Use ultimate transcription solution
    console.log('Starting enterprise transcription...')
    const result = await transcribeYouTubeVideo(url)
    
    // Support videos up to 4 hours (Railway compatible)
    if (result.duration > 14400) {
      return NextResponse.json(
        { error: 'Video too long (max 4 hours)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ transcript: result.transcript })

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to transcribe video' },
      { status: 500 }
    )
  }
}

function isValidYouTubeURL(url: string): boolean {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/
  return regex.test(url)
}

export const maxDuration = 300 // 5 minutes Railway timeout