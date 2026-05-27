'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/store/chatStore'
import { MessageBubble } from './MessageBubble'

interface ChatWindowProps {
  messages: Message[]
  isStreaming: boolean
  conversationId?: string
}

export function ChatWindow({ messages, isStreaming, conversationId }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        {messages.map((msg, i) => {
          const precedingUser = msg.role === 'assistant'
            ? messages.slice(0, i).findLast((m) => m.role === 'user')
            : undefined
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              userPrompt={precedingUser?.content}
              conversationId={conversationId}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
