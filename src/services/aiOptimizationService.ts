import { supabase } from '@/utils/supabase'
import { errorLogger } from './errorLoggingService'
import { logger } from '@/utils/logger'

// Types based on backend Edge Function specification
export interface AIOptimizationRequest {
  user_id: string
  meal_name: string
  target_macros: {
    protein: number
    fat: number
    carbs: number
  }
  current_ingredients: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    calories: number
    protein: number
    fat: number
    carbs: number
    fiber: number
    // Nowe pola opcjonalne dla zachowania kontekstu oryginalnych jednostek
    original_unit?: string
    original_quantity?: number
    // CRITICAL FIX: unit_weight z konkretnego składnika (może różnić się od globalnej bazy)
    unit_weight?: number
  }>
  context?: {
    template_id?: string
    day_plan_id?: string
    client_id?: string
  }
  ai_model?: "gpt-4o-mini" | "gpt-5" | "gpt-5-mini" | "gpt-5-nano"
}

export interface AIOptimizationResponse {
  success: boolean
  data?: {
    optimized_ingredients: Array<{
      id: string
      name: string
      quantity: number
      unit: string
      calories: number
      protein: number
      fat: number
      carbs: number
      fiber: number
    }>
    macro_summary: {
      total_calories: number
      total_protein: number
      total_fat: number
      total_carbs: number
      total_fiber: number
      protein_percentage: number
      fat_percentage: number
      carbs_percentage: number
    }
    comparison: {
      calorie_difference: number
      protein_difference: number
      fat_difference: number
      carbs_difference: number
      target_achievement: {
        protein_achievement: number
        fat_achievement: number
        carbs_achievement: number
      }
    }
    ai_comment: string
    achievability: {
      overall_score: number
      feasibility: 'high' | 'medium' | 'low'
      main_challenges: string[]
    }
  }
  error?: {
    code: string
    message: string
    details?: string
  }
}

// Error codes for better error handling
export enum AIOptimizationErrorCodes {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FORBIDDEN = 'FORBIDDEN',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INVALID_INGREDIENTS = 'INVALID_INGREDIENTS',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  AI_ERROR = 'AI_ERROR',
  AI_QUALITY_ERROR = 'AI_QUALITY_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Polish error messages for user-friendly feedback
const ERROR_MESSAGES: Record<string, string> = {
  [AIOptimizationErrorCodes.INVALID_INPUT]: 'Nieprawidłowe dane wejściowe. Sprawdź składniki i cele makro.',
  [AIOptimizationErrorCodes.UNAUTHORIZED]: 'Brak autoryzacji. Zaloguj się ponownie.',
  [AIOptimizationErrorCodes.INVALID_TOKEN]: 'Sesja wygasła. Zaloguj się ponownie.',
  [AIOptimizationErrorCodes.FORBIDDEN]: 'Brak uprawnień do tej operacji.',
  [AIOptimizationErrorCodes.DATABASE_ERROR]: 'Błąd bazy danych. Spróbuj ponownie za chwilę.',
  [AIOptimizationErrorCodes.INVALID_INGREDIENTS]: 'Niektóre składniki nie istnieją w bazie danych.',
  [AIOptimizationErrorCodes.CONFIGURATION_ERROR]: 'Błąd konfiguracji serwera. Skontaktuj się z administratorem.',
  [AIOptimizationErrorCodes.AI_ERROR]: 'Błąd AI. Spróbuj ponownie z innymi parametrami.',
  [AIOptimizationErrorCodes.AI_QUALITY_ERROR]: 'AI próbowało usunąć składniki. Wszystkie składniki muszą zostać zachowane. Spróbuj ponownie.',
  [AIOptimizationErrorCodes.PROCESSING_ERROR]: 'Błąd przetwarzania odpowiedzi. Spróbuj ponownie.',
  [AIOptimizationErrorCodes.NETWORK_ERROR]: 'Błąd sieci. Sprawdź połączenie internetowe.',
  [AIOptimizationErrorCodes.TIMEOUT_ERROR]: 'Przekroczono limit czasu. Spróbuj ponownie.',
  [AIOptimizationErrorCodes.RATE_LIMIT_ERROR]: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.',
  [AIOptimizationErrorCodes.INTERNAL_ERROR]: 'Wewnętrzny błąd serwera. Spróbuj ponownie za chwilę.'
}

export class AIOptimizationService {
  private readonly EDGE_FUNCTION_URL: string
  private readonly DEFAULT_TIMEOUT = 180000 // 180 seconds (3 minutes for GPT-5 and O1 models)
  private readonly MAX_RETRIES = 2

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is not configured')
    }
    this.EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/ai-macro-optimization`
  }

  /**
   * Main optimization method - calls Edge Function with retry logic
   */
  async optimize(request: AIOptimizationRequest): Promise<AIOptimizationResponse> {
    // Validate input
    const validationError = this.validateRequest(request)
    if (validationError) {
      // Log validation error to database for debugging
      errorLogger.logValidationError({
        message: validationError,
        component: 'aiOptimizationService',
        invalidData: {
          meal_name: request.meal_name,
          target_macros: request.target_macros,
          ingredients_count: request.current_ingredients?.length,
          ingredients: request.current_ingredients?.map(ing => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit
          }))
        },
        severity: 'warning'
      }).catch(err => logger.warn('Failed to log validation error:', err))

      return {
        success: false,
        error: {
          code: AIOptimizationErrorCodes.INVALID_INPUT,
          message: validationError
        }
      }
    }

    // Execute with retry logic
    return this.handleRetry(async () => {
      const headers = await this.buildHeaders()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT)

      try {
        logger.log(`⏱️ AI Optymalizacja (${request.ai_model || 'gpt-4o-mini'})`)
        logger.log(`🚀 Rozpoczynam optymalizację AI (${request.ai_model || 'gpt-4o-mini'})...`)

        const response = await fetch(this.EDGE_FUNCTION_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          return this.handleHttpError(response)
        }

        const data: AIOptimizationResponse = await response.json()

        logger.log(`✅ AI zwróciło wynik:`, {
          ingredients: data.data?.optimized_ingredients?.length || 0,
          achievability: data.data?.achievability?.overall_score,
          commentLength: data.data?.ai_comment?.length || 0
        })

        return data

      } catch (error) {
        clearTimeout(timeoutId)
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return {
              success: false,
              error: {
                code: AIOptimizationErrorCodes.TIMEOUT_ERROR,
                message: ERROR_MESSAGES[AIOptimizationErrorCodes.TIMEOUT_ERROR]
              }
            }
          }
          
          if (error.message.includes('fetch')) {
            return {
              success: false,
              error: {
                code: AIOptimizationErrorCodes.NETWORK_ERROR,
                message: ERROR_MESSAGES[AIOptimizationErrorCodes.NETWORK_ERROR]
              }
            }
          }
        }

        throw error
      }
    }, this.MAX_RETRIES)
  }

  /**
   * Validates ingredients exist in database
   */
  async validateIngredients(ingredientIds: string[]): Promise<{
    valid: boolean
    validIds: string[]
    invalidIds: string[]
    error?: string
  }> {
    try {
      const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select('id')
        .in('id', ingredientIds)

      if (error) {
        return {
          valid: false,
          validIds: [],
          invalidIds: ingredientIds,
          error: 'Błąd podczas sprawdzania składników w bazie danych'
        }
      }

      const validIds = ingredients?.map(ing => ing.id) || []
      const invalidIds = ingredientIds.filter(id => !validIds.includes(id))

      return {
        valid: invalidIds.length === 0,
        validIds,
        invalidIds
      }
    } catch (error) {
      return {
        valid: false,
        validIds: [],
        invalidIds: ingredientIds,
        error: 'Błąd połączenia z bazą danych'
      }
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode: string): string {
    return ERROR_MESSAGES[errorCode] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
  }

  /**
   * Build request headers with authentication
   */
  private async buildHeaders(): Promise<Record<string, string>> {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.access_token) {
      throw new Error('No valid session found')
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    }
  }

  /**
   * Retry mechanism with exponential backoff
   */
  private async handleRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries) {
          break
        }

        // Don't retry certain errors
        if (this.isNonRetryableError(error)) {
          break
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000
        await this.sleep(delay)
      }
    }

    // Handle final error - include actual error message for debugging
    const actualErrorMsg = lastError?.message || 'Unknown error'

    return {
      success: false,
      error: {
        code: AIOptimizationErrorCodes.INTERNAL_ERROR,
        message: `${this.getErrorMessage(AIOptimizationErrorCodes.INTERNAL_ERROR)} (${actualErrorMsg})`
      }
    } as T
  }

  /**
   * Handle HTTP response errors - FIXED: Show real backend message
   */
  private async handleHttpError(response: Response): Promise<AIOptimizationResponse> {
    let rawText = '';
    try {
      rawText = await response.text()
      const errorData = JSON.parse(rawText)

      if (errorData.error?.code) {
        return {
          success: false,
          error: {
            code: errorData.error.code,
            message: errorData.error.message || this.getErrorMessage(errorData.error.code)
          }
        }
      }
    } catch {
      // If we can't parse error response, fall back to status-based error
    }

    // Map HTTP status codes to our error codes
    let errorCode: string
    switch (response.status) {
      case 401:
        errorCode = AIOptimizationErrorCodes.UNAUTHORIZED
        break
      case 403:
        errorCode = AIOptimizationErrorCodes.FORBIDDEN
        break
      case 429:
        errorCode = AIOptimizationErrorCodes.RATE_LIMIT_ERROR
        break
      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = AIOptimizationErrorCodes.INTERNAL_ERROR
        break
      default:
        errorCode = AIOptimizationErrorCodes.INTERNAL_ERROR
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: `${this.getErrorMessage(errorCode)} (HTTP ${response.status}: ${rawText.slice(0, 100)})`
      }
    }
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    if (error?.code) {
      const nonRetryableCodes = [
        AIOptimizationErrorCodes.INVALID_INPUT,
        AIOptimizationErrorCodes.UNAUTHORIZED,
        AIOptimizationErrorCodes.INVALID_TOKEN,
        AIOptimizationErrorCodes.FORBIDDEN,
        AIOptimizationErrorCodes.INVALID_INGREDIENTS
      ]
      return nonRetryableCodes.includes(error.code)
    }
    return false
  }

  /**
   * Validate request structure
   */
  private validateRequest(request: AIOptimizationRequest): string | null {
    if (!request.user_id) {
      return 'Brak ID użytkownika'
    }

    if (!request.meal_name || request.meal_name.trim().length === 0) {
      return 'Brak nazwy posiłku'
    }

    if (!request.target_macros) {
      return 'Brak docelowych makroskładników'
    }

    const { protein, fat, carbs } = request.target_macros
    if (protein < 0 || protein > 500) {
      return 'Nieprawidłowa wartość białka (0-500g)'
    }
    if (fat < 0 || fat > 200) {
      return 'Nieprawidłowa wartość tłuszczu (0-200g)'
    }
    if (carbs < 0 || carbs > 800) {
      return 'Nieprawidłowa wartość węglowodanów (0-800g)'
    }

    if (!request.current_ingredients || request.current_ingredients.length === 0) {
      return 'Brak składników do optymalizacji'
    }

    // Validate each ingredient
    for (const ingredient of request.current_ingredients) {
      if (!ingredient.id || !ingredient.name) {
        return 'Nieprawidłowe dane składnika'
      }
      // ✅ Allow 0g ingredients (ornamental/flavor ingredients like lemon juice)
      // ❌ Block only negative quantities
      if (ingredient.quantity < 0) {
        return 'Nieprawidłowa ilość składnika (wartość ujemna)'
      }
    }

    return null
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const aiOptimizationService = new AIOptimizationService()