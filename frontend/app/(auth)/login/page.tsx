'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      router.push('/chat')
    } catch {
      // error is set in the store
    }
  }

  async function handleDemoLogin() {
    clearError()
    // Sets a demo token directly so the UI is fully testable without a backend
    const demoToken = 'demo-token-' + Date.now()
    document.cookie = `auth-token=${demoToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        token: demoToken,
        user: { id: 'demo', email: 'demo@ink.ai', name: 'Demo User' },
      },
      version: 0,
    }))
    router.push('/chat')
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">Welcome back</h2>
        <p className="text-[var(--foreground-muted)] text-sm">Sign in to continue to Ink AI</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <p className="text-sm text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={isLoading} className="mt-1 w-full">
          Sign in
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs text-[var(--foreground-muted)]">
          <span className="bg-[var(--background)] px-3">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={handleDemoLogin}
      >
        Continue with Demo
      </Button>

      <p className="mt-6 text-center text-sm text-[var(--foreground-muted)]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[var(--accent)] hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
