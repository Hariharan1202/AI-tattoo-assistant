'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { VoiceInput } from './VoiceInput'

interface AttachedImage {
  file: File
  previewUrl: string
}

interface ChatInputProps {
  onSend: (content: string, imageFiles?: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'Describe your tattoo idea...',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  useEffect(() => {
    return () => {
      attachedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'))
    const newImages = images.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setAttachedImages((prev) => [...prev, ...newImages])
  }

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed && attachedImages.length === 0) return
    if (disabled) return
    const files = attachedImages.length > 0 ? attachedImages.map((i) => i.file) : undefined
    onSend(trimmed || '📎 Uploaded image', files)
    setValue('')
    setAttachedImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function removeImage(index: number) {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function handleTranscription(text: string) {
    setValue(text)
    setIsRecording(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const canSend = (value.trim().length > 0 || attachedImages.length > 0) && !disabled

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col bg-[var(--surface-raised)] border rounded-2xl focus-within:border-[var(--accent)]/50 transition-all overflow-hidden ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
              : 'border-[var(--border)]'
          }`}
        >
          {isDragging && (
            <div className="flex items-center justify-center py-4 gap-2 text-[var(--accent)] text-sm font-medium pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Drop image to attach
            </div>
          )}

          {/* Image thumbnails */}
          {!isDragging && attachedImages.length > 0 && (
            <div className="flex gap-2 flex-wrap px-3 pt-3">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative group flex-shrink-0">
                  <img
                    src={img.previewUrl}
                    alt="attachment"
                    className="w-16 h-16 object-cover rounded-lg border border-[var(--border)]"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-2.5 h-2.5 text-[var(--foreground-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          {!isDragging && (
            <div className="flex items-end gap-2 px-3 py-2">
              {isRecording ? (
                <VoiceInput
                  onTranscription={handleTranscription}
                  onCancel={() => setIsRecording(false)}
                />
              ) : (
                <>
                  {/* Voice button */}
                  <button
                    type="button"
                    onClick={() => setIsRecording(true)}
                    disabled={disabled}
                    title="Record voice message"
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] disabled:opacity-35 disabled:cursor-not-allowed transition-all mb-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    disabled={disabled}
                    className="flex-1 resize-none bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] outline-none py-1.5 max-h-40 disabled:opacity-50"
                  />

                  {/* Image upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    title="Upload reference image"
                    className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all mb-0.5 ${
                      attachedImages.length > 0
                        ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
                        : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]'
                    } disabled:opacity-35 disabled:cursor-not-allowed`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Send */}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] disabled:opacity-35 disabled:cursor-not-allowed transition-all active:scale-95 mb-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {!isRecording && !isDragging && (
          <p className="text-center text-[10px] text-[var(--foreground-muted)] mt-2 select-none">
            <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] font-mono">Enter</kbd>
            {' '}to send ·{' '}
            <kbd className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] font-mono">Shift+Enter</kbd>
            {' '}for new line · drag & drop images to attach
          </p>
        )}
      </div>
    </div>
  )
}
