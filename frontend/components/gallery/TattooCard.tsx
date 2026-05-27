'use client'

import Image from 'next/image'
import { GeneratedImage } from '@/store/galleryStore'
import { useGalleryStore } from '@/store/galleryStore'

interface TattooCardProps {
  image: GeneratedImage
  onClick: (image: GeneratedImage) => void
}

export function TattooCard({ image, onClick }: TattooCardProps) {
  const removeImage = useGalleryStore((s) => s.removeImage)

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = image.imageUrl
    a.download = `ink-ai-${image.id}.png`
    a.click()
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    removeImage(image.id)
  }

  return (
    <div
      className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] cursor-pointer group"
      onClick={() => onClick(image)}
    >
      <Image
        src={image.imageUrl}
        alt={image.prompt}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        unoptimized
      />

      {/* Style badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-[var(--border)] text-[10px] text-[var(--accent)] font-medium tracking-wide">
        {image.style}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 gap-2">
        <p className="text-xs text-white leading-snug line-clamp-3">{image.prompt}</p>
        <div className="flex gap-1.5">
          <button
            onClick={handleDownload}
            className="flex-1 py-1.5 rounded-lg bg-[var(--accent)]/20 hover:bg-[var(--accent)]/40 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-medium transition-colors"
          >
            Download
          </button>
          <button
            onClick={handleDelete}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
