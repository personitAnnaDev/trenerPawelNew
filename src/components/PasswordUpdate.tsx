import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/utils/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger';

export function PasswordUpdate() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { updatePassword, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if URL has auth params (code in query or tokens in hash)
    const hasCode = new URLSearchParams(window.location.search).has('code')
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasHashTokens = hashParams.has('access_token') && hashParams.has('refresh_token')

    if (!hasCode && !hasHashTokens) {
      setError('Nieprawidłowy lub wygasły link resetowania hasła. Spróbuj ponownie.')
      return
    }

    // Immediately check if session already exists (event might have fired before mount)
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        logger.info('Session already exists on mount')
        setSessionReady(true)
        setError(null)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
    checkExistingSession()

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('PasswordUpdate auth event:', event)

      if (event === 'PASSWORD_RECOVERY') {
        logger.info('PASSWORD_RECOVERY event received, session:', !!session)
        if (session) {
          setSessionReady(true)
          setError(null)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
        }
      }
    })

    // Timeout: if no session after 3 seconds, show error
    timeoutRef.current = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        logger.info('Session found after timeout')
        setSessionReady(true)
        setError(null)
      } else {
        logger.warn('No session after timeout')
        setError('Nieprawidłowy lub wygasły link resetowania hasła. Spróbuj ponownie.')
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Also watch for user from AuthContext
  useEffect(() => {
    if (!authLoading && user) {
      setSessionReady(true)
    }
  }, [user, authLoading])

  const validatePasswords = () => {
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków')
      return false
    }

    // Check password strength requirements (Supabase policy)
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(password)

    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      const missing = []
      if (!hasLowercase) missing.push('małe litery (a-z)')
      if (!hasUppercase) missing.push('wielkie litery (A-Z)')
      if (!hasNumber) missing.push('cyfry (0-9)')
      if (!hasSpecial) missing.push('znaki specjalne (np. !@#$%)')
      setError(`Hasło musi zawierać: ${missing.join(', ')}`)
      return false
    }

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!sessionReady) {
      setError('Sesja nie jest gotowa. Odśwież stronę i spróbuj ponownie.')
      return
    }

    if (!validatePasswords()) {
      return
    }

    setLoading(true)

    try {
      await updatePassword(password)
      setSuccess(true)
      toast.success('Hasło zostało pomyślnie zmienione')

      // Redirect to main app after 2 seconds (user is already logged in)
      setTimeout(() => {
        navigate('/klienci')
      }, 2000)
    } catch (error: any) {
      logger.error('Update password error:', error)

      // Handle password errors from Supabase
      const statusCode = error?.status || error?.statusCode
      const errorCode = error?.code?.toLowerCase() || ''
      const errorMessage = error?.message?.toLowerCase() || ''

      // Check for weak_password error code first (Supabase returns this in error.code)
      if (errorCode === 'weak_password') {
        setError('Hasło musi zawierać: małe litery (a-z), wielkie litery (A-Z), cyfry (0-9) oraz znaki specjalne (np. !@#$%^&*).')
      } else if (errorCode === 'same_password' || errorMessage.includes('same_password') || errorMessage.includes('different from the old')) {
        setError('Nowe hasło musi być inne od poprzedniego hasła. Wprowadź inne hasło.')
      } else if (statusCode === 422 || errorMessage.includes('422')) {
        // Handle other 422 errors
        if (errorMessage.includes('weak') || errorMessage.includes('too short') || errorMessage.includes('length')) {
          setError('Hasło musi zawierać: małe litery (a-z), wielkie litery (A-Z), cyfry (0-9) oraz znaki specjalne (np. !@#$%^&*).')
        } else {
          setError('Hasło nie spełnia wymagań bezpieczeństwa. Sprawdź wymagania poniżej.')
        }
      } else if (errorMessage.includes('same') || errorMessage.includes('previous') || errorMessage.includes('old password')) {
        setError('Nowe hasło musi być inne od poprzedniego hasła. Wprowadź inne hasło.')
      } else {
        setError(error.message || 'Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading while waiting for session
  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Weryfikacja linku...
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Proszę czekać
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a08032]"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Hasło zostało zmienione
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Za chwilę zostaniesz przekierowany do aplikacji
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a08032]"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-zinc-100">
            Ustaw nowe hasło
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Wprowadź nowe hasło dla swojego konta
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-100">
                Nowe hasło
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400 pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                Hasło musi zawierać: małe litery (a-z), wielkie litery (A-Z), cyfry (0-9) i znaki specjalne (np. !@#$%)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-100">
                Potwierdź nowe hasło
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400 pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]"
              disabled={loading || !sessionReady}
            >
              {loading ? 'Zmienianie hasła...' : 'Zmień hasło'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}