'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGalleryStore } from '@/store/galleryStore'
import { useAuthStore } from '@/store/authStore'
import { generateMockImageUrl, extractStyle } from '@/lib/mockGenerate'
import { isRealToken } from '@/lib/chatApi'

type GenState = 'idle' | 'generating' | 'done'

interface GenerateButtonProps {
  prompt: string
  conversationId?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function GenerateButton({ prompt, conversationId }: GenerateButtonProps) {
  const [state, setState] = useState<GenState>('idle')
  const addImage = useGalleryStore((s) => s.addImage)
  const token = useAuthStore((s) => s.token)
  const router = useRouter()

  async function handleGenerate() {
    if (state !== 'idle') return
    setState('generating')

    if (isRealToken(token)) {
      try {
        const res = await fetch(`${API_URL}/api/images/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prompt, conversation_id: conversationId ?? null }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        addImage({
          id: data.id,
          prompt: data.prompt,
          style: data.style ?? 'Custom',
          imageUrl: `${API_URL}${data.image_url}`,
          conversationId,
          createdAt: data.created_at,
        })
        setState('done')
        return
      } catch {
        // Fall through to mock on error
      }
    }

    // Mock path
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

  return (
    <button
      onClick={() => router.push('/gallery')}
      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--success)]/10 hover:bg-[var(--success)]/20 border border-[var(--success)]/25 text-[var(--success)] text-xs font-medium transition-colors"
    >
      <span className="text-sm leading-none">✓</span>
      Generated · View in Gallery →
    </button>
  )
}
