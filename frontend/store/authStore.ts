'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

function setAuthCookie(token: string) {
  document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function clearAuthCookie() {
  document.cookie = 'auth-token=; path=/; max-age=0'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/api/auth/login', { email, password })
          setAuthCookie(data.access_token)
          set({ token: data.access_token, user: data.user, isLoading: false })
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            'Login failed. Please check your credentials.'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await api.post('/api/auth/register', { name, email, password })
          setAuthCookie(data.access_token)
          set({ token: data.access_token, user: data.user, isLoading: false })
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            'Registration failed. Please try again.'
          set({ error: message, isLoading: false })
          throw err
        }
      },

      logout: () => {
        clearAuthCookie()
        set({ token: null, user: null, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAuthCookie(state.token)
        }
      },
    }
  )
)
