'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/store/authStore'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const validateToken = useAuthStore((s) => s.validateToken)
  const router = useRouter()

  useEffect(() => {
    // On every mount inside the protected area, validate the stored token.
    // If the backend rejects it (expired, DB reset, wrong JWT secret) we clear
    // state and send the user back to /login.
    validateToken().then((valid) => {
      if (!valid) router.replace('/login')
    })
    // Run once on mount only — router reference is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
