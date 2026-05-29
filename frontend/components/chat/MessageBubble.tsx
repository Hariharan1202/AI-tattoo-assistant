'use client'

import Image from 'next/image'
import { Message } from '@/store/chatStore'
import { GenerateButton } from './GenerateButton'

// Marker the AI embeds when it wants to offer image generation.
// Format: [GENERATE: <detailed prompt>]
const GENERATE_MARKER_RE = /\[GENERATE:\s*([^\]]+)\]/i

/**
 * Split an assistant message into the display text and an optional
 * generation prompt extracted from the [GENERATE: ...] marker.
 * The marker is stripped from the visible text.
 */
function parseAssistantContent(content: string): {
  displayText: string
  generatePrompt: string | null
} {
  const match = content.match(GENERATE_MARKER_RE)
  if (!match) return { displayText: content, generatePrompt: null }
  return {
    displayText: content.replace(GENERATE_MARKER_RE, '').trimEnd(),
    generatePrompt: match[1].trim(),
  }
}

function renderText(text: string) {
  return text.split('\n').map((line, lineIdx, lines) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <span key={lineIdx}>
        {parts.map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i} className="font-semibold text-[var(--foreground)]">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          )
        )}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    )
  })
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  conversationId?: string
}

export function MessageBubble({ message, isStreaming, conversationId }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] flex flex-col gap-2 items-end">
          {/* Attached images */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end">
              {message.imageUrls.map((url, i) => (
                <div key={i} className="relative w-40 h-40 rounded-xl overflow-hidden border border-[var(--accent)]/20">
                  <Image
                    src={url}
                    alt={`Reference ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
          {/* Text bubble */}
          {message.content && (
            <div className="rounded-2xl rounded-tr-sm px-4 py-3 bg-[var(--accent)]/15 border border-[var(--accent)]/25">
              <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Parse [GENERATE: ...] marker from the assistant message.
  // While streaming the marker may be partially written — only parse when done.
  const { displayText, generatePrompt } = isStreaming
    ? { displayText: message.content, generatePrompt: null }
    : parseAssistantContent(message.content ?? '')

  const hasImages = (message.imageUrls?.length ?? 0) > 0

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[var(--accent)] text-xs leading-none">✦</span>
      </div>
      <div className="flex-1 min-w-0">
        {/* Text bubble — skip entirely if this is an image-only message */}
        {message.content ? (
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[var(--surface-raised)] border border-[var(--border)]">
            <p className="text-sm text-[var(--foreground)] leading-relaxed">
              {renderText(displayText ?? '')}
              {isStreaming && (
                <span className="inline-block w-0.5 h-3.5 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
              )}
            </p>
            {/* Show generate button only when: streaming is done AND the AI embedded a [GENERATE: ...] marker */}
            {!isStreaming && generatePrompt && (
              <GenerateButton prompt={generatePrompt} conversationId={conversationId} />
            )}
          </div>
        ) : !hasImages ? (
          /* Loading dots — only when there's no content AND no images yet */
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[var(--surface-raised)] border border-[var(--border)]">
            <div className="flex gap-1 items-center h-5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}

        {/* Generated images — shown below text (or standalone for image-only messages) */}
        {!isStreaming && hasImages && (
          <div className={`flex flex-col gap-2 ${message.content ? 'mt-2' : ''}`}>
            {message.imageUrls!.map((url, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden border border-[var(--accent)]/20 max-w-sm bg-[var(--surface-raised)]"
              >
                <Image
                  src={url}
                  alt="Generated tattoo concept"
                  width={512}
                  height={512}
                  className="w-full object-contain"
                  unoptimized
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[10px] text-white/70 font-medium">
                  AI Concept
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
