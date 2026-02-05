/**
 * E2E Tests: Real Breakfast Optimization Scenarios
 *
 * Tests GPT-5 with REAL breakfast dishes from the test user's database
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
describe.skip('🍳 Real Breakfast Optimization (E2E)', () => {
  let aiService: AIOptimizationService
  const testResults: any[] = []
  let suiteStartTime: Date
  const reportGenerator = new ReportGenerator()

  beforeAll(async () => {
    suiteStartTime = new Date()
    console.log('\n🚀 Starting Real Breakfast Optimization Tests...')
    await initializeSupabase()
    aiService = new AIOptimizationService()
  })

  afterAll(async () => {
    await cleanupSupabase()

    const testSuite: TestSuite = {
      suiteName: 'Real Breakfast Meals',
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

  it('Test 1: Optymalizuj Omlet (wysokobiałkowy)', async () => {
    const testName = 'Optymalizuj Omlet'
    const dishName = 'Omlet'

    // Fetch real dish ingredients
    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 41.8B/25.8T/76.7W (~638 kcal) - 81 meals, 30 clients
    const targetMacros = { protein: 42, fat: 26, carbs: 77 }

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
      scenario: 'Real Breakfast Meals',
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

  it('Test 2: Zwiększ białko w Jajkach z szynką', async () => {
    const testName = 'Zwiększ białko - Jajka z szynką'
    const dishName = 'Jajka z szynką '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 47.2B/27.5T/41.7W (~608 kcal) - 55 meals, 23 clients
    const targetMacros = { protein: 47, fat: 28, carbs: 42 }

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
      scenario: 'Real Breakfast Meals',
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

  it('Test 3: Balansuj makra w Płatkach owsianych z białkiem', async () => {
    const testName = 'Balansuj makra - Płatki owsiane'
    const dishName = 'Płatki owsiane z białkiem '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 36.3B/16.4T/75.8W (~511 kcal) - 53 meals, 22 clients
    const targetMacros = { protein: 36, fat: 16, carbs: 76 }

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
      scenario: 'Real Breakfast Meals',
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

  it('Test 4: Zwiększ węglowodany w Kleiku ryżowym', async () => {
    const testName = 'Zwiększ węgle - Kleik ryżowy'
    const dishName = 'Kleik ryżowy/Płatki ryżowe'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 31.3B/13.7T/81.5W (~593 kcal) - 113 meals, 30 clients (most popular!)
    const targetMacros = { protein: 31, fat: 14, carbs: 82 }

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
      scenario: 'Real Breakfast Meals',
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

  it('Test 5: High-carb Płatki śniadaniowe z napojem roślinnym', async () => {
    const testName = 'High-carb śniadanie'
    const dishName = 'Płatki śniadaniowe z napojem roślinnym '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 42.8B/9.6T/86.9W (~613 kcal) - 14 meals, 3 clients
    const targetMacros = { protein: 43, fat: 10, carbs: 87 }

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
      scenario: 'Real Breakfast Meals',
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
