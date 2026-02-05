/**
 * E2E Tests: Real Lunch Optimization Scenarios
 *
 * Tests GPT-5 with REAL lunch dishes from the test user's database
 * Each test uses actual meal combinations with macro targets from real diets
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
describe.skip('🍽️ Real Lunch Optimization (E2E)', () => {
  let aiService: AIOptimizationService
  const testResults: any[] = []
  let suiteStartTime: Date
  const reportGenerator = new ReportGenerator()

  beforeAll(async () => {
    suiteStartTime = new Date()
    console.log('\n🚀 Starting Real Lunch Optimization Tests...')
    await initializeSupabase()
    aiService = new AIOptimizationService()
  })

  afterAll(async () => {
    await cleanupSupabase()

    const testSuite: TestSuite = {
      suiteName: 'Real Lunch Meals',
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

  it('Test 1: Balansuj makra w Piersi z kurczaka z dodatkami', async () => {
    const testName = 'Balansuj makra - Kurczak'
    const dishName = 'Pierś z kurczaka z dodatkami'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 37B/9T/71W (~511 kcal)
    const targetMacros = { protein: 37, fat: 9, carbs: 71 }

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
      scenario: 'Real Lunch Meals',
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

    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 2: Zwiększ tłuszcz w Łososiu atlantyckim', async () => {
    const testName = 'Zwiększ tłuszcz - Łosoś'
    const dishName = 'Łosoś atlantycki'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 40B/20T/18W (~409 kcal)
    const targetMacros = { protein: 40, fat: 20, carbs: 18 }

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
      scenario: 'Real Lunch Meals',
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

    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 3: Optymalizuj Wołowinę na obiad', async () => {
    const testName = 'Optymalizuj Wołowinę'
    const dishName = 'Udziec/Rostbef/Mostek/Polędwica/Tatar WOŁOWINA'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 40B/13T/44W (~447 kcal)
    const targetMacros = { protein: 40, fat: 13, carbs: 44 }

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
      scenario: 'Real Lunch Meals',
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

    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 4: Balansuj makra w Chudej rybie/Tuńczyku', async () => {
    const testName = 'Balansuj makra - Tuńczyk'
    const dishName = 'Chuda ryba/krewetki/Tuńczyk w sosie własnym'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 36B/13T/42W (~447 kcal)
    const targetMacros = { protein: 36, fat: 13, carbs: 42 }

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
      scenario: 'Real Lunch Meals',
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

    expect(validation.success).toBe(true)
  }, 300000)

  it('Test 5: Low-carb Kurczak BT', async () => {
    const testName = 'Low-carb Kurczak BT'
    const dishName = 'Kurczak BT'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 38B/21T/5W (~362 kcal)
    const targetMacros = { protein: 38, fat: 21, carbs: 5 }

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
      scenario: 'Real Lunch Meals',
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

    expect(validation.success).toBe(true)
  }, 300000)
})
