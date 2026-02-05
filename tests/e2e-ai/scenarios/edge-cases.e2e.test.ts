/**
 * E2E Tests: Real-World Meal Optimization Scenarios
 *
 * Tests GPT-5 with REAL dishes from the test user's database
 * Each test uses actual meal combinations that people cook
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { AIOptimizationService } from '@/services/aiOptimizationService'
import {
  initializeSupabase,
  cleanupSupabase,
  fetchDishIngredients,
  getUserId,
  dishIngredientsToAIRequest,
} from '../helpers/supabase-client'
import { validateAIResult } from '../helpers/ai-assertions'
import { ReportGenerator, TestSuite } from '../helpers/report-generator'

// SKIPPED: E2E AI tests require Supabase authentication setup
describe.skip('🍽️ Real-World Meal Optimization (E2E)', () => {
  let aiService: AIOptimizationService
  const testResults: any[] = []
  let suiteStartTime: Date
  const reportGenerator = new ReportGenerator()

  beforeAll(async () => {
    suiteStartTime = new Date()
    console.log('\n🚀 Starting Real-World Meal Optimization Tests...')
    await initializeSupabase()
    aiService = new AIOptimizationService()
  })

  afterAll(async () => {
    await cleanupSupabase()

    const testSuite: TestSuite = {
      suiteName: 'Real-World Meals',
      aiModel: 'gpt-5',
      results: testResults,
      startTime: suiteStartTime,
      endTime: new Date(),
    }

    reportGenerator.addTestSuite(testSuite)
    const report = reportGenerator.generateMarkdownReport()
    const reportPath = reportGenerator.saveReport(report)

    console.log(`\n📊 Final Report saved to: ${reportPath}`)
  })

  it('Test 1: Zwiększ białko w obiedzie (Pierś z kurczaka)', async () => {
    const testName = 'Zwiększ białko w obiedzie'
    const dishName = 'Pierś z kurczaka z ziemniakami '

    // Fetch real dish ingredients
    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Current macros: 38g P, 12g T, 61g W (499 kcal)
    // Target: +32% protein, slight fat increase, maintain carbs
    const targetMacros = { protein: 50, fat: 15, carbs: 60 }

    const request = {
      user_id: getUserId(),
      meal_name: testName,
      target_macros: targetMacros,
      current_ingredients: dishIngredients.map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.dish_quantity, // Use quantity from dish recipe
        unit: 'gramy',
        calories: (ing.calories * ing.dish_quantity) / 100,
        protein: (ing.protein * ing.dish_quantity) / 100,
        fat: (ing.fat * ing.dish_quantity) / 100,
        carbs: (ing.carbs * ing.dish_quantity) / 100,
        fiber: (ing.fiber * ing.dish_quantity) / 100,
        original_unit: ing.dish_unit,
        original_quantity: ing.dish_quantity,
        unit_weight: ing.unit_weight || 100,
      })),
      ai_model: 'gpt-5' as const,
    }

    const startTime = Date.now()
    const response = await aiService.optimize(request)
    const responseTime = (Date.now() - startTime) / 1000

    const validation = validateAIResult(
      response,
      targetMacros,
      dishIngredients.map((ing: any) => ing.name),
      responseTime,
      'gpt-5'
    )

    testResults.push({
      testName,
      scenario: 'Real-World Meals',
      mealName: dishName,
      targets: targetMacros,
      initialIngredients: request.current_ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        protein: ing.protein,
        fat: ing.fat,
        carbs: ing.carbs,
      })),
      validation,
      passed: validation.success,
      aiComment: response.data?.ai_comment,
      timestamp: new Date(),
    })

    console.log(`\n${validation.success ? '✅' : '❌'} ${testName}: ${responseTime.toFixed(1)}s`)

    // This test should pass - realistic protein increase
    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 2: Zmniejsz tłuszcz w twarogu', async () => {
    const testName = 'Zmniejsz tłuszcz w twarogu'
    const dishName = 'Twaróg z warzywami '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Current macros: 26g P, 28.6g T, 11g W (414 kcal)
    // Target: -30% fat (realistic reduction), maintain protein
    const targetMacros = { protein: 25, fat: 20, carbs: 10 }

    const request = {
      user_id: getUserId(),
      meal_name: testName,
      target_macros: targetMacros,
      current_ingredients: dishIngredientsToAIRequest(dishIngredients),
      ai_model: 'gpt-5' as const,
    }

    const startTime = Date.now()
    const response = await aiService.optimize(request)
    const responseTime = (Date.now() - startTime) / 1000

    const validation = validateAIResult(
      response,
      targetMacros,
      dishIngredients.map((ing: any) => ing.name),
      responseTime,
      'gpt-5'
    )

    testResults.push({
      testName,
      scenario: 'Real-World Meals',
      mealName: dishName,
      targets: targetMacros,
      initialIngredients: request.current_ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        protein: ing.protein,
        fat: ing.fat,
        carbs: ing.carbs,
      })),
      validation,
      passed: validation.success,
      aiComment: response.data?.ai_comment,
      timestamp: new Date(),
    })

    console.log(`\n${validation.success ? '✅' : '❌'} ${testName}: ${responseTime.toFixed(1)}s`)

    // This should pass - realistic -30% fat reduction
    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 3: Obniż węglowodany w kaszy (cutting diet)', async () => {
    const testName = 'Obniż węglowodany - cutting'
    const dishName = 'Kasza manna '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Current macros: 42g P, 16g T, 99g W (717 kcal)
    // Target: -30% carbs for cutting phase, maintain protein
    const targetMacros = { protein: 40, fat: 12, carbs: 70 }

    const request = {
      user_id: getUserId(),
      meal_name: testName,
      target_macros: targetMacros,
      current_ingredients: dishIngredientsToAIRequest(dishIngredients),
      ai_model: 'gpt-5' as const,
    }

    const startTime = Date.now()
    const response = await aiService.optimize(request)
    const responseTime = (Date.now() - startTime) / 1000

    const validation = validateAIResult(
      response,
      targetMacros,
      dishIngredients.map((ing: any) => ing.name),
      responseTime,
      'gpt-5'
    )

    testResults.push({
      testName,
      scenario: 'Real-World Meals',
      mealName: dishName,
      targets: targetMacros,
      initialIngredients: request.current_ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        protein: ing.protein,
        fat: ing.fat,
        carbs: ing.carbs,
      })),
      validation,
      passed: validation.success,
      aiComment: response.data?.ai_comment,
      timestamp: new Date(),
    })

    console.log(`\n${validation.success ? '✅' : '❌'} ${testName}: ${responseTime.toFixed(1)}s`)

    // Should pass - reduce porridge and fruit portions
    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 4: Low-carb kanapki (reduced carbs)', async () => {
    const testName = 'Low-carb kanapki'
    const dishName = 'Kanapki '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Current macros: 22g P, 7.4g T, 48g W (358 kcal)
    // Target: low-carb (not extreme keto) - realistic reduction
    const targetMacros = { protein: 25, fat: 15, carbs: 25 }

    const request = {
      user_id: getUserId(),
      meal_name: testName,
      target_macros: targetMacros,
      current_ingredients: dishIngredientsToAIRequest(dishIngredients),
      ai_model: 'gpt-5' as const,
    }

    const startTime = Date.now()
    const response = await aiService.optimize(request)
    const responseTime = (Date.now() - startTime) / 1000

    const validation = validateAIResult(
      response,
      targetMacros,
      dishIngredients.map((ing: any) => ing.name),
      responseTime,
      'gpt-5'
    )

    testResults.push({
      testName,
      scenario: 'Real-World Meals',
      mealName: dishName,
      targets: targetMacros,
      initialIngredients: request.current_ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        protein: ing.protein,
        fat: ing.fat,
        carbs: ing.carbs,
      })),
      validation,
      passed: validation.success,
      aiComment: response.data?.ai_comment,
      timestamp: new Date(),
    })

    console.log(`\n${validation.success ? '✅' : '❌'} ${testName}: ${responseTime.toFixed(1)}s`)

    // Should pass - realistic low-carb transformation (not extreme keto)
    expect(validation.success).toBe(true)
  }, 300000)
})
