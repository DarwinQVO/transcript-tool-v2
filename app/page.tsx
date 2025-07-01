'use client'

import { useState } from 'react'

interface VideoMetadata {
  title: string
  channel: string
  publishDate: string
  duration: number
}

interface ProcessingState {
  step: 'idle' | 'metadata' | 'transcribing' | 'done' | 'error'
  message: string
  progress?: number
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<ProcessingState>({ step: 'idle', message: '' })
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [transcript, setTranscript] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [enableSpeakerIdentification, setEnableSpeakerIdentification] = useState(false)

  const processVideo = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setState({ 
        step: 'error', 
        message: 'Please provide a YouTube URL' 
      });
      return;
    }

    try {
      setState({ step: 'metadata', message: 'Analyzing video...', progress: 10 })
      
      const metadataResponse = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl })
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || 'Failed to fetch metadata')
      }

      const metadataData = await metadataResponse.json()
      setMetadata(metadataData)

      if (metadataData.duration > 14400) {
        throw new Error('Video too long (max 4 hours). Please use the file upload method instead.')
      }

      const transcribingMessage = enableSpeakerIdentification ? 
        'Processing transcript with speaker identification... This may take longer.' :
        'Processing transcript... This may take a few minutes.';
      setState({ step: 'transcribing', message: transcribingMessage, progress: 30 })

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: trimmedUrl,
          enableSpeakerIdentification 
        })
      })

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json()
        throw new Error(errorData.error || 'Failed to transcribe video')
      }

      const transcribeData = await transcribeResponse.json()
      
      if (transcribeData.error) {
        throw new Error(transcribeData.error)
      }
      
      setTranscript(transcribeData.transcript)
      
      // Mostrar fuente en el mensaje
      const sourceMsg = transcribeData.cached ? 'Retrieved from cache!' : 
                       transcribeData.source === 'youtube' ? 'Extracted from YouTube captions!' : 
                       transcribeData.source === 'whisper' ? 'Transcribed with AI!' :
                       transcribeData.source === 'whisper-sliced' ? 
                         `Transcribed with AI (${transcribeData.chunks} chunks, ${transcribeData.duration?.toFixed(1)} min)!` :
                       transcribeData.source === 'whisper-sliced-with-speakers' ?
                         `Transcribed with AI + Speaker ID (${transcribeData.chunks} chunks, ${transcribeData.speakerSegments} speakers, ${transcribeData.duration?.toFixed(1)} min)!` :
                       'Transcript generated successfully!'
      
      setState({ step: 'done', message: sourceMsg, progress: 100 })

    } catch (error) {
      console.error('Processing error:', error)
      setState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.' 
      })
    }
  }

  const processFile = async () => {
    if (!selectedFile) return

    try {
      setState({ step: 'transcribing', message: 'Transcribing uploaded file...' })
      
      const formData = new FormData()
      formData.append('audio', selectedFile)

      const response = await fetch('/api/transcribe-file', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to transcribe file')
      }

      const data = await response.json()
      setTranscript(data.transcript)
      setMetadata({
        title: selectedFile.name,
        channel: 'Uploaded File',
        publishDate: new Date().toLocaleDateString(),
        duration: 0
      })
      setState({ step: 'done', message: 'File transcription complete!' })

    } catch (error) {
      setState({ 
        step: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      })
    }
  }

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript)
  }

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${metadata?.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetAll = () => {
    setUrl('')
    setSelectedFile(null)
    setTranscript('')
    setMetadata(null)
    setState({ step: 'idle', message: '' })
    setEnableSpeakerIdentification(false)
  }

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` 
                   : `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const convertMarkdownToHtml = (markdown: string) => {
    return markdown
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-slate-900 dark:text-slate-100">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3 text-slate-900 dark:text-slate-100">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-sm font-mono">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto mt-2 mb-4"><code>$1</code></pre>')
      .replace(/^- (.+)$/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\n/g, '<br>')
      .replace(/---/g, '<hr class="my-6 border-slate-300 dark:border-slate-600">')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            YouTube Transcript Tool
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Enterprise-grade transcript extraction supporting videos up to 3 hours
          </p>
          <div className="flex justify-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              YouTube Captions
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              AI Chunking
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              Up to 3 Hours
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Smart Caching
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 mb-8">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  YouTube URL
                </label>
                <div className="flex gap-3">
                  <input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    disabled={state.step !== 'idle'}
                  />
                  <button
                    onClick={processVideo}
                    disabled={!url.trim() || state.step === 'metadata' || state.step === 'transcribing'}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {state.step === 'metadata' || state.step === 'transcribing' ? 'Processing...' : 'Process'}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Or Upload Audio File
                </label>
                <div className="flex gap-3">
                  <input
                    id="file"
                    type="file"
                    accept=".mp3,.wav,.m4a,.mp4,audio/*,video/mp4"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    disabled={state.step !== 'idle'}
                  />
                  <button
                    onClick={processFile}
                    disabled={!selectedFile || state.step === 'transcribing'}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {state.step === 'transcribing' ? 'Processing...' : 'Transcribe'}
                  </button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <input
                id="speakerIdentification"
                type="checkbox"
                checked={enableSpeakerIdentification}
                onChange={(e) => setEnableSpeakerIdentification(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-600 dark:border-slate-500"
                disabled={state.step !== 'idle'}
              />
              <label htmlFor="speakerIdentification" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                🎭 Enable Speaker Identification (Beta)
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Identifies different speakers in conversations
              </span>
            </div>

            {state.step !== 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
                  {state.step === 'metadata' || state.step === 'transcribing' ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : state.step === 'error' ? (
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                  <span className={`font-medium flex-1 ${
                    state.step === 'error' ? 'text-red-600' : 
                    state.step === 'done' ? 'text-green-600' : 
                    'text-blue-600'
                  }`}>
                    {state.message}
                  </span>
                  {typeof state.progress === 'number' && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {state.progress}%
                    </span>
                  )}
                </div>
                
                {typeof state.progress === 'number' && state.step !== 'error' && state.step !== 'done' && (
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {metadata && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Video Metadata</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">Title</h3>
                <p className="text-slate-900 dark:text-slate-100">{metadata.title}</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">Channel</h3>
                <p className="text-slate-900 dark:text-slate-100">{metadata.channel}</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">Duration</h3>
                <p className="text-slate-900 dark:text-slate-100">{formatDuration(metadata.duration)}</p>
              </div>
              <div>
                <h3 className="font-medium text-slate-700 dark:text-slate-300">Published</h3>
                <p className="text-slate-900 dark:text-slate-100">{metadata.publishDate}</p>
              </div>
            </div>
          </div>
        )}

        {transcript && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transcript</h2>
              <div className="flex gap-2">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  New
                </button>
                <button
                  onClick={copyTranscript}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Copy
                </button>
                <button
                  onClick={downloadTranscript}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 max-h-[600px] overflow-y-auto">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {transcript.includes('# ') ? (
                  <div dangerouslySetInnerHTML={{ 
                    __html: convertMarkdownToHtml(transcript) 
                  }} />
                ) : (
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {transcript}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}