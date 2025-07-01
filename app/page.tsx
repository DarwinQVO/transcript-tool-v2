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
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<ProcessingState>({ step: 'idle', message: '' })
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [transcript, setTranscript] = useState('')

  const processVideo = async () => {
    if (!url.trim()) return

    try {
      setState({ step: 'metadata', message: 'Fetching video metadata...' })
      
      const metadataResponse = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!metadataResponse.ok) {
        throw new Error('Failed to fetch metadata')
      }

      const metadataData = await metadataResponse.json()
      setMetadata(metadataData)

      if (metadataData.duration > 14400) {
        throw new Error('Video too long (max 4 hours)')
      }

      setState({ step: 'transcribing', message: 'Transcribing audio...' })

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe video')
      }

      const transcribeData = await transcribeResponse.json()
      setTranscript(transcribeData.transcript)
      setState({ step: 'done', message: 'Processing complete!' })

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

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` 
                   : `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            YouTube Transcript Tool
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Extract metadata and generate transcripts from YouTube videos up to 4 hours
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 mb-8">
          <div className="space-y-6">
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

            {state.step !== 'idle' && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
                {state.step === 'metadata' || state.step === 'transcribing' ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : state.step === 'error' ? (
                  <div className="w-5 h-5 bg-red-500 rounded-full" />
                ) : (
                  <div className="w-5 h-5 bg-green-500 rounded-full" />
                )}
                <span className={`font-medium ${
                  state.step === 'error' ? 'text-red-600' : 
                  state.step === 'done' ? 'text-green-600' : 
                  'text-blue-600'
                }`}>
                  {state.message}
                </span>
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
                  onClick={copyTranscript}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
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
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {transcript}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}