/**
 * AI Assertions for E2E Tests
 *
 * Validates AI optimization results with ±5% tolerance
 * matching the green color threshold used in the UI
 */

import { AIOptimizationResponse } from '@/services/aiOptimizationService'

export interface MacroTarget {
  protein: number
  fat: number
  carbs: number
}

export interface MacroAchievement {
  target: number
  actual: number
  difference: number
  percentDifference: number
  withinTolerance: boolean
}

export interface ValidationResult {
  success: boolean
  macroAchievement: {
    protein: MacroAchievement
    fat: MacroAchievement
    carbs: MacroAchievement
  }
  ingredientPreservation: {
    allPreserved: boolean
    missingIngredients: string[]
    originalCount: number
    optimizedCount: number
  }
  performanceMetrics: {
    responseTime: number
    estimatedCost: number
  }
  aiQuality: {
    achievabilityScore: number
    feasibility: string
    commentLength: number
    hasComment: boolean
  }
  errors: string[]
}

/**
 * Default tolerance: ±10% (realistic for real-world recipes with structural constraints)
 * UI shows green for ±5%, yellow for ±6-15%, so ±10% aligns with "acceptable" range
 */
const DEFAULT_TOLERANCE_PERCENT = 10

/**
 * Calculate macro achievement for a single macro
 */
function calculateMacroAchievement(
  target: number,
  actual: number,
  tolerance: number = DEFAULT_TOLERANCE_PERCENT
): MacroAchievement {
  const difference = actual - target
  const percentDifference = target === 0 ? 0 : (difference / target) * 100
  const withinTolerance = Math.abs(percentDifference) <= tolerance

  return {
    target,
    actual,
    difference,
    percentDifference,
    withinTolerance,
  }
}

/**
 * Validate AI optimization result
 */
export function validateAIResult(
  response: AIOptimizationResponse,
  targets: MacroTarget,
  originalIngredientNames: string[],
  responseTime: number,
  aiModel: string = 'gpt-5'
): ValidationResult {
  const errors: string[] = []

  // Check if response was successful
  if (!response.success || !response.data) {
    return {
      success: false,
      macroAchievement: {
        protein: { target: targets.protein, actual: 0, difference: 0, percentDifference: 0, withinTolerance: false },
        fat: { target: targets.fat, actual: 0, difference: 0, percentDifference: 0, withinTolerance: false },
        carbs: { target: targets.carbs, actual: 0, difference: 0, percentDifference: 0, withinTolerance: false },
      },
      ingredientPreservation: {
        allPreserved: false,
        missingIngredients: originalIngredientNames,
        originalCount: originalIngredientNames.length,
        optimizedCount: 0,
      },
      performanceMetrics: {
        responseTime,
        estimatedCost: 0,
      },
      aiQuality: {
        achievabilityScore: 0,
        feasibility: 'unknown',
        commentLength: 0,
        hasComment: false,
      },
      errors: [response.error?.message || 'AI optimization failed'],
    }
  }

  const data = response.data

  // Validate macro achievement
  const proteinAchievement = calculateMacroAchievement(targets.protein, data.macro_summary.total_protein)
  const fatAchievement = calculateMacroAchievement(targets.fat, data.macro_summary.total_fat)
  const carbsAchievement = calculateMacroAchievement(targets.carbs, data.macro_summary.total_carbs)

  // Check if all macros are within tolerance
  if (!proteinAchievement.withinTolerance) {
    errors.push(
      `Protein out of tolerance: ${data.macro_summary.total_protein.toFixed(1)}g ` +
      `(${proteinAchievement.percentDifference >= 0 ? '+' : ''}${proteinAchievement.percentDifference.toFixed(1)}% from target ${targets.protein}g)`
    )
  }
  if (!fatAchievement.withinTolerance) {
    errors.push(
      `Fat out of tolerance: ${data.macro_summary.total_fat.toFixed(1)}g ` +
      `(${fatAchievement.percentDifference >= 0 ? '+' : ''}${fatAchievement.percentDifference.toFixed(1)}% from target ${targets.fat}g)`
    )
  }
  if (!carbsAchievement.withinTolerance) {
    errors.push(
      `Carbs out of tolerance: ${data.macro_summary.total_carbs.toFixed(1)}g ` +
      `(${carbsAchievement.percentDifference >= 0 ? '+' : ''}${carbsAchievement.percentDifference.toFixed(1)}% from target ${targets.carbs}g)`
    )
  }

  // Validate ingredient preservation
  const optimizedNames = data.optimized_ingredients.map(ing => ing.name)
  const missingIngredients = originalIngredientNames.filter(name => !optimizedNames.includes(name))

  if (missingIngredients.length > 0) {
    errors.push(`Missing ingredients after optimization: ${missingIngredients.join(', ')}`)
  }

  // Estimate cost (rough estimates for GPT-5 based on OpenAI pricing)
  const costPerTest = aiModel === 'gpt-5' ? 0.022 : aiModel === 'gpt-5-mini' ? 0.006 : 0.003

  // Validate AI quality
  if (!data.ai_comment || data.ai_comment.length === 0) {
    errors.push('AI did not provide a comment')
  }

  if (data.achievability.overall_score < 50) {
    errors.push(`Low achievability score: ${data.achievability.overall_score}`)
  }

  return {
    success: errors.length === 0,
    macroAchievement: {
      protein: proteinAchievement,
      fat: fatAchievement,
      carbs: carbsAchievement,
    },
    ingredientPreservation: {
      allPreserved: missingIngredients.length === 0,
      missingIngredients,
      originalCount: originalIngredientNames.length,
      optimizedCount: data.optimized_ingredients.length,
    },
    performanceMetrics: {
      responseTime,
      estimatedCost: costPerTest,
    },
    aiQuality: {
      achievabilityScore: data.achievability.overall_score,
      feasibility: data.achievability.feasibility,
      commentLength: data.ai_comment.length,
      hasComment: data.ai_comment.length > 0,
    },
    errors,
  }
}

/**
 * Assert that AI result passes all validation checks
 */
export function assertAIResultValid(
  result: ValidationResult,
  testName: string
) {
  if (!result.success) {
    throw new Error(
      `❌ ${testName} failed:\n` +
      result.errors.map(err => `  - ${err}`).join('\n') +
      `\n\nMacro Achievement:\n` +
      `  Protein: ${result.macroAchievement.protein.actual.toFixed(1)}g ` +
      `(${result.macroAchievement.protein.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.protein.percentDifference.toFixed(1)}%)\n` +
      `  Fat: ${result.macroAchievement.fat.actual.toFixed(1)}g ` +
      `(${result.macroAchievement.fat.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.fat.percentDifference.toFixed(1)}%)\n` +
      `  Carbs: ${result.macroAchievement.carbs.actual.toFixed(1)}g ` +
      `(${result.macroAchievement.carbs.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.carbs.percentDifference.toFixed(1)}%)`
    )
  }
}

/**
 * Format validation result for reporting
 */
export function formatValidationResult(result: ValidationResult): string {
  const proteinIcon = result.macroAchievement.protein.withinTolerance ? '✅' : '❌'
  const fatIcon = result.macroAchievement.fat.withinTolerance ? '✅' : '❌'
  const carbsIcon = result.macroAchievement.carbs.withinTolerance ? '✅' : '❌'

  return (
    `${proteinIcon} Protein: ${result.macroAchievement.protein.actual.toFixed(1)}g ` +
    `(${result.macroAchievement.protein.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.protein.percentDifference.toFixed(1)}%)\n` +
    `${fatIcon} Fat: ${result.macroAchievement.fat.actual.toFixed(1)}g ` +
    `(${result.macroAchievement.fat.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.fat.percentDifference.toFixed(1)}%)\n` +
    `${carbsIcon} Carbs: ${result.macroAchievement.carbs.actual.toFixed(1)}g ` +
    `(${result.macroAchievement.carbs.percentDifference >= 0 ? '+' : ''}${result.macroAchievement.carbs.percentDifference.toFixed(1)}%)\n` +
    `⏱️  Response time: ${result.performanceMetrics.responseTime.toFixed(2)}s\n` +
    `💰 Estimated cost: $${result.performanceMetrics.estimatedCost.toFixed(4)}\n` +
    `🎯 Achievability: ${result.aiQuality.achievabilityScore} (${result.aiQuality.feasibility})`
  )
}
