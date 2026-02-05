/**
 * E2E Tests: Real Dinner Optimization Scenarios
 *
 * Tests GPT-5 with REAL dinner/evening meal dishes from the test user's database
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
describe.skip('🥗 Real Dinner Optimization (E2E)', () => {
  let aiService: AIOptimizationService
  const testResults: any[] = []
  let suiteStartTime: Date
  const reportGenerator = new ReportGenerator()

  beforeAll(async () => {
    suiteStartTime = new Date()
    console.log('\n🚀 Starting Real Dinner Optimization Tests...')
    await initializeSupabase()
    aiService = new AIOptimizationService()
  })

  afterAll(async () => {
    await cleanupSupabase()

    const testSuite: TestSuite = {
      suiteName: 'Real Dinner Meals',
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

  it('Test 1: Light dinner - Chuda ryba/Tuńczyk', async () => {
    const testName = 'Light dinner - Tuńczyk'
    const dishName = 'Chuda ryba/krewetki/Tuńczyk w sosie własnym'

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets (evening meal): avg 28B/13T/28W (~354 kcal)
    const targetMacros = { protein: 28, fat: 13, carbs: 28 }

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
      scenario: 'Real Dinner Meals',
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

  it('Test 2: Balansuj makra w Twarogu z warzywami', async () => {
    const testName = 'Balansuj makra - Twaróg'
    const dishName = 'Twaróg z warzywami '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets (evening): ~25B/20T/10W (~350 kcal)
    // Note: This dish is also in edge-cases but with different goal
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
      scenario: 'Real Dinner Meals',
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

  it('Test 3: High-protein Sałatka z szynką parmeńską', async () => {
    const testName = 'High-protein sałatka'
    const dishName = 'Sałatka z szynką parmeńską i rukolą '

    const dishIngredients = await fetchDishIngredients(dishName)
    expect(dishIngredients.length).toBeGreaterThan(0)

    // Target from real diets: avg 45B/18T/63W (~615 kcal)
    const targetMacros = { protein: 45, fat: 18, carbs: 63 }

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
      scenario: 'Real Dinner Meals',
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
