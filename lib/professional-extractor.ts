interface VideoInfo {
  title: string
  duration: number
  audioUrl: string
}

export async function extractVideoInfo(url: string): Promise<VideoInfo> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    // Method 1: Try YouTube oEmbed API for metadata
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const oembedResponse = await fetch(oembedUrl)
    
    if (!oembedResponse.ok) {
      throw new Error('Video not found or private')
    }
    
    const oembedData = await oembedResponse.json()
    
    // Method 2: Get video page to extract audio streams
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!pageResponse.ok) {
      throw new Error('Failed to fetch video page')
    }

    const pageText = await pageResponse.text()
    
    // Extract player response from page
    const playerResponseMatch = pageText.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
    if (!playerResponseMatch) {
      throw new Error('Could not find player response')
    }

    const playerResponse = JSON.parse(playerResponseMatch[1])
    
    if (!playerResponse.streamingData?.adaptiveFormats) {
      throw new Error('No streaming data found')
    }

    // Find best audio stream
    const audioFormats = playerResponse.streamingData.adaptiveFormats
      .filter((format: any) => format.mimeType?.includes('audio'))
      .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))

    if (audioFormats.length === 0) {
      throw new Error('No audio streams found')
    }

    const bestAudio = audioFormats[0]
    const duration = parseInt(playerResponse.videoDetails?.lengthSeconds || '0')

    return {
      title: oembedData.title || playerResponse.videoDetails?.title || 'Unknown Title',
      duration: duration,
      audioUrl: bestAudio.url
    }

  } catch (error) {
    console.error('Professional extraction error:', error)
    throw new Error('Failed to extract video information')
  }
}

export async function downloadAudio(audioUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)

  } catch (error) {
    console.error('Audio download error:', error)
    throw new Error('Failed to download audio')
  }
}

// Simple metadata-only function for Railway deployment
export async function getVideoMetadata(url: string) {
  try {
    const videoId = extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    // Use YouTube oEmbed API for basic metadata
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const response = await fetch(oembedUrl)
    
    if (!response.ok) {
      throw new Error('Video not found or private')
    }
    
    const data = await response.json()
    
    return {
      title: data.title,
      channel: data.author_name,
      publishDate: 'Unknown', // oEmbed doesn't provide publish date
      duration: 0 // Will be estimated during transcription
    }
  } catch (error) {
    console.error('Metadata extraction error:', error)
    throw new Error('Failed to get video metadata')
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}