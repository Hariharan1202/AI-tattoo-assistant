'use client'

import { useParams } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ChatInput } from '@/components/chat/ChatInput'
import { mockStream, getMockResponse, IMAGE_ANALYSIS_RESPONSE } from '@/lib/streaming'
import { sendMessageSSE, isRealToken, uploadImage } from '@/lib/chatApi'

export default function ConversationPage() {
  const params = useParams()
  const id = params.id as string
  const hasTriggered = useRef(false)

  const setActiveConversation = useChatStore((s) => s.setActiveConversation)
  const addMessage = useChatStore((s) => s.addMessage)
  const appendToLastMessage = useChatStore((s) => s.appendToLastMessage)
  const setStreaming = useChatStore((s) => s.setStreaming)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const messages = useChatStore((s) => s.messagesByConversation[id] ?? [])
  const token = useAuthStore((s) => s.token)

  const addEmptyAssistantMessage = useCallback(() => {
    addMessage(id, {
      id: `msg-${Date.now()}-a`,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    })
  }, [id, addMessage])

  const triggerMockResponse = useCallback(
    async (userContent: string, hasImages = false) => {
      addEmptyAssistantMessage()
      setStreaming(true)
      const responseText = hasImages ? IMAGE_ANALYSIS_RESPONSE : getMockResponse(userContent)
      await mockStream(
        responseText,
        (chunk) => appendToLastMessage(id, chunk),
        () => setStreaming(false),
      )
    },
    [id, addEmptyAssistantMessage, appendToLastMessage, setStreaming],
  )

  const triggerRealResponse = useCallback(
    (userContent: string, imageUrl?: string) => {
      addEmptyAssistantMessage()
      setStreaming(true)
      sendMessageSSE({
        conversationId: id,
        content: userContent,
        imageUrl,
        token,
        onChunk: (chunk) => appendToLastMessage(id, chunk),
        onDone: () => setStreaming(false),
        onError: () => {
          // Fall back to mock on API error (e.g. no DB yet)
          appendToLastMessage(id, getMockResponse(userContent))
          setStreaming(false)
        },
      })
    },
    [id, token, addEmptyAssistantMessage, appendToLastMessage, setStreaming],
  )

  useEffect(() => {
    setActiveConversation(id)
    hasTriggered.current = false
  }, [id, setActiveConversation])

  useEffect(() => {
    if (hasTriggered.current) return
    const msgs = useChatStore.getState().messagesByConversation[id] ?? []
    const last = msgs[msgs.length - 1]
    if (last?.role === 'user') {
      hasTriggered.current = true
      if (isRealToken(token)) {
        triggerRealResponse(last.content, last.imageUrls?.[0])
      } else {
        triggerMockResponse(last.content, (last.imageUrls?.length ?? 0) > 0)
      }
    }
  }, [id, messages.length, token, triggerMockResponse, triggerRealResponse])

  const handleSend = useCallback(
    async (content: string, imageFiles?: File[]) => {
      const localUrls = imageFiles?.map((f) => URL.createObjectURL(f))
      addMessage(id, {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        imageUrls: localUrls,
        createdAt: new Date().toISOString(),
      })

      if (isRealToken(token)) {
        // Upload first file to get a persistent URL the backend can read
        let uploadedUrl: string | undefined
        if (imageFiles?.length) {
          try {
            uploadedUrl = await uploadImage(token!, imageFiles[0])
          } catch {
            uploadedUrl = undefined
          }
        }
        triggerRealResponse(content, uploadedUrl)
      } else {
        await triggerMockResponse(content, (imageFiles?.length ?? 0) > 0)
      }
    },
    [id, token, addMessage, triggerMockResponse, triggerRealResponse],
  )

  return (
    <div className="flex flex-col h-full">
      <ChatWindow messages={messages} isStreaming={isStreaming} conversationId={id} />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
