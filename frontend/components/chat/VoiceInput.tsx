'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { isRealToken } from '@/lib/chatApi'

interface VoiceInputProps {
  onTranscription: (text: string) => void
  onCancel: () => void
}

type RecordState = 'requesting' | 'recording' | 'processing' | 'error'

const MOCK_TRANSCRIPTIONS = [
  'I want a minimal dragon tattoo on my forearm, Japanese style',
  'Can you recommend some floral tattoo styles for a sleeve?',
  "I'm thinking of a geometric mandala for my back piece",
  'What about a watercolor phoenix rising, dark aesthetic',
  'Fine line botanical piece for my ribcage, wildflowers',
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function VoiceInput({ onTranscription, onCancel }: VoiceInputProps) {
  const [state, setState] = useState<RecordState>('requesting')
  const [seconds, setSeconds] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const token = useAuthStore((s) => s.token)

  const transcribeReal = useCallback(async (blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, 'recording.webm')
    const res = await fetch(`${API_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.text as string
  }, [token])

  const stopAndTranscribe = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setState('processing')

    const recorder = mediaRecorderRef.current
    if (!recorder) return

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

      if (isRealToken(token)) {
        try {
          const text = await transcribeReal(blob)
          onTranscription(text)
        } catch (err) {
          // Surface the real error — do NOT silently substitute a random mock phrase
          const msg = err instanceof Error ? err.message : 'Transcription failed'
          setErrorMsg(`Voice transcription failed: ${msg}. Please type your message instead.`)
          setState('error')
        }
      } else {
        // Demo mode — use mock transcription
        await new Promise((r) => setTimeout(r, 850))
        const text = MOCK_TRANSCRIPTIONS[Math.floor(Math.random() * MOCK_TRANSCRIPTIONS.length)]
        onTranscription(text)
      }
    }

    recorder.stop()
  }, [token, transcribeReal, onTranscription])

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        chunksRef.current = []
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        recorder.start()
        setState('recording')
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      } catch (err) {
        if (!cancelled) {
          const name = (err as { name?: string })?.name ?? ''
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setErrorMsg('Microphone access denied. Click the 🔒 icon in your browser address bar and allow microphone, then try again.')
          } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
            setErrorMsg('No microphone found. Please connect a microphone and try again.')
          } else {
            setErrorMsg(`Could not start recording: ${(err as Error).message ?? name}`)
          }
          setState('error')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (state === 'error') {
    return (
      <div className="flex items-center gap-3 py-1.5 flex-1">
        <span className="text-xs text-[var(--error)] flex-1">{errorMsg}</span>
        <button
          onClick={onCancel}
          className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline flex-shrink-0"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div className="flex items-center gap-2 py-1.5 flex-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        <span className="text-xs text-[var(--foreground-muted)]">Transcribing audio...</span>
      </div>
    )
  }

  if (state === 'requesting') {
    return (
      <div className="flex items-center gap-2 py-1.5 flex-1">
        <span className="text-xs text-[var(--foreground-muted)] animate-pulse">Requesting microphone access...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-1.5 flex-1">
      <div className="relative flex-shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-400 animate-ping opacity-75" />
      </div>
      <span className="text-xs font-mono text-[var(--foreground)] tabular-nums">{fmt(seconds)}</span>
      <span className="text-xs text-[var(--foreground-muted)]">Recording…</span>
      <div className="flex-1" />
      <button
        onClick={stopAndTranscribe}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/25 transition-colors flex-shrink-0"
      >
        <div className="w-2 h-2 rounded-sm bg-red-400 flex-shrink-0" />
        Stop
      </button>
      <button
        onClick={onCancel}
        title="Cancel"
        className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
