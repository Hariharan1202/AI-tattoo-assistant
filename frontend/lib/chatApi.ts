import { consumeSSE } from './streaming'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function isRealToken(token: string | null): boolean {
  return !!token && !token.startsWith('mock-')
}

export interface SendOptions {
  conversationId: string
  content: string
  imageUrl?: string
  token: string | null
  onChunk: (chunk: string) => void
  onDone: () => void
  onError: (err: Error) => void
}

export function sendMessageSSE(opts: SendOptions): AbortController {
  const { conversationId, content, imageUrl, token, onChunk, onDone, onError } = opts
  return consumeSSE(
    `${API_URL}/api/chat/conversations/${conversationId}/messages`,
    { content, image_url: imageUrl ?? null },
    token,
    onChunk,
    onDone,
    onError,
  )
}

export { isRealToken }

export async function createConversation(token: string, title: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function uploadImage(token: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/api/images/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  // Return the server-relative path (e.g. /uploads/uuid.jpg).
  // The FastAPI backend detects this prefix and reads the file from disk,
  // then base64-encodes it for the Azure vision API.
  // A full http://localhost:8000/... URL is NOT accessible to Azure's cloud API.
  return data.url as string
}
