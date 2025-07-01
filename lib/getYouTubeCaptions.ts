// Helper para obtener captions de YouTube

export async function fetchCaptions(url: string): Promise<string | null> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    // Intentar obtener transcript en inglés
    const transcripts = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });
    
    if (transcripts && transcripts.length > 0) {
      const text = transcripts
        .map(item => item.text)
        .join(' ')
        .replace(/\[Music\]/gi, '')
        .replace(/\[Applause\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return text.length > 50 ? text : null;
    }
    
    return null;
  } catch (error) {
    console.log('No captions available:', error instanceof Error ? error.message : String(error));
    return null;
  }
}