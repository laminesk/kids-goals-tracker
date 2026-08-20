'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthSession, UserRole } from '@/types/database'
import { getSupabase } from '@/lib/supabase/client'

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  login: (role: UserRole, identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = async () => {
    const stored = localStorage.getItem('auth_session')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSession(parsed)
      } catch {
        localStorage.removeItem('auth_session')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshSession()
  }, [])

  const login = async (role: UserRole, identifier: string, password: string) => {
    const supabase = getSupabase()

    if (role === 'parent') {
      const { data, error } = await supabase
        .from('parents')
        .select('id, family_id, email, password_hash, name')
        .eq('email', identifier)
        .single()

      if (error || !data) {
        return { success: false, error: 'Email ou mot de passe incorrect' }
      }

      const valid = await import('@/utils/helpers').then(m => m.verifyPassword(password, data.password_hash))
      if (!valid) {
        return { success: false, error: 'Email ou mot de passe incorrect' }
      }

      const newSession: AuthSession = {
        user: {
          id: data.id,
          role: 'parent',
          family_id: data.family_id,
          name: data.name || 'Parent',
        },
      }
      localStorage.setItem('auth_session', JSON.stringify(newSession))
      setSession(newSession)
      return { success: true }
    } else {
      const { data, error } = await supabase
        .from('children')
        .select('id, family_id, name, pin_hash')
        .eq('name', identifier)
        .single()

      if (error || !data) {
        return { success: false, error: 'Nom ou PIN incorrect' }
      }

      const valid = await import('@/utils/helpers').then(m => m.verifyPassword(password, data.pin_hash))
      if (!valid) {
        return { success: false, error: 'Nom ou PIN incorrect' }
      }

      const newSession: AuthSession = {
        user: {
          id: data.id,
          role: 'child',
          family_id: data.family_id,
          name: data.name,
        },
      }
      localStorage.setItem('auth_session', JSON.stringify(newSession))
      setSession(newSession)
      return { success: true }
    }
  }

  const logout = async () => {
    localStorage.removeItem('auth_session')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}