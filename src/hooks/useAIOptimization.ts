import { useState, useCallback, useRef, useEffect } from 'react'
import { aiOptimizationService, AIOptimizationRequest, AIOptimizationResponse } from '@/services/aiOptimizationService'
import { debounceAsync } from '@/utils/debounce'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { errorLogger } from '@/services/errorLoggingService'
import { logger } from '@/utils/logger'

export interface OptimizationData {
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
    original_unit?: string
    original_quantity?: number
    unit_weight?: number
  }>
  context?: {
    template_id?: string
    day_plan_id?: string
    client_id?: string
  }
  ai_model?: "gpt-4o-mini" | "gpt-5" | "gpt-5-mini" | "gpt-5-nano"
}

export interface UseAIOptimizationReturn {
  // Core optimization method
  optimize: (data: OptimizationData) => void
  
  // State management
  isOptimizing: boolean
  result: AIOptimizationResponse['data'] | null
  error: string | null
  
  // Control methods
  reset: () => void
  clearError: () => void
  
  // Advanced features
  validateIngredients: (ingredientIds: string[]) => Promise<{
    valid: boolean
    validIds: string[]
    invalidIds: string[]
    error?: string
  }>
  
  // Performance tracking
  lastOptimizationTime: number | null
  requestCount: number
}

interface OptimizationState {
  isOptimizing: boolean
  result: AIOptimizationResponse['data'] | null
  error: string | null
  lastOptimizationTime: number | null
  requestCount: number
}

const INITIAL_STATE: OptimizationState = {
  isOptimizing: false,
  result: null,
  error: null,
  lastOptimizationTime: null,
  requestCount: 0
}

// Debounce delay for rapid successive calls
const DEBOUNCE_DELAY = 1500 // 1.5 seconds

export function useAIOptimization(): UseAIOptimizationReturn {
  const { user } = useAuth()
  const [state, setState] = useState<OptimizationState>(INITIAL_STATE)
  
  // Ref for cancellation support
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Ref for tracking component mount status
  const isMountedRef = useRef(true)

  /**
   * Safe state update that checks if component is still mounted
   */
  const safeSetState = useCallback((newState: Partial<OptimizationState>) => {
    if (isMountedRef.current) {
      setState(prevState => ({
        ...prevState,
        ...newState
      }))
    }
  }, [])

  /**
   * Main optimization method with comprehensive error handling
   */
  const optimizeInternal = useCallback(async (data: OptimizationData): Promise<void> => {
    // Validate user authentication
    if (!user) {
      const errorMsg = 'Musisz być zalogowany, aby używać optymalizacji AI'
      safeSetState({ error: errorMsg })
      toast({
        title: 'Błąd autoryzacji',
        description: errorMsg,
        variant: 'destructive'
      })
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    // Set loading state
    safeSetState({
      isOptimizing: true,
      error: null,
      result: null
    })

    const startTime = Date.now()

    try {
      // Build request with user ID
      const request: AIOptimizationRequest = {
        ...data,
        user_id: user.id
      }


      // Call AI optimization service
      const response = await aiOptimizationService.optimize(request)
      

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      if (response.success && response.data) {
        // Success - update state with results
        safeSetState({
          isOptimizing: false,
          result: response.data,
          error: null,
          lastOptimizationTime: Date.now() - startTime,
          requestCount: state.requestCount + 1
        })

        // Show success toast
        toast({
          title: 'Optymalizacja AI ukończona',
          description: 'Sprawdź propozycję zmian w składnikach',
          variant: 'default'
        })

      } else {
        // AI returned error
        const errorMsg = response.error?.message || 'Nieznany błąd optymalizacji AI'

        // Log error to database for debugging
        errorLogger.logAIError({
          message: errorMsg,
          component: 'useAIOptimization',
          code: response.error?.code,
          request: request,
          response: response,
          severity: 'error'
        }).catch(err => logger.warn('Failed to log AI error:', err))

        safeSetState({
          isOptimizing: false,
          error: errorMsg,
          requestCount: state.requestCount + 1
        })

        toast({
          title: 'Błąd optymalizacji AI',
          description: errorMsg,
          variant: 'destructive'
        })
      }

    } catch (error) {
      logger.error('💥 useAIOptimization: Exception caught:', error)
      // Network or unexpected error
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      const errorMsg = error instanceof Error
        ? error.message
        : 'Wystąpił nieoczekiwany błąd podczas optymalizacji'

      // Log network/unexpected error to database
      errorLogger.logNetworkError({
        message: errorMsg,
        component: 'useAIOptimization',
        url: aiOptimizationService['EDGE_FUNCTION_URL'],
        severity: 'error'
      }).catch(err => logger.warn('Failed to log network error:', err))

      safeSetState({
        isOptimizing: false,
        error: errorMsg,
        requestCount: state.requestCount + 1
      })

      toast({
        title: 'Błąd sieci',
        description: errorMsg,
        variant: 'destructive'
      })

      logger.error('AI optimization error:', error)
    }
  }, [user, safeSetState, state.requestCount])

  /**
   * Debounced optimize method to prevent spam
   */
  const debouncedOptimize = useCallback(
    debounceAsync(optimizeInternal, DEBOUNCE_DELAY),
    [optimizeInternal]
  )

  /**
   * Public optimize method - uses debouncing for performance
   */
  const optimize = useCallback((data: OptimizationData) => {
    // For immediate feedback, show loading state right away
    safeSetState({
      isOptimizing: true,
      error: null
    })
    
    // Call debounced version
    debouncedOptimize(data)
  }, [debouncedOptimize, safeSetState])

  /**
   * Validate ingredients in database
   */
  const validateIngredients = useCallback(async (ingredientIds: string[]) => {
    try {
      return await aiOptimizationService.validateIngredients(ingredientIds)
    } catch (error) {
      logger.error('Ingredient validation error:', error)
      return {
        valid: false,
        validIds: [],
        invalidIds: ingredientIds,
        error: 'Błąd sprawdzania składników'
      }
    }
  }, [])

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    safeSetState(INITIAL_STATE)
  }, [safeSetState])

  /**
   * Clear only the error state
   */
  const clearError = useCallback(() => {
    safeSetState({ error: null })
  }, [safeSetState])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // Core methods
    optimize,
    
    // State
    isOptimizing: state.isOptimizing,
    result: state.result,
    error: state.error,
    
    // Control methods
    reset,
    clearError,
    
    // Advanced features
    validateIngredients,
    
    // Performance tracking
    lastOptimizationTime: state.lastOptimizationTime,
    requestCount: state.requestCount
  }
}

/**
 * Utility hook for ingredients validation
 * Separate from main hook for cases where only validation is needed
 */
export function useIngredientsValidation() {
  const [isValidating, setIsValidating] = useState(false)
  
  const validateIngredients = useCallback(async (ingredientIds: string[]) => {
    setIsValidating(true)
    try {
      const result = await aiOptimizationService.validateIngredients(ingredientIds)
      return result
    } catch (error) {
      logger.error('Ingredients validation error:', error)
      return {
        valid: false,
        validIds: [],
        invalidIds: ingredientIds,
        error: 'Błąd sprawdzania składników'
      }
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    validateIngredients,
    isValidating
  }
}

/**
 * Helper hook for formatting optimization results
 * Provides computed values and formatting utilities
 */
export function useOptimizationResultFormatter(result: AIOptimizationResponse['data'] | null) {
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(1)}%`
  }, [])

  const formatMacro = useCallback((value: number) => {
    return `${value.toFixed(1)}g`
  }, [])

  const formatCalories = useCallback((value: number) => {
    return `${Math.round(value)} kcal`
  }, [])

  const getAchievementColor = useCallback((achievement: number) => {
    if (achievement >= 95 && achievement <= 105) return 'text-green-500'
    if (achievement >= 85 && achievement <= 115) return 'text-yellow-500'
    return 'text-red-500'
  }, [])

  const getFeasibilityColor = useCallback((feasibility: string) => {
    switch (feasibility) {
      case 'high': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }, [])

  const getFeasibilityText = useCallback((feasibility: string) => {
    switch (feasibility) {
      case 'high': return 'Wysoka'
      case 'medium': return 'Średnia' 
      case 'low': return 'Niska'
      default: return 'Nieznana'
    }
  }, [])

  return {
    // Formatting methods
    formatPercentage,
    formatMacro,
    formatCalories,
    
    // Color helpers
    getAchievementColor,
    getFeasibilityColor,
    
    // Text helpers
    getFeasibilityText,
    
    // Computed values
    hasResult: !!result,
    hasChanges: result ? (
      Math.abs(result.comparison.protein_difference) > 0.1 ||
      Math.abs(result.comparison.fat_difference) > 0.1 ||
      Math.abs(result.comparison.carbs_difference) > 0.1
    ) : false,
    
    isHighQuality: result ? (
      result.achievability.feasibility === 'high' &&
      result.achievability.overall_score >= 75
    ) : false
  }
}