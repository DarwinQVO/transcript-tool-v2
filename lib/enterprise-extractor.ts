import youtubedl from 'youtube-dl-exec'
import { readFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface VideoInfo {
  title: string
  duration: number
  audioBuffer: Buffer
}

export async function extractVideo(url: string): Promise<VideoInfo> {
  const tempAudioPath = join(tmpdir(), `audio-${Date.now()}.%(ext)s`)
  const finalPath = tempAudioPath.replace('.%(ext)s', '.m4a')
  
  try {
    // Use youtube-dl-exec with enterprise settings
    const info = await youtubedl(url, {
      extractAudio: true,
      audioFormat: 'm4a',
      audioQuality: '128K',
      output: tempAudioPath,
      verbose: false,
      format: 'worstaudio[ext=m4a]/worst[ext=m4a]/worstaudio/worst',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referer: 'https://www.youtube.com/',
      addHeader: [
        'Accept-Language:en-US,en;q=0.9',
        'Accept-Encoding:gzip, deflate, br'
      ],
      noCheckCertificates: true,
      preferFreeFormats: true,
      extractor: 'youtube',
      noWarnings: true,
      noCallHome: true,
      dumpJson: true,
      noDownload: false
    } as any)

    // Wait for file to be created
    let attempts = 0
    while (!existsSync(finalPath) && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }

    if (!existsSync(finalPath)) {
      throw new Error('Audio file was not created')
    }

    const audioBuffer = readFileSync(finalPath)
    
    // Clean up
    try {
      unlinkSync(finalPath)
    } catch (e) {
      console.warn('Failed to cleanup temp file:', e)
    }

    return {
      title: (info as any)?.title || 'Unknown Title',
      duration: (info as any)?.duration || 0,
      audioBuffer
    }

  } catch (error) {
    // Cleanup on error
    try {
      if (existsSync(finalPath)) {
        unlinkSync(finalPath)
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    console.error('Enterprise extraction error:', error)
    throw new Error('Failed to extract video')
  }
}

// Fallback method using direct API approach
export async function getVideoMetadata(url: string) {
  try {
    const videoId = extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    // Use YouTube oEmbed API for metadata (always works)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      throw new Error('Failed to get video metadata')
    }
    
    const data = await response.json()
    
    return {
      title: data.title,
      channel: data.author_name,
      publishDate: 'Unknown', // oEmbed doesn't provide this
      duration: 0 // Will need to estimate or use another method
    }
  } catch (error) {
    console.error('Metadata extraction error:', error)
    throw new Error('Failed to get video metadata')
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}