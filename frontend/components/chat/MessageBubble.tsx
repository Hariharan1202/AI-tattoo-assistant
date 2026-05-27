'use client'

import Image from 'next/image'
import { Message } from '@/store/chatStore'
import { GenerateButton } from './GenerateButton'

const GENERATE_KEYWORDS = ['generate', 'concept image', 'shall i generate', 'want me to generate']

function shouldShowGenerate(content: string): boolean {
  const lower = content.toLowerCase()
  return GENERATE_KEYWORDS.some((k) => lower.includes(k))
}

function parseContent(text: string) {
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
  userPrompt?: string
  conversationId?: string
}

export function MessageBubble({ message, isStreaming, userPrompt, conversationId }: MessageBubbleProps) {
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

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[var(--accent)] text-xs leading-none">✦</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-[var(--surface-raised)] border border-[var(--border)]">
          {message.content ? (
            <>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">
                {parseContent(message.content)}
                {isStreaming && (
                  <span className="inline-block w-0.5 h-3.5 bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
                )}
              </p>
              {!isStreaming && shouldShowGenerate(message.content) && userPrompt && (
                <GenerateButton prompt={userPrompt} conversationId={conversationId} />
              )}
            </>
          ) : (
            <div className="flex gap-1 items-center h-5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-muted)] animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
