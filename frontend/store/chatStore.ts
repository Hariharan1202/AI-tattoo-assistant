'use client'

import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** Blob / data URLs used for local display in the chat bubble. */
  imageUrls?: string[]
  /**
   * Server-relative path to the uploaded file, e.g. /uploads/uuid.jpg.
   * This is the value passed to the backend for Azure vision analysis —
   * blob: and http://localhost URLs are not accessible from the cloud.
   */
  serverImageUrl?: string
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  updatedAt: string
}

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Japanese sleeve concept', updatedAt: '2h ago' },
  { id: '2', title: 'Minimal floral forearm', updatedAt: '1d ago' },
  { id: '3', title: 'Dragon back piece', updatedAt: '3d ago' },
]

const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: '1-1', role: 'user', content: 'I want a minimal Japanese dragon tattoo for my forearm', createdAt: '' },
    { id: '1-2', role: 'assistant', content: 'Great choice! For a minimal Japanese dragon on your forearm, I\'d recommend the **irezumi-inspired fine line style**.\n\n**Key elements to consider:**\n- Elongated dragon body following the arm contour\n- Minimal shading with clean, single-needle linework\n- Subtle cloud motifs for context\n- Keep it under 6 inches for a truly minimal look\n\nWould you like me to generate a concept image for this design?', createdAt: '' },
  ],
  '2': [
    { id: '2-1', role: 'user', content: 'I\'m thinking of a floral forearm piece, quite minimal', createdAt: '' },
    { id: '2-2', role: 'assistant', content: 'A minimal floral forearm piece sounds beautiful! Here are my top style recommendations:\n\n**Fine Line Botanical**\n- Single-needle linework\n- Delicate wildflowers: lavender, chamomile, poppy\n- Flowing vertical composition\n\n**Blackwork Minimal**\n- Bold but sparse botanical elements\n- High contrast, timeless aesthetic\n\nWhat flowers or plants resonate with you most?', createdAt: '' },
  ],
  '3': [
    { id: '3-1', role: 'user', content: 'Dragon back piece, large scale, dark aesthetic', createdAt: '' },
    { id: '3-2', role: 'assistant', content: 'A large-scale dragon back piece is a bold and powerful choice! For a dark aesthetic:\n\n**Style: Dark Japanese / Black & Grey Realism**\n- Full back coverage with the dragon as centrepiece\n- Deep black shading with subtle grey gradients\n- Storm clouds and lightning accents\n- Red accent eyes for dramatic contrast\n\n**Composition ideas:**\n- Dragon ascending from lower back toward shoulders\n- Coiled around the spine\n\nThis is a major commitment — typically 40–60 hours. Shall I generate some concept images?', createdAt: '' },
  ],
}

interface ChatState {
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  activeConversationId: string | null
  isStreaming: boolean

  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Message) => void
  appendToLastMessage: (conversationId: string, chunk: string) => void
  setStreaming: (streaming: boolean) => void
  addConversation: (conversation: Conversation) => void
  getMessages: (conversationId: string) => Message[]
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: MOCK_CONVERSATIONS,
  messagesByConversation: MOCK_MESSAGES,
  activeConversationId: null,
  isStreaming: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), message],
      },
    })),

  appendToLastMessage: (conversationId, chunk) =>
    set((state) => {
      const messages = [...(state.messagesByConversation[conversationId] ?? [])]
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + chunk }
      }
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages },
      }
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversation.id]: [],
      },
    })),

  getMessages: (conversationId) =>
    get().messagesByConversation[conversationId] ?? [],
}))
