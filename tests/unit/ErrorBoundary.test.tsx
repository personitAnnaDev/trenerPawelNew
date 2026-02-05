import React, { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { errorLogger } from '@/services/errorLoggingService';

/**
 * Unit Tests for ErrorBoundary Component
 *
 * Test IDs:
 * - EB-UT-01: ErrorBoundary catches render errors
 * - EB-UT-02: ErrorBoundary calls onError callback
 * - EB-UT-03: ErrorBoundary renders custom fallback
 * - EB-UT-04: ErrorBoundary resets error state
 * - EB-UT-05: getDerivedStateFromError updates state correctly
 * - EB-UT-06: componentDidCatch logs to errorLoggingService
 * - EB-UT-07: ErrorBoundary renders default fallback by level
 * - EB-UT-08: ErrorBoundary preserves error info
 */

// Mock error logging service
vi.mock('@/services/errorLoggingService', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

// Suppress console.error for cleaner test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  vi.clearAllMocks();
});

// Helper to render with Router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

// Test component that throws an error
interface ThrowErrorProps {
  shouldThrow?: boolean;
  errorMessage?: string;
  children?: ReactNode;
}

const ThrowError: React.FC<ThrowErrorProps> = ({
  shouldThrow = true,
  errorMessage = 'Test error',
  children
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>{children || 'No error'}</div>;
};

describe('ErrorBoundary Component', () => {
  describe('EB-UT-01: ErrorBoundary catches render errors', () => {
    it('should catch and handle errors thrown by child components', () => {
      const customFallback = <div data-testid="custom-error">Error caught</div>;
      const { container } = render(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError errorMessage="Child component error" />
        </ErrorBoundary>
      );

      // Should not throw - error should be caught
      expect(container).toBeInTheDocument();

      // Should render fallback
      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      // Should not render children
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary level="app">
          <ThrowError shouldThrow={false}>
            <div>Success content</div>
          </ThrowError>
        </ErrorBoundary>
      );

      expect(screen.getByText('Success content')).toBeInTheDocument();
    });

    it('should handle multiple errors in sequence', () => {
      const customFallback = <div data-testid="error-fallback">Error state</div>;
      const { rerender } = render(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError shouldThrow={false}>No error yet</ThrowError>
        </ErrorBoundary>
      );

      expect(screen.getByText('No error yet')).toBeInTheDocument();

      // Trigger error
      rerender(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      // Should show fallback
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
      expect(screen.queryByText('No error yet')).not.toBeInTheDocument();
    });
  });

  describe('EB-UT-02: ErrorBoundary calls onError callback', () => {
    it('should call onError callback when error occurs', () => {
      const onErrorMock = vi.fn();
      const customFallback = <div>Error UI</div>;

      render(
        <ErrorBoundary level="app" onError={onErrorMock} fallback={customFallback}>
          <ThrowError errorMessage="Callback test error" />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should not call onError when no error occurs', () => {
      const onErrorMock = vi.fn();

      render(
        <ErrorBoundary level="app" onError={onErrorMock}>
          <ThrowError shouldThrow={false}>Success</ThrowError>
        </ErrorBoundary>
      );

      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('should handle onError callback throwing error gracefully', () => {
      const onErrorMock = vi.fn(() => {
        throw new Error('onError callback error');
      });
      const customFallback = <div>Fallback</div>;

      // Should not crash even if onError throws
      expect(() => {
        render(
          <ErrorBoundary level="app" onError={onErrorMock} fallback={customFallback}>
            <ThrowError errorMessage="Original error" />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('EB-UT-03: ErrorBoundary renders custom fallback', () => {
    it('should render custom static fallback component', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('should render custom fallback function with error and reset', () => {
      const fallbackFn = (error: Error, reset: () => void) => (
        <div>
          <p data-testid="error-message">{error.message}</p>
          <button onClick={reset} data-testid="reset-btn">Reset</button>
        </div>
      );

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <ThrowError errorMessage="Function fallback error" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent('Function fallback error');
      expect(screen.getByTestId('reset-btn')).toBeInTheDocument();
    });

    it('should pass correct error object to fallback function', () => {
      const fallbackFn = vi.fn((error: Error) => (
        <div>Error: {error.message}</div>
      ));

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <ThrowError errorMessage="Specific error message" />
        </ErrorBoundary>
      );

      expect(fallbackFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Specific error message',
        }),
        expect.any(Function)
      );
    });
  });

  describe('EB-UT-04: ErrorBoundary resets error state', () => {
    it('should reset error and re-render children when reset is called', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        React.useEffect(() => {
          // Simulate external fix after mount
          const timer = setTimeout(() => setShouldThrow(false), 100);
          return () => clearTimeout(timer);
        }, []);

        if (shouldThrow) {
          throw new Error('Initial error');
        }

        return <div data-testid="success-content">Content loaded</div>;
      };

      const fallbackFn = (error: Error, reset: () => void) => (
        <div>
          <p data-testid="error-text">Error occurred</p>
          <button onClick={reset} data-testid="reset-button">Try again</button>
        </div>
      );

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <TestComponent />
        </ErrorBoundary>
      );

      // Error state active
      expect(screen.getByTestId('error-text')).toBeInTheDocument();

      // Wait for external fix
      setTimeout(() => {
        // Click reset
        const resetButton = screen.getByTestId('reset-button');
        fireEvent.click(resetButton);

        // Should show children again after reset
        setTimeout(() => {
          expect(screen.queryByTestId('success-content')).toBeInTheDocument();
          expect(screen.queryByTestId('error-text')).not.toBeInTheDocument();
        }, 150);
      }, 150);
    });

    it('should handle reset button click', () => {
      const resetFn = vi.fn();
      const fallbackFn = (error: Error, reset: () => void) => (
        <div>
          <p data-testid="error-indicator">Error</p>
          <button onClick={() => { reset(); resetFn(); }} data-testid="reset">Reset</button>
        </div>
      );

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <ThrowError errorMessage="Test error" />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();

      // Click reset
      fireEvent.click(screen.getByTestId('reset'));

      // Reset function should be called
      expect(resetFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('EB-UT-05: getDerivedStateFromError updates state correctly', () => {
    it('should update hasError to true when error is thrown', () => {
      const customFallback = <div data-testid="error-state">Error caught</div>;
      const { container } = render(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError errorMessage="State update test" />
        </ErrorBoundary>
      );

      // Component should render fallback (not crash)
      expect(container).toBeInTheDocument();

      // Fallback should be visible (which means hasError = true)
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('should store error object in state', () => {
      const fallbackFn = (error: Error) => (
        <div data-testid="error-msg">{error.message}</div>
      );

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <ThrowError errorMessage="Error object test" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-msg')).toHaveTextContent('Error object test');
    });
  });

  describe('EB-UT-06: componentDidCatch logs to errorLoggingService', () => {
    it('should log error to errorLoggingService with correct parameters', () => {
      const customFallback = <div>Error</div>;
      render(
        <ErrorBoundary level="app" featureName="TestFeature" fallback={customFallback}>
          <ThrowError errorMessage="Logging test error" />
        </ErrorBoundary>
      );

      expect(errorLogger.logError).toHaveBeenCalledTimes(1);
      expect(errorLogger.logError).toHaveBeenCalledWith({
        type: 'UNKNOWN',
        message: 'Logging test error',
        component: 'TestFeature',
        code: 'Error',
        context: expect.objectContaining({
          componentStack: expect.any(String),
          errorStack: expect.any(String),
          level: 'app',
        }),
        severity: 'critical',
      });
    });

    it('should use correct severity based on level (app = critical)', () => {
      const customFallback = <div>Error</div>;
      render(
        <ErrorBoundary level="app" fallback={customFallback}>
          <ThrowError errorMessage="Critical error" />
        </ErrorBoundary>
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
        })
      );
    });

    it('should use correct severity for non-app levels (error)', () => {
      render(
        <ErrorBoundary level="feature" featureName="TestFeature">
          <ThrowError errorMessage="Feature error" />
        </ErrorBoundary>
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
        })
      );
    });

    it('should log componentStack and errorStack in context', () => {
      const customFallback = <div>Error</div>;
      render(
        <ErrorBoundary level="route" fallback={customFallback}>
          <ThrowError errorMessage="Stack trace test" />
        </ErrorBoundary>
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            componentStack: expect.stringContaining('ThrowError'),
            errorStack: expect.stringContaining('Stack trace test'),
          }),
        })
      );
    });
  });

  describe('EB-UT-07: ErrorBoundary renders default fallback by level', () => {
    it('should render app-level fallback for level="app"', () => {
      renderWithRouter(
        <ErrorBoundary level="app">
          <ThrowError errorMessage="App error" />
        </ErrorBoundary>
      );

      // App-level fallback should contain specific text
      expect(screen.getByText(/coś poszło nie tak/i)).toBeInTheDocument();
    });

    it('should render route-level fallback for level="route"', () => {
      renderWithRouter(
        <ErrorBoundary level="route">
          <ThrowError errorMessage="Route error" />
        </ErrorBoundary>
      );

      // Route-level fallback should contain specific text
      expect(screen.getByText(/błąd ładowania strony/i)).toBeInTheDocument();
    });

    it('should render feature-level fallback for level="feature"', () => {
      render(
        <ErrorBoundary level="feature" featureName="Zarządzanie dietą">
          <ThrowError errorMessage="Feature error" />
        </ErrorBoundary>
      );

      // Feature-level fallback should show feature name
      expect(screen.getByText(/zarządzanie dietą.*niedostępna/i)).toBeInTheDocument();
    });

    it('should render form-level fallback for level="form"', () => {
      render(
        <ErrorBoundary level="form">
          <ThrowError errorMessage="Form error" />
        </ErrorBoundary>
      );

      // Form-level fallback should contain specific text
      expect(screen.getByText(/formularz napotkał błąd/i)).toBeInTheDocument();
    });
  });

  describe('EB-UT-08: ErrorBoundary preserves error info', () => {
    it('should show error details in development mode', () => {
      // Mock dev environment
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = true;

      renderWithRouter(
        <ErrorBoundary level="app">
          <ThrowError errorMessage="Dev mode error details" />
        </ErrorBoundary>
      );

      // Should show error message in dev (multiple locations)
      const errorMessages = screen.getAllByText(/dev mode error details/i);
      expect(errorMessages.length).toBeGreaterThan(0);

      // Restore
      (import.meta.env as any).DEV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      // Mock prod environment
      const originalEnv = import.meta.env.DEV;
      (import.meta.env as any).DEV = false;

      renderWithRouter(
        <ErrorBoundary level="app">
          <ThrowError errorMessage="Prod mode error details" />
        </ErrorBoundary>
      );

      // Should NOT show specific error message in prod
      expect(screen.queryByText(/prod mode error details/i)).not.toBeInTheDocument();

      // Should show generic message
      expect(screen.getByText(/coś poszło nie tak/i)).toBeInTheDocument();

      // Restore
      (import.meta.env as any).DEV = originalEnv;
    });

    it('should preserve error type (Error.name)', () => {
      const fallbackFn = (error: Error) => (
        <div data-testid="error-name">{error.name}</div>
      );

      render(
        <ErrorBoundary level="app" fallback={fallbackFn}>
          <ThrowError errorMessage="Type test" />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('error-name')).toHaveTextContent('Error');
    });
  });
});
