'use client'

import { useRouter } from 'next/navigation'
import { ChatInput } from '@/components/chat/ChatInput'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { isRealToken, createConversation, uploadImage } from '@/lib/chatApi'

const QUICK_PROMPTS = [
  { icon: '🐉', prompt: 'Minimal dragon tattoo, Japanese style, forearm' },
  { icon: '🌸', prompt: 'Fine line floral sleeve, botanical theme' },
  { icon: '🔺', prompt: 'Geometric mandala, dotwork, back piece' },
  { icon: '🌊', prompt: 'Japanese wave with koi fish, full sleeve' },
]

export default function ChatPage() {
  const router = useRouter()
  const { addConversation, setActiveConversation, addMessage } = useChatStore()
  const token = useAuthStore((s) => s.token)

  async function handleSend(content: string, imageFiles?: File[]) {
    // Blob URLs (URL.createObjectURL) are only valid in this browser session and
    // are NOT accessible to Azure APIs running in the cloud.  We store them for
    // local preview but also upload to get a server-relative path that the
    // conversation page can safely pass to the backend.
    const localUrls = imageFiles?.map((f) => URL.createObjectURL(f))

    let convId: string

    if (isRealToken(token)) {
      try {
        convId = await createConversation(token!, content.slice(0, 60))
      } catch {
        convId = `conv-${Date.now()}`
      }
    } else {
      convId = `conv-${Date.now()}`
    }

    // Upload image (if any) before navigating so the conversation page's
    // useEffect receives a /uploads/ path instead of a blob: URL.
    let serverImageUrl: string | undefined
    if (isRealToken(token) && imageFiles?.length) {
      try {
        serverImageUrl = await uploadImage(token!, imageFiles[0])
      } catch {
        serverImageUrl = undefined
      }
    }

    addConversation({ id: convId, title: content.slice(0, 60), updatedAt: 'just now' })
    setActiveConversation(convId)
    addMessage(convId, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      imageUrls: localUrls,          // blob URLs — display only in the chat bubble
      serverImageUrl,                 // /uploads/... — passed to Azure by the conversation page
      createdAt: new Date().toISOString(),
    })
    router.push(`/chat/${convId}`)
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Welcome */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-[var(--accent)]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg w-full">
          <div className="text-5xl mb-5 text-[var(--accent)]">✦</div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Your AI Tattoo Studio
          </h2>
          <p className="text-[var(--foreground-muted)] leading-relaxed mb-8 text-sm">
            Describe your tattoo idea, upload a reference, or record a voice note.
            I&apos;ll help you find the perfect style and generate concepts.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_PROMPTS.map(({ icon, prompt }) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-raised)] transition-all text-left group"
              >
                <div className="text-xl mb-1.5">{icon}</div>
                <p className="text-xs text-[var(--foreground-muted)] group-hover:text-[var(--foreground)] transition-colors leading-snug">
                  {prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  )
}
