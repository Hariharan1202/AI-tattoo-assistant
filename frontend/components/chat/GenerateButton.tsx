'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGalleryStore } from '@/store/galleryStore'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { generateMockImageUrl, extractStyle } from '@/lib/mockGenerate'
import { isRealToken } from '@/lib/chatApi'

type GenState = 'idle' | 'generating' | 'done' | 'error'

interface GenerateButtonProps {
  prompt: string
  conversationId?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function GenerateButton({ prompt, conversationId }: GenerateButtonProps) {
  const [state, setState] = useState<GenState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const addImage = useGalleryStore((s) => s.addImage)
  const addMessage = useChatStore((s) => s.addMessage)
  const token = useAuthStore((s) => s.token)
  const router = useRouter()

  async function handleGenerate() {
    if (state !== 'idle') return
    setState('generating')

    if (isRealToken(token)) {
      // Real API path — never fall back silently to mock
      try {
        const res = await fetch(`${API_URL}/api/images/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prompt, conversation_id: conversationId ?? null }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail ?? `HTTP ${res.status}`)
        }
        const data = await res.json()
        const imageUrl = `${API_URL}${data.image_url}`

        // Add to gallery
        addImage({
          id: data.id,
          prompt: data.prompt,
          style: data.style ?? 'Custom',
          imageUrl,
          conversationId,
          createdAt: data.created_at,
        })

        // Show generated image inside the chat conversation
        if (conversationId) {
          addMessage(conversationId, {
            id: `gen-img-${data.id}`,
            role: 'assistant',
            content: '',
            imageUrls: [imageUrl],
            createdAt: data.created_at ?? new Date().toISOString(),
          })
        }

        setState('done')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Image generation failed'
        setErrorMsg(msg)
        setState('error')
      }
      return
    }

    // Demo mode (no real token) — use mock SVG placeholder
    await new Promise((r) => setTimeout(r, 1800))
    const style = extractStyle(prompt)
    const imageUrl = generateMockImageUrl(prompt)
    addImage({
      id: `gen-${Date.now()}`,
      prompt,
      style: style.name,
      imageUrl,
      conversationId,
      createdAt: new Date().toISOString(),
    })

    // Show mock image in chat too
    if (conversationId) {
      addMessage(conversationId, {
        id: `gen-img-${Date.now()}`,
        role: 'assistant',
        content: '✦ Concept preview (demo mode)',
        imageUrls: [imageUrl],
        createdAt: new Date().toISOString(),
      })
    }

    setState('done')
  }

  if (state === 'idle') {
    return (
      <button
        onClick={handleGenerate}
        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 border border-[var(--accent)]/25 text-[var(--accent)] text-xs font-medium transition-colors"
      >
        <span className="text-sm leading-none">✦</span>
        Generate Concept
      </button>
    )
  }

  if (state === 'generating') {
    return (
      <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs w-fit">
        <span className="w-3 h-3 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        Generating concept...
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
          <span className="flex-shrink-0 mt-px">⚠</span>
          <span>{errorMsg}</span>
        </div>
        <button
          onClick={() => setState('idle')}
          className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] underline text-left transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // state === 'done'
  return (
    <button
      onClick={() => router.push('/gallery')}
      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 hover:bg-[var(--success)]/20 border border-[var(--success)]/25 text-[var(--success)] text-xs font-medium transition-colors"
    >
      <span className="text-sm leading-none">✓</span>
      View in Gallery →
    </button>
  )
}
