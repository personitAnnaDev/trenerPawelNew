/**
 * Error Logging Service
 *
 * Centralized service for logging application errors to Supabase for developer debugging.
 * Sends errors to Edge Function which stores them in error_logs table.
 *
 * Usage:
 *   import { errorLogger } from '@/services/errorLoggingService'
 *
 *   errorLogger.logError({
 *     type: 'AI_ERROR',
 *     message: 'OpenAI API timeout',
 *     component: 'useAIOptimization',
 *     context: { request: {...} }
 *   })
 */

import { supabase } from '@/utils/supabase'
import { logger } from '@/utils/logger'

export type ErrorType =
  | 'AI_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'UNKNOWN'

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface LogErrorRequest {
  type: ErrorType
  message: string
  component: string
  code?: string
  context?: Record<string, unknown>
  severity?: ErrorSeverity
}

class ErrorLoggingService {
  private readonly EDGE_FUNCTION_URL: string
  private isEnabled: boolean = true

  constructor() {
    // Use Supabase project URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      logger.warn('⚠️ VITE_SUPABASE_URL not found - error logging disabled')
      this.isEnabled = false
      this.EDGE_FUNCTION_URL = ''
    } else {
      this.EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/log-error`
    }
  }

  /**
   * Log an error to the database
   * Fails silently to avoid cascading errors
   */
  async logError(request: LogErrorRequest): Promise<void> {
    // Skip if disabled
    if (!this.isEnabled) {
      return
    }

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        logger.warn('⚠️ No session - skipping error log')
        return
      }

      // Collect browser metadata
      const userAgent = navigator.userAgent
      const url = window.location.href

      // Build request body
      const body = {
        error_type: request.type,
        error_code: request.code,
        error_message: request.message,
        component: request.component,
        context: request.context,
        severity: request.severity || 'error',
        user_agent: userAgent,
        url: url,
      }

      // Send to Edge Function (fire and forget)
      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.warn('⚠️ Failed to log error:', response.status, errorText)
      } else {
        logger.log('📝 Error logged to database')
      }
    } catch (error) {
      // Fail silently - don't throw errors in error logger
      logger.warn('⚠️ Error logging service failed:', error)
    }
  }

  /**
   * Log AI-specific errors with structured context
   */
  async logAIError(params: {
    message: string
    component: string
    code?: string
    request?: unknown
    response?: unknown
    severity?: ErrorSeverity
  }): Promise<void> {
    return this.logError({
      type: 'AI_ERROR',
      message: params.message,
      component: params.component,
      code: params.code,
      context: {
        request: params.request,
        response: params.response,
      },
      severity: params.severity || 'error',
    })
  }

  /**
   * Log validation errors
   */
  async logValidationError(params: {
    message: string
    component: string
    invalidData?: unknown
    severity?: ErrorSeverity
  }): Promise<void> {
    return this.logError({
      type: 'VALIDATION_ERROR',
      message: params.message,
      component: params.component,
      context: {
        invalidData: params.invalidData,
      },
      severity: params.severity || 'warning',
    })
  }

  /**
   * Log network errors
   */
  async logNetworkError(params: {
    message: string
    component: string
    url?: string
    statusCode?: number
    severity?: ErrorSeverity
  }): Promise<void> {
    return this.logError({
      type: 'NETWORK_ERROR',
      message: params.message,
      component: params.component,
      context: {
        url: params.url,
        statusCode: params.statusCode,
      },
      severity: params.severity || 'error',
    })
  }

  /**
   * Log database errors
   */
  async logDatabaseError(params: {
    message: string
    component: string
    query?: string
    error?: unknown
    severity?: ErrorSeverity
  }): Promise<void> {
    return this.logError({
      type: 'DATABASE_ERROR',
      message: params.message,
      component: params.component,
      context: {
        query: params.query,
        error: params.error,
      },
      severity: params.severity || 'error',
    })
  }

  /**
   * Enable or disable error logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    logger.log(`📝 Error logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Check if error logging is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled
  }
}

// Export singleton instance
export const errorLogger = new ErrorLoggingService()
