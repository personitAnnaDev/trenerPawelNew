import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '@/services/errorLoggingService';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'feature' | 'form';
  featureName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error | null;
  reset: () => void;
  featureName?: string;
}

// Inline fallback components to avoid circular dependencies
const FullPageErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
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

const PageErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
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

const FeatureErrorFallback: React.FC<ErrorFallbackProps> = ({
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

const FormErrorFallback: React.FC<ErrorFallbackProps> = ({ error, reset }) => {
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

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Features:
 * - Catches render errors at different levels (app, route, feature, form)
 * - Integrates with errorLoggingService
 * - Provides default fallbacks with Polish localization
 * - Supports custom fallback components or functions
 * - Allows error recovery via reset functionality
 * - Dev/prod error visibility split
 *
 * Usage:
 * ```tsx
 * // App-level
 * <ErrorBoundary level="app">
 *   <App />
 * </ErrorBoundary>
 *
 * // Feature-level with custom fallback
 * <ErrorBoundary level="feature" featureName="Zarządzanie dietą">
 *   <ClientDietManager />
 * </ErrorBoundary>
 *
 * // With custom fallback function
 * <ErrorBoundary fallback={(error, reset) => <CustomError error={error} onReset={reset} />}>
 *   <Component />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  /**
   * Update state so the next render will show the fallback UI.
   * This is called during the render phase, so side effects are not allowed.
   */
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Log error details after the component has caught an error.
   * This is called during the commit phase, so side effects are allowed.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'app', featureName } = this.props;

    // Log to console (development)
    logger.error('🔥 Error Boundary caught error:', error, errorInfo);

    // Log to database (production & development)
    try {
      errorLogger.logError({
        type: 'UNKNOWN',
        message: error.message,
        component: featureName || `ErrorBoundary-${level}`,
        code: error.name,
        context: {
          componentStack: errorInfo.componentStack,
          errorStack: error.stack,
          level,
        },
        severity: level === 'app' ? 'critical' : 'error',
      });
    } catch (loggingError) {
      // Prevent logging errors from crashing the error boundary
      logger.error('Failed to log error to service:', loggingError);
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        // Prevent onError callback from crashing the error boundary
        logger.error('Error in onError callback:', handlerError);
      }
    }
  }

  /**
   * Reset error state and allow re-rendering of children
   */
  private resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const { fallback, level = 'app', featureName } = this.props;
      const { error } = this.state;

      // Custom fallback with reset function
      if (typeof fallback === 'function' && error) {
        return fallback(error, this.resetError);
      }

      // Custom static fallback
      if (fallback) {
        return fallback;
      }

      // Default fallback based on level
      switch (level) {
        case 'app':
          return <FullPageErrorFallback error={error} reset={this.resetError} />;
        case 'route':
          return <PageErrorFallback error={error} reset={this.resetError} />;
        case 'feature':
          return (
            <FeatureErrorFallback
              error={error}
              reset={this.resetError}
              featureName={featureName}
            />
          );
        case 'form':
          return <FormErrorFallback error={error} reset={this.resetError} />;
        default:
          return <FullPageErrorFallback error={error} reset={this.resetError} />;
      }
    }

    return this.props.children;
  }
}
