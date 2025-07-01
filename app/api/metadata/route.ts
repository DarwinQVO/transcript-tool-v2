import { NextRequest, NextResponse } from 'next/server'
import ytdl from 'ytdl-core'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    const info = await ytdl.getInfo(url)
    const { title, author, lengthSeconds, uploadDate } = info.videoDetails

    const metadata = {
      title: title || 'Unknown Title',
      channel: author?.name || 'Unknown Channel',
      publishDate: uploadDate || 'Unknown Date',
      duration: parseInt(lengthSeconds) || 0,
    }

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Metadata extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    )
  }
}