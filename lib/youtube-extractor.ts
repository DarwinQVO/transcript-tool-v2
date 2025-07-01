import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

export interface VideoData {
  audioUrl: string
  title: string
  duration: number
}

export async function extractYouTubeAudio(url: string): Promise<VideoData> {
  let browser
  
  try {
    // Railway-compatible browser setup
    const isDev = process.env.NODE_ENV === 'development'
    
    browser = await puppeteer.launch({
      args: isDev ? [] : [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: isDev 
        ? undefined // Use system Chromium
        : await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()

    // Set realistic headers to bypass detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    })

    // Navigate to video
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })

    // Extract video data using YouTube's internal API
    const videoData = await page.evaluate(() => {
      // Access YouTube's internal player data
      const player = (window as any).ytInitialPlayerResponse
      
      if (!player || !player.streamingData) {
        throw new Error('Could not access video streaming data')
      }

      const audioFormats = player.streamingData.adaptiveFormats
        ?.filter((format: any) => format.mimeType?.includes('audio'))
        ?.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))

      if (!audioFormats || audioFormats.length === 0) {
        throw new Error('No audio streams found')
      }

      const bestAudio = audioFormats[0]
      
      return {
        audioUrl: bestAudio.url,
        title: player.videoDetails?.title || 'Unknown',
        duration: parseInt(player.videoDetails?.lengthSeconds || '0')
      }
    })

    return videoData

  } catch (error) {
    console.error('YouTube extraction error:', error)
    throw new Error('Failed to extract YouTube audio stream')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}