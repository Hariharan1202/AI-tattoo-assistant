'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

const MOCK_CONVERSATIONS = [
  { id: '1', title: 'Japanese sleeve concept', updatedAt: '2h ago' },
  { id: '2', title: 'Minimal floral forearm', updatedAt: '1d ago' },
  { id: '3', title: 'Dragon back piece', updatedAt: '3d ago' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { conversations, activeConversationId, setActiveConversation } = useChatStore()

  const displayConversations = conversations.length > 0 ? conversations : MOCK_CONVERSATIONS

  function handleNewChat() {
    router.push('/chat')
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] text-xl">✦</span>
          <span className="font-bold text-[var(--foreground)] tracking-tight">Ink AI</span>
        </div>
      </div>

      {/* New chat */}
      <div className="p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleNewChat}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </Button>
      </div>

      {/* Nav links */}
      <nav className="px-3 pb-2 border-b border-[var(--border)]">
        <Link
          href="/gallery"
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === '/gallery'
              ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Gallery
        </Link>
      </nav>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-3 mb-2">
          Recent
        </p>
        <div className="flex flex-col gap-0.5">
          {displayConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { setActiveConversation(conv.id); router.push(`/chat/${conv.id}`) }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                activeConversationId === conv.id
                  ? 'bg-[var(--accent-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {conv.title}
            </button>
          ))}
        </div>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)] truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-[var(--foreground-muted)] truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
