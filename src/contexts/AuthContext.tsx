import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { User } from '@supabase/supabase-js'
import { getPolishErrorMessage } from '@/utils/errorMessages'
import { logger } from '@/utils/logger'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Export AuthContext for testing purposes
export { AuthContext }

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (!session?.user) {
        setLoading(false)
      }
    })

    // 🎯 FIX: Detect localStorage token removal (cross-tab and DevTools)
    const handleStorageChange = (event: StorageEvent) => {
      // Check if Supabase auth token was removed
      if (event.key?.includes('supabase') && event.key?.includes('auth') && event.newValue === null) {
        logger.warn('[AuthContext] Token removed from localStorage - signing out')
        supabase.auth.signOut()
      }
    }

    // 🎯 FIX: Check session when tab becomes visible (catches DevTools localStorage edits)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        // Force re-read from localStorage
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          logger.warn('[AuthContext] Session not found on visibility change - signing out')
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const polishError = new Error(getPolishErrorMessage(error))
      throw polishError
    }

    // Ensure user state is updated before proceeding
    if (data.user) {
      setUser(data.user)
    }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    })
    if (error) {
      const polishError = new Error(getPolishErrorMessage(error))
      throw polishError
    }

    // With email confirmation enabled, user won't be logged in automatically
    // Return info about whether email confirmation is needed
    const needsConfirmation = !data.session

    return { needsConfirmation }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Błąd podczas wylogowania:', error)
      const polishError = new Error(getPolishErrorMessage(error))
      throw polishError
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })
    if (error) {
      const polishError = new Error(getPolishErrorMessage(error))
      throw polishError
    }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      // Preserve status code for proper error handling in components
      const polishMessage = getPolishErrorMessage(error)
      const polishError = new Error(polishMessage) as Error & { status?: number }
      polishError.status = error.status
      throw polishError
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}
