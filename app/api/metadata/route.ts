import { NextRequest, NextResponse } from 'next/server'
import { sanitizeYouTube } from '@/utils/sanitizeYouTube'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    
    const cleanUrl = sanitizeYouTube(url)
    if (!cleanUrl || !isValidYouTubeURL(cleanUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      )
    }

    // Usar oEmbed directo (siempre funciona)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      throw new Error('Video not found')
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      title: data.title,
      channel: data.author_name,
      publishDate: new Date().toLocaleDateString(),
      duration: 0
    })
    
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