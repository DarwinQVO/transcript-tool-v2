import ytdl from '@distube/ytdl-core'

export async function simpleExtractAudio(url: string): Promise<Buffer> {
  // Enhanced ytdl-core with multiple user agents and retry logic
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]

  for (let attempt = 0; attempt < userAgents.length; attempt++) {
    try {
      const audioStream = ytdl(url, {
        quality: 'lowestaudio',
        filter: 'audioonly',
        requestOptions: {
          headers: {
            'User-Agent': userAgents[attempt],
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Referer': 'https://www.youtube.com/',
            'Origin': 'https://www.youtube.com'
          }
        },
        range: { start: 0, end: 1024 * 1024 * 50 } // Limit to 50MB chunks
      })

      const chunks: Buffer[] = []
      
      await new Promise<void>((resolve, reject) => {
        let timeout = setTimeout(() => {
          reject(new Error('Download timeout'))
        }, 180000) // 3 min timeout per attempt
        
        audioStream.on('data', (chunk) => {
          chunks.push(chunk)
          clearTimeout(timeout)
          timeout = setTimeout(() => reject(new Error('Download timeout')), 180000)
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

      return Buffer.concat(chunks)

    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error)
      if (attempt === userAgents.length - 1) {
        throw error
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  throw new Error('All extraction attempts failed')
}