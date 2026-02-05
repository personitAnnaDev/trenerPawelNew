import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { errorLogger } from "@/services/errorLoggingService";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { handleSessionExpiredError, isRLSError, isSessionExpiredError } from "@/utils/sessionErrorHandler";
import { Login } from "@/components/Login";
import { Register } from "@/components/Register";
import { PasswordReset } from "@/components/PasswordReset";
import { PasswordUpdate } from "@/components/PasswordUpdate";
import Navigation from "./components/Navigation";
import Klienci from "./pages/Klienci";
import NowyKlient from "./pages/NowyKlient";
import KlientSzczegoly from "./pages/KlientSzczegoly";
import ClientDietPreview from "./components/ClientDietPreview";
import PublicDietView from "./pages/PublicDietView";
import Potrawy from "./pages/Potrawy";
import NowaPotrawa from "./components/NowaPotrawa"; // Dodano import
import Produkty from "./pages/Produkty";
import Jadlospisy from "./pages/Jadlospisy";
import TemplateEdit from "./pages/TemplateEdit";
import TemplatePreview from "./pages/TemplatePreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry session/RLS errors - they won't succeed
        if (isRLSError(error) || isSessionExpiredError(error)) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry session/RLS errors - they won't succeed
        if (isRLSError(error) || isSessionExpiredError(error)) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// Global error handlers using MutationCache and QueryCache
queryClient.getMutationCache().subscribe((event) => {
  if (event.type === 'updated' && event.mutation.state.status === 'error') {
    const error = event.mutation.state.error;

    // Handle session expired errors (RLS or JWT)
    handleSessionExpiredError(error).then((wasSessionError) => {
      if (!wasSessionError) {
        // Log non-session errors
        errorLogger.logError({
          type: 'DATABASE_ERROR',
          message: error?.message || 'Mutation failed',
          component: 'QueryClient',
          context: { error: error?.toString(), stack: (error as Error)?.stack },
          severity: 'error',
        });
      }
    });
  }
});

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.query.state.status === 'error') {
    const error = event.query.state.error;

    // Handle session expired errors (RLS or JWT)
    handleSessionExpiredError(error).then((wasSessionError) => {
      if (!wasSessionError) {
        // Log non-session errors
        errorLogger.logError({
          type: 'NETWORK_ERROR',
          message: error?.message || 'Query failed',
          component: 'QueryClient',
          context: { error: error?.toString(), stack: (error as Error)?.stack },
          severity: 'error',
        });
      }
    });
  }
});

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#a08032]"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/klienci" replace /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <SessionTimeoutWarning />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<PasswordReset />} />
              <Route path="/update-password" element={<PasswordUpdate />} />
              <Route path="/" element={<RootRedirect />} />
              <Route path="/klienci" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <Klienci />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/klienci/nowy" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <NowyKlient />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/klienci/:id" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <KlientSzczegoly />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/klienci/:id/jadlospis-preview" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <ClientDietPreview />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/potrawy" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <Potrawy />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/produkty" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <Produkty />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/jadlospisy" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <Jadlospisy />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/jadlospisy/:templateId" element={
                <ProtectedRoute>
                  <div className="flex flex-col bg-background">
                    <Navigation />
                    <ErrorBoundary level="route">
                      <div className="flex-1 overflow-hidden">
                        <TemplateEdit />
                      </div>
                    </ErrorBoundary>
                  </div>
                </ProtectedRoute>
              } />
              {/* Publiczny route dla współdzielonych jadłospisów */}
              <Route path="/jadlospis/:token" element={
                <ErrorBoundary level="route">
                  <PublicDietView />
                </ErrorBoundary>
              } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        )}
      </QueryErrorResetBoundary>
    </QueryClientProvider>
  );
};

export default App;
