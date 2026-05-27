'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GeneratedImage {
  id: string
  prompt: string
  style: string
  imageUrl: string
  conversationId?: string
  createdAt: string
}

interface GalleryState {
  images: GeneratedImage[]
  addImage: (image: GeneratedImage) => void
  removeImage: (id: string) => void
}

export const useGalleryStore = create<GalleryState>()(
  persist(
    (set) => ({
      images: [],
      addImage: (image) =>
        set((state) => ({ images: [image, ...state.images] })),
      removeImage: (id) =>
        set((state) => ({ images: state.images.filter((img) => img.id !== id) })),
    }),
    { name: 'gallery-store' }
  )
)
