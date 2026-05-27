'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { GeneratedImage } from '@/store/galleryStore'

interface TattooLightboxProps {
  image: GeneratedImage
  onClose: () => void
}

export function TattooLightbox({ image, onClose }: TattooLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = image.imageUrl
    a.download = `ink-ai-${image.id}.png`
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>

        {/* Image */}
        <div className="relative aspect-square w-full">
          <Image
            src={image.imageUrl}
            alt={image.prompt}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/25 text-[var(--accent)] text-xs font-medium">
              {image.style}
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {new Date(image.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">{image.prompt}</p>
          <button
            onClick={handleDownload}
            className="w-full py-2.5 rounded-xl bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 border border-[var(--accent)]/30 text-[var(--accent)] text-sm font-medium transition-colors"
          >
            Download Concept
          </button>
        </div>
      </div>
    </div>
  )
}
