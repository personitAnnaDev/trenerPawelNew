import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error | null;
  reset: () => void;
  featureName?: string;
}

/**
 * Full Page Error Fallback (App-level)
 *
 * Displays when an unhandled error occurs at the app level.
 * Provides options to reload the page or navigate to home.
 */
export const FullPageErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleNavigateHome = () => {
    window.location.href = '/klienci';
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-zinc-800 border-zinc-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-zinc-100">
            Coś poszło nie tak
          </CardTitle>
          <CardDescription className="text-zinc-400 mt-2">
            Przepraszamy, aplikacja napotkała nieoczekiwany błąd
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && error && (
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700">
              <p className="text-xs font-mono text-red-400 break-all">
                {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs text-zinc-500 mt-2 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleReload}
              className="bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież stronę
            </Button>
            <Button
              onClick={handleNavigateHome}
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Przejdź do strony głównej
            </Button>
          </div>
          <p className="text-center text-sm text-zinc-500 mt-6">
            Jeśli problem się powtarza, skontaktuj się z administratorem
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Page Error Fallback (Route-level)
 *
 * Displays when an error occurs on a specific page/route.
 * Allows retry or navigation back.
 */
export const PageErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500" />
          </div>
          <CardTitle className="text-xl">Błąd ładowania strony</CardTitle>
          <CardDescription className="mt-2">
            Nie udało się załadować tej strony
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {import.meta.env.DEV && error && (
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-md">
              <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              onClick={reset}
              className="w-full bg-gradient-to-r from-[#a08032] to-[#e6d280] hover:from-[#8a6c2b] hover:to-[#d4c06b] text-zinc-900 font-semibold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wróć
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Feature Error Fallback (Feature-level)
 *
 * Displays when an error occurs in a specific feature/component.
 * Shows inline warning without disrupting the entire page.
 */
export const FeatureErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
  featureName = 'Ta funkcja',
}) => {
  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                {featureName} jest tymczasowo niedostępna
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Wystąpił błąd podczas ładowania tej funkcji
              </p>
            </div>
            {import.meta.env.DEV && error && (
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs font-mono text-yellow-900 dark:text-yellow-100 break-all">
                {error.message}
              </div>
            )}
            <Button
              onClick={reset}
              size="sm"
              variant="outline"
              className="border-yellow-600 text-yellow-900 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-100 dark:hover:bg-yellow-900"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Form Error Fallback (Form-level)
 *
 * Displays when an error occurs in a form component.
 * Provides inline error message with reset option.
 */
export const FormErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  reset,
}) => {
  return (
    <div className="p-4 border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-red-900 dark:text-red-100">
            Formularz napotkał błąd
          </p>
          {import.meta.env.DEV && error && (
            <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
              {error.message}
            </p>
          )}
          <Button
            onClick={reset}
            size="sm"
            variant="outline"
            className="border-red-600 text-red-900 hover:bg-red-100 dark:border-red-400 dark:text-red-100 dark:hover:bg-red-900"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetuj formularz
          </Button>
        </div>
      </div>
    </div>
  );
};
