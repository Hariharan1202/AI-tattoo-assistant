'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useGalleryStore, GeneratedImage } from '@/store/galleryStore'
import { useAuthStore } from '@/store/authStore'
import { isRealToken } from '@/lib/chatApi'
import { TattooCard } from '@/components/gallery/TattooCard'
import { TattooLightbox } from '@/components/gallery/TattooLightbox'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function GalleryPage() {
  const localImages = useGalleryStore((s) => s.images)
  const token = useAuthStore((s) => s.token)
  const [apiImages, setApiImages] = useState<GeneratedImage[]>([])
  const [selected, setSelected] = useState<GeneratedImage | null>(null)

  useEffect(() => {
    if (!isRealToken(token)) return
    fetch(`${API_URL}/api/images/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: Array<{ id: string; prompt: string; style: string | null; image_url: string; created_at: string }>) => {
        setApiImages(
          data.map((d) => ({
            id: d.id,
            prompt: d.prompt,
            style: d.style ?? 'Custom',
            imageUrl: d.image_url.startsWith('http') ? d.image_url : `${API_URL}${d.image_url}`,
            createdAt: d.created_at,
          }))
        )
      })
      .catch(() => {})
  }, [token])

  // Merge: API images first (authoritative), then local-only ones not already in API set
  const apiIds = new Set(apiImages.map((i) => i.id))
  const merged = [...apiImages, ...localImages.filter((i) => !apiIds.has(i.id))]

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Gallery</h1>
            <p className="text-[var(--foreground-muted)] text-sm mt-1">
              AI-generated tattoo concepts from your conversations
            </p>
          </div>
          {merged.length > 0 && (
            <span className="text-xs text-[var(--foreground-muted)] bg-[var(--surface-raised)] border border-[var(--border)] px-3 py-1.5 rounded-full">
              {merged.length} concept{merged.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {merged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center mb-5">
              <span className="text-2xl text-[var(--accent)] opacity-60">✦</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">No concepts yet</h2>
            <p className="text-sm text-[var(--foreground-muted)] max-w-xs leading-relaxed mb-6">
              Start a chat, describe your tattoo idea, and click &ldquo;Generate Concept&rdquo; when the AI suggests one.
            </p>
            <Link
              href="/chat"
              className="px-4 py-2 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-medium transition-colors"
            >
              Start a conversation →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {merged.map((img) => (
              <TattooCard key={img.id} image={img} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <TattooLightbox image={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
