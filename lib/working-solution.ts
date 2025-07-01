// SOLUCIÓN SIMPLIFICADA - Solo lo que funciona

interface TranscriptionResult {
  title: string
  duration: number
  transcript: string
}

export async function transcribeFromFile(audioFile: File): Promise<TranscriptionResult> {
  try {
    console.log('Transcribing uploaded file with Whisper...')
    
    // Verificar tamaño (límite Whisper 25MB)
    if (audioFile.size > 24 * 1024 * 1024) {
      throw new Error('File too large (max 25MB)')
    }

    // Transcribir con OpenAI Whisper
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      response_format: 'text',
    })

    return {
      title: audioFile.name,
      duration: 0,
      transcript: transcription
    }

  } catch (error) {
    console.error('File transcription error:', error)
    throw new Error('Failed to transcribe file')
  }
}