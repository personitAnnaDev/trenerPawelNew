import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'
import { logger } from '@/utils/logger';

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      setLoading(false)
      return
    }

    try {
      const result = await signUp(email, password)
      
      if (result.needsConfirmation) {
        setRegistrationSuccess(true)
        setLoading(false)
      } else {
        // Direct login without email confirmation (legacy behavior)
        setLoading(false)
        setTimeout(() => {
          navigate('/klienci')
        }, 150)
      }
    } catch (error: any) {
      logger.error('Registration error:', error)
      setError(error.message)
      setLoading(false)
    }
  }

  // Show success message if registration needs email confirmation
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">Sprawdź swoją skrzynkę email</h2>
              <p className="text-zinc-400 mb-6">
                Wysłaliśmy link potwierdzający na Twój adres email. Kliknij w link, aby aktywować konto.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#a08032] hover:bg-[#8a6d2b] text-white"
                >
                  Przejdź do logowania
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRegistrationSuccess(false)
                    setEmail('')
                    setPassword('')
                    setConfirmPassword('')
                    setError(null)
                  }}
                  className="w-full text-zinc-400 hover:text-zinc-300"
                >
                  Spróbuj ponownie
                </Button>
              </div>
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
            Utwórz nowe konto
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Zarejestruj się, aby rozpocząć korzystanie z aplikacji
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email-reg" className="text-zinc-100">
                Adres email
              </Label>
              <Input
                id="email-reg"
                type="email"
                placeholder="twój@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-reg" className="text-zinc-100">
                Hasło
              </Label>
              <div className="relative">
                <Input
                  id="password-reg"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-zinc-100">
                Potwierdź hasło
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
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
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]"
              disabled={loading}
            >
              {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
            </Button>
            <p className="text-sm text-center text-zinc-400">
              Masz już konto?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-[#a08032] hover:text-[#e6d280] underline"
              >
                Zaloguj się
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
