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
  // Track the ID of the last user message we already triggered a response for.
  // Using an ID (not a boolean flag) makes this immune to React re-render timing:
  // each message has a unique ID so there is no race condition where a re-render
  // resets the guard before the effect fires.
  const lastRespondedId = useRef<string | null>(null)

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
      // Pass the full conversation text as context so generate-confirmations
      // ("yes go ahead") can infer which subject the user is referring to.
      const conversationContext = useChatStore
        .getState()
        .messagesByConversation[id]
        ?.map((m) => m.content)
        .join(' ') ?? ''
      const responseText = hasImages
        ? IMAGE_ANALYSIS_RESPONSE
        : getMockResponse(userContent, conversationContext)
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
  }, [id, setActiveConversation])

  useEffect(() => {
    const msgs = useChatStore.getState().messagesByConversation[id] ?? []
    const last = msgs[msgs.length - 1]
    // Only respond if:
    //  1. The last message is from the user
    //  2. We haven't already triggered a response for this exact message
    if (last?.role !== 'user' || last.id === lastRespondedId.current) return
    lastRespondedId.current = last.id
    if (isRealToken(token)) {
      // Use the server-relative path stored on the message (set by handleSend
      // or by the welcome page after upload).  Never pass blob: or http://localhost
      // URLs — those are local to the browser and not accessible from Azure.
      triggerRealResponse(last.content, last.serverImageUrl)
    } else {
      triggerMockResponse(last.content, (last.imageUrls?.length ?? 0) > 0)
    }
  }, [id, messages.length, token, triggerMockResponse, triggerRealResponse])

  const handleSend = useCallback(
    async (content: string, imageFiles?: File[]) => {
      const msgId = `msg-${Date.now()}`
      // Reserve this message ID BEFORE calling addMessage so that when Zustand
      // triggers a re-render and the useEffect above fires, it sees
      // lastRespondedId === msgId and skips — preventing a duplicate response.
      lastRespondedId.current = msgId

      const localUrls = imageFiles?.map((f) => URL.createObjectURL(f))

      // Add the user message immediately so it appears in the chat bubble right
      // away, even while the image is still uploading.  The useEffect above is
      // already guarded by lastRespondedId so it won't fire for this message.
      addMessage(id, {
        id: msgId,
        role: 'user',
        content,
        imageUrls: localUrls,   // blob URLs for display (available instantly)
        createdAt: new Date().toISOString(),
      })

      if (isRealToken(token)) {
        // Upload first file to get the server-relative path (/uploads/...)
        // The backend reads the file from disk using this path — do NOT pass
        // a full http:// URL or a blob: URL, neither is accessible to Azure.
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
