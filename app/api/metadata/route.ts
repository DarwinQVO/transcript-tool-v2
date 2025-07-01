import { NextRequest, NextResponse } from 'next/server'
import { getVideoMetadata } from '@/lib/professional-extractor'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !isValidYouTubeURL(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    const metadata = await getVideoMetadata(url)
    return NextResponse.json(metadata)
    
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}

function isValidYouTubeURL(url: string): boolean {
  const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/
  return regex.test(url)
}