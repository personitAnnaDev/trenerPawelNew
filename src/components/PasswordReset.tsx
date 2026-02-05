import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger';

export function PasswordReset() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await resetPassword(email)
      setSent(true)
      toast.success('Link resetujący został wysłany na podany adres email')
    } catch (error: any) {
      setError(error.message || 'Wystąpił błąd podczas wysyłania emaila. Spróbuj ponownie.')
      logger.error('Reset password error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Email został wysłany
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Sprawdź swoją skrzynkę pocztową i kliknij w link, aby zresetować hasło
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-zinc-700 p-4">
              <p className="text-sm text-zinc-300">
                <strong>Adres email:</strong> {email}
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                Nie widzisz emaila? Sprawdź folder spam lub spróbuj ponownie za kilka minut.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button 
                variant="outline" 
                className="w-full border-zinc-600 text-zinc-100 hover:bg-zinc-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót do logowania
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <Card className="w-full max-w-md bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-zinc-100">
            Resetuj hasło
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Wprowadź swój adres email, a wyślemy Ci link do zresetowania hasła
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b]"
              disabled={loading}
            >
              {loading ? 'Wysyłanie...' : 'Wyślij link resetujący'}
            </Button>
            <Link to="/login">
              <Button 
                type="button"
                variant="ghost" 
                className="w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Powrót do logowania
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}