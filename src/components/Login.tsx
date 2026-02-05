import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      // Add a small delay to ensure auth state is updated
      setTimeout(() => {
        navigate('/klienci')
      }, 150)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-zinc-100">
            Zaloguj się do swojego konta
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Wprowadź swoje dane logowania, aby kontynuować
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-100">
                Adres email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="twój@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-700 border-zinc-600 text-zinc-100 placeholder-zinc-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-100">
                Hasło
              </Label>
              <div className="relative">
                <Input
                  id="password"
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
              <div className="text-right mt-2">
                <Link
                  to="/reset-password"
                  className="text-sm text-[#a08032] hover:text-[#e6d280] transition-colors"
                >
                  Nie pamiętasz hasła?
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]"
              disabled={loading}
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </Button>
            <p className="text-sm text-center text-zinc-400">
              Nie masz konta?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-[#a08032] hover:text-[#e6d280] underline"
              >
                Zarejestruj się
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
